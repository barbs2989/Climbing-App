import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit configuration.
// No per-IP limit: gps_submissions has no IP column and a client-supplied
// address can't be trusted anyway. Add it server-side if spam shows up.
const RATE_LIMITS = {
  per_email: { limit: 10, window_hours: 24 }, // 10 submissions per 24 hours per email
  per_route: { limit: 5, window_hours: 7 * 24 }, // 5 submissions per week per route
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, routeId } = await req.json();

    if (!email || !routeId) {
      return new Response(
        JSON.stringify({ error: "Missing email or routeId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const oneDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Check submissions per email (24 hours)
    const { count: emailCount } = await supabase
      .from("gps_submissions")
      .select("*", { count: "exact", head: true })
      .eq("climber_email", email)
      .gte("submitted_at", oneDay.toISOString());

    if (emailCount >= RATE_LIMITS.per_email.limit) {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: `Rate limit exceeded: ${emailCount}/${RATE_LIMITS.per_email.limit} submissions in 24 hours`,
          retryAfter: 86400,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "86400" } }
      );
    }

    // Check submissions per route (7 days)
    const { count: routeCount } = await supabase
      .from("gps_submissions")
      .select("*", { count: "exact", head: true })
      .eq("route_id", routeId)
      .gte("submitted_at", oneWeek.toISOString());

    if (routeCount >= RATE_LIMITS.per_route.limit) {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: `Rate limit exceeded: ${routeCount}/${RATE_LIMITS.per_route.limit} submissions for this route this week`,
          retryAfter: 604800,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "604800" } }
      );
    }

    // All checks passed
    return new Response(
      JSON.stringify({
        allowed: true,
        emailRemaining: RATE_LIMITS.per_email.limit - emailCount,
        routeRemaining: RATE_LIMITS.per_route.limit - routeCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
