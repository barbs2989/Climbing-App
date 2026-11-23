// One-off: does TOP CONTRIBUTORS leave out the climbers Ranks leaves out (0479)?
//
// Replays every migration into PGlite with Supabase's default grants (as check:profile-privacy does;
// no network, no production), builds a state > crag with three climbers who each logged public climbs
// there (A 3 pts, B 2, C 1), then reads area_top_contributors, user_top_contributor_areas and
// leaderboard('area') as the real client roles:
//   1. nobody hidden: every reader sees A, B, C in that order, on the crag and on the state above it;
//   2. A turns "Show me on leaderboards" off: A is on nobody's board (A's own included), holds no
//      Top Contributor badge, and B (now first of two) holds it;
//   3. A blocks C: C does not see A, A does not see C, B and a signed-out reader see both;
//   4. the people on an area's board are the people Ranks By area gives contribution points there.
// Run it WITHOUT 0479 in supabase/migrations and steps 2 and 3 fail: that is the bug.
//   node scripts/oneoff/probe-top-contributors-0479.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "supabase", "migrations");
let failures = 0, passes = 0;
const ok = (c, m) => { console.log((c ? "  ok    " : "  FAIL  ") + m); if (c) passes++; else failures++; };
const dead = (m) => { console.error(`probe-top-contributors-0479 FAILED: ${m}. Nothing below was checked.`); process.exit(1); };

let PGlite, ltree, pg_trgm, pgcrypto, uuid_ossp;
try {
  ({ PGlite } = await import("@electric-sql/pglite"));
  ({ ltree } = await import("@electric-sql/pglite/contrib/ltree"));
  ({ pg_trgm } = await import("@electric-sql/pglite/contrib/pg_trgm"));
  ({ pgcrypto } = await import("@electric-sql/pglite/contrib/pgcrypto"));
  ({ uuid_ossp } = await import("@electric-sql/pglite/contrib/uuid_ossp"));
} catch { dead("@electric-sql/pglite is not installed (npm install)"); }

// The pre-migration stand-ins are check:migration-replay's own, read from it so the two cannot drift.
const replaySrc = fs.readFileSync(path.join(ROOT, "scripts", "check-migration-replay.mjs"), "utf8");
const preStart = replaySrc.indexOf("await db.exec(`");
if (preStart < 0) dead("could not find check:migration-replay's setup block");
const pre = replaySrc.slice(preStart + 15, replaySrc.indexOf("`);", preStart));

const db = new PGlite({ extensions: { ltree, pg_trgm, pgcrypto, uuid_ossp } });
await db.exec(pre);
await db.exec(`
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
`);
const files = fs.readdirSync(DIR).filter((f) => /^\d+_.*\.sql$/.test(f)).sort();
if (files.length < 200) dead(`only ${files.length} migrations found`);
for (const f of files) {
  try { await db.exec("begin"); await db.exec(fs.readFileSync(path.join(DIR, f), "utf8")); await db.exec("commit"); }
  catch (e) { await db.exec("rollback").catch(() => {}); dead(`${f} did not replay: ${e.message}`); }
}
const has0479 = files.some((f) => f.startsWith("0479_"));
console.log(`probe-top-contributors-0479: ${files.length} migrations replayed${has0479 ? "" : " (0479 is NOT among them: expect steps 2 and 3 to fail)"}.`);

