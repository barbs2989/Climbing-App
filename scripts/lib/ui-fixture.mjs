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
import { POLICY_VERSION } from "../../lib/policy.js";

// Never a routable domain. .invalid is reserved by RFC 2606 precisely so it can never
// resolve, so a stray confirmation mail cannot reach a real inbox.
const DOMAIN = "climbmatch-qa.invalid";
const ROUTE_ID = "wa_mount_baker_north_ridge";

// Resolved on FIRST USE, not at import. scripts/lib/durable-fixture.mjs re-exports
// sessionForStorage and STORAGE_KEY from here so the two fixture modes cannot disagree about
// the storage contract — and that import happens in CI, which deliberately holds no service
// key. Demanding it at module scope made importing this file fail before doing anything, and
// worse, made the key look required for a path that must never have it.
let _KEY = null, _SH = null;
const KEY = () => (_KEY ??= requireServiceKey());
const SH = () => (_SH ??= headers(KEY()));

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
    headers: { ...SH(), "Content-Type": "application/json", ...(h || {}) },
  });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: r.status, body };
};

const auth = async (path, opts = {}) => {
  const r = await fetchRetry(`${SUPABASE_URL}/auth/v1/${path}`, {
    ...opts,
    // KEY() — CALL it. #919 made the key lazy (`const KEY = () => …`) so importing this file
    // could not demand a service key on the CI path that must never hold one. It wired SH()
    // correctly and missed this one helper, so `apikey` got the FUNCTION and the bearer token
    // got its source text: every local run died with 401 "Invalid API key" before creating a
    // fixture. Invisible because the same PR moved CI onto the anon-key durable fixture, so
    // nothing exercised this path again.
    headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}`, "Content-Type": "application/json", ...(opts.headers || {}) },
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
  // `terms_version` rides along exactly as lib/auth.js sends it on a real signup, so 0145's
  // handle_new_user() trigger stamps profiles.terms_accepted_version.
  //
  // WITHOUT IT THE FIXTURE MANUFACTURES A STATE THE APP'S OWN FLOW CANNOT PRODUCE: an account
  // with no acceptance on record. PolicyUpdateNotice then fired -- correctly -- on all 63
  // screens of every check:signed-in and check:outage walk, telling an account created seconds
  // ago that it "predates the version we now publish", and putting a fixed 200px panel over the
  // bottom of every screen those guards measure. Same rule this file already follows for the
  // connection row and the group membership: seed the state the app would reach, never one it
  // could not.
  const { status, body } = await auth("admin/users", {
    method: "POST",
    body: JSON.stringify({
      email, password, email_confirm: true,
      user_metadata: { name, terms_version: POLICY_VERSION },
    }),
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
// A run's own fixture is minutes old, and this sweep runs BEFORE each fixture is created — so
// without an age gate a second walk starting now deletes the accounts of one already in flight,
// mid-assertion. That is not hypothetical: two runs were observed overlapping in this project on
// 2026-08-19 (a local walk 5 minutes into its own fixture while CI held another). The victim's
// failure would land nowhere near its cause — its rows simply stop existing — and re-running it
// would appear to fix it, which is how a real defect gets filed as a flake.
//
// 45 minutes is comfortably past the 25-minute CI job wall, so anything older than this cannot
// belong to a live run; a leak still has a bounded lifetime, just a longer one.
const ORPHAN_MIN_AGE_MS = 45 * 60 * 1000;

export async function sweepOrphans(log = () => {}) {
  const { body } = await auth("admin/users?per_page=200");
  const now = Date.now();
  const mine = (body?.users || []).filter((u) => (u.email || "").endsWith(`@${DOMAIN}`));
  // An unparseable created_at reads as age 0, i.e. too young to touch. Comparing NaN directly
  // would make both filters below false and the account would fall out of the sweep silently —
  // never deleted, never reported, which is the one outcome a leak backstop must not produce.
  const ageOf = (u) => { const t = Date.parse(u.created_at); return Number.isFinite(t) ? now - t : 0; };
  const live = mine.filter((u) => ageOf(u) < ORPHAN_MIN_AGE_MS);
  if (live.length) log(`  leaving ${live.length} fixture account(s) younger than 45 min alone — another run may be using them`);
  const stale = mine.filter((u) => ageOf(u) >= ORPHAN_MIN_AGE_MS);
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

    // A SECOND crew, owned by the MATE, with the owner left INVITED rather than confirmed.
    //
    // This exists because of a blind spot check:outage documented about itself. "No crew
    // invites" was on screen in the HEALTHY run too -- the mate JOINS the first crew rather
    // than staying invited -- so the outage introduced nothing, rule 2 stayed quiet, and rule 1
    // was satisfied by the friend-requests section beside it. The gate #1212 put in front of
    // that sentence was therefore real and UNVERIFIABLE, and its injection case had to expect a
    // PASS. An absence the fixture happens to share is unmeasurable, not absent.
    //
    // It has to be a second crew: the owner is already a CONFIRMED member of the first one, so
    // there is nowhere in it to hang a pending invite for them.
    //
    // The MATE creates it and does the inviting, because that is what the live policy requires:
    // `join or invite` demands invited_by = auth.uid() AND (the crew's created_by is you, or you
    // are seating yourself at a status other than confirmed). Seeding it as the owner would
    // manufacture a state the app's own flow cannot reach -- the trap this file already records
    // for the accepted connection.
    const inviteCrew = await insert("crews", {
      created_by: mate.id,
      route_id: ROUTE_ID,
      dates: ["2026-10-04"],
      meet_place: "Coleman Deming TH",
      meet_time: "05:00",
      cap: 3,
    });
    track("crews", `id=eq.${inviteCrew.id}`);
    await insert("crew_members", { crew_id: inviteCrew.id, user_id: mate.id, status: "confirmed", invited_by: mate.id });
    await insert("crew_members", { crew_id: inviteCrew.id, user_id: owner.id, status: "invited", invited_by: mate.id });
    log(`  crew ${inviteCrew.id.slice(0, 8)} owned by the mate, with the owner INVITED and not confirmed`);

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
    // Then hide it. `groups read public or member` makes a public group readable by everyone,
    // and useMyGroups() lists every group it can see, newest first — so for the ~4 minutes a
    // walk takes, a real climber's Groups tab is topped by "Fixture Alpine Club". The fixture
    // PROFILES are kept out of partner browse for exactly this reason; the group they own was
    // missed. Measured 2026-08-19 against the live project.
    //
    // Created public and flipped rather than inserted private, even though this path holds the
    // service key and could write 'private' directly. Two reasons: the durable CI path CANNOT
    // (the live INSERT policy refuses it, 42501) so this keeps the two fixtures producing the
    // same row; and a group that was never public is a state the app's own flow cannot reach,
    // which is the standard this repo already holds setup to.
    // `rest()` does not ask for the changed rows back — insert() adds that header itself — and
    // without it PostgREST answers 204 with no body, so the assertion below would fail on a
    // write that worked. It is also the only way to tell a real change from the 200-with-zero-
    // rows that a filter miss or an RLS refusal returns.
    const hidden = await rest(`groups?id=eq.${group.id}`, {
      method: "PATCH", body: JSON.stringify({ visibility: "private" }),
      headers: { Prefer: "return=representation" },
    });
    if (!Array.isArray(hidden.body) || hidden.body[0]?.visibility !== "private") {
      throw new Error(`could not make the fixture group private (HTTP ${hidden.status}): ${JSON.stringify(hidden.body).slice(0, 200)} — it would be listed in every real user's Groups tab`);
    }
    log(`  group ${group.id.slice(0, 8)} owned by the fixture, 1 other member, private`);

    await insert("objectives", { user_id: owner.id, route_id: ROUTE_ID });
    // A LOGGED ASCENT, which is what this row was always meant to be. Two fields made it
    // something the app's own form cannot produce, and between them the walk never saw a
    // populated logbook at all:
    //
    //   stars      absent -> App files the row by `row.stars == null`, and a null-starred row
    //              goes to condReports, NOT to `logs`. So AT A GLANCE read "Climbs logged 0",
    //              the pyramid stayed empty, and the row rendered on no screen the walk opens.
    //              LogAscent writes `stars: scout ? undefined : stars` with stars defaulting to
    //              5, so on the app's own path a null star rating means a CONDITIONS report and
    //              nothing else.
    //   tick_type  "lead" lowercase -> routeCompleted() matches a capitalised vocabulary
    //              ({Summit, Send, Onsight, Flash, Redpoint, Lead, Follow, Top-rope, Repeat}),
    //              so the tick never counted and the ticklist read "1 climb to go" above a
    //              seeded log for that very route.
    //
    // Recorded before as a fixture artifact, with the note that the READER must not be
    // lowercased to suit a fixture. Correct — this is the other direction.
    await insert("climb_logs", {
      user_id: owner.id, route_id: ROUTE_ID, date_climbed: "2026-07-04",
      discipline: "alpine", tick_type: "Lead", stars: 4, party_size: 2, notes: "Fixture log.",
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
