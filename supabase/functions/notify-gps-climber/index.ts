// Records a row in gps_notifications, then emails the climber IF a mail provider
// is configured (see _shared/mailer.ts — inert without RESEND_API_KEY, so this
// sends nothing until that secret is set). The row is written first and is the
// system of record either way; `email_sent` on it says whether mail actually went
// out. The response reports `emailed` so the UI can tell the climber the truth
// rather than promising an email that may never arrive.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/mailer.ts";

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

    // Record first — this row is the system of record even if mail never sends.
    const { data: row, error } = await supabase.from("gps_notifications").insert({
      submission_id: submissionId,
      type: "climber_thank_you",
      recipient_email: climberEmail,
      recipient_name: climberName,
      route_name: routeName,
      quality_score: qualityScore,
      status: qualityScore >= 90 ? "auto_approved" : qualityScore >= 70 ? "pending_review" : "needs_improvement",
      sent_at: new Date().toISOString(),
    }).select("id").single();

    if (error) throw error;

    const outcome = qualityScore >= 90
      ? "It scored high enough to be approved automatically — it should appear on the route shortly."
      : qualityScore >= 70
        ? "It's queued for a human review, usually within 24-48 hours."
        : "It scored below our review threshold. Adding more waypoints or re-recording the track usually fixes this.";

    const mail = await sendEmail({
      to: climberEmail,
      subject: `GPS track received: ${routeName}`,
      text: `Thanks ${climberName},\n\nWe've got your GPS track for ${routeName}.\n\nQuality score: ${qualityScore}/100. ${outcome}\n\nYou don't need to do anything else — this note is just a receipt.\n\n— ClimbMatch`,
    });

    // Best-effort: the notification row already exists, so a failed stamp is a
    // reporting gap, not a lost submission.
    if (row && row.id) {
      const { error: stampErr } = await supabase.from("gps_notifications")
        .update({ email_sent: mail.sent, email_error: mail.sent ? null : (mail.reason || "unknown") })
        .eq("id", row.id);
      if (stampErr) console.error("Could not stamp email outcome:", stampErr.message);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notification recorded", emailed: mail.sent, qualityScore }),
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
