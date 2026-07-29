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
    const { submissionId, action, adminNotes } = await req.json();

    if (!submissionId || !["approve", "reject"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: need submissionId and action (approve|reject)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

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
          approved_by: "admin@climbmatch.app",
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
