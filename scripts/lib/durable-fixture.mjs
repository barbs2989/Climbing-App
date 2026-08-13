// The CI half of check:signed-in's fixture: sign in as two accounts that already exist,
// using the ANON key only.
//
// Deliberately a separate module from ui-fixture.mjs, which calls requireServiceKey() at
// import time — importing that from CI would fail before doing anything, and worse, would
// make the service key look required when the whole point is that it is not.
//
// The privileged work happened once, locally:
//   scripts/oneoff/create-ci-test-accounts.mjs   (accounts, discoverable=false)
//   scripts/oneoff/seed-ci-test-fixture.mjs      (crew, group, logbook, connection)
// Everything here is what a real climber's browser does: exchange a password for a session.
//
// It returns the same shape as createFixture() so the walk cannot tell the difference —
// except cleanup(), which is a no-op that reports nothing leaked, because nothing was made.

import { SUPABASE_URL, anonKey } from "./supabase-env.mjs";
// Re-exported from ui-fixture so the two modes cannot disagree about the storage contract.
// Safe to import now that its service-key lookup is lazy.
export { sessionForStorage, STORAGE_KEY } from "./ui-fixture.mjs";

const ANON = anonKey();

export function durableCredsPresent() {
  return !!(process.env.CI_TEST_OWNER_EMAIL && process.env.CI_TEST_OWNER_PASSWORD
    && process.env.CI_TEST_MATE_EMAIL && process.env.CI_TEST_MATE_PASSWORD);
}

async function readBody(r) {
  const text = await r.text().catch(() => "");
  try { return { status: r.status, json: JSON.parse(text), text }; }
  catch { return { status: r.status, json: null, text }; }
}

// A sick database answers with a gateway page, not JSON. Say which it is: "the fixture is
// broken" and "the database is down" need opposite responses, and a JSON parse error in the
// middle of a CI log reads as the former.
function assertHealthy(res, what) {
  if (res.status === 503 || res.status === 504 || (res.status >= 500 && !res.json) || res.json?.code === "PGRST002") {
    throw new Error(`the database is not answering (HTTP ${res.status}) while ${what}. This is not a fixture fault; re-run when it recovers.`);
  }
}

async function signIn(email, password) {
  const res = await readBody(await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }));
  assertHealthy(res, `signing in as ${email}`);
  if (!res.json?.access_token) {
    throw new Error(`sign-in failed for ${email} (HTTP ${res.status}): ${(res.text || "").slice(0, 200)}. If the password was rotated, re-run create-ci-test-accounts.mjs --reset-password and update the CI secrets.`);
  }
  return res.json;
}

export async function durableFixture(log) {
  const ownerEmail = process.env.CI_TEST_OWNER_EMAIL;
  const mateEmail = process.env.CI_TEST_MATE_EMAIL;
  const session = await signIn(ownerEmail, process.env.CI_TEST_OWNER_PASSWORD);
  const mateSession = await signIn(mateEmail, process.env.CI_TEST_MATE_PASSWORD);

  // Read the mate's display name from their own profile rather than hardcoding it here: the
  // walk asserts the crew roster renders that name, and a constant in two files is a constant
  // that will disagree with itself.
  const res = await readBody(await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${mateSession.user.id}&select=id,name,discoverable`,
    { headers: { apikey: ANON, Authorization: `Bearer ${session.access_token}` } },
  ));
  assertHealthy(res, "reading the mate's profile");
  const mate = res.json?.[0];
  if (!mate?.name) throw new Error(`the mate profile ${mateSession.user.id} has no name — re-run scripts/oneoff/create-ci-test-accounts.mjs`);

  // The safety contract, re-checked on every run rather than at setup only. These accounts
  // are permanent, so "discoverable=false" has to keep being true, not merely have been true
  // the day they were made — a later migration or backfill could flip a column default.
  if (mate.discoverable !== false) {
    throw new Error(`the CI mate profile is discoverable — it can surface in partner browse for real users. Set discoverable=false before running again.`);
  }

  log(`  signed in as the durable CI accounts (anon key only, no service key)`);
  return {
    owner: { id: session.user.id, email: ownerEmail, name: "CI Fixture Owner" },
    mate: { id: mateSession.user.id, email: mateEmail, name: mate.name },
    session,
    // Nothing was created, so nothing is removed. Returning [] matches createFixture's
    // contract of "these are the rows I could not delete", which is genuinely empty here.
    async cleanup() { return []; },
  };
}
