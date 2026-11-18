// Applies researched trip times so each route states ONE total (owner, 2026-11-18: "Make sure total
// average time of trip is consistent and the same on each route for all fields").
//
//   node scripts/oneoff/apply-trip-time-consistency.mjs fixes.json            # dry run
//   node scripts/oneoff/apply-trip-time-consistency.mjs fixes.json --apply    # write, with a rollback file
//
// fixes.json: [{ id, from: { timing, itinerary }, to: { timing, itinerary }, why }]. Compare-and-set,
// as apply-timing-fixes.mjs does: a row whose live timing/itinerary is no longer `from` is REFUSED.
//
// THE ONE-TOTAL RULE, checked on every `to` before anything is written (tolerance 0.05 hr):
//   totalHrs == approach + summit + descent           (all three present)
//   totalHrs == the trip plan's day hours, summed      (when the plan has days)
//   totalHrs == the section breakdown's hours, summed  (when there is one)
// On a multi-day trip the total is MOVING time: the plan's own tile says "Moving", and the day
// count carries the elapsed time. That retires the "elapsed total" second convention
// [[summit-time-held-the-car-to-car-total]] recorded, which is what put a 36 hr total beside a
// 12 hr plan on the same screen.
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
import { itineraryShapeErrors } from "../../lib/itineraryShape.js";
import { shoutedStrings } from "../lib/shouted-prose.mjs";

const [file, flag] = process.argv.slice(2);
const APPLY = flag === "--apply";
const key = requireServiceKey();
const fixes = JSON.parse(fs.readFileSync(file, "utf8"));
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.keys(v).sort().reduce((o, k) => ((o[k] = canon(v[k])), o), {}) : v);
const same = (a, b) => JSON.stringify(canon(a ?? null)) === JSON.stringify(canon(b ?? null));
const near = (a, b) => Math.abs(a - b) < 0.05;
const isNum = (v) => typeof v === "number" && isFinite(v) && v >= 0 && v < 200;
const SOURCE_WORDS = /\b(mountain ?project|summitpost|peakbagger|guidebook|trip reports?|according to|per (?:the )?[A-Z]|beckey|nwhikers|cascadeclimbers|wta)\b/i;

// `before` is the stored plan: a shape problem it ALREADY had (a day title over 60 characters, a
// placeholder "Day 1" with no figures) is not this fix's to make, and must not block a time repair.
// Only a problem the proposal INTRODUCES is refused.
export function oneTotalErrors(t, it, before) {
  const out = [];
  if (!t || typeof t !== "object") return ["no timing"];
  const { approachTimeHrs: a, summitTimeHrs: s, descentTimeHrs: d, totalHrs: tot } = t;
  for (const [k, v] of Object.entries({ a, s, d, tot })) if (!isNum(v)) out.push(`leg ${k} is ${v}`);
  if (out.length) return out;
  if (!near(a + s + d, tot)) out.push(`legs sum to ${a + s + d}, total is ${tot}`);
  const sec = Array.isArray(t.sectionBreakdown) ? t.sectionBreakdown : [];
  if (sec.some((x) => !isNum(x && x.hrs))) out.push("a section has no hrs");
  else if (sec.length && !near(sec.reduce((x, y) => x + y.hrs, 0), tot)) out.push(`sections sum to ${sec.reduce((x, y) => x + y.hrs, 0)}, total is ${tot}`);
  if (it != null) {
    const had = new Set(before ? itineraryShapeErrors(before, { complete: true }) : []);
    out.push(...itineraryShapeErrors(it, { complete: true }).filter((e) => !had.has(e)).map((e) => "trip plan: " + e));
    const days = Array.isArray(it.days) ? it.days : [];
    // A plan with NO day hours prints no hours, so it cannot contradict the total; one with SOME is refused.
    if (days.every((x) => !(x && isNum(x.hours)))) { /* nothing on screen to disagree */ }
    else if (days.some((x) => !isNum(x && x.hours))) out.push("a day has no hours");
    else if (days.length && !near(days.reduce((x, y) => x + y.hours, 0), tot)) out.push(`days sum to ${days.reduce((x, y) => x + y.hours, 0)}, total is ${tot}`);
    if (typeof it.totalNote === "string" && SOURCE_WORDS.test(it.totalNote)) out.push("totalNote names a source");
  }
  const shout = shoutedStrings({ timing: t, itinerary: it });
  if (shout.length) out.push("shouted prose: " + JSON.stringify(shout).slice(0, 120));
  return out;
}

const rollback = [];
let ok = 0, refused = 0;
for (const f of fixes) {
  const bad = oneTotalErrors(f.to.timing, f.to.itinerary, f.from.itinerary);
  if (bad.length) { console.log(`REFUSED ${f.id}: ${bad.join("; ")}`); refused++; continue; }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(f.id)}&select=id,timing,itinerary`, { headers: headers(key) });
  const rows = await r.json();
  if (!Array.isArray(rows) || rows.length !== 1) { console.log(`REFUSED ${f.id}: not exactly one row`); refused++; continue; }
  const live = { timing: rows[0].timing, itinerary: rows[0].itinerary };
  if (same(live.timing, f.to.timing) && same(live.itinerary, f.to.itinerary)) { console.log(`ALREADY ${f.id}`); continue; }
  if (!same(live.timing, f.from.timing) || !same(live.itinerary, f.from.itinerary)) { console.log(`REFUSED ${f.id}: live row is not the researched 'from'`); refused++; continue; }
  const T = (x) => (x && x.timing ? x.timing.totalHrs : null);
  console.log(`${APPLY ? "WRITE" : "would write"} ${f.id}: total ${T(f.from)} -> ${T(f.to)}`);
  if (APPLY) {
    const body = { timing: f.to.timing };
    if (f.to.itinerary !== undefined && !same(f.from.itinerary, f.to.itinerary)) body.itinerary = f.to.itinerary;
    await patchRow("routes", f.id, body);
    rollback.push({ id: f.id, before: live, after: f.to });
    await new Promise((res) => setTimeout(res, 1000));
  }
  ok++;
}
if (APPLY && rollback.length) {
  const rb = `audits/rollback-trip-time-consistency-${Date.now()}.json`;
  fs.writeFileSync(rb, JSON.stringify(rollback, null, 1));
  console.log("rollback:", rb);
}
console.log(`${APPLY ? "applied" : "dry run"}: ${ok} ok, ${refused} refused`);
