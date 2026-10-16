#!/usr/bin/env node
// Does a route's `rappels` field claim rappels its OWN descent_text says are not made?
//
// Both fields describe the same descent of the same climb, so when they disagree one of them is
// wrong — and the descent text is the longer, more specific, more recently researched of the two.
// `wa_mount_stuart_north_ridge` stored "6 raps to 30m" while its descent text said the Cascadian
// Couloir walk-off needs "no rappelling required (0 rappels)" and that the only rappel on the route
// is an optional bypass taken on the way UP. `wa_mount_baker_coleman_headwall` stored "2-3 rappels
// to 30m" against a text stating no trip report describes a fixed rappel on its descent at all.
//
// Nothing else can see this. Every coverage check asks whether the column is POPULATED, and it is —
// a wrong claim and a right one look identical from there.
//
// REPORT-ONLY, deliberately, and the exit code says "things to look at" rather than "these are
// bugs". Measured precision on the first run was 6 flagged, 1 real: a route may legitimately carry
// a walk-off descent AND a real rappel elsewhere on the day (Buckner's North Face rappels the
// Sharkfin Col step on the return leg, not the summit slopes), or offer rappelling as a conditional
// alternative to downclimbing (Stickney). CONFIRM EACH HIT BY READING BOTH FIELDS IN FULL before
// changing anything — same discipline as audit:area-parents.
//
// Read-only, anon key. Fails closed on an empty read: zero rows makes every route look consistent.
import { selectAll } from "./lib/supabase-env.mjs";

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf("--" + n); if (i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")) return args[i + 1]; const eq = args.find(a => a.startsWith("--" + n + "=")); return eq ? eq.slice(n.length + 3) : null; };
const INJECT = flag("inject");
const STATE = flag("state") || "wa";

// The descent text denying rappelling in the route's own words.
const DENIES = /\bno rappel|\(0 rappels?\)|\bzero rappels?\b|without rappelling|no rappelling required/i;
// The rappels field asserting a positive count. Narrow on purpose — a LEADING number. Prose that
// merely mentions a rappel ("...or rappel if wet") is not a claim that the descent has N of them,
// and matching it would bury the real hits.
const CLAIMS = /^\s*~?(\d+)\s*(?:[-–]\s*\d+)?\s*(?:x\s*)?(?:raps?|rappels?)\b|^\s*~?(\d+)\s*$/i;

const rows = await selectAll("routes", "id,name,area_id,discipline,rappels,descent_text", "", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about data this never saw."); process.exit(1); }
const scope = rows.filter(r => String(r.id).startsWith(STATE + "_") && r.rappels && r.descent_text);
if (!scope.length) { console.error(`FAIL — 0 ${STATE} routes carry both a rappels value and a descent text; every comparison below would be vacuous.`); process.exit(1); }

if (INJECT === "contradict") { const t = scope[0]; t.rappels = "6 raps to 30m"; t.descent_text = "Walk-off down the south side with no rappelling required (0 rappels)."; console.log(`[inject] ${t.id}: claims 6 raps against a descent text that denies any`); }
if (INJECT === "clean") { for (const t of scope) t.rappels = "None on the standard descent — this is a walk-off."; console.log("[inject] every claim rewritten as a walk-off; agreement must report 0"); }

const hits = [];
for (const r of scope) {
  if (!DENIES.test(r.descent_text)) continue;
  const m = CLAIMS.exec(String(r.rappels).trim());
  const n = m && +(m[1] || m[2]);
  if (n) hits.push({ r, n });
}

console.log(`${scope.length} ${STATE} routes carry both a rappels value and a descent text.`);
console.log(`${hits.length} claim a rappel count their own descent text denies.\n`);
for (const h of hits) {
  console.log(`  ${h.r.id}  [${h.r.area_id}]  "${h.r.name}"  claims ${h.n}`);
  console.log(`     rappels: ${String(h.r.rappels).replace(/\s+/g, " ").slice(0, 130)}`);
  console.log(`     descent: ${String(h.r.descent_text).replace(/\s+/g, " ").slice(0, 200)}\n`);
}
if (hits.length) {
  console.log("These are CANDIDATES, not findings. Read both fields in full before changing one:");
  console.log("  - a walk-off descent can still involve a real rappel elsewhere on the day (a col on the return leg);");
  console.log("  - rappelling is often a conditional alternative to downclimbing, not a contradiction;");
  console.log("  - and the descent text is the one to trust only because it is the more specific of the two, not by rule.");
}
process.exitCode = 0;

// Injection-tested:
//   --inject=contradict  a fabricated 6-rap claim against a walk-off text  -> must appear in the list
//   --inject=clean       every claim rewritten as a walk-off               -> must report 0
