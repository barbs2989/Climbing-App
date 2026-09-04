// IS "an approach marker listed AFTER the summit" ONE mechanism, or 81 separate judgements?
//
// `audit:waypoint-order` reports this class and CLAUDE.md says, correctly, that it must NOT be
// reordered: the information that would justify an order is `distMi`, and these routes are
// exactly the ones that lack it. `probe-waypoint-order-coverage.mjs` sizes the gap. Neither asks
// what SHAPE the class is — and the shape is what tempts the next session into a bulk fix.
//
// THE ANSWER IS THAT IT LOOKS MECHANICAL AND IS NOT, WHICH IS WHY THIS EXISTS. 67 of 81 (83%)
// lead with one of three runs — `Trailhead,Summit`, a bare `Summit`, or `Trailhead,Topout` —
// with an approach-ONLY tail behind it. That is the fingerprint of a pass that wrote the summit
// first and appended approach pins after it, not of 81 authors each choosing an order. From
// there, "move the summit to the end, preserving everything else" reads like a safe transform.
//
// IT IS NOT SAFE, and the proof is built in rather than argued: a DESCENT route has the IDENTICAL
// shape, because summit-first is the correct reading order for one. Both routes CLAUDE.md names
// as descent sequences sit INSIDE the fingerprint. A bulk reorder would take two known-correct
// routes and break them, and nothing in the shape separates them from the other 79 — only reading
// the route does.
//
// So this is a measurement, not a worklist. Report-only, read-only, anon key.
import { selectAll } from "../lib/supabase-env.mjs";

const APPROACH = new Set(["Trailhead", "Junction", "Water", "Campsite", "Hazard", "Approach", "Pass", "Camp"]);
const SUMMITY = new Set(["Summit", "Topout"]);
const num = (x) => (x == null || x === "" ? null : (Number.isFinite(+x) ? +x : null));

// The two CLAUDE.md names as descent sequences, where summit-first is CORRECT. If either falls
// outside the fingerprint this file's conclusion is wrong and should be re-derived.
const KNOWN_DESCENT = ["wa_forbidden_peak_east_ledges", "wa_davis_peak_nc_north_face"];

const state = (process.argv.find((a) => a.startsWith("--state=")) || "--state=wa").split("=")[1];
const rows = await selectAll("routes", "id,name,discipline,waypoints", `id=like.${state}_*`, { pageSize: 1000 });
if (!rows.length) { console.error(`FAIL - 0 ${state} routes read. An empty read is not a clean catalog.`); process.exit(1); }

let carry = 0, unsortable = 0;
const hits = [];
for (const r of rows) {
  const w = Array.isArray(r.waypoints) ? r.waypoints : [];
  if (w.length < 2) continue;
  carry++;
  const d = w.map((x) => num(x && (x.distMi ?? x.dist_mi)));
  if (d.every((x) => x != null)) continue;      // orderWaypoints CAN sort these; the screen is right
  unsortable++;
  const si = w.findIndex((x) => x && SUMMITY.has(x.type));
  if (si < 0 || si === w.length - 1) continue;
  if (!w.slice(si + 1).every((x) => x && APPROACH.has(x.type))) continue;  // a real post-summit leg
  hits.push({ id: r.id, disc: r.discipline || "?", n: w.length, si, types: w.map((x) => (x && x.type) || "?") });
}
if (!carry) { console.error("FAIL - no route carries 2+ waypoints; the walk broke."); process.exit(1); }

console.log(`${carry} ${state} route(s) with 2+ waypoints; ${unsortable} unsortable (a pin lacks distMi)`);
console.log(`${hits.length} of those put an APPROACH-ONLY tail after the summit\n`);

const lead = {};
for (const h of hits) { const k = h.types.slice(0, h.si + 1).join(","); lead[k] = (lead[k] || 0) + 1; }
const top = Object.entries(lead).sort((a, b) => b[1] - a[1]);
console.log("the run up to and including the summit:");
for (const [k, v] of top.slice(0, 8)) console.log(`  ${String(v).padStart(3)}  ${k}`);
const share = top.slice(0, 3).reduce((n, [, v]) => n + v, 0);
console.log(`\n  top three shapes cover ${share} of ${hits.length} (${Math.round(share / hits.length * 100)}%) — a MECHANICAL fingerprint,`);
console.log("  which is exactly what makes a bulk reorder tempting.");

console.log("\nAND WHY IT MUST NOT BE DONE — a descent route has the same shape:");
let contaminated = 0;
for (const id of KNOWN_DESCENT) {
  const inSet = hits.some((h) => h.id === id);
  if (inSet) contaminated++;
  console.log(`  ${inSet ? "INSIDE " : "outside"}  ${id}`);
}
if (!contaminated) {
  console.log("\n  NEITHER is inside the fingerprint. That contradicts this script's own conclusion —");
  console.log("  re-derive it before quoting the 'do not reorder' rule from here.");
  process.exit(1);
}
console.log(`\n  ${contaminated} of ${KNOWN_DESCENT.length} known-correct descent routes sit inside it. Nothing in the shape`);
console.log("  separates them from the rest; only reading the route does. Report only — nothing changed.");
