// Brings every route that uses the Suiattle River Road (Forest Road 26) up to the closure in force on
// 2026-11-18: order 06-05-26-25 (from 2026-11-05) closes the road to vehicles from milepost 12 to the
// Suiattle River Trailhead. The post-flood closure at ~milepost 4 and the Miners Fire trail closure are
// no longer listed on the forest's alerts page, so text saying "16 closed miles" or "milepost 4" is wrong,
// and so are day hours that walk those 16 miles.
//
//   node scripts/oneoff/apply-suiattle-road.mjs fixes.json            # dry run
//   node scripts/oneoff/apply-suiattle-road.mjs fixes.json --apply    # write, with a rollback file
//
// fixes.json: [{ id, why, from: { <column>: value }, to: { <column>: value } }] — whole column values,
// only the columns that change. Compare-and-set: a row whose live value of any of those columns is no
// longer `from` is REFUSED. Every row written also gets access_checked_at = now, because its road and
// access facts were checked against the Forest Service's alerts that day.
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
import { itineraryShapeErrors } from "../../lib/itineraryShape.js";
import { shoutedStrings } from "../lib/shouted-prose.mjs";

// dist_km: three rows had 16 road miles added to their distance by the closure-distance pass (b03);
// the road walk is now 8 miles, so their distance drops by 8 miles too.
const COLS = new Set(["dist_km", "timing", "itinerary", "approach", "descent", "descent_text", "access", "road", "approach_logistics", "approach_variants"]);
const [file, flag] = process.argv.slice(2);
const APPLY = flag === "--apply";
const key = requireServiceKey();
const fixes = JSON.parse(fs.readFileSync(file, "utf8"));
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.keys(v).sort().reduce((o, k) => ((o[k] = canon(v[k])), o), {}) : v);
const same = (a, b) => JSON.stringify(canon(a ?? null)) === JSON.stringify(canon(b ?? null));
const near = (a, b) => Math.abs(a - b) < 0.05;
const isNum = (v) => typeof v === "number" && isFinite(v) && v >= 0 && v < 200;
const strs = (v, acc) => { if (typeof v === "string") acc.add(v); else if (v && typeof v === "object") Object.values(v).forEach((x) => strs(x, acc)); return acc; };
const SOURCE_WORDS = /\b(mountain ?project|summitpost|peakbagger|guidebook|trip reports?|according to|per (?:the )?[A-Z]|beckey|nwhikers|cascadeclimbers|wta)\b/i;
// The closure that is no longer in force, in the spellings the catalog used for it.
const STALE = /\b(mile ?post|MP)\s*4(\.5)?\b|milepost 4-4\.5|16 closed miles|15-16 (of the )?miles|roughly 15 miles each way|April 2, 2026|Apr 2, 2026|January 1, 2028|Jan 1, 2028|1 January 2028|06-05-26-03/i;

function errors(f) {
  const out = [];
  for (const c of Object.keys(f.to)) if (!COLS.has(c)) out.push(`column ${c} is not one this script writes`);
  if (Object.keys(f.from).sort().join() !== Object.keys(f.to).sort().join()) out.push("from and to name different columns");
  const added = [...strs(f.to, new Set())].filter((s) => !strs(f.from, new Set()).has(s));
  for (const s of added) {
    if (SOURCE_WORDS.test(s)) out.push("names a source: " + JSON.stringify(s.slice(0, 80)));
    if (STALE.test(s)) out.push("still states the old closure: " + JSON.stringify(s.slice(0, 100)));
  }
  const shout = shoutedStrings(f.to);
  if (shout.length) out.push("shouted prose: " + JSON.stringify(shout).slice(0, 120));
  // The one-total rule, on whatever hours the route ends up with.
  const t = "timing" in f.to ? f.to.timing : null, it = "itinerary" in f.to ? f.to.itinerary : null;
  if (t && isNum(t.totalHrs)) {
    const { approachTimeHrs: a, summitTimeHrs: s, descentTimeHrs: d, totalHrs: tot } = t;
    if ([a, s, d].every(isNum) && !near(a + s + d, tot)) out.push(`legs sum to ${a + s + d}, total is ${tot}`);
    const sec = Array.isArray(t.sectionBreakdown) ? t.sectionBreakdown : [];
    if (sec.length && sec.every((x) => isNum(x && x.hrs)) && !near(sec.reduce((x, y) => x + y.hrs, 0), tot)) out.push(`sections sum to ${sec.reduce((x, y) => x + y.hrs, 0)}, total is ${tot}`);
    const days = (it || f.from.itinerary || {}).days || [];
    if (days.length && days.every((x) => isNum(x && x.hours)) && !near(days.reduce((x, y) => x + y.hours, 0), tot)) out.push(`days sum to ${days.reduce((x, y) => x + y.hours, 0)}, total is ${tot}`);
  }
  if (it) {
    const had = new Set(f.from.itinerary ? itineraryShapeErrors(f.from.itinerary, { complete: true }) : []);
    out.push(...itineraryShapeErrors(it, { complete: true }).filter((e) => !had.has(e)).map((e) => "trip plan: " + e));
  }
  return out;
}

const rollback = [];
let ok = 0, refused = 0;
for (const f of fixes) {
  const bad = errors(f);
  if (bad.length) { console.log(`REFUSED ${f.id}: ${bad.join("; ")}`); refused++; continue; }
  const cols = Object.keys(f.to);
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(f.id)}&select=id,access_checked_at,${cols.join(",")}`, { headers: headers(key) });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length !== 1) { console.log(`REFUSED ${f.id}: not exactly one row`); refused++; continue; }
  const live = rows[0];
  if (cols.every((c) => same(live[c], f.to[c]))) { console.log(`ALREADY ${f.id}`); continue; }
  const drift = cols.filter((c) => !same(live[c], f.from[c]));
  if (drift.length) { console.log(`REFUSED ${f.id}: live ${drift.join(",")} is not the 'from' it was written against`); refused++; continue; }
  const T = (x) => (x && x.timing ? x.timing.totalHrs : "-");
  console.log(`${APPLY ? "WRITE" : "would write"} ${f.id}: ${cols.join(",")}${"timing" in f.to ? `  total ${T(f.from)} -> ${T(f.to)}` : ""}`);
  if (APPLY) {
    const body = { ...f.to, access_checked_at: new Date().toISOString() };
    await patchRow("routes", f.id, body);
    rollback.push({ id: f.id, before: { ...Object.fromEntries(cols.map((c) => [c, live[c]])), access_checked_at: live.access_checked_at }, after: body, why: f.why });
    await new Promise((res) => setTimeout(res, 1000));
  }
  ok++;
}
if (APPLY && rollback.length) {
  const rb = `audits/rollback-suiattle-road-${Date.now()}.json`;
  fs.writeFileSync(rb, JSON.stringify(rollback, null, 1));
  console.log("rollback:", rb);
}
console.log(`${APPLY ? "applied" : "dry run"}: ${ok} ok, ${refused} refused`);
