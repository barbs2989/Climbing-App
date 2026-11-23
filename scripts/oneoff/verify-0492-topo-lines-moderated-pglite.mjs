// One-off: are the words on a topo LINE moderated (0492), and is a topo's CAPTION (0488)?
//
// Replays every migration into PGlite with Supabase's default grants (no network, no production),
// then acts as two real client roles, A (the author) and B (a reader):
//   1. a clean line is visible to B;
//   2. a line whose NAME, VARIATION CAPTION or MARKER NOTE holds a floor term is held on insert:
//      A still reads it, B does not, and the review queue has an "Automatic screening" entry;
//   3. a clean line EDITED to hold a floor term is held;
//   4. A cannot un-hold their own line by writing the column;
//   5. B can report A's line (the report copies its words and the photo), A cannot report their own;
//   6. A can appeal the held line, B cannot;
//   7. a topo CAPTION with a floor term is held, and a report of a topo copies its caption.
// Run it WITHOUT 0492 in supabase/migrations and 2-6 fail: that is the gap.
//   node scripts/oneoff/verify-0492-topo-lines-moderated-pglite.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "supabase", "migrations");
let failures = 0, passes = 0;
const ok = (c, m) => { console.log((c ? "  ok    " : "  FAIL  ") + m); if (c) passes++; else failures++; };
const dead = (m) => { console.error(`verify-0492 FAILED: ${m}. Nothing below was checked.`); process.exit(1); };

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
console.log(`verify-0492: ${files.length} migrations replayed${files.some((f) => f.startsWith("0492_")) ? "" : " (0492 is NOT among them: expect 2-6 to fail)"}.`);

