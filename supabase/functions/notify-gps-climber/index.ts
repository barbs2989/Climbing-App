// Sends the climber a receipt for a GPS submission they just made.
//
// TAKES ONLY A submissionId. It used to take the recipient address, the name and
// the route name from the request body and email them verbatim -- and the gateway
// accepts the PUBLIC publishable key, so once RESEND_API_KEY was set anyone could
// have sent mail from our domain to any address with text of their choosing. Now
// every field comes from the gps_submissions row validate-gps wrote:
//   - the row must exist and be fresh (FRESH_MIN), so old ids cannot be replayed;
//   - at most ONE receipt per submission (unique index, migration 0183);
//   - the caller's IP is rate limited, and the mailer caps every recipient and the
//     whole project (see _shared/mailer.ts).
// The row is written first and is the system of record; `email_sent` records
// whether mail actually went out, and the response reports it so the UI tells the
// climber the truth.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, looksLikeEmail } from "../_shared/mailer.ts";
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

// A name is caller-supplied at submission time, so it goes into the email only as
// plain letters, capped. No links, no markup, no line breaks.
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

    if (!(await allow(supabase, [{ bucket: "notify:climber:ip", key: clientIp(req), limit: 10, windowSec: HOUR }]))) {
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
    if (!looksLikeEmail(sub.climber_email)) {
      return json({ success: true, emailed: false, reason: "no_recipient" });
    }

    const { data: route } = await supabase.from("routes").select("name").eq("id", sub.route_id).maybeSingle();
    const routeName = (route && route.name) || "your route";
    const name = cleanName(sub.climber_name) || "there";
    const score = Number(sub.quality_score) || 0;
    const status = score >= 90 ? "auto_approved" : score >= 70 ? "pending_review" : "needs_improvement";

    // Record first. The unique (submission_id, type) index makes a replay fail here,
    // before anything is sent.
    const { data: row, error } = await supabase.from("gps_notifications").insert({
      submission_id: sub.id,
      type: "climber_thank_you",
      recipient_email: sub.climber_email,
      recipient_name: name,
      route_name: routeName,
      quality_score: score,
      status,
      sent_at: new Date().toISOString(),
    }).select("id").single();
    if (error) {
      if (error.code === "23505") return json({ success: true, emailed: false, reason: "already_notified" });
      throw error;
    }

    const outcome = score >= 90
      ? "It scored high enough to go to the front of the review queue — it should appear on the route shortly."
      : score >= 70
        ? "It's queued for a human review, usually within 24-48 hours."
        : "It scored below our review threshold. Adding more waypoints or re-recording the track usually fixes this.";

    const mail = await sendEmail({
      to: sub.climber_email,
      subject: `GPS track received: ${routeName}`,
      text: `Hi ${name},\n\nWe've got your GPS track for ${routeName}.\n\nQuality score: ${score}/100. ${outcome}\n\nYou don't need to do anything else — this note is just a receipt. If you didn't submit this, you can ignore it.\n\n— ClimbMatch`,
    }, supabase);

    if (row && row.id) {
      const { error: stampErr } = await supabase.from("gps_notifications")
        .update({ email_sent: mail.sent, email_error: mail.sent ? null : (mail.reason || "unknown") })
        .eq("id", row.id);
      if (stampErr) console.error("Could not stamp email outcome:", stampErr.message);
    }

    return json({ success: true, emailed: mail.sent, qualityScore: score });
  } catch (error) {
    console.error("notify-gps-climber:", error && (error as Error).message);
    return json({ error: "Internal error" }, 500);
  }
});
