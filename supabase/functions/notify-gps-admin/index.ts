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
    const { submissionId, routeName, qualityScore, climberName, climberEmail } = await req.json();

    if (!submissionId || !routeName || qualityScore === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // If auto-approved (score >= 90), notify admin that merge is ready
    if (qualityScore >= 90) {
      await supabase.from("gps_notifications").insert({
        submission_id: submissionId,
        type: "admin_auto_approved",
        recipient_email: "admin@climbmatch.app",
        route_name: routeName,
        quality_score: qualityScore,
        climber_name: climberName,
        climber_email: climberEmail,
        status: "action_needed",
        sent_at: new Date().toISOString(),
        action_url: `/admin/gps-submissions/${submissionId}`,
      });

      console.log(`[ADMIN EMAIL] Auto-approved track ready for merge: ${routeName} (score: ${qualityScore})`);
    }

    // If manual review needed (70-89), create admin task
    if (qualityScore >= 70 && qualityScore < 90) {
      await supabase.from("gps_notifications").insert({
        submission_id: submissionId,
        type: "admin_needs_review",
        recipient_email: "admin@climbmatch.app",
        route_name: routeName,
        quality_score: qualityScore,
        climber_name: climberName,
        climber_email: climberEmail,
        status: "pending_review",
        sent_at: new Date().toISOString(),
        action_url: `/admin/gps-submissions/${submissionId}`,
      });

      console.log(`[ADMIN EMAIL] Track needs review: ${routeName} (score: ${qualityScore})`);
    }

    // If rejected (< 70), notify climber to resubmit
    if (qualityScore < 70) {
      await supabase.from("gps_notifications").insert({
        submission_id: submissionId,
        type: "climber_needs_improvement",
        recipient_email: climberEmail,
        recipient_name: climberName,
        route_name: routeName,
        quality_score: qualityScore,
        status: "rejected",
        sent_at: new Date().toISOString(),
        feedback: "Quality score too low. Try adding more waypoints or re-recording the track.",
      });

      console.log(`[EMAIL] Track needs improvement: ${routeName} (score: ${qualityScore}) → ${climberEmail}`);
    }

    return new Response(
      JSON.stringify({ success: true, notificationType: qualityScore >= 90 ? "auto_approved" : qualityScore >= 70 ? "pending_review" : "needs_improvement" }),
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
