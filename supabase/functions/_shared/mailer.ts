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
// Never throws. A notification row is the system of record for a submission, so a
// mail provider being down, misconfigured or rate-limiting must not fail the
// caller and must not lose the submission — callers record the row first, then
// send, then store the outcome.

export type MailResult = { sent: boolean; reason?: string; id?: string };

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function mailerConfigured(): boolean {
  return !!Deno.env.get("RESEND_API_KEY");
}

export function adminAddress(): string {
  return Deno.env.get("GPS_ADMIN_EMAIL") || "admin@climbmatch.app";
}

export async function sendEmail(
  { to, subject, text }: { to: string; subject: string; text: string },
): Promise<MailResult> {
  if (!to) return { sent: false, reason: "no_recipient" };

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
