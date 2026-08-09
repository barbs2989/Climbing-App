// A disposable, fully-seeded pair of real accounts, for driving the app signed in.
//
// Why a FIXTURE and not just "sign in as a fresh user". A --signed-in pass was built on
// 2026-08-05 and reverted, because injection-tested against the crew-chat TDZ crash it
// MISSED: that crash only fires when a signed-in user opens a crew chat that HAS members,
// and a brand-new account has no crews, so `activeCrew` was null and the faulty branch was
// never reached. The depth is the whole problem. An account that owns nothing lands in the
// same empty states check:zero already covers.
//
// So both halves matter, and the second one is the point:
//
//   owner  — signs in, owns a crew and a group
//   mate   — a SECOND real account, joined to both
//
// `mate` exists so member resolution has something to resolve. Two shipped bugs were
// exactly this and nothing else could see them:
//
//   #569  crew roster resolved members against the seed CLIMBERS array, so a real
//         member (a uuid) matched nothing and was dropped -- "You + 0 climbers"
//   #680  group management compared ownerId against the seed id 0, so the owner of a
//         DB-backed group got no controls, and uuid members rendered an empty roster
//
// Both need a uuid member sitting in a real row. A solo fixture reproduces neither.
//
// Everything is created and destroyed per run. The alternative -- one permanent QA
// account -- leaves a fake climber in `profiles` forever, where it surfaces in partner
// search and Discover for real users. That is a visible product defect in exchange for a
// few seconds of setup.
//
// Requires the service key: it admin-creates users and writes rows on their behalf.
// The service key BYPASSES RLS, which is fine for SETUP but means nothing here proves a
// policy allows anything -- see scripts/lib/ notes and the real-JWT probes for that.

import { SUPABASE_URL, requireServiceKey, anonKey, headers } from "./supabase-env.mjs";

// Never a routable domain. .invalid is reserved by RFC 2606 precisely so it can never
// resolve, so a stray confirmation mail cannot reach a real inbox.
const DOMAIN = "climbmatch-qa.invalid";
const ROUTE_ID = "wa_mount_baker_north_ridge";

const KEY = requireServiceKey();
const SH = headers(KEY);

// Retry transient transport failures. Teardown MUST NOT be defeated by one flaky
// socket: a single `fetch failed` during cleanup is how two fixture accounts were
// left in the production project on 2026-08-07, where a leftover profile is visible
// to real users in partner search.
async function fetchRetry(url, opts, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fetch(url, opts); } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 400 * (i + 1)));
    }
  }
  throw last;
}

const rest = async (path, opts = {}) => {
  const { headers: h, ...rest } = opts;
  const r = await fetchRetry(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...rest,
    headers: { ...SH, "Content-Type": "application/json", ...(h || {}) },
  });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: r.status, body };
};

