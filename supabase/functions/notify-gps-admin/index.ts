// Records a gps_notifications row per submission and emails the relevant party IF
// a mail provider is configured (see _shared/mailer.ts — inert without
// RESEND_API_KEY, so this sends nothing until that secret is set). The row is
// written first and is the system of record either way; `email_sent` on it says
// whether mail actually went out.
//
// Routing by quality score: >=90 tells the admin a merge is ready, 70-89 asks for
// a review, <70 goes back to the climber with feedback.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, adminAddress } from "../_shared/mailer.ts";

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

    // Record the row, then try to send, then stamp the outcome onto it. A mail
    // failure must never lose the notification — the row is what the admin works
    // from when email is unconfigured or broken.
    const record = async (fields: Record<string, unknown>, mail: { to: string; subject: string; text: string } | null) => {
      const { data: row, error } = await supabase.from("gps_notifications")
        .insert({ ...fields, sent_at: new Date().toISOString() })
        .select("id").single();
      if (error) throw error;

      if (!mail || !mail.to) {
        // Nothing to send (e.g. the climber left the optional email blank).
        if (row && row.id) {
          await supabase.from("gps_notifications")
            .update({ email_sent: false, email_error: "no_recipient" })
            .eq("id", row.id);
        }
        return false;
      }

      const res = await sendEmail(mail);
      if (row && row.id) {
        const { error: stampErr } = await supabase.from("gps_notifications")
          .update({ email_sent: res.sent, email_error: res.sent ? null : (res.reason || "unknown") })
          .eq("id", row.id);
        if (stampErr) console.error("Could not stamp email outcome:", stampErr.message);
      }
      return res.sent;
    };

    const admin = adminAddress();
    const who = climberName || "an anonymous contributor";
    let emailed = false;

    if (qualityScore >= 90) {
      emailed = await record({
        submission_id: submissionId,
        type: "admin_auto_approved",
        recipient_email: admin,
        route_name: routeName,
        quality_score: qualityScore,
        climber_name: climberName,
        climber_email: climberEmail,
        status: "action_needed",
        action_url: `/admin/gps-submissions/${submissionId}`,
      }, {
        to: admin,
        subject: `GPS track auto-approved: ${routeName} (${qualityScore}/100)`,
        text: `A GPS track for ${routeName} scored ${qualityScore}/100 and was auto-approved.\n\nFrom: ${who}${climberEmail ? ` <${climberEmail}>` : ""}\nSubmission: ${submissionId}\nReview: /admin/gps-submissions/${submissionId}\n\nIt is ready to merge onto the route.`,
      });
    } else if (qualityScore >= 70) {
      emailed = await record({
        submission_id: submissionId,
        type: "admin_needs_review",
        recipient_email: admin,
        route_name: routeName,
        quality_score: qualityScore,
        climber_name: climberName,
        climber_email: climberEmail,
        status: "pending_review",
        action_url: `/admin/gps-submissions/${submissionId}`,
      }, {
        to: admin,
        subject: `GPS track needs review: ${routeName} (${qualityScore}/100)`,
        text: `A GPS track for ${routeName} scored ${qualityScore}/100 — below the auto-approve threshold, so it needs a look.\n\nFrom: ${who}${climberEmail ? ` <${climberEmail}>` : ""}\nSubmission: ${submissionId}\nReview: /admin/gps-submissions/${submissionId}`,
      });
    } else {
      const feedback = "Quality score too low. Try adding more waypoints or re-recording the track.";
      // Email is optional on the submission form — record the outcome either way,
      // but only send when there is somewhere to send it.
      emailed = await record({
        submission_id: submissionId,
        type: "climber_needs_improvement",
        recipient_email: climberEmail || null,
        recipient_name: climberName,
        route_name: routeName,
        quality_score: qualityScore,
        status: "rejected",
        feedback,
      }, climberEmail ? {
        to: climberEmail,
        subject: `GPS track needs another pass: ${routeName}`,
        text: `Thanks ${climberName || "for the submission"},\n\nYour GPS track for ${routeName} scored ${qualityScore}/100, which is below our review threshold.\n\n${feedback}\n\nRe-submitting is welcome any time.\n\n— ClimbMatch`,
      } : null);
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailed,
        notificationType: qualityScore >= 90 ? "auto_approved" : qualityScore >= 70 ? "pending_review" : "needs_improvement",
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
