// Shared outbound mail for the GPS notification functions.
//
// Deliberately inert until configured: with no RESEND_API_KEY set, every call
// logs the intended message and reports { sent: false, reason: "not_configured" }
// — exactly the behaviour these functions had before a provider was wired, so
// deploying this cannot start emailing anyone by accident. Set the secret to turn
// it on:
//
//   supabase secrets set RESEND_API_KEY=re_...          # enables sending
//   supabase secrets set GPS_NOTIFY_FROM="ClimbMatch <notifications@yourdomain>"
//   supabase secrets set GPS_ADMIN_EMAIL=you@yourdomain # where admin alerts go
//
// GPS_NOTIFY_FROM must be a domain you have verified with Resend; unverified
// senders are rejected at the API and surface here as { sent: false }.
//
// RATE LIMITED, AND IT CANNOT BE CALLED WITHOUT THE LIMITER. sendEmail takes the
// service-role client as a required argument and, before any request reaches
// Resend, charges three limits in public.edge_rate_events (migration 0183):
//   - per recipient:  MAIL_PER_RECIPIENT_DAILY (default 3) per 24h
//   - whole project:  MAIL_HOURLY_CAP (default 20) per hour
//   - whole project:  MAIL_DAILY_CAP  (default 50) per 24h
// Safety alerts (sendEmail(..., { pool: "safety" })) are charged to separate
// buckets instead (SAFETY_MAIL_HOURLY_CAP 20, SAFETY_MAIL_DAILY_CAP 50), so the
// shared pool running out can never silence a report alert.
// So even a caller who gets past every other check can neither flood one inbox nor
// run up the Resend bill. Over a limit the call reports { sent: false,
// reason: "rate_limited" } and nothing is sent. The limiter fails closed.
//
// Never throws. A notification row is the system of record for a submission, so a
// mail provider being down, misconfigured or rate-limiting must not fail the
// caller and must not lose the submission — callers record the row first, then
// send, then store the outcome.

export type MailResult = { sent: boolean; reason?: string; id?: string };

import { allow, DAY, HOUR } from "./ratelimit.ts";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const envInt = (name: string, dflt: number) => {
  const n = parseInt(Deno.env.get(name) || "", 10);
  return Number.isFinite(n) && n > 0 ? n : dflt;
};

// A deliberately plain address check: one @, no whitespace, a dot in the domain.
export function looksLikeEmail(v: unknown): v is string {
  return typeof v === "string" && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function mailerConfigured(): boolean {
  return !!Deno.env.get("RESEND_API_KEY");
}

// True only when the request carries a signed-in user's token whose verified email is
// `email`. Used before mailing a climber, so a receipt can only reach the caller.
// deno-lint-ignore no-explicit-any
export async function callerOwns(supabase: any, req: Request, email: string): Promise<boolean> {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return false;
  try {
    const { data } = await supabase.auth.getUser(token);
    const mine = data && data.user && data.user.email;
    return typeof mine === "string" && mine.toLowerCase() === email.toLowerCase();
  } catch (_e) {
    return false;
  }
}

// Fallback kept on purpose: removing it would silently stop admin mail on a project
// where GPS_ADMIN_EMAIL is unset. It is a role address, not a person's.
export function adminAddress(): string {
  return Deno.env.get("GPS_ADMIN_EMAIL") || "admin@climbmatch.app";
}

// deno-lint-ignore no-explicit-any
export async function sendEmail(
  { to, subject, text }: { to: string; subject: string; text: string },
  supabase: any,
  opts: { pool?: "default" | "safety" } = {},
): Promise<MailResult> {
  if (!to) return { sent: false, reason: "no_recipient" };
  if (!looksLikeEmail(to)) return { sent: false, reason: "invalid_recipient" };
  if (!supabase) return { sent: false, reason: "no_limiter" };

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("GPS_NOTIFY_FROM");

  if (!apiKey) {
    // Same observable behaviour as before a provider existed.
    console.log(`[EMAIL not configured] To: ${to}`, { subject, text });
    return { sent: false, reason: "not_configured" };
  }
  if (!from) {
    console.error("[EMAIL] RESEND_API_KEY is set but GPS_NOTIFY_FROM is not — refusing to guess a sender");
    return { sent: false, reason: "no_sender" };
  }

  // Charged only when a send is really about to happen, so an unconfigured mailer
  // does not burn quota.
  // Safety alerts draw on their OWN buckets, so no other function's mail (GPS
  // receipts, admin notes) can use up the quota a report alert needs. The safety
  // recipient is a fixed internal address, so its per-recipient cap is the daily cap.
  const safety = opts.pool === "safety";
  const safetyDay = envInt("SAFETY_MAIL_DAILY_CAP", 50);
  const ok = await allow(supabase, safety ? [
    { bucket: "mail:safety:recipient", key: to, limit: safetyDay, windowSec: DAY },
    { bucket: "mail:safety:hour", key: "all", limit: envInt("SAFETY_MAIL_HOURLY_CAP", 20), windowSec: HOUR },
    { bucket: "mail:safety:day", key: "all", limit: safetyDay, windowSec: DAY },
  ] : [
    { bucket: "mail:recipient", key: to, limit: envInt("MAIL_PER_RECIPIENT_DAILY", 3), windowSec: DAY },
    { bucket: "mail:global:hour", key: "all", limit: envInt("MAIL_HOURLY_CAP", 20), windowSec: HOUR },
    { bucket: "mail:global:day", key: "all", limit: envInt("MAIL_DAILY_CAP", 50), windowSec: DAY },
  ]);
  if (!ok) {
    console.warn("[EMAIL] rate limited — not sending");
    return { sent: false, reason: "rate_limited" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, text }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.error(`[EMAIL] provider rejected send to ${to}: ${res.status} ${detail}`);
      return { sent: false, reason: `http_${res.status}` };
    }
    const body = await res.json().catch(() => ({}));
    return { sent: true, id: body && body.id };
  } catch (err) {
    console.error(`[EMAIL] send to ${to} threw: ${err && err.message}`);
    return { sent: false, reason: "exception" };
  }
}
