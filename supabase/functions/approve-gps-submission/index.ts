import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Admin guard. The gateway's JWT check passes for the public anon key,
    // so this endpoint additionally requires a logged-in user whose email is
    // on the admin list (ADMIN_EMAILS secret, comma-separated; unset = nobody here,
    // and review_gps_submission() checks is_admin() again as the caller).
    const adminEmails = (Deno.env.get("ADMIN_EMAILS") ?? "")
      .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const callerEmail = userData?.user?.email?.toLowerCase();
    if (userError || !callerEmail) {
      return new Response(
        JSON.stringify({ error: "Sign in required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!adminEmails.includes(callerEmail)) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { submissionId, action, adminNotes, toArea } = await req.json();

    if (!submissionId || !["approve", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: need submissionId and action (approve|reject)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ONE implementation of approval (0397): review_gps_submission(). This function used to APPEND an
    // approved line to the route's existing one (`[...existing, ...new]`), so the map drew two walks
    // joined by a straight jump, and it could only write to the one route, never to the crag. It now
    // calls the database function AS THE CALLER, whose own is_admin() check decides, and which
    // replaces the line (keeping the old one in replaced_gpx) and can save a crag's walk in.
    const asCaller = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: "Bearer " + token } },
    });
    const { data: result, error: rpcError } = await asCaller.rpc("review_gps_submission", {
      p_id: submissionId, p_action: action, p_to_area: !!toArea, p_notes: adminNotes ?? null,
    });
    if (rpcError) {
      console.error("review_gps_submission failed:", rpcError.code, rpcError.message);
      return new Response(
        JSON.stringify({ error: rpcError.code === "42501" ? "Admin access required" : "Could not review this submission" }),
        { status: rpcError.code === "42501" ? 403 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log(`[REVIEW] GPS submission ${submissionId}: ${result}`);
    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("approve-gps-submission:", error && (error as Error).message);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
