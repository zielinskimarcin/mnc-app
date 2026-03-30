// supabase/functions/run_scheduled_push/index.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import cronParser from "https://esm.sh/cron-parser@4.9.0";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Audience =
  | { type: "all" }
  | { type: "has_account" } // user_id IS NOT NULL
  | { type: "no_account" } // user_id IS NULL
  | { type: "points_eq"; value: number }
  | { type: "points_gte"; value: number }
  | { type: "points_lt"; value: number };

function json(v: unknown, status = 200) {
  return new Response(JSON.stringify(v), { status, headers: corsHeaders });
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function sendExpoBatch(messages: any[]) {
  const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  const expoJson = await expoRes.json().catch(() => null);
  return { ok: expoRes.ok, status: expoRes.status, expo: expoJson };
}

async function fetchTokens(service: any, audience: Audience) {
  let rows: any[] = [];

  if (audience.type === "all") {
    const { data, error } = await service
      .from("push_tokens")
      .select("expo_push_token")
      .not("expo_push_token", "is", null);

    if (error) throw error;
    rows = data ?? [];
  }

  if (audience.type === "has_account") {
    const { data, error } = await service
      .from("push_tokens")
      .select("expo_push_token")
      .not("expo_push_token", "is", null)
      .not("user_id", "is", null);

    if (error) throw error;
    rows = data ?? [];
  }

  if (audience.type === "no_account") {
    const { data, error } = await service
      .from("push_tokens")
      .select("expo_push_token")
      .not("expo_push_token", "is", null)
      .is("user_id", null);

    if (error) throw error;
    rows = data ?? [];
  }

  // PUNKTY — jak w send_push (bez joinów)
  if (
    audience.type === "points_eq" ||
    audience.type === "points_gte" ||
    audience.type === "points_lt"
  ) {
    const value = Number((audience as any).value ?? 0);

    // 1) profile spełniające warunek
    let profileQuery = service.from("profiles").select("id, points");

    if (audience.type === "points_eq") profileQuery = profileQuery.eq("points", value);
    if (audience.type === "points_gte") profileQuery = profileQuery.gte("points", value);
    if (audience.type === "points_lt") profileQuery = profileQuery.lt("points", value);

    const { data: profiles, error: pErr } = await profileQuery;
    if (pErr) throw pErr;

    const userIds = (profiles ?? []).map((p: any) => p.id).filter(Boolean);

    if (userIds.length === 0) {
      rows = [];
    } else {
      const { data: tokens, error: tErr } = await service
        .from("push_tokens")
        .select("expo_push_token")
        .in("user_id", userIds)
        .not("expo_push_token", "is", null);

      if (tErr) throw tErr;
      rows = tokens ?? [];
    }
  }

  const tokenList = Array.from(
    new Set(
      rows
        .map((r: any) => String(r.expo_push_token ?? "").trim())
        .filter(Boolean)
    )
  );

  return tokenList;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

    // Zabezpieczenie cron
    const secret = req.headers.get("x-cron-secret") ?? "";
    if (!CRON_SECRET || secret !== CRON_SECRET) {
      return json({ error: "Forbidden" }, 403);
    }

    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Pobierz due joby
    const nowIso = new Date().toISOString();
    const { data: jobs, error: jobsErr } = await service
      .from("push_jobs")
      .select("*")
      .eq("status", "scheduled")
      .lte("next_run_at", nowIso)
      .order("next_run_at", { ascending: true })
      .limit(50);

    if (jobsErr) throw jobsErr;

    if (!jobs || jobs.length === 0) {
      return json({ ok: true, ran: 0, results: [] });
    }

    const results: any[] = [];

    for (const job of jobs) {
      const title = String(job.title ?? "").trim();
      const body = String(job.body ?? "").trim();
      const baseData = job.data ?? {};
      const audience: Audience = (job.audience ?? { type: "all" }) as Audience;

      if (!title || !body) {
        // popsuty job -> cancel, żeby nie mielić w kółko
        await service.from("push_jobs").update({ status: "cancelled" }).eq("id", job.id);
        results.push({ id: job.id, error: "Missing title/body -> cancelled" });
        continue;
      }

      // 1) tokeny wg audience
      const tokenList = await fetchTokens(service, audience);

      // 2) ZAPIS KAMPANII (zawsze, nawet jeśli tokenów=0)
      let campaignId: string | null = null;
      try {
        const { data: camp, error: campErr } = await service
          .from("push_campaigns")
          .insert({
            title,
            body,
            data: baseData,
            audience,
            tokens: tokenList.length,
            sent: 0,
          })
          .select("id")
          .single();

        if (campErr) throw campErr;
        campaignId = camp?.id ?? null;
      } catch (e) {
        // jeśli kampania nie może się zapisać, nie ubijamy wysyłki (ale logujemy błąd w odpowiedzi)
        campaignId = null;
        results.push({ id: job.id, warn: "Failed to insert push_campaigns", detail: String(e) });
      }

      if (tokenList.length === 0) {
        // Nie wywalaj 500 — tylko przesuń next_run/status i zaktualizuj kampanię sent=0
        const now = new Date();
        const patch: any = { last_run_at: now.toISOString() };

        if (!job.repeat_cron) {
          patch.status = "sent";
        } else {
          const interval = cronParser.parseExpression(job.repeat_cron, {
            currentDate: new Date(now.getTime() + 1000),
            tz: "Europe/Rome",
          });
          patch.next_run_at = interval.next().toDate().toISOString();
        }

        await service.from("push_jobs").update(patch).eq("id", job.id);

        if (campaignId) {
          await service.from("push_campaigns").update({ sent: 0 }).eq("id", campaignId);
        }

        results.push({
          id: job.id,
          campaign_id: campaignId,
          audience,
          tokens: 0,
          sent: 0,
          note: "No tokens for audience",
          status: patch.status ?? "scheduled",
          next_run_at: patch.next_run_at ?? null,
        });
        continue;
      }

      // 3) wysyłka do Expo w batchach po 100
      const batches = chunk(tokenList, 100);
      const expoResponses: any[] = [];
      let sent = 0;

      for (const batch of batches) {
        const messages = batch.map((to) => ({
          to,
          sound: "default",
          title,
          body,
          // KLUCZ: dokładamy campaign_id żeby app mogła logować open
          data: { ...baseData, campaign_id: campaignId },
        }));

        const r = await sendExpoBatch(messages);
        expoResponses.push(r);
        sent += batch.length;
      }

      // 4) update campaign.sent (bez deliveries; tylko sent i opens osobno)
      if (campaignId) {
        try {
          await service.from("push_campaigns").update({ sent }).eq("id", campaignId);
        } catch {
          // ignorujemy, żeby nie psuć wysyłki
        }
      }

      // 5) aktualizuj job (last_run_at, status/next_run_at)
      const now = new Date();
      const patch: any = { last_run_at: now.toISOString() };

      if (!job.repeat_cron) {
        patch.status = "sent";
      } else {
        const interval = cronParser.parseExpression(job.repeat_cron, {
          currentDate: new Date(now.getTime() + 1000),
          tz: "Europe/Rome",
        });
        patch.next_run_at = interval.next().toDate().toISOString();
      }

      const { error: upErr } = await service.from("push_jobs").update(patch).eq("id", job.id);
      if (upErr) throw upErr;

      results.push({
        id: job.id,
        campaign_id: campaignId,
        audience,
        tokens: tokenList.length,
        sent,
        status: patch.status ?? "scheduled",
        next_run_at: patch.next_run_at ?? null,
        expo: expoResponses,
      });
    }

    return json({ ok: true, ran: results.length, results });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});