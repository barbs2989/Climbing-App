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
    // on the admin list (ADMIN_EMAILS secret, comma-separated).
    const adminEmails = (Deno.env.get("ADMIN_EMAILS") ?? "barbs2989@gmail.com")
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

    const { submissionId, action, adminNotes } = await req.json();

    if (!submissionId || !["approve", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: need submissionId and action (approve|reject)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the submission
    const { data: submission, error: fetchError } = await supabase
      .from("gps_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (fetchError || !submission) {
      return new Response(
        JSON.stringify({ error: "Submission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "approve") {
      // Update submission status
      await supabase
        .from("gps_submissions")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: callerEmail,
          admin_notes: adminNotes,
        })
        .eq("id", submissionId);

      // Merge GPS data into route
      const { data: route } = await supabase
        .from("routes")
        .select("gpx")
        .eq("id", submission.route_id)
        .single();

      if (route) {
        // Combine existing GPX with new submission
        const existingGpx = route.gpx || [];
        const mergedGpx = [...existingGpx, ...submission.gpx_data];

        // routes has no gps_contributor_email or updated_at column — writing
        // unknown columns makes PostgREST reject the whole PATCH (42703), so
        // the merge would silently never happen. Verified against live schema.
        await supabase
          .from("routes")
          .update({
            gpx: mergedGpx,
            gps_contributor_name: submission.climber_name,
          })
          .eq("id", submission.route_id);

        console.log(`[APPROVE] GPS merged for route ${submission.route_id} by ${submission.climber_name}`);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Submission approved and merged", routeId: submission.route_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reject") {
      // Update submission status
      await supabase
        .from("gps_submissions")
        .update({
          status: "rejected",
          admin_notes: adminNotes || "Rejected by admin",
        })
        .eq("id", submissionId);

      console.log(`[REJECT] GPS submission rejected: ${submissionId}`);

      return new Response(
        JSON.stringify({ success: true, message: "Submission rejected", submissionId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
