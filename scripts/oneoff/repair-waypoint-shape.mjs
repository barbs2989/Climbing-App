// Repair two MECHANICAL waypoint defects that stop good data from rendering.
// Dry-run by default. `--apply` writes; `--state` scopes (default washington).
//
//   node scripts/oneoff/repair-waypoint-shape.mjs
//   node scripts/oneoff/repair-waypoint-shape.mjs --apply
//
// Neither repair invents, moves, or reinterprets a coordinate. Both are shape fixes on
// data that is already correct and simply cannot reach the screen:
//
//  1. `elevFt` WITHOUT `elev`  (529 WA routes). RouteDetail reads `w.elev` and never
//     `w.elevFt` — grep the app, it appears zero times — so every one of those elevations
//     renders as nothing. The value is copied to `elev` unchanged; `elevFt` is left in
//     place, because something in the import pipeline may still read it and dropping a key
//     is not required to fix the render.
//
//  2. `type` NOT CAPITALISED  (203 WA routes). The app compares `w.type==="Trailhead"`,
//     `w.type==="Summit"||w.type==="Topout"`, `w.type==="Water"`, `w.type==="Bailout"`
//     and keys its colour and glyph maps on the same strings. A lowercase `trailhead`
//     therefore gets the fallback dot, and drops out of the trailhead/summit logic
//     entirely — it is not merely ugly.
//
// THE ONE RULE THAT MAKES (2) SAFE: only a type that case-insensitively equals one of the
// app's OWN eight canonical values is touched. Anything else is left alone and printed.
// Blanket-capitalising would invent vocabulary the app has no branch for — turning an
// unrecognised `water crossing` into `Water crossing` makes it look handled while it still
// falls through to the same fallback, which is worse than leaving it visibly odd.
//
// Writes go through patchRow, which throws unless exactly one row came back, so a wrong id
// or an RLS rejection cannot read as success. Every changed row is then RE-READ and
// reconciled — a 200 is not evidence the data changed.

import { selectAll, patchRow, SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const stateEq = argv.find(a => a.startsWith("--state="));
const stateIdx = argv.indexOf("--state");
const STATE = (stateEq ? stateEq.slice(8) : stateIdx >= 0 ? argv[stateIdx + 1] : "washington").toLowerCase();
const ALIAS = { wa: "washington", or: "oregon", ca: "california", co: "colorado", ut: "utah" };
const stateArg = ALIAS[STATE] || STATE;

// The app's own vocabulary — RouteDetail's colour map and glyph map are keyed on exactly
// these. Keep this list in sync with those two objects, not with whatever the DB holds.
const CANON = ["Trailhead", "Water", "Campsite", "Junction", "Hazard", "Summit", "Topout", "Bailout"];
const CANON_BY_LC = new Map(CANON.map(c => [c.toLowerCase(), c]));

const allAreas = await selectAll("areas", "id,name,path", null, { pageSize: 1000 });
if (!allAreas.length) { console.error("FAIL: read 0 areas."); process.exit(1); }
const areas = stateArg === "all" ? allAreas : allAreas.filter(a => String(a.path || "").split(".").includes(stateArg));
if (!areas.length) { console.error(`FAIL: no areas for "${stateArg}".`); process.exit(1); }

const routes = [];
const ids = areas.map(a => a.id);
for (let i = 0; i < ids.length; i += 80) {
  const chunk = ids.slice(i, i + 80).map(x => `"${x}"`).join(",");
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints&area_id=in.(${encodeURIComponent(chunk)})&limit=2000`;
  const res = await fetch(url, { headers: headers(anonKey()) });
  if (!res.ok) throw new Error(`GET routes chunk ${i} -> ${res.status}`);
  routes.push(...await res.json());
}
if (!routes.length) { console.error("FAIL: read 0 routes."); process.exit(1); }

const plan = [];
const offVocab = new Map();
let elevFixes = 0, caseFixes = 0;

for (const r of routes) {
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  if (!wps.length) continue;
  let touched = false;
  const next = wps.map(w => {
    if (!w || typeof w !== "object") return w;
    const out = { ...w };
    if (out.elevFt != null && out.elev == null) { out.elev = out.elevFt; elevFixes++; touched = true; }
    const t = String(out.type || "").trim();
    if (t) {
      const canon = CANON_BY_LC.get(t.toLowerCase());
      if (canon && canon !== t) { out.type = canon; caseFixes++; touched = true; }
      else if (!canon) offVocab.set(t, (offVocab.get(t) || 0) + 1);
    }
    return out;
  });
  if (touched) plan.push({ id: r.id, name: r.name, waypoints: next });
}

console.log(`${routes.length} routes read in scope "${stateArg}".`);
console.log(`Planned: ${plan.length} routes to patch — ${elevFixes} elev copies, ${caseFixes} type recasings.`);
if (offVocab.size) {
  console.log(`\nLeft alone — ${offVocab.size} type values outside the app's vocabulary (${CANON.join(", ")}):`);
  for (const [t, n] of [...offVocab].sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(5)}  ${JSON.stringify(t)}`);
  console.log("   These render with the fallback glyph. Decide each one deliberately; do not bulk-capitalise.");
}
if (!plan.length) { console.log("\nNothing to do."); process.exit(0); }
if (!APPLY) { console.log(`\nDry run. Re-run with --apply to write ${plan.length} rows.`); process.exit(0); }

console.log(`\nApplying to ${plan.length} rows…`);
let ok = 0;
const failed = [];
for (const p of plan) {
  try { await patchRow("routes", p.id, { waypoints: p.waypoints }); ok++; }
  catch (e) { failed.push({ id: p.id, err: String(e.message || e).slice(0, 160) }); }
  if (ok % 100 === 0 && ok) console.log(`   …${ok}/${plan.length}`);
}
console.log(`PATCH reported success on ${ok}/${plan.length}${failed.length ? `, ${failed.length} failed` : ""}.`);
for (const f of failed.slice(0, 10)) console.log("   FAIL", f.id, f.err);

// Re-read and reconcile. A 200 is not evidence the data changed.
console.log("\nRe-reading to verify…");
const changedIds = plan.map(p => p.id);
const after = [];
for (let i = 0; i < changedIds.length; i += 80) {
  const chunk = changedIds.slice(i, i + 80).map(x => `"${x}"`).join(",");
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,waypoints&id=in.(${encodeURIComponent(chunk)})&limit=2000`;
  const res = await fetch(url, { headers: headers(anonKey()) });
  if (!res.ok) throw new Error(`verify GET -> ${res.status}`);
  after.push(...await res.json());
}
let residualElev = 0, residualCase = 0;
for (const r of after) {
  for (const w of (Array.isArray(r.waypoints) ? r.waypoints : [])) {
    if (w && w.elevFt != null && w.elev == null) residualElev++;
    const t = String(w?.type || "").trim();
    const canon = CANON_BY_LC.get(t.toLowerCase());
    if (t && canon && canon !== t) residualCase++;
  }
}
console.log(`Verified ${after.length}/${changedIds.length} rows re-read.`);
console.log(`Residual elevFt-without-elev: ${residualElev} (expected 0)`);
console.log(`Residual mis-cased canonical types: ${residualCase} (expected 0)`);
if (residualElev || residualCase || after.length !== changedIds.length || failed.length) {
  console.error("VERIFICATION FAILED — the write did not fully land.");
  process.exit(1);
}
console.log("Both repairs verified against a fresh read.");
