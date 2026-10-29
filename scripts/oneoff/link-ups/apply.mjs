// Write the researched LINK-UPS (research-data/link-ups/*.json) into route_link_ups (0380).
//
//   node scripts/oneoff/link-ups/apply.mjs            # dry run: validates every file, writes nothing
//   node scripts/oneoff/link-ups/apply.mjs --write    # upserts, one row per second, then re-reads
//
// A research file is a JSON array of link-ups in the shape research-data/link-ups/BRIEF.md asks
// for, with each leg's `route_id` filled in by hand after resolving it against the catalog (null
// when the catalog does not hold that climb), and `also_route_ids` for catalog routes that are the
// whole link-up. `drop: true` keeps a researched entry in the log
// without publishing it. `sources`, `notes` and `confidence` stay in the file; the app never sees them.
//
// Every route_id is checked to EXIST before anything is written, and every written row is read
// back and compared, because a 200 from PostgREST is not evidence the row changed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, requireServiceKey, headers } from "../../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DIR = path.join(ROOT, "research-data/link-ups");
const WRITE = process.argv.includes("--write");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const key = requireServiceKey();

// Same throttle as scripts/lib/supabase-env.mjs: 30 s timeout, one minute's back-off and ONE retry
// on a timeout or 5xx, then stop.
async function call(url, init, what) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let res = null, err = null;
    try { res = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) }); } catch (e) { err = e; }
    if (res && res.status < 500) return res;
    const why = err ? String(err.message || err).slice(0, 80) : `HTTP ${res.status}`;
    if (attempt === 0) { console.error(`  ${what}: ${why} — backing off 60 s before one retry`); await sleep(60000); continue; }
    throw new Error(`${what}: ${why} twice — STOPPED (throttle rule). Re-run once the database answers.`);
  }
}

const BAD_TEXT = [/https?:\/\//i, /\b(mountain project|summitpost|peakbagger|cascadeclimbers|nwhikers|14ers\.com|beckey|guidebook|according to|fastest known)\b/i, /\b[A-Z]{4,}\b/];
function textProblems(s, field) {
  if (s == null || s === "") return [];
  return BAD_TEXT.filter((re) => re.test(s)).map((re) => `${field} matches ${re}`);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
const rows = [], problems = [], unplaced = [];
for (const f of files) {
  const list = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  for (const lu of list) {
    if (lu.drop) continue;
    const where = `${f}:${lu.id}`;
    const legs = (lu.legs || []).map((l) => ({ peak: String(l.peak || "").trim(), route: l.route ? String(l.route).trim() : null, route_id: l.route_id || null, connect: l.connect ? String(l.connect).trim() : null }));
    if (!/^[a-z]{2}_lu_[a-z0-9_]+$/.test(lu.id || "")) problems.push(`${where}: bad id`);
    if (legs.length < 2 || legs.some((l) => !l.peak)) problems.push(`${where}: needs 2+ legs, each with a peak`);
    if (!lu.how || lu.how.length < 20 || lu.how.length > 900) problems.push(`${where}: how must be 20-900 chars`);
    for (const fld of ["how", "descent", "logistics"]) problems.push(...textProblems(lu[fld], fld).map((p) => `${where}: ${p}`));
    legs.forEach((l, i) => problems.push(...textProblems(l.connect, `legs[${i}].connect`).map((p) => `${where}: ${p}`)));
    // also_route_ids: catalog routes that ARE the whole link-up (a "Ptarmigan Traverse" route), so the
    // section shows on that page too without posing as one of its legs.
    const route_ids = [...new Set(legs.map((l) => l.route_id).concat(lu.also_route_ids || []).filter(Boolean))];
    // No catalog climb to show it on (the catalog does not hold these summits as alpine, mountaineering
    // or scrambling routes): kept in the research log, not written, and counted so it is not lost.
    if (!route_ids.length) { unplaced.push(where); continue; }
    rows.push({ id: lu.id, name: lu.name, state: lu.state, region: lu.region || null, route_ids, legs, duration: lu.duration || null, how: lu.how, descent: lu.descent || null, logistics: lu.logistics || null, checked_at: lu.checked_at || new Date().toISOString().slice(0, 10) });
  }
}
const dupIds = rows.map((r) => r.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dupIds.length) problems.push(`duplicate ids: ${dupIds.join(", ")}`);

// Every route_id must exist.
const allIds = [...new Set(rows.flatMap((r) => r.route_ids))];
const found = new Set();
for (let i = 0; i < allIds.length; i += 80) {
  const chunk = allIds.slice(i, i + 80);
  const res = await call(`${SUPABASE_URL}/rest/v1/routes?select=id&id=in.(${chunk.map((x) => `"${x}"`).join(",")})`, { headers: headers(key) }, "GET routes");
  for (const r of await res.json()) found.add(r.id);
  await sleep(200);
}
for (const r of rows) for (const id of r.route_ids) if (!found.has(id)) problems.push(`${r.id}: route_id ${id} does not exist`);

console.log(`${files.length} file(s), ${rows.length} link-up(s), ${allIds.length} distinct climbs, ${problems.length} problem(s)`);
problems.forEach((p) => console.log("  - " + p));
if (unplaced.length) console.log(`${unplaced.length} link-up(s) resolve to no catalog climb and are not written:\n  ` + unplaced.join("\n  "));
if (problems.length) process.exit(1);
if (!WRITE) { console.log("dry run — nothing written (pass --write)"); process.exit(0); }

for (const r of rows) {
  const res = await call(`${SUPABASE_URL}/rest/v1/route_link_ups?on_conflict=id`, { method: "POST", headers: headers(key, { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" }), body: JSON.stringify(r) }, `upsert ${r.id}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`upsert ${r.id} -> ${res.status} ${text.slice(0, 200)}`);
  console.log("  wrote " + r.id);
  await sleep(1000);
}

// Reconcile: read every row back and compare.
const res = await call(`${SUPABASE_URL}/rest/v1/route_link_ups?select=id,route_ids,how&limit=2000`, { headers: headers(key) }, "GET route_link_ups");
const live = new Map((await res.json()).map((r) => [r.id, r]));
const bad = rows.filter((r) => { const l = live.get(r.id); return !l || l.how !== r.how || JSON.stringify(l.route_ids) !== JSON.stringify(r.route_ids); });
console.log(`reconciled: ${rows.length - bad.length}/${rows.length} rows match; table holds ${live.size}`);
if (bad.length) { console.log("MISMATCH: " + bad.map((r) => r.id).join(", ")); process.exit(1); }
