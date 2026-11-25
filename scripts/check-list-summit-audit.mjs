// A peak list counts a peak only from a route that REACHES ITS SUMMIT (owner, 2026-11-14: "they can't
// log a bouldering route and get the tick for climbing Castleton Tower").
//
// lib/lists.js counts a peak when a logged route sits on the peak's area or one of its `also`
// faces. Those areas also hold climbs that stop short: a V1 at the foot of Castleton, a crag on
// Pikes Peak's flank, a gulch ice flow. research-data/list-summit-audit/audit.json records a
// reviewed verdict for every such route, and lib/listSummit.js (generated from it) refuses the
// ones that do not top out.
//
// This guard keeps that true when lists change. It fails when:
//   1. a roster peak or `also` area was never audited - a NEW LIST, a new peak, or a new face
//      attached to a peak must be reviewed (scripts/audit-list-summit-routes.mjs, then
//      scripts/build-list-summit-audit.mjs) before it ships;
//   2. an area the audit DROPPED (its routes do not reach the summit) is attached again;
//   3. lib/listSummit.js no longer matches the audit's "does not reach the summit" verdicts, or a
//      verdict has no reason;
//   4. the rule itself stops working: a boulder problem on Castleton Tower ticks it, or wears the
//      Desert Towers chip, or a real summit route stops counting.
//
// New ROUTES added to an audited peak in the database are not visible to a static guard; run
// `node scripts/audit-list-summit-routes.mjs --check` (needs a DB slot) to list unreviewed ones.
// Bouldering and top-rope are refused by discipline whatever the audit says.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PEAK_ROSTERS, peakClimbed, routeInList } from "../lib/lists.js";
import { NOT_SUMMIT, reachesSummit } from "../lib/listSummit.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIT = path.join(ROOT, "research-data/list-summit-audit/audit.json");
const fail = [];
let audit;
try { audit = JSON.parse(fs.readFileSync(AUDIT, "utf8")); } catch (e) {
  console.error(`check:list-summit-audit FAILED — cannot read ${AUDIT}: ${e.message}`);
  process.exit(1);
}

export function unauditedAreas(rosters, reviewed) {
  const seen = new Set(reviewed), out = [];
  for (const [list, peaks] of Object.entries(rosters)) for (const p of peaks)
    for (const a of [p.id, ...(p.also || [])]) if (!seen.has(a)) out.push(`${list}: ${a}${a === p.id ? "" : ` (also of ${p.id})`}`);
  return out;
}

// 1. Every roster area audited.
const un = unauditedAreas(PEAK_ROSTERS, audit.reviewedAreas || []);
if (un.length) fail.push(`${un.length} peak-list area(s) were never audited for summit routes:\n    ${un.slice(0, 20).join("\n    ")}` +
  "\n  Run scripts/audit-list-summit-routes.mjs (DB slot), review the new routes into a verdicts-*.json, then scripts/build-list-summit-audit.mjs.");
// Self-test: a roster with one extra peak must be reported, or check 1 is blind.
if (!unauditedAreas({ ...PEAK_ROSTERS, zz_new: [{ id: "zz_unaudited_peak" }] }, audit.reviewedAreas || []).some(s => s.includes("zz_unaudited_peak")))
  fail.push("self-test: an unaudited peak was not reported — check 1 cannot fail.");

// 2. Dropped areas stay dropped.
const attached = new Set();
for (const peaks of Object.values(PEAK_ROSTERS)) for (const p of peaks) for (const a of p.also || []) attached.add(a);
for (const a of audit.areas || []) if (a.keepArea === false && attached.has(a.area))
  fail.push(`${a.area} is attached to ${a.peak} again, but the audit dropped it: ${a.reason}`);

// 3. The deny map is the audit's verdicts, every one with a reason.
const deny = new Set((audit.routes || []).filter(r => r.summits === false).map(r => r.id));
for (const r of audit.routes || []) {
  if (typeof r.summits !== "boolean") fail.push(`${r.id} has no verdict in the audit`);
  if (!r.reason || !String(r.reason).trim()) fail.push(`${r.id} has a verdict with no reason`);
}
const lib = new Set(Object.keys(NOT_SUMMIT));
const onlyAudit = [...deny].filter(id => !lib.has(id)), onlyLib = [...lib].filter(id => !deny.has(id));
if (onlyAudit.length || onlyLib.length) fail.push(`lib/listSummit.js is stale against the audit (missing ${onlyAudit.length}, extra ${onlyLib.length}, e.g. ${[...onlyAudit, ...onlyLib].slice(0, 3).join(", ")}). Re-run scripts/build-list-summit-audit.mjs.`);

// 4. The rule, end to end, on the case that prompted it.
const castleton = (PEAK_ROSTERS.desert || []).find(p => p.id === "ut_castleton_tower");
const boulder = { id: "zz_castleton_boulder", mountainId: "ut_castleton_tower", discipline: "bouldering", grade: "V1" };
const kor = { id: "zz_castleton_kor_ingalls", mountainId: "ut_castleton_tower", discipline: "trad", grade: "5.9" };
if (!castleton) fail.push("Castleton Tower is no longer on the Desert Towers roster — update this guard's case.");
else {
  if (peakClimbed(castleton, [boulder])) fail.push("a boulder problem on Castleton Tower ticks the peak");
  if (routeInList(boulder, "desert")) fail.push("a boulder problem on Castleton Tower wears the Desert Towers chip");
  if (reachesSummit({ ...boulder, discipline: "toprope" })) fail.push("a top-rope route reaches a summit");
  if (!peakClimbed(castleton, [kor])) fail.push("a summit route (Kor-Ingalls) no longer ticks Castleton Tower");
  const denied = Object.keys(NOT_SUMMIT)[0];
  if (denied && reachesSummit({ id: denied, mountainId: "x", discipline: "alpine" })) fail.push(`${denied} is in NOT_SUMMIT but reachesSummit() says it tops out`);
}

if (fail.length) {
  console.error(`check:list-summit-audit FAILED (${fail.length}):\n  ${fail.join("\n  ")}`);
  process.exit(1);
}
const rs = audit.routes.length;
console.log(`check:list-summit-audit OK — ${audit.reviewedAreas.length} list areas audited; ${rs} routes reviewed, ${deny.size} refused as not reaching the summit.`);
