import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePushToken(value: unknown) {
  if (value == null) return null;
  if (typeof value !== "string") return null;

  const token = value.trim();
  if (!token || token.length > 200) return null;

  return /^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]+\]$/.test(token)
    ? token
    : null;
}

function normalizeUuid(value: unknown) {
  if (typeof value !== "string") return null;

  const uuid = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
    ? uuid
    : null;
}

async function resolveUserId(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : authHeader.trim();

  if (!jwt || jwt === anonKey || jwt.startsWith("sb_publishable_") || jwt.split(".").length !== 3) {
    return { userId: null };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser(jwt);

  if (error || !user) {
    return { userId: null, error: json({ error: "Invalid session" }, 401) };
  }

  return { userId: user.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
      return json({ error: "Missing Supabase env" }, 500);
    }

    const payload = await req.json().catch(() => ({}));
    const campaignId = normalizeUuid(payload?.campaign_id ?? payload?.campaignId);

    if (!campaignId) {
      return json({ error: "Invalid campaign id" }, 400);
    }

    const expoPushToken = normalizePushToken(
      payload?.expo_push_token ?? payload?.expoPushToken ?? payload?.token
    );

    if (!expoPushToken) {
      return json({ ok: true, skipped: true, reason: "missing_or_invalid_push_token" });
    }

    const resolved = await resolveUserId(req, SUPABASE_URL, ANON_KEY);
    if (resolved.error) return resolved.error;

    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: tokenRow, error: tokenError } = await service
      .from("push_tokens")
      .select("user_id")
      .eq("expo_push_token", expoPushToken)
      .maybeSingle();

    if (tokenError) {
      console.log("track_push_open token lookup error:", tokenError);
      return json({ error: "Could not verify push token" }, 500);
    }

    if (!tokenRow) {
      return json({ ok: true, skipped: true, reason: "unknown_push_token" });
    }

    const { error } = await service.from("push_opens").upsert({
      campaign_id: campaignId,
      expo_push_token: expoPushToken,
      user_id: resolved.userId ?? tokenRow.user_id ?? null,
      opened_at: new Date().toISOString(),
    }, {
      onConflict: "campaign_id,expo_push_token",
    });

    if (error) {
      console.log("track_push_open upsert error:", error);
      return json({ error: "Could not track push open" }, 500);
    }

    return json({ ok: true });
  } catch (error) {
    console.log("track_push_open unhandled error:", error);
    return json({ error: "Internal error" }, 500);
  }
});