const A = "00000000-0000-4000-8000-00000000000a", B = "00000000-0000-4000-8000-00000000000b", C = "00000000-0000-4000-8000-00000000000c";
const NAME = { [A]: "A", [B]: "B", [C]: "C" };
try {
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${A}', 'a@example.test', '{"name":"Ada First"}'),
      ('${B}', 'b@example.test', '{"name":"Bo Second"}'),
      ('${C}', 'c@example.test', '{"name":"Cy Third"}');
    insert into areas (id, name, path) values ('zz_state', 'Probe State', 'zz_state');
    insert into areas (id, name, path, parent_id) values ('zz_crag', 'Probe Crag', 'zz_state.zz_crag', 'zz_state');
    insert into routes (id, area_id, name, discipline) values
      ('zz_r1', 'zz_crag', 'Probe One', 'sport'), ('zz_r2', 'zz_crag', 'Probe Two', 'sport'), ('zz_r3', 'zz_crag', 'Probe Three', 'sport');
    insert into climb_logs (user_id, route_id, discipline, date_climbed, tick_type, trip_report_visibility) values
      ('${A}', 'zz_r1', 'sport', current_date - 3, 'Redpoint', 'public'), ('${A}', 'zz_r2', 'sport', current_date - 3, 'Redpoint', 'public'), ('${A}', 'zz_r3', 'sport', current_date - 3, 'Redpoint', 'public'),
      ('${B}', 'zz_r1', 'sport', current_date - 2, 'Redpoint', 'public'), ('${B}', 'zz_r2', 'sport', current_date - 2, 'Redpoint', 'public'),
      ('${C}', 'zz_r1', 'sport', current_date - 1, 'Redpoint', 'public');
  `);
} catch (e) { dead("fixtures did not insert: " + e.message); }

async function as(role, uid, sql, params = []) {
  try {
    await db.exec("begin");
    await db.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true), set_config('request.jwt.claims', $3, true)", [uid || "", role, JSON.stringify(uid ? { sub: uid, role } : { role })]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(sql, params);
    await db.exec("rollback");
    return { rows: r.rows };
  } catch (e) { await db.exec("rollback").catch(() => {}); return { error: e.message }; }
}
const READERS = [["signed out", "anon", null], ["A", "authenticated", A], ["B", "authenticated", B], ["C", "authenticated", C]];
const board = async (role, uid, aid) => { const r = await as(role, uid, "select contributor, n from area_top_contributors($1, 5)", [aid]); return r.error ? "ERROR " + r.error : r.rows.map((x) => (NAME[x.contributor] || x.contributor) + "=" + x.n).join(" "); };
const badge = async (role, uid, who) => { const r = await as(role, uid, "select area_id from user_top_contributor_areas($1) order by 1", [who]); return r.error ? "ERROR " + r.error : r.rows.map((x) => x.area_id).join(","); };
const ranks = async (uid, aid) => { const r = await as("authenticated", uid, "select user_id, contribs from leaderboard('area', $1) where contribs > 0 order by contribs desc, user_id", [aid]); return r.error ? "ERROR " + r.error : r.rows.map((x) => NAME[x.user_id] + "=" + x.contribs).join(" "); };
const expectBoards = async (step, want) => {
  for (const [who, role, uid] of READERS) for (const aid of ["zz_crag", "zz_state"]) {
    const got = await board(role, uid, aid);
    ok(got === want[who], `${step}: ${who} reads ${aid} as "${got}"${got === want[who] ? "" : ` (wanted "${want[who]}")`}`);
  }
};

// ── 1. nobody hidden, nobody blocked ─────────────────────────────────────────────────────────────────
const ALL = "A=3 B=2 C=1";
await expectBoards("1 nobody hidden", { "signed out": ALL, A: ALL, B: ALL, C: ALL });
ok((await badge("anon", null, A)) === "zz_crag,zz_state", "1: A, first of three, holds the badge for the crag and the state");
ok((await badge("anon", null, B)) === "", "1: B, second, holds no badge");
for (const [who, , uid] of READERS.slice(1)) { const g = await ranks(uid, "zz_crag"); ok(g === ALL, `1: Ranks By area, read by ${who}, gives contribution points to the same people ("${g}")`); }

// ── 2. A turns "Show me on leaderboards" off ─────────────────────────────────────────────────────────
await db.exec(`update profiles set show_on_ranks = false where id = '${A}'`);
const NO_A = "B=2 C=1";
await expectBoards("2 A hidden", { "signed out": NO_A, A: NO_A, B: NO_A, C: NO_A });
ok((await badge("anon", null, A)) === "" && (await badge("authenticated", A, A)) === "", "2: A holds no Top Contributor badge, to anyone or to themselves");
ok((await badge("authenticated", C, B)) === "zz_crag,zz_state", "2: B, now first of two, holds the badge");
{ const g = await ranks(B, "zz_crag"); ok(g === NO_A, `2: Ranks By area agrees for B ("${g}")`); }
await db.exec(`update profiles set show_on_ranks = true where id = '${A}'`);

// ── 3. A blocks C ────────────────────────────────────────────────────────────────────────────────────
await db.exec(`insert into blocked_users (blocker, blocked) values ('${A}', '${C}')`);
await expectBoards("3 A blocked C", { "signed out": ALL, A: "A=3 B=2", B: ALL, C: NO_A });
{ const g = await ranks(C, "zz_crag"); ok(g === NO_A, `3: Ranks By area agrees for C, the blocked climber ("${g}")`); }
{ const g = await ranks(A, "zz_crag"); ok(g === "A=3 B=2", `3: Ranks By area agrees for A, who blocked ("${g}")`); }
ok((await badge("authenticated", C, A)) === "", "3: C is not shown A's badge");
ok((await badge("authenticated", B, A)) === "zz_crag,zz_state", "3: B still is");

console.log(`\nprobe-top-contributors-0479: ${passes} ok, ${failures} failed.`);
process.exit(failures ? 1 : 0);
