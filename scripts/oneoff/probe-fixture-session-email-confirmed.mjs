// Does the session the UI fixture injects actually carry `email_confirmed_at`?
//
// It has to, for the verification fix to mean anything on a browser walk: the fix makes
// `verified` fall back to `session.user.email_confirmed_at` when a `verification_records` read
// fails. Measured with `check:outage ONLY=verification_records`, the outage still INTRODUCED
// "Verify to boost your trust" / "Verified climbers get more requests." and removed nothing --
// so on the fixture account that fallback is evaluating false, and the question is why.
//
// Creating the account the way the fixture does (`email_confirm: true` via the admin API) then
// signing in the way the fixture does (`token?grant_type=password`) is the only honest way to
// answer it. Reading the fixture source cannot: `sessionForStorage()` passes `session.user`
// straight through, so what matters is what the token endpoint RETURNS, not what the helper does
// with it.
//
// Cleans up after itself. Uses the `.invalid` domain the fixture uses, so a stray confirmation
// can never route, and `sweepOrphans()` would remove anything a crash leaves behind.

import { requireServiceKey, SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const SERVICE = requireServiceKey();
const stamp = `${process.pid}${Math.abs(Date.now() % 100000)}`;
const EMAIL = `probe-${stamp}@climbmatch-qa.invalid`;
const PASSWORD = `Pw-${stamp}-aA1!`;

const auth = (path, init = {}) =>
  fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json", ...(init.headers || {}),
    },
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));

let userId = null;
try {
  const created = await auth("admin/users", {
    method: "POST",
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true,
      user_metadata: { name: "Probe Account" } }),
  });
  if (created.status >= 300) {
    console.error(`FAIL — could not create the account (${created.status}). Nothing was measured.`);
    console.error(JSON.stringify(created.body));
    process.exit(1);
  }
  userId = created.body.id;
  console.log(`created ${EMAIL}`);
  console.log(`  admin API reports email_confirmed_at = ${JSON.stringify(created.body.email_confirmed_at)}`);

  // The fixture signs in with the ANON key, not the service key. Use the same call.
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const session = await r.json();
  if (!session || !session.access_token) {
    console.error(`FAIL — sign-in returned no session (${r.status}). Nothing was measured.`);
    process.exit(1);
  }

  const u = session.user || {};
  console.log("\nwhat the TOKEN endpoint returns, which is what sessionForStorage() passes through:");
  console.log(`  session.user present          : ${!!session.user}`);
  console.log(`  session.user.email_confirmed_at: ${JSON.stringify(u.email_confirmed_at)}`);
  console.log(`  session.user.confirmed_at      : ${JSON.stringify(u.confirmed_at)}`);
  console.log(`  session.user keys              : ${Object.keys(u).sort().join(", ")}`);

  const ok = !!u.email_confirmed_at;
  console.log("\n" + (ok
    ? "ok — the injected session DOES carry email_confirmed_at, so the browser walk still showing\n"
      + "     the verification nudge is NOT explained by the fixture. Look further up: `session` in\n"
      + "     App, or the effect's ordering."
    : "FINDING — the injected session does NOT carry email_confirmed_at, so `sessionEmailConfirmed`\n"
      + "     is false on every fixture account and the session fallback cannot be exercised by any\n"
      + "     browser guard. That is a FIXTURE limitation, not a defect in the fix."));
  process.exitCode = 0;
} finally {
  if (userId) {
    const d = await auth(`admin/users/${userId}`, { method: "DELETE" }).catch(() => null);
    console.log(`\ncleaned up ${EMAIL} (${d ? d.status : "delete failed"})`);
  }
}
