import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ProfileRow = {
  role: string | null;
  points: number | null;
  created_at: string | null;
};

type CampaignRow = {
  sent: number | null;
  tokens: number | null;
  created_at: string | null;
};

type LoyaltyEventRow = {
  delta: number | null;
  reason: string | null;
  created_at: string | null;
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getJwt(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const jwt = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : authHeader.trim();

  return jwt && jwt.split(".").length === 3 ? jwt : null;
}

function isWithinDays(value: string | null, days: number) {
  if (!value) return false;
  return new Date(value).getTime() >= Date.now() - days * 24 * 60 * 60 * 1000;
}

async function getExactCount(service: any, table: string) {
  const { count, error } = await service
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
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

    const jwt = getJwt(req);
    if (!jwt) return json({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(jwt);

    if (userError || !user) {
      return json({ error: "Invalid session" }, 401);
    }

    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: requester, error: roleError } = await service
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (roleError || !["admin", "staff"].includes(String(requester?.role ?? ""))) {
      return json({ error: "Forbidden" }, 403);
    }

    const [
      profilesResult,
      campaignsResult,
      eventsResult,
      pushTokens,
      pushOpens,
      pushJobs,
      menuItems,
    ] = await Promise.all([
      service
        .from("profiles")
        .select("role, points, created_at")
        .order("created_at", { ascending: false })
        .range(0, 99999),
      service
        .from("push_campaigns")
        .select("sent, tokens, created_at")
        .order("created_at", { ascending: false })
        .range(0, 99999),
      service
        .from("loyalty_events")
        .select("delta, reason, created_at")
        .order("created_at", { ascending: false })
        .range(0, 99999),
      getExactCount(service, "push_tokens"),
      getExactCount(service, "push_opens"),
      getExactCount(service, "push_jobs"),
      getExactCount(service, "menu_items"),
    ]);

    if (profilesResult.error) throw profilesResult.error;
    if (campaignsResult.error) throw campaignsResult.error;
    if (eventsResult.error) throw eventsResult.error;

    const profiles = (profilesResult.data ?? []) as ProfileRow[];
    const campaigns = (campaignsResult.data ?? []) as CampaignRow[];
    const events = (eventsResult.data ?? []) as LoyaltyEventRow[];

    const totalUsers = profiles.length;
    const totalPoints = profiles.reduce((sum, row) => sum + Number(row.points ?? 0), 0);
    const campaignsSent = campaigns.reduce((sum, row) => sum + Number(row.sent ?? 0), 0);
    const campaignTargets = campaigns.reduce((sum, row) => sum + Number(row.tokens ?? 0), 0);
    const rewardsRedeemed = events.filter((event) => event.reason === "reward_redemption").length;
    const events30d = events.filter((event) => isWithinDays(event.created_at, 30));

    return json({
      users: {
        total: totalUsers,
        admins: profiles.filter((row) => row.role === "admin").length,
        staff: profiles.filter((row) => row.role === "staff").length,
        regular: profiles.filter((row) => row.role === "user").length,
        new30d: profiles.filter((row) => isWithinDays(row.created_at, 30)).length,
        rewardReady: profiles.filter((row) => Number(row.points ?? 0) >= 10).length,
        averagePoints: totalUsers > 0 ? Math.round((totalPoints / totalUsers) * 10) / 10 : 0,
      },
      loyalty: {
        events: events.length,
        events30d: events30d.length,
        rewardsRedeemed,
        rewardsRedeemed30d: events30d.filter((event) => event.reason === "reward_redemption").length,
        pointsAdded30d: events30d
          .filter((event) => Number(event.delta ?? 0) > 0)
          .reduce((sum, event) => sum + Number(event.delta ?? 0), 0),
      },
      push: {
        tokens: pushTokens,
        campaigns: campaigns.length,
        campaignTargets,
        sent: campaignsSent,
        opens: pushOpens,
        openRate: campaignsSent > 0 ? Math.round((pushOpens / campaignsSent) * 1000) / 10 : 0,
        jobs: pushJobs,
      },
      menu: {
        items: menuItems,
      },
    });
  } catch (error) {
    console.log("dashboard_stats error:", error);
    return json({ error: "Internal error" }, 500);
  }
});
