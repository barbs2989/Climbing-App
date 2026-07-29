// NOTE: this does NOT send email. It records a row in gps_notifications and logs
// the intended message; wiring an actual provider (Resend/SendGrid) is still to do
// — see the marker further down. Do not add UI copy promising the climber an email
// until that exists.
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
    const { submissionId, climberEmail, climberName, routeName, qualityScore } = await req.json();

    if (!submissionId || !climberEmail || !climberName || !routeName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Store notification record in Supabase
    const { error } = await supabase.from("gps_notifications").insert({
      submission_id: submissionId,
      type: "climber_thank_you",
      recipient_email: climberEmail,
      recipient_name: climberName,
      route_name: routeName,
      quality_score: qualityScore,
      status: qualityScore >= 90 ? "auto_approved" : qualityScore >= 70 ? "pending_review" : "needs_improvement",
      sent_at: new Date().toISOString(),
    });

    if (error) throw error;

    // In production, integrate with Resend or SendGrid here
    // For now, log the intended email
    console.log(`[EMAIL] To: ${climberEmail}`, {
      subject: `GPS Track Received: ${routeName}`,
      body: `Thanks for the submission! Quality score: ${qualityScore}/100.`,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Notification queued", qualityScore }),
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
