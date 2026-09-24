// Tells the admin about a GPS submission, and -- for a low score -- tells the
// climber what to fix. Records a gps_notifications row per notification; emails
// only if a mail provider is configured (see _shared/mailer.ts).
//
// TAKES ONLY A submissionId. Route name, score and the climber's details used to be
// read from the request body, which anyone holding the public key could fill in:
// unlimited rows in gps_notifications and, once mail was configured, arbitrary text
// in the admin's inbox and mail to any address. Every field now comes from the
// gps_submissions row, the row must be fresh, and there is at most ONE notification
// of each type per submission (unique index, migration 0183). The admin address is
// server-side configuration, never a request field.
//
// Routing by quality score: >=90 tells the admin it is ready to merge, 70-89 asks
// for a review, <70 goes back to the climber with feedback.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, adminAddress, looksLikeEmail } from "../_shared/mailer.ts";
import { allow, clientIp, HOUR } from "../_shared/ratelimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const FRESH_MIN = 30;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cleanName = (v: unknown) =>
  (typeof v === "string" ? v : "").replace(/[^\p{L}\p{M} .'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const submissionId = body && body.submissionId;
    if (typeof submissionId !== "string" || !UUID_RE.test(submissionId)) {
      return json({ error: "Missing or invalid submissionId" }, 400);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (!(await allow(supabase, [{ bucket: "notify:admin:ip", key: clientIp(req), limit: 10, windowSec: HOUR }]))) {
      return json({ error: "Too many requests" }, 429);
    }

    const { data: sub } = await supabase
      .from("gps_submissions")
      .select("id, route_id, climber_email, climber_name, quality_score, submitted_at")
      .eq("id", submissionId)
      .maybeSingle();
    if (!sub) return json({ error: "Submission not found" }, 404);
    if (Date.now() - new Date(sub.submitted_at).getTime() > FRESH_MIN * 60 * 1000) {
      return json({ error: "Submission is too old to notify about" }, 409);
    }

    const { data: route } = await supabase.from("routes").select("name").eq("id", sub.route_id).maybeSingle();
    const routeName = (route && route.name) || sub.route_id;
    const score = Number(sub.quality_score) || 0;
    const climberName = cleanName(sub.climber_name);
    const climberEmail = looksLikeEmail(sub.climber_email) ? sub.climber_email : null;
    const who = climberName || "an anonymous contributor";

    // Insert the row, then send, then stamp the outcome. The unique index turns a
    // replay into a 23505 here, before anything is sent.
    const record = async (fields: Record<string, unknown>, mail: { to: string; subject: string; text: string } | null) => {
      const { data: row, error } = await supabase.from("gps_notifications")
        .insert({ ...fields, submission_id: sub.id, sent_at: new Date().toISOString() })
        .select("id").single();
      if (error) {
        if (error.code === "23505") return { sent: false, duplicate: true };
        throw error;
      }
      const res = mail && mail.to ? await sendEmail(mail, supabase) : { sent: false, reason: "no_recipient" };
      if (row && row.id) {
        const { error: stampErr } = await supabase.from("gps_notifications")
          .update({ email_sent: res.sent, email_error: res.sent ? null : (res.reason || "unknown") })
          .eq("id", row.id);
        if (stampErr) console.error("Could not stamp email outcome:", stampErr.message);
      }
      return { sent: res.sent, duplicate: false };
    };

    const admin = adminAddress();
    const review = `/admin/gps-submissions/${sub.id}`;
    let out;
    if (score >= 70) {
      const ready = score >= 90;
      out = await record({
        type: ready ? "admin_auto_approved" : "admin_needs_review",
        recipient_email: admin,
        route_name: routeName,
        quality_score: score,
        climber_name: climberName || null,
        climber_email: climberEmail,
        status: ready ? "action_needed" : "pending_review",
        action_url: review,
      }, {
        to: admin,
        subject: ready ? `GPS track ready to merge: ${routeName} (${score}/100)` : `GPS track needs review: ${routeName} (${score}/100)`,
        text: `A GPS track for ${routeName} scored ${score}/100${ready ? " and is ready to merge" : " — below the ready-to-merge threshold, so it needs a look"}.\n\nFrom: ${who}${climberEmail ? ` <${climberEmail}>` : ""}\nSubmission: ${sub.id}\nReview: ${review}`,
      });
    } else {
      const feedback = "Quality score too low. Try adding more waypoints or re-recording the track.";
      out = await record({
        type: "climber_needs_improvement",
        recipient_email: climberEmail,
        recipient_name: climberName || null,
        route_name: routeName,
        quality_score: score,
        status: "rejected",
        feedback,
      }, climberEmail ? {
        to: climberEmail,
        subject: `GPS track needs another pass: ${routeName}`,
        text: `Hi ${climberName || "there"},\n\nYour GPS track for ${routeName} scored ${score}/100, which is below our review threshold.\n\n${feedback}\n\nRe-submitting is welcome any time. If you didn't submit this, you can ignore it.\n\n— ClimbMatch`,
      } : null);
    }

    return json({
      success: true,
      emailed: out.sent,
      duplicate: out.duplicate,
      notificationType: score >= 90 ? "auto_approved" : score >= 70 ? "pending_review" : "needs_improvement",
    });
  } catch (error) {
    console.error("notify-gps-admin:", error && (error as Error).message);
    return json({ error: "Internal error" }, 500);
  }
});
