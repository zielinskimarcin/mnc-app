import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing SUPABASE_URL or SERVICE_ROLE_KEY env" }), { status: 500, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const payload = await req.json().catch(() => ({}));
    const title = String(payload?.title ?? "").trim();
    const body = String(payload?.body ?? "").trim();
    const data = payload?.data ?? {};
    const audience = payload?.audience ?? { type: "all" };

    if (!title || !body) {
      return new Response(JSON.stringify({ error: "Missing title/body" }), { status: 400, headers: corsHeaders });
    }

    // -------------- DIAGNOSTYKA: czy tabele istnieją? ----------------
    try {
      const { data: checkCamp } = await supabase.rpc('pg_stat_statements' as any).catch(() => ({ data: null }));
      // ignore – this rpc try is just to ensure client works; we won't rely on it
    } catch (err) {
      // ignore
    }

    // Explicitly check push_campaigns and push_opens existence by attempting a harmless select
    const { error: checkCampErr } = await supabase.from('push_campaigns').select('id').limit(1);
    if (checkCampErr && checkCampErr.code === '42703' || checkCampErr && checkCampErr.code === '42P01') {
      return new Response(JSON.stringify({ error: "Table push_campaigns missing or permission denied", detail: String(checkCampErr) }), { status: 500, headers: corsHeaders });
    }
    if (checkCampErr) {
      // other error
      return new Response(JSON.stringify({ error: "Error selecting from push_campaigns", detail: String(checkCampErr) }), { status: 500, headers: corsHeaders });
    }

    // Create campaign (wrapped)
    let campaignId: string | null = null;
    try {
      const { data: campaignData, error: insertErr } = await supabase
        .from('push_campaigns')
        .insert({ title, body, audience })
        .select('id')
        .single();

      if (insertErr) {
        return new Response(JSON.stringify({ error: "Failed inserting campaign", detail: insertErr }), { status: 500, headers: corsHeaders });
      }
      campaignId = campaignData?.id ?? null;
    } catch (e) {
      return new Response(JSON.stringify({ error: "Exception inserting campaign", detail: String(e) }), { status: 500, headers: corsHeaders });
    }

    // --- original audience->token logic (unchanged)
    let tokenRows: { expo_push_token: string }[] = [];

    if (audience.type === "all") {
      const { data, error } = await supabase.from("push_tokens").select("expo_push_token").not("expo_push_token", "is", null);
      if (error) throw error;
      tokenRows = data ?? [];
    }

    if (audience.type === "has_account") {
      const { data, error } = await supabase.from("push_tokens").select("expo_push_token").not("expo_push_token", "is", null).not("user_id", "is", null);
      if (error) throw error;
      tokenRows = data ?? [];
    }

    if (audience.type === "no_account") {
      const { data, error } = await supabase.from("push_tokens").select("expo_push_token").not("expo_push_token", "is", null).is("user_id", null);
      if (error) throw error;
      tokenRows = data ?? [];
    }

    if (audience.type === "points_eq" || audience.type === "points_gte" || audience.type === "points_lt") {
      const value = Number(audience.value ?? 0);
      // fetch profiles
      const { data: profiles, error: pErr } = await supabase.from("profiles").select("id, points");
      if (pErr) {
        return new Response(JSON.stringify({ error: "Failed selecting profiles", detail: String(pErr) }), { status: 500, headers: corsHeaders });
      }
      const filtered = (profiles ?? []).filter((p: any) => {
        const pts = Number(p.points ?? 0);
        if (audience.type === "points_eq") return pts === value;
        if (audience.type === "points_gte") return pts >= value;
        return pts < value;
      });
      const ids = filtered.map((p:any) => p.id);
      if (ids.length === 0) {
        return new Response(JSON.stringify({ error: "No profiles matching points" }), { status: 400, headers: corsHeaders });
      }
      const { data: tokens, error: tErr } = await supabase.from("push_tokens").select("expo_push_token").in("user_id", ids).not("expo_push_token", "is", null);
      if (tErr) throw tErr;
      tokenRows = tokens ?? [];
    }

    const tokenList = Array.from(new Set(tokenRows.map((t) => String(t.expo_push_token ?? "").trim()).filter(Boolean)));
    if (tokenList.length === 0) {
      return new Response(JSON.stringify({ error: "No tokens for audience" }), { status: 400, headers: corsHeaders });
    }

    // send to expo
    const batches = chunk(tokenList, 100);
    let sent = 0;
    const expoResults: any[] = [];

    for (const batch of batches) {
      const messages = batch.map((to) => ({
        to,
        sound: "default",
        title,
        body,
        data: { ...data, campaign_id: campaignId },
      }));

      try {
        const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messages),
        });
        const expoJson = await expoRes.json().catch(() => null);
        expoResults.push(expoJson);
      } catch (e) {
        expoResults.push({ error: String(e) });
      }

      sent += batch.length;
    }

    // update campaign.sent safely
    try {
      await supabase.from('push_campaigns').update({ sent }).eq('id', campaignId);
    } catch (e) {
      // non-fatal
      console.log("Failed updating campaign.sent:", e);
    }

    return new Response(JSON.stringify({ ok: true, audience, tokens: tokenList.length, sent, expoResults }), { status: 200, headers: corsHeaders });
  } catch (e) {
    console.log("Unhandled error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});