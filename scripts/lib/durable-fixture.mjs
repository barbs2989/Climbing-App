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

// A REST call as a given user's JWT — never the service key, which CI does not hold.
const asUser = async (sess, path, init = {}) => readBody(await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
  ...init,
  headers: {
    apikey: ANON, Authorization: `Bearer ${sess.access_token}`,
    "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}),
  },
}));

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

  // A GROUP PER RUN, not one shared group — this is the isolation the durable-account design
  // was missing, and its absence produced non-deterministic reds on other people's PRs.
  //
  // The accounts have to be durable (no service key in CI, and no self-delete API, so per-run
  // ACCOUNTS would leak forever). Their DATA does not. The walk opens group modals that mutate
  // shared state — visibility, membership — and the assertions it makes are precisely about
  // that state (`isCreator`'s "+ Mod" control, `isMod`'s visibility toggle). Two runs a minute
  // apart therefore read each other's writes: on 2026-08-14 #969 failed on exactly that pair
  // and passed on re-run of the same SHA, having changed no app code.
  //
  // Groups are safe to make per-run because, unlike auth users, an owner can delete their own:
  // measured create 201 / mate-joins 201 / owner-deletes 200, row gone. So each run gets a
  // uniquely named group and takes it away again.
  const tag = process.env.GITHUB_RUN_ID
    ? `run ${process.env.GITHUB_RUN_ID}${process.env.GITHUB_RUN_ATTEMPT ? "." + process.env.GITHUB_RUN_ATTEMPT : ""}`
    : `local ${process.pid.toString(36)}${Date.now().toString(36).slice(-4)}`;
  const groupName = `CI Fixture Alpine Club (${tag})`;

  const mk = await asUser(session, "groups", {
    method: "POST",
    body: JSON.stringify({
      created_by: session.user.id, name: groupName, blurb: "Per-run fixture for check:signed-in.",
      location: "North Cascades", disciplines: ["alpine"], visibility: "public",
    }),
  });
  assertHealthy(mk, "creating this run's group");
  const group = mk.json?.[0];
  if (!group?.id) throw new Error(`could not create this run's group (HTTP ${mk.status}): ${(mk.text || "").slice(0, 200)}`);

  // The MATE seats themselves. A group owner cannot add a member (403) — that is the policy,
  // and it is what a real join does; seeding it any other way would manufacture a state the
  // app's own flow cannot reach.
  const join = await asUser(mateSession, "group_members", {
    method: "POST",
    body: JSON.stringify({ group_id: group.id, user_id: mateSession.user.id, role: "member" }),
  });
  assertHealthy(join, "seating the mate in this run's group");
  if (join.status >= 300) throw new Error(`the mate could not join this run's group (HTTP ${join.status}): ${(join.text || "").slice(0, 200)}`);
  log(`  created this run's own group ${JSON.stringify(groupName)} — no other run can touch it`);

  return {
    owner: { id: session.user.id, email: ownerEmail, name: "CI Fixture Owner" },
    mate: { id: mateSession.user.id, email: mateEmail, name: mate.name },
    group,
    session,
    // The accounts stay; this run's group does not. Returning the names of rows that could
    // NOT be removed matches createFixture's contract, so a leak is reported rather than
    // accumulating silently in a live project.
    async cleanup() {
      const del = await asUser(session, `groups?id=eq.${group.id}`, { method: "DELETE" });
      if (del.status >= 300) return [`group ${groupName} (HTTP ${del.status})`];
      const left = await asUser(session, `groups?id=eq.${group.id}&select=id`);
      return Array.isArray(left.json) && left.json.length ? [`group ${groupName} (still present after DELETE)`] : [];
    },
  };
}
