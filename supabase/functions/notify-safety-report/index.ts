// notify-safety-report — email ClimbMatch Safety the moment a content report is filed.
//
// WHY: App Review expects a developer to act on a report within 24 hours, and before this the only
// signal a report existed was a badge in the app that refreshed while the admin happened to have it
// open. One reviewer cannot meet a 24-hour target on a signal like that.
//
// WHO MAY CALL IT: the climber who FILED the report, and only about that report — the caller's JWT
// is resolved and must match `user_reports.reporter`. So nobody can make this function email the
// reviewer about somebody else's report, or replay old ones (it refuses anything older than 30
// minutes or no longer open), and each report alerts at most once (a per-report rate bucket).
//
// WHERE IT GOES: SAFETY_ALERT_EMAIL, falling back to the mailer's admin address. Nothing is sent
// until RESEND_API_KEY is set (the shared mailer logs and returns not_configured) — the app never
// claims an alert was sent, so an unconfigured mailer degrades to the in-app badge, not to a lie.
//
// Deploy:  npx supabase functions deploy notify-safety-report
// Secrets: RESEND_API_KEY, GPS_NOTIFY_FROM (a verified sender), SAFETY_ALERT_EMAIL
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
const URGENT = new Set(["A child may be at risk", "Threats or violence", "Someone is in danger"]);
const KIND: Record<string, string> = {
  message: "a direct message", crew_message: "a crew-chat message", group_post: "a group post",
  group_event: "a group event", comment: "a comment", trip_report: "a trip report", group: "a group",
  topo: "a topo", list: "a list", profile: "a profile",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const reportId = body && body.reportId;
    if (typeof reportId !== "string" || !UUID_RE.test(reportId)) return json({ error: "Missing or invalid reportId" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await supabase.auth.getUser(token);
    const caller = userData && userData.user && userData.user.id;
    if (!caller) return json({ error: "Sign in required" }, 401);

    if (!(await allow(supabase, [
      { bucket: "safety:alert:ip", key: clientIp(req), limit: 30, windowSec: HOUR },
      { bucket: "safety:alert:user", key: caller, limit: 30, windowSec: DAY },
    ]))) return json({ error: "Too many requests" }, 429);

    const { data: rep } = await supabase.from("user_reports")
      .select("id, reporter, reason, target_kind, snapshot, status, created_at")
      .eq("id", reportId).maybeSingle();
    if (!rep) return json({ error: "Report not found" }, 404);
    if (rep.reporter !== caller) return json({ error: "Not your report" }, 403);
    if (rep.status !== "open") return json({ sent: false, reason: "not_open" });
    if (Date.now() - new Date(rep.created_at).getTime() > FRESH_MIN * 60 * 1000) return json({ sent: false, reason: "stale" });
    // One alert per report, however often the client calls.
    if (!(await allow(supabase, [{ bucket: "safety:alert:report", key: rep.id, limit: 1, windowSec: 7 * DAY }]))) {
      return json({ sent: false, reason: "already_alerted" });
    }

    const { count: openCount } = await supabase.from("user_reports")
      .select("id", { count: "exact", head: true }).in("status", ["open", "reviewing"]);
    const to = Deno.env.get("SAFETY_ALERT_EMAIL") || adminAddress();
    if (!looksLikeEmail(to)) return json({ sent: false, reason: "no_recipient" });
    const urgent = URGENT.has(rep.reason);
    const what = KIND[rep.target_kind as string] || "a climber";
    const excerpt = (rep.snapshot || "").replace(/\s+/g, " ").slice(0, 400);
    const res = await sendEmail({
      to,
      subject: (urgent ? "URGENT — " : "") + "ClimbMatch Safety: " + what + " reported (" + rep.reason + ")",
      text:
        "A climber reported " + what + " for: " + rep.reason + ".\n\n" +
        (excerpt ? "What was reported:\n“" + excerpt + (rep.snapshot && rep.snapshot.length > 400 ? "…" : "") + "”\n\n" : "") +
        "Open reports right now: " + (openCount ?? "?") + ".\n" +
        "Review it in ClimbMatch: Menu → You → Safety reports. Target: acted on within 24 hours.\n" +
        (urgent ? "\nIf someone may be in immediate danger, consider contacting local law enforcement; for child exploitation, report to NCMEC (report.cybertip.org).\n" : ""),
    }, supabase);
    return json({ sent: res.sent, reason: res.sent ? undefined : res.reason });
  } catch (err) {
    console.error("notify-safety-report failed:", err && (err as Error).message);
    return json({ error: "internal" }, 500);
  }
});
