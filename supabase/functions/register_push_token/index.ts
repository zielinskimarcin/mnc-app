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
  if (typeof value !== "string") return null;

  const token = value.trim();
  if (token.length > 200) return null;

  return /^(ExpoPushToken|ExponentPushToken)\[[A-Za-z0-9_-]+\]$/.test(token)
    ? token
    : null;
}

function optionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;

  const text = value.trim();
  if (!text) return null;

  return text.slice(0, maxLength);
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
    const expoPushToken = normalizePushToken(
      payload?.expo_push_token ?? payload?.expoPushToken ?? payload?.token
    );

    if (!expoPushToken) {
      return json({ error: "Invalid Expo push token" }, 400);
    }

    const resolved = await resolveUserId(req, SUPABASE_URL, ANON_KEY);
    if (resolved.error) return resolved.error;

    const platform = optionalText(payload?.platform, 32);
    const deviceId = optionalText(payload?.device_id ?? payload?.deviceId, 160);
    const device = optionalText(payload?.device, 160);
    const now = new Date().toISOString();

    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { error } = await service.from("push_tokens").upsert(
      {
        expo_push_token: expoPushToken,
        user_id: resolved.userId,
        platform,
        device_id: deviceId,
        device,
        last_seen_at: now,
        updated_at: now,
      },
      { onConflict: "expo_push_token" }
    );

    if (error) {
      console.log("register_push_token upsert error:", error);
      return json({ error: "Could not register push token" }, 500);
    }

    return json({ ok: true });
  } catch (error) {
    console.log("register_push_token unhandled error:", error);
    return json({ error: "Internal error" }, 500);
  }
});
