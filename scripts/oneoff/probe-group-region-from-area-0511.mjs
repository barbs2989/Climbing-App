// One-off: does a group's STATE come from the catalog area it climbs at (0511)?
//
// Replays every migration into PGlite (no network, no production), builds canada > bc > Squamish and
// canada > nt > a crag, then writes groups as the owner would and reads them back:
//   1. a group that PICKED Squamish but typed only "Squamish" is filed under British Columbia, not Other,
//      and "squamish" / "bc" find it;
//   2. a group with no area that typed "Squamish, BC" (the form's custom place) is filed under BC;
//   3. a group with no area that typed only "Squamish" is still Other: the text names no state;
//   4. a client that writes area_region / area_place itself is overwritten by the trigger;
//   5. clearing the area falls back to the typed text;
//   6. a Northwest Territories area files its group there (place_regions() lacked NT before 0511);
//   7. discover_groups, called as another climber, lists by those regions.
// Run it WITHOUT 0511 in supabase/migrations and steps 1, 4, 6 and 7 fail: that is the bug.
//   node scripts/oneoff/probe-group-region-from-area-0511.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "supabase", "migrations");
let failures = 0, passes = 0;
const ok = (c, m) => { console.log((c ? "  ok    " : "  FAIL  ") + m); if (c) passes++; else failures++; };
const dead = (m) => { console.error(`probe-group-region-from-area-0511 FAILED: ${m}. Nothing below was checked.`); process.exit(1); };

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
const has = files.some((f) => f.startsWith("0511_"));
console.log(`probe-group-region-from-area-0511: ${files.length} migrations replayed${has ? "" : " (0511 is NOT among them: expect steps 1, 4, 6 and 7 to fail)"}.`);

const O = "00000000-0000-4000-8000-0000000000a1", V = "00000000-0000-4000-8000-0000000000b2";
const G1 = "00000000-0000-4000-8000-000000000001", G2 = "00000000-0000-4000-8000-000000000002", G3 = "00000000-0000-4000-8000-000000000003", G4 = "00000000-0000-4000-8000-000000000004";
try {
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${O}', 'o@example.test', '{"name":"Owner"}'), ('${V}', 'v@example.test', '{"name":"Visitor"}');
    insert into areas (id, name, path, lat, lng) values ('zzc', 'Probe Country', 'zzc', null, null);
    insert into areas (id, name, path, parent_id) values ('zzc_bc', 'British Columbia', 'zzc.zzc_bc', 'zzc'), ('zzc_nt', 'Northwest Territories', 'zzc.zzc_nt', 'zzc');
    insert into areas (id, name, path, parent_id, lat, lng) values
      ('zz_squamish', 'Squamish', 'zzc.zzc_bc.zz_squamish', 'zzc_bc', 49.7, -123.15),
      ('zz_nt_crag', 'Probe North Crag', 'zzc.zzc_nt.zz_nt_crag', 'zzc_nt', 62.45, -114.37);
    insert into groups (id, name, location, area_id, created_by, visibility) values
      ('${G1}', 'Probe Picked', 'Squamish', 'zz_squamish', '${O}', 'public'),
      ('${G2}', 'Probe Typed With State', 'Squamish, BC', null, '${O}', 'public'),
      ('${G3}', 'Probe Typed Bare', 'Squamish', null, '${O}', 'public'),
      ('${G4}', 'Probe North', '', 'zz_nt_crag', '${O}', 'public');
  `);
} catch (e) { dead("fixtures did not insert: " + e.message); }

const row = async (id) => (await db.query(`select region, area_region, area_place, search_text, lat from groups where id = $1`, [id])).rows[0];

// ── 1. picked Squamish, typed no state ─────────────────────────────────────────────────────────
{ const r = await row(G1);
  ok(r.region === "British Columbia", `1: a group placed at Squamish is filed under British Columbia (got ${r.region})`);
  ok(r.area_place === "Squamish" && r.area_region === "British Columbia", `1: the trigger wrote its area's name and state (${r.area_place} / ${r.area_region})`);
  ok(/\bsquamish\b/.test(r.search_text || "") && /\bbc\b/.test(r.search_text || ""), `1: "squamish" and "bc" are in its search text ("${r.search_text}")`); }
// ── 2 / 3. no area ─────────────────────────────────────────────────────────────────────────────
ok((await row(G2)).region === "British Columbia", "2: a typed \"Squamish, BC\" with no area is filed under British Columbia");
ok((await row(G3)).region === null, "3: a typed \"Squamish\" with no area still names no state (Other)");
// ── 4. a client cannot forge the area's state ──────────────────────────────────────────────────
await db.exec(`update groups set area_region = 'Utah', area_place = 'Moab' where id = '${G1}'`);
{ const r = await row(G1); ok(r.area_region === "British Columbia" && r.area_place === "Squamish" && r.region === "British Columbia", `4: a written area_region/area_place is overwritten (${r.area_region} / ${r.area_place})`); }
// ── 5. clearing the area ───────────────────────────────────────────────────────────────────────
await db.exec(`update groups set area_id = null, location = 'Salt Lake City, UT' where id = '${G1}'`);
{ const r = await row(G1); ok(r.region === "Utah" && r.area_region === null && r.area_place === null && r.lat === null, `5: with no area the typed text decides again (${r.region})`); }
await db.exec(`update groups set area_id = 'zz_squamish', location = 'Squamish' where id = '${G1}'`);
// ── 6. a territory the region table lacked ─────────────────────────────────────────────────────
ok((await row(G4)).region === "Northwest Territories", "6: a Northwest Territories area files its group there");
// ── 7. Discover, as another climber ────────────────────────────────────────────────────────────
async function discover(region, q = "") {
  try {
    await db.exec("begin");
    await db.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claims', $2, true)", [V, JSON.stringify({ sub: V, role: "authenticated" })]);
    await db.exec("set local role authenticated");
    const r = await db.query("select name from discover_groups(q => $1, p_region => $2) order by name", [q, region]);
    await db.exec("rollback");
    return r.rows.map((x) => x.name).join(",");
  } catch (e) { await db.exec("rollback").catch(() => {}); return "ERROR " + e.message; }
}
{ const g = await discover("British Columbia"); ok(g === "Probe Picked,Probe Typed With State", `7: the British Columbia chip lists both BC groups ("${g}")`); }
{ const g = await discover("Other"); ok(g === "Probe Typed Bare", `7: Other lists only the group whose place names no state ("${g}")`); }
{ const g = await discover(null, "squamish bc"); ok(g === "Probe Picked,Probe Typed With State", `7: searching "squamish bc" finds both ("${g}")`); }

console.log(`\nprobe-group-region-from-area-0511: ${passes} ok, ${failures} failed.`);
process.exit(failures ? 1 : 0);
