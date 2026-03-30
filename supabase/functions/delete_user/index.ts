import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader) return new Response("Missing Authorization header", { status: 401 });

    // Wyciągnij czysty JWT
    const jwt = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : authHeader.trim();

    if (!jwt || jwt.split(".").length !== 3) {
      return new Response("Invalid JWT format", { status: 401 });
    }

    // 1) Weryfikacja usera przez ANON_KEY + jawny jwt
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(jwt);

    if (userError || !user) {
      return new Response("Invalid JWT", { status: 401 });
    }

    // 2) Admin operacje przez SERVICE_ROLE
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Najpierw dane
    const { error: pErr } = await admin.from("profiles").delete().eq("id", user.id);
    if (pErr) return new Response(`profiles delete error: ${pErr.message}`, { status: 500 });

    const { error: tErr } = await admin.from("push_tokens").delete().eq("user_id", user.id);
    if (tErr) return new Response(`push_tokens delete error: ${tErr.message}`, { status: 500 });

    // Potem auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
    if (delErr) return new Response(`deleteUser error: ${delErr.message}`, { status: 500 });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});