const A = "00000000-0000-4000-8000-00000000000a", B = "00000000-0000-4000-8000-00000000000b";
try {
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values ('${A}', 'a@example.test', '{"name":"Ada First"}'), ('${B}', 'b@example.test', '{"name":"Bo Second"}');
    insert into areas (id, name, path) values ('zz_crag', 'Probe Crag', 'zz_crag');
    insert into routes (id, area_id, name, discipline) values ('zz_r1', 'zz_crag', 'Probe One', 'trad');
  `);
} catch (e) { dead("fixtures did not insert: " + e.message); }

// One statement as a client role; committed, so a later reader sees it.
async function as(uid, sql, params = []) {
  const role = uid ? "authenticated" : "anon";
  try {
    await db.exec("begin");
    await db.query("select set_config('request.jwt.claim.sub', $1, true), set_config('request.jwt.claim.role', $2, true), set_config('request.jwt.claims', $3, true)", [uid || "", role, JSON.stringify({ sub: uid || undefined, role })]);
    await db.exec(`set local role ${role}`);
    const r = await db.query(sql, params);
    await db.exec("commit");
    return { rows: r.rows };
  } catch (e) { await db.exec("rollback").catch(() => {}); return { error: e.message, rows: [] }; }
}
const TERM = (await db.query("select term from screening_terms order by length(term) desc limit 1")).rows[0].term;
const pts = JSON.stringify([{ x: 10, y: 80 }, { x: 40, y: 20 }]);

const topo = await as(A, "insert into topos (area_id, route_id, storage_path) values ('zz_crag', 'zz_r1', $1) returning id, moderation", [A + "/x-photo.jpg"]);
if (topo.error) dead("A could not post a topo photo: " + topo.error);
const T = topo.rows[0].id;
const line = (fields) => as(A, "insert into topo_lines (topo_id, route_id, points, pins, label, variants, variant_labels) values ($1, 'zz_r1', $2::jsonb, $3::jsonb, $4, '[]'::jsonb, $5::jsonb) returning id, moderation",
  [T, pts, JSON.stringify(fields.pins || []), fields.label || null, JSON.stringify(fields.variant_labels || [])]);
const seenBy = async (uid, id) => (await as(uid, "select id from topo_lines where id = $1", [id])).rows.length === 1;

// 1
const clean = await line({ label: "Direct start", pins: [{ x: 1, y: 1, category: "belay", note: "two bolts" }] });
ok(!clean.error && clean.rows[0].moderation === "visible", "1: a clean line is stored visible" + (clean.error ? " — " + clean.error : ""));
ok(await seenBy(B, clean.rows[0].id), "1: another climber reads it");

// 2
for (const [what, fields] of [["its name", { label: "the " + TERM + " line" }], ["a variation caption", { variant_labels: ["fine", TERM] }], ["a marker note", { pins: [{ x: 1, y: 1, category: "hazard", note: TERM }] }]]) {
  const r = await line(fields);
  const held = !r.error && r.rows[0] && r.rows[0].moderation === "held";
  ok(held, `2: a line with a floor term in ${what} is held on insert` + (r.error ? " — " + r.error : ""));
  if (!held) continue;
  ok(await seenBy(A, r.rows[0].id) && !(await seenBy(B, r.rows[0].id)) && !(await seenBy(null, r.rows[0].id)), `2: (${what}) its author still reads it; another climber and a signed-out reader do not`);
  const q = await db.query("select reporter_label, snapshot from user_reports where target_kind = 'topo_line' and target_id = $1", [r.rows[0].id]);
  ok(q.rows.length === 1 && q.rows[0].reporter_label === "Automatic screening" && String(q.rows[0].snapshot).includes(TERM), `2: (${what}) the review queue has its automatic-screening entry, with the words`);
}

// 3
const ed = await line({ label: "Left variation" });
const edId = ed.rows[0] && ed.rows[0].id;
const up = await as(A, "update topo_lines set label = $2 where id = $1 returning moderation", [edId, TERM]);
ok(!up.error && up.rows[0] && up.rows[0].moderation === "held", "3: a clean line edited to hold a floor term is held" + (up.error ? " — " + up.error : ""));
ok(!(await seenBy(B, edId)), "3: and another climber no longer reads it");

// 4
const un = await as(A, "update topo_lines set moderation = 'visible' where id = $1 returning moderation", [edId]);
ok(!!un.error || !(await seenBy(B, edId)), "4: its author cannot un-hold it by writing the column" + (un.error ? " (refused: " + un.error.slice(0, 60) + ")" : ""));

// 5
const rep = await as(B, "select report_content('topo_line', $1, 'Spam or scam', null) as id", [clean.rows[0].id]);
ok(!rep.error && !!rep.rows[0].id, "5: another climber can report a line" + (rep.error ? " — " + rep.error : ""));
if (!rep.error) {
  const s = (await db.query("select snapshot, snapshot_media::text as media, reported_id from user_reports where id = $1", [rep.rows[0].id])).rows[0];
  ok(String(s.snapshot).includes("Direct start") && String(s.snapshot).includes("two bolts") && s.media.includes("x-photo.jpg") && s.reported_id === A, "5: the report copies the line's words, names its author and carries the photo");
}
const own = await as(A, "select report_content('topo_line', $1, 'Spam or scam', null) as id", [clean.rows[0].id]);
ok(!!own.error, "5: its author cannot report their own line");

// 6
const ap = await as(A, "select file_appeal('topo_line', $1, 'that is a route name') as id", [edId]);
ok(!ap.error && !!ap.rows[0].id, "6: the author can appeal the held line" + (ap.error ? " — " + ap.error : ""));
const apB = await as(B, "select file_appeal('topo_line', $1, 'not mine') as id", [edId]);
ok(!!apB.error, "6: another climber cannot");

// 7
const repT = await as(B, "select report_content('topo', $1, 'Spam or scam', null) as id", [T]);
await as(A, "update topos set caption = 'North face from the notch' where id = $1", [T]);
const repT2 = await as(B, "select report_content('topo', $1, 'Spam or scam', null) as id", [T]);
const snapT = repT2.error ? "" : (await db.query("select snapshot from user_reports where id = $1", [repT2.rows[0].id])).rows[0].snapshot;
ok(!repT.error && String(snapT).includes("North face from the notch"), "7: a report of a topo photo copies its caption" + (repT2.error ? " — " + repT2.error : ""));
const cap = await as(A, "update topos set caption = $2 where id = $1 returning moderation", [T, "see " + TERM]);
ok(!cap.error && cap.rows[0].moderation === "held", "7: a caption with a floor term holds the topo (0488)" + (cap.error ? " — " + cap.error : ""));

console.log(`\nverify-0492: ${passes} passed, ${failures} failed.`);
process.exit(failures ? 1 : 0);
