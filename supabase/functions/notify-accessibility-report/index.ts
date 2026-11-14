// notify-accessibility-report — email the owner the moment an accessibility report is filed (0354).
//
// WHY: the Accessibility statement promises a reply within 5 business days. Before this, a report
// reached a table and a badge in the admin's Review tab, which only helps while the admin has the app
// open. Same shape as notify-safety-report, and the same mailer.
//
// WHO MAY CALL IT: whoever just filed the report. A signed-in caller's JWT must match the report's
// user_id. A GUEST report (user_id null) has no JWT to match, so it is guarded instead by freshness
// (filed in the last 30 minutes and still open), a per-IP limit, and one alert per report ever -- the
// worst a stranger holding a guest report's id can do is send the one alert it would have sent anyway.
//
// WHERE IT GOES: ACCESSIBILITY_ALERT_EMAIL, else SAFETY_ALERT_EMAIL, else the mailer's admin address.
// Nothing is sent until RESEND_API_KEY is set (the shared mailer returns not_configured); the form
// never claims an email went out, so an unconfigured mailer degrades to the Review badge.
//
// Deploy:  npx supabase functions deploy notify-accessibility-report --no-verify-jwt
//          (a guest has no session JWT for the gateway to verify; the checks above are the gate)
// Secrets: RESEND_API_KEY, GPS_NOTIFY_FROM (a verified sender), ACCESSIBILITY_ALERT_EMAIL (optional)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail, adminAddress, looksLikeEmail } from "../_shared/mailer.ts";
import { allow, clientIp, DAY, HOUR } from "../_shared/ratelimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const FRESH_MIN = 30;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const reportId = body && body.reportId;
    if (typeof reportId !== "string" || !UUID_RE.test(reportId)) return json({ error: "Missing or invalid reportId" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData } = token ? await supabase.auth.getUser(token) : { data: null };
    const caller = (userData && userData.user && userData.user.id) || null;

    if (!(await allow(supabase, [{ bucket: "a11y:alert:ip", key: clientIp(req), limit: 20, windowSec: HOUR }]))) {
      return json({ error: "Too many requests" }, 429);
    }

    const { data: rep } = await supabase.from("accessibility_reports")
      .select("id, user_id, contact_email, screen, problem, assistive, status, created_at")
      .eq("id", reportId).maybeSingle();
    if (!rep) return json({ error: "Report not found" }, 404);
    if (rep.user_id && rep.user_id !== caller) return json({ error: "Not your report" }, 403);
    if (rep.status !== "open") return json({ sent: false, reason: "not_open" });
    if (Date.now() - new Date(rep.created_at).getTime() > FRESH_MIN * 60 * 1000) return json({ sent: false, reason: "stale" });
    if (!(await allow(supabase, [{ bucket: "a11y:alert:report", key: rep.id, limit: 1, windowSec: 7 * DAY }]))) {
      return json({ sent: false, reason: "already_alerted" });
    }

    const { count: openCount } = await supabase.from("accessibility_reports")
      .select("id", { count: "exact", head: true }).eq("status", "open");
    const to = Deno.env.get("ACCESSIBILITY_ALERT_EMAIL") || Deno.env.get("SAFETY_ALERT_EMAIL") || adminAddress();
    if (!looksLikeEmail(to)) return json({ sent: false, reason: "no_recipient" });
    const problem = String(rep.problem || "").replace(/\s+/g, " ").slice(0, 1200);
    const res = await sendEmail({
      to,
      subject: "ClimbMatch accessibility report" + (rep.screen ? " — " + String(rep.screen).slice(0, 80) : ""),
      text:
        (rep.user_id ? "A signed-in climber" : "A visitor who is not signed in") + " reported an accessibility problem.\n\n" +
        "What went wrong:\n“" + problem + "”\n\n" +
        (rep.screen ? "Screen: " + rep.screen + "\n" : "") +
        (rep.assistive ? "Assistive technology: " + rep.assistive + "\n" : "") +
        (rep.contact_email ? "Reply to: " + rep.contact_email + "\n" : "Reply to: the email on their account (shown in the app's queue)\n") +
        "\nOpen accessibility reports right now: " + (openCount ?? "?") + ".\n" +
        "Review it in ClimbMatch: Menu → You → Review → Accessibility reports. The statement promises a reply within 5 business days.\n",
    }, supabase);
    return json({ sent: res.sent, reason: res.sent ? undefined : res.reason });
  } catch (err) {
    console.error("notify-accessibility-report failed:", err && (err as Error).message);
    return json({ error: "internal" }, 500);
  }
});
