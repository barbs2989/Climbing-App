// Writes researched trailhead facts (BRIEF.md) into routes.approach_logistics:
//   trailheadPass / trailheadParking / trailheadFacilities  — read by TrailheadCard.
// Usage: node scripts/oneoff/trailhead-facts/apply.mjs batches/b00.out.json [more…] [--dry]
// Each route of a trailhead group is re-read with the service key, must still name one of the
// group's trailhead names, and is patched one row at a time (patchRow paces 1 write/s and throws
// unless exactly one row changed), then re-read to reconcile. A rollback JSON of every touched
// row's prior approach_logistics is written before the first write.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const files = args.filter((a) => !a.startsWith("--"));
const HERE = path.dirname(fileURLToPath(import.meta.url));
const groups = new Map(JSON.parse(fs.readFileSync(path.join(HERE, "groups.json"))).map((g) => [g.key, g]));
const LIMITS = { pass: 60, parking: 140, facilities: 80 };
const KEY = { pass: "trailheadPass", parking: "trailheadParking", facilities: "trailheadFacilities" };

/* What a value may be: a short fact in our own words. Prices go stale and live in ACCESS, so a
   bracketed price after "Park entrance fee" is dropped. */
function clean(field, v) {
  if (v == null) return null;
  let s = String(v).replace(/\s+/g, " ").trim();
  if (field === "pass") s = s.replace(/^(Park entrance fee)\s*\(.*\)$/i, "$1");
  if (!s) return null;
  const why = s.length > LIMITS[field] ? "too long" : /https?:|www\./i.test(s) ? "link" : /\b(likely|probably|assume|reportedly|according)\b/i.test(s) ? "hedge/source" : /\b[A-Z]{5,}\b/.test(s.replace(/\b(SR|US|FR|NPS|USFS|WDFW|DNR|ADK|DEC)\b/g, "")) ? "caps" : null;
  if (why) { console.error(`  refused ${field} "${s}": ${why}`); return null; }
  return s;
}

const plan = [];
for (const f of files) {
  for (const x of JSON.parse(fs.readFileSync(path.resolve(f)))) {
    const g = groups.get(x.key);
    if (!g) { console.error(`unknown key ${x.key}`); process.exit(1); }
    const facts = {};
    for (const fld of Object.keys(KEY)) { const c = clean(fld, x[fld]); if (c) facts[KEY[fld]] = c; }
    /* One spelling per pass: in Washington and Oregon (Forest Service Region 6) the "recreation
       pass" a fee page names IS the Northwest Forest Pass, and two batches worded it each way. */
    if (facts.trailheadPass && (g.state === "Washington" || g.state === "Oregon")) facts.trailheadPass = facts.trailheadPass.replace(/^Northwest Forest Pass or \$5 day fee$/i, "$5 day fee or Northwest Forest Pass").replace(/^\$5 day fee or recreation pass$/i, "$5 day fee or Northwest Forest Pass");
    if (Object.keys(facts).length && (x.evidence || []).length) plan.push({ g, facts });
  }
}
console.log(`${plan.length} trailhead(s) with facts, ${plan.reduce((n, p) => n + p.g.routes.length, 0)} route row(s)`);

const key = requireServiceKey();
async function readRows(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const q = `${SUPABASE_URL}/rest/v1/routes?select=id,approach_logistics&id=in.(${ids.slice(i, i + 50).map(encodeURIComponent).join(",")})`;
    const r = await fetch(q, { headers: headers(key) });
    if (!r.ok) throw new Error(`read ${r.status} ${(await r.text()).slice(0, 200)}`);
    out.push(...(await r.json()));
  }
  return out;
}

const rollback = [], writes = [];
for (const { g, facts } of plan) {
  const rows = await readRows(g.routes);
  for (const r of rows) {
    const al = r.approach_logistics || {};
    if (!al.trailhead || !g.names.includes(al.trailhead)) { console.error(`  skip ${r.id}: trailhead is now "${al.trailhead}"`); continue; }
    const next = { ...al };
    let changed = false;
    for (const [k, v] of Object.entries(facts)) if (next[k] !== v) { next[k] = v; changed = true; }
    if (!changed) continue;
    rollback.push({ id: r.id, approach_logistics: r.approach_logistics });
    writes.push({ id: r.id, next, facts });
  }
}
console.log(`${writes.length} row(s) to write${DRY ? " (dry run)" : ""}`);
if (DRY || !writes.length) process.exit(0);
const rbFile = path.join(HERE, `rollback-${Date.now()}.json`);
fs.writeFileSync(rbFile, JSON.stringify(rollback, null, 1));
console.log(`rollback: ${rbFile}`);
let done = 0;
for (const w of writes) {
  await patchRow("routes", w.id, { approach_logistics: w.next });
  if (++done % 25 === 0) console.log(`  ${done}/${writes.length}`);
}
// Reconcile: every written row must now read back with the facts.
const back = await readRows(writes.map((w) => w.id));
const bad = writes.filter((w) => { const r = back.find((b) => b.id === w.id); return !r || Object.entries(w.facts).some(([k, v]) => (r.approach_logistics || {})[k] !== v); });
console.log(`wrote ${done}; re-read ${back.length}; mismatched ${bad.length}`);
if (bad.length) { console.error(bad.map((b) => b.id).join("\n")); process.exit(1); }
