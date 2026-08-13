#!/usr/bin/env node
// ONE-TIME: give the durable CI accounts the things check:signed-in asserts on.
//
// Runs entirely on the ANON key plus the two accounts' own JWTs — NO service key. That is
// not a convenience, it is the point. CLAUDE.md records that the existing fixture's setup
// bypasses RLS, "so a row existing here is no evidence a policy would have let a user create
// it. This answers 'does the screen render correctly', never 'is the policy right'." Seeding
// as the users themselves means every row below IS evidence a real climber could create it.
//
// Where the owner cannot write a row, the script retries as the MATE and says so. That
// fallback is deliberate reporting, not a workaround: which identity a row needs is exactly
// the policy question, and the log line is the answer. A row that neither can write is a
// finding — it means the app's own flow could not produce this state either.
//
// Idempotent: it looks for an existing crew/group by name first and reuses it, so re-running
// repairs drift (a lost member row) instead of accumulating clubs.
//
//   node scripts/oneoff/seed-ci-test-fixture.mjs
//   node scripts/oneoff/seed-ci-test-fixture.mjs --dry-run

import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry-run");
const ANON = anonKey();
const ROUTE_ID = "wa_mount_baker_north_ridge";
const CREW_MEET = "Heliotrope Ridge TH";
const GROUP_NAME = "CI Fixture Alpine Club";

const CREDS = {
  owner: { email: process.env.CI_TEST_OWNER_EMAIL, password: process.env.CI_TEST_OWNER_PASSWORD },
  mate: { email: process.env.CI_TEST_MATE_EMAIL, password: process.env.CI_TEST_MATE_PASSWORD },
};
for (const [who, c] of Object.entries(CREDS)) {
  if (!c.email || !c.password) {
    console.error(`CI_TEST_${who.toUpperCase()}_EMAIL and _PASSWORD must be set. They are printed by create-ci-test-accounts.mjs and stored as GitHub secrets.`);
    process.exit(1);
  }
}

// Read the body as TEXT and parse defensively. Supabase answers a sick database with a
// gateway page or a bare "upstream request timeout" — not JSON — and a bare r.json() turns
// that into `Unexpected token 'u'`, which reads as a bug in this script rather than as the
// database being down. Same family as the fail-open traps this repo keeps hitting: a failed
// request must say something definite.
async function body(r) {
  const text = await r.text().catch(() => "");
  try { return { ok: r.ok, status: r.status, json: JSON.parse(text), text }; }
  catch { return { ok: r.ok, status: r.status, json: null, text }; }
}

function dbDown(res) {
  // PGRST002 is PostgREST failing to reach Postgres; 5xx with no JSON is the gateway.
  return res.status === 503 || res.status === 504 || (res.status >= 500 && !res.json) ||
    res.json?.code === "PGRST002";
}

async function signIn({ email, password }) {
  const res = await body(await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }));
  if (dbDown(res)) {
    throw new Error(`the database is not answering (HTTP ${res.status}${res.json?.code ? " " + res.json.code : ""}: ${(res.json?.message || res.text || "").slice(0, 120)}). Nothing was written. Retry when it recovers — this is not a fault in the fixture.`);
  }
  if (!res.json?.access_token) throw new Error(`sign-in failed for ${email} (HTTP ${res.status}): ${(res.text || "").slice(0, 200)}`);
  return { token: res.json.access_token, id: res.json.user.id };
}

const as = async (who, path, init = {}) => {
  const res = await body(await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON, Authorization: `Bearer ${who.token}`,
      "Content-Type": "application/json", Prefer: "return=representation", ...(init.headers || {}),
    },
  }));
  // Stop on an unhealthy database rather than reading it as "no rows" and inserting a
  // duplicate, or as a policy refusal and blaming RLS.
  if (dbDown(res)) throw new Error(`the database stopped answering mid-seed (HTTP ${res.status}) on ${path}. Re-run when it recovers; this script is idempotent, so it will pick up where it left off.`);
  return { status: res.status, body: res.json };
};

// Insert as the owner; if the policy says no, try as the mate and report which one worked.
// A row that neither identity can write is raised, because the app could not create it either.
async function insertAsEither(table, row, owner, mate, label) {
  const first = await as(owner, table, { method: "POST", body: JSON.stringify(row) });
  if (first.status < 300) return { row: first.body?.[0], by: "owner" };
  const second = await as(mate, table, { method: "POST", body: JSON.stringify(row) });
  if (second.status < 300) {
    console.log(`     note: ${label} had to be written by the MATE — owner got ${first.status}. That is the policy, and it is what a real invite/accept flow does.`);
    return { row: second.body?.[0], by: "mate" };
  }
  throw new Error(`${label}: neither account could insert into ${table}. owner ${first.status} ${JSON.stringify(first.body)?.slice(0, 160)} | mate ${second.status} ${JSON.stringify(second.body)?.slice(0, 160)}`);
}