const auth = async (path, opts = {}) => {
  const r = await fetchRetry(`${SUPABASE_URL}/auth/v1/${path}`, {
    ...opts,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: r.status, body };
};

// Insert and REQUIRE the row back. PostgREST answers 200 with an empty array when a
// statement matched nothing, so "no error" is not evidence a row exists -- the failure
// mode this repo keeps re-learning. A fixture that silently seeded nothing would make the
// walk below report a clean pass over an empty account.
async function insert(table, row, select = "*") {
  const { status, body } = await rest(`${table}?select=${select}`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (status >= 300) throw new Error(`seed ${table} failed (${status}): ${JSON.stringify(body)}`);
  if (!Array.isArray(body) || body.length !== 1) {
    throw new Error(`seed ${table} returned ${Array.isArray(body) ? body.length : "no"} rows, expected exactly 1`);
  }
  return body[0];
}

async function createUser(tag, name) {
  // A per-run suffix keeps two concurrent runs (this repo routinely has parallel
  // sessions) from colliding on the unique email index.
  const stamp = `${process.pid.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const email = `ui-${tag}-${stamp}@${DOMAIN}`;
  const password = `Qa!${Math.random().toString(36).slice(2, 12)}Aa1`;
  const { status, body } = await auth("admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }),
  });
  if (status >= 300 || !body?.id) throw new Error(`admin create user failed (${status}): ${JSON.stringify(body)}`);
  return { id: body.id, email, password, name };
}

// The session the browser will run as. Fetched over the auth API rather than typed into
// the sign-in modal: it is deterministic, it does not couple this check to the modal's
// markup, and a modal change should fail check:ui, not silently un-sign-in this walk.
async function signIn(user) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  const body = await r.json();
  if (!r.ok || !body?.access_token) throw new Error(`sign in failed (${r.status}): ${JSON.stringify(body)}`);
  return body;
}

// Remove any fixture account left behind by a previous run that died before teardown --
// a browser launch timeout, a killed process, a machine that slept. Identified purely by
// the reserved .invalid domain, so it can only ever match accounts this file created.
//
// Retrying cleanup is not enough on its own: a process that is killed never reaches its
// finally block at all. This is the backstop that makes leaks self-healing rather than
// cumulative, and it runs BEFORE each fixture is created so a leak has a bounded lifetime.
export async function sweepOrphans(log = () => {}) {
  const { body } = await auth("admin/users?per_page=200");
  const stale = (body?.users || []).filter((u) => (u.email || "").endsWith(`@${DOMAIN}`));
  if (!stale.length) return 0;
  log(`  sweeping ${stale.length} fixture account(s) left by an earlier run`);
  for (const u of stale) {
    // Rows that merely REFERENCE the user are not necessarily removed with it, so take
    // the things it created first.
    for (const table of ["groups", "crews"]) {
      const { body: rows } = await rest(`${table}?created_by=eq.${u.id}&select=id`);
      for (const row of Array.isArray(rows) ? rows : []) {
        await rest(`${table}?id=eq.${row.id}`, { method: "DELETE" }).catch(() => {});
      }
    }
    await auth(`admin/users/${u.id}`, { method: "DELETE" }).catch(() => {});
  }
  return stale.length;
}

export async function createFixture(log = () => {}) {
  await sweepOrphans(log).catch(() => {});
  const undo = [];
  const track = (table, filter) => undo.push({ table, filter });
  const users = [];

  try {
    const owner = await createUser("owner", "Quinn Fixture");
    users.push(owner);
    const mate = await createUser("mate", "Robin Belay");
    users.push(mate);
    log(`  fixture accounts: ${owner.name} (owner) + ${mate.name} (member)`);

    // Give both profiles enough shape that the UI is rendering real values rather than
    // falling through to a default. Bare {id, name} is the state check:zero already walks.
    for (const u of [owner, mate]) {
      const { status } = await rest(`profiles?id=eq.${u.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          location: "Bellingham, WA",
          disciplines: ["alpine", "trad"],
          trad_grade: "5.9",
          bio: "Fixture account for check:signed-in.",
        }),
      });
      if (status >= 300) throw new Error(`profile patch failed (${status})`);
    }

    // A crew WITH a second confirmed member -- the state the reverted attempt could not
    // reach, and the only state in which the #569 roster bug renders.
    const crew = await insert("crews", {
      created_by: owner.id,
      route_id: ROUTE_ID,
      dates: ["2026-09-12", "2026-09-13"],
      meet_place: "Heliotrope Ridge TH",
      meet_time: "04:30",
      cap: 4,
    });
    track("crews", `id=eq.${crew.id}`);
    for (const u of [owner, mate]) {
      await insert("crew_members", { crew_id: crew.id, user_id: u.id, status: "confirmed", invited_by: owner.id });
    }
    log(`  crew ${crew.id.slice(0, 8)} with 2 confirmed members`);

    // A group the owner OWNS, with a uuid member -- the state #680 fixed. Without the
    // member row the roster is a single self-row and the per-member controls never render,
    // so the interesting half of that fix would go unwalked.
    const group = await insert("groups", {
      created_by: owner.id,
      name: "Fixture Alpine Club",
      blurb: "Seeded by check:signed-in.",
      location: "North Cascades",
      disciplines: ["alpine"],
      visibility: "public",
    });
    track("groups", `id=eq.${group.id}`);
    // The owner row is created by the groups_add_owner trigger (0090), deliberately, so
    // there is no window where a group has no owner. Assert it landed instead of inserting
    // a duplicate -- if that trigger ever stops firing, every downstream permission check
    // in the walk below would quietly test a group with no owner at all.
    const ownerRow = await rest(`group_members?group_id=eq.${group.id}&user_id=eq.${owner.id}&select=role`);
    if (!Array.isArray(ownerRow.body) || ownerRow.body.length !== 1 || ownerRow.body[0].role !== "owner") {
      throw new Error(`groups_add_owner trigger did not seat the creator as owner: ${JSON.stringify(ownerRow.body)}`);
    }
    await insert("group_members", { group_id: group.id, user_id: mate.id, role: "member" });
    log(`  group ${group.id.slice(0, 8)} owned by the fixture, 1 other member`);

    await insert("objectives", { user_id: owner.id, route_id: ROUTE_ID });
    await insert("climb_logs", {
      user_id: owner.id, route_id: ROUTE_ID, date_climbed: "2026-07-04",
      discipline: "alpine", tick_type: "lead", party_size: 2, notes: "Fixture log.",
    });
    await insert("saved_searches", { user_id: owner.id, name: "Cascades alpine", query: { state: "Washington", disc: ["alpine"] } });
    await insert("user_lists", { user_id: owner.id, name: "Fixture ticklist", icon: "star", route_ids: [ROUTE_ID], shared: false });
    await insert("connections", { requester: owner.id, addressee: mate.id, status: "accepted" });
    log("  objective, log, saved search, list, connection");

    const session = await signIn(owner);

    return {
      owner, mate, crew, group, session,
      // Delete the seeded rows explicitly rather than trusting FK cascades. Whether a
      // cascade fires is a property of the schema, not of this script, and a fixture that
      // leaks rows into a production project on a schema change is worse than one that is
      // slightly slower.
      async cleanup() {
        for (const { table, filter } of undo.reverse()) {
          await rest(`${table}?${filter}`, { method: "DELETE" }).catch(() => {});
        }
        for (const u of users) {
          await auth(`admin/users/${u.id}`, { method: "DELETE" }).catch(() => {});
        }
        // Assert the accounts are actually gone. A leaked fixture profile shows up in
        // partner search for real users, which is the whole reason this is per-run.
        const left = [];
        for (const u of users) {
          const { body } = await rest(`profiles?id=eq.${u.id}&select=id`);
          if (Array.isArray(body) && body.length) left.push(u.email);
        }
        return left;
      },
    };
  } catch (e) {
    // Partial setup still leaves rows behind. Tear down what exists before rethrowing.
    for (const { table, filter } of undo.reverse()) {
      await rest(`${table}?${filter}`, { method: "DELETE" }).catch(() => {});
    }
    for (const u of users) await auth(`admin/users/${u.id}`, { method: "DELETE" }).catch(() => {});
    throw e;
  }
}

// The shape supabase-js persists under its storageKey. Written into localStorage before
// the app's first script runs, so the client boots already authenticated and no sign-in
// form is ever touched.
export function sessionForStorage(session) {
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in || 3600),
    token_type: session.token_type || "bearer",
    user: session.user,
  };
}

export const STORAGE_KEY = "climbmatch-auth";