async function run() {
  console.log(`${DRY ? "[dry-run] " : ""}${SUPABASE_URL}`);
  const owner = await signIn(CREDS.owner);
  const mate = await signIn(CREDS.mate);
  console.log(`  signed in as owner ${owner.id.slice(0, 8)} and mate ${mate.id.slice(0, 8)} — anon key only, no service key`);
  if (DRY) { console.log("[dry-run] stopping before any write."); return; }

  // ---- crew, with a second CONFIRMED member (the state #569's roster bug renders in) ----
  let { body: crews } = await as(owner, `crews?meet_place=eq.${encodeURIComponent(CREW_MEET)}&select=id&limit=1`);
  let crewId = crews?.[0]?.id;
  if (!crewId) {
    const { row } = await insertAsEither("crews", {
      created_by: owner.id, route_id: ROUTE_ID, dates: ["2026-09-12", "2026-09-13"],
      meet_place: CREW_MEET, meet_time: "04:30", cap: 4,
    }, owner, mate, "crew");
    crewId = row.id;
    console.log(`  crew ${crewId.slice(0, 8)} created`);
  } else console.log(`  crew ${crewId.slice(0, 8)} already exists`);

  for (const u of [owner, mate]) {
    const { body: have } = await as(owner, `crew_members?crew_id=eq.${crewId}&user_id=eq.${u.id}&select=user_id`);
    if (have?.length) continue;
    await insertAsEither("crew_members",
      { crew_id: crewId, user_id: u.id, status: "confirmed", invited_by: owner.id },
      owner, mate, `crew member ${u.id.slice(0, 8)}`);
  }
  const { body: cm } = await as(owner, `crew_members?crew_id=eq.${crewId}&select=user_id`);
  console.log(`  crew has ${cm?.length ?? "?"} member row(s)`);

  // ---- group the owner OWNS, with a uuid member (the state #680 fixed) ----
  let { body: groups } = await as(owner, `groups?name=eq.${encodeURIComponent(GROUP_NAME)}&select=id&limit=1`);
  let groupId = groups?.[0]?.id;
  if (!groupId) {
    const { row } = await insertAsEither("groups", {
      created_by: owner.id, name: GROUP_NAME, blurb: "Seeded for check:signed-in.",
      location: "North Cascades", disciplines: ["alpine"], visibility: "public",
    }, owner, mate, "group");
    groupId = row.id;
    console.log(`  group ${groupId.slice(0, 8)} created`);
  } else console.log(`  group ${groupId.slice(0, 8)} already exists`);

  // 0090's groups_add_owner trigger seats the creator, deliberately, so there is no window
  // where a group has no owner. Assert rather than insert — if it stopped firing, every
  // permission check in the walk would quietly test a group with no owner at all.
  const { body: ownerRow } = await as(owner, `group_members?group_id=eq.${groupId}&user_id=eq.${owner.id}&select=role`);
  if (!ownerRow?.length || ownerRow[0].role !== "owner") {
    throw new Error(`groups_add_owner did not seat the creator as owner: ${JSON.stringify(ownerRow)}`);
  }
  const { body: mateRow } = await as(owner, `group_members?group_id=eq.${groupId}&user_id=eq.${mate.id}&select=user_id`);
  if (!mateRow?.length) {
    await insertAsEither("group_members", { group_id: groupId, user_id: mate.id, role: "member" }, owner, mate, "group member");
  }
  console.log(`  group owned by the fixture, mate seated as member`);

  // ---- the owner's own logbook shape, and the connection the Crew tab renders ----
  const solo = [
    ["objectives", { user_id: owner.id, route_id: ROUTE_ID }, `user_id=eq.${owner.id}&route_id=eq.${ROUTE_ID}`],
    ["climb_logs", { user_id: owner.id, route_id: ROUTE_ID, date_climbed: "2026-07-04", discipline: "alpine", tick_type: "lead", party_size: 2, notes: "CI fixture log." }, `user_id=eq.${owner.id}&route_id=eq.${ROUTE_ID}`],
    ["user_lists", { user_id: owner.id, name: "CI fixture ticklist", icon: "star", route_ids: [ROUTE_ID], shared: false }, `user_id=eq.${owner.id}&name=eq.CI%20fixture%20ticklist`],
  ];
  for (const [table, row, filter] of solo) {
    const { body: have } = await as(owner, `${table}?${filter}&select=*&limit=1`);
    if (have?.length) { console.log(`  ${table}: already present`); continue; }
    await insertAsEither(table, row, owner, mate, table);
    console.log(`  ${table}: written`);
  }

  // A connection is made in TWO steps, and discovering that is the whole argument for
  // seeding as the users. The service-key fixture inserts {requester, addressee,
  // status:"accepted"} in one write, which RLS refuses for BOTH accounts (42501) — so it has
  // been manufacturing a state the app's own flow cannot produce, and any screen that depends
  // on how an accepted connection actually comes about was being tested against a fiction.
  // The real flow: the requester creates it pending, the addressee accepts it.
  const { body: conn } = await as(owner, `connections?requester=eq.${owner.id}&addressee=eq.${mate.id}&select=status&limit=1`);
  if (!conn?.length) {
    const { status, body: made } = await as(owner, "connections", {
      method: "POST", body: JSON.stringify({ requester: owner.id, addressee: mate.id, status: "pending" }),
    });
    if (status >= 300) throw new Error(`connection request failed (${status}): ${JSON.stringify(made)?.slice(0, 200)}`);
    console.log("  connection: requested by owner (pending)");
    const { status: aStatus, body: acc } = await as(mate, `connections?requester=eq.${owner.id}&addressee=eq.${mate.id}`, {
      method: "PATCH", body: JSON.stringify({ status: "accepted" }),
    });
    if (aStatus >= 300 || !acc?.length) throw new Error(`the addressee could not accept the request (${aStatus}): ${JSON.stringify(acc)?.slice(0, 200)}`);
    console.log("  connection: accepted by mate — the two-step flow a real pair uses");
  } else console.log(`  connection: already ${conn[0].status}`);

  console.log("\nok — the durable accounts now own a crew and a group, each with a second real member.");
  console.log("Every row above was written by a USER's JWT, so it is also evidence RLS permits this state.");
}

run().catch((e) => { console.error("\nFAILED:", e.message); process.exit(1); });
