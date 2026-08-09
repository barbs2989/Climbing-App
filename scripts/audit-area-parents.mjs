// audit:area-parents — is every area filed under the place it actually belongs to?
//
// WHY THIS EXISTS. The Liberty Bell Group is one ridge of five towers. Three of them --
// Lexington Tower, North Early Winters Spire, South Early Winters Spire, carrying 23
// routes including Liberty Crack's neighbours and the Direct East Buttress -- were
// parented as SIBLINGS of the group rather than inside it, so the group advertised 27
// routes against a true 50 and the best-known lines at Washington Pass rendered outside
// the formation every guidebook files them under. Kangaroo Ridge (route_count 0, holding
// two empty stubs while all five populated formations sat outside) and "Silver Star and
// Wine spires" (containing NEITHER Silver Star NOR three of the four Wine Spires) had the
// identical defect. 0106 repaired all three.
//
// Nothing could see it. check:counts proves route_count matches the SUBTREE it has -- it
// is exactly correct about a wrong tree. The ltree paths were self-consistent. No guard
// asks the prior question: is this the right subtree?
//
// THE MECHANISM, which is why this will recur. Two loads that were never joined: an
// OpenBeta-derived crag tree supplied the GROUPING rows plus hollow `crag` stubs for a few
// formations, and a separate alpine peak list attached every real summit FLAT to the
// region above. Any future import of a state with both shapes reproduces it.
//
//   node scripts/audit-area-parents.mjs                      Washington (the default)
//   node scripts/audit-area-parents.mjs --state washington   one state subtree, by AREA ID
//   node scripts/audit-area-parents.mjs --all                whole catalog
//   node scripts/audit-area-parents.mjs --inject=<case>      perturb the snapshot to test a detector
//
// `--state` takes an area **id**, not a postal code: the WA root row is `washington`, and
// scoping is done by walking the SUBTREE from it. Never filter by an id prefix -- the
// `id like 'wa_%'` reflex misses legacy ids such as `stuart_west_ridge`.
//
// REPORT-ONLY, like audit:identity and audit:distances -- not a pass/fail gate. Every
// detector here is a HYPOTHESIS GENERATOR, not a verdict, and the exit code says "I found
// things to look at", never "these are bugs". That framing is deliberate and was earned:
// the first drafts of D1 flagged 41 candidate peaks of which 12 were real, because
// coordinates cannot decide parentage in crag terrain (at the Icicle Creek boulders every
// formation is within 500 m of every other) and generic name tokens like "dome", "face"
// and "buttress" match across unrelated crags. Read every hit before acting on it.
//
// Read-only, anon key only -- a checker that can write is a checker that can corrupt what
// it is checking. Fails closed on an empty read: zero areas makes every tree look perfect,
// and this guard's realistic failure mode is a FALSE PASS.

import { selectAll } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const h = argv.find(a => a.startsWith(`--${k}=`)); return h ? h.split("=").slice(1).join("=") : d; };
const ALL = argv.includes("--all");
const STATE = (arg("state", "washington")).toLowerCase();
const INJECT = arg("inject", "");
const log = (...a) => console.log(...a);

log("reading areas (read-only, anon key)...");
const areas = await selectAll("areas", "id,name,area_type,parent_id,path,route_count,lat,lng,elevation_ft", "", { pageSize: 1000 });
log(`  areas=${areas.length}`);

if (!areas.length) {
  console.error("\naudit:area-parents FAILED — `areas` came back empty. That is a connection or\n" +
    "RLS problem, not a clean tree: reporting 'no misparents' off zero rows is a false pass.");
  process.exit(1);
}

// byId/kids are rebuilt from scratch by reindex(). An earlier draft built them ONCE,
// before injection, and every --inject case silently did nothing: the injections mutate
// parent_id, but the child lists were already frozen, so a peak "moved" out of its group
// was still listed as its child and never appeared as a sibling. All four tests passed by
// reporting the unperturbed tree. The maps must be derived AFTER any perturbation.
let byId = new Map(), kids = new Map();
const ch = id => kids.get(id) || [];
function reindex() {
  byId = new Map(areas.map(a => [a.id, a]));
  kids = new Map();
  for (const a of areas) { if (!kids.has(a.parent_id)) kids.set(a.parent_id, []); kids.get(a.parent_id).push(a); }
}
reindex();

// ---------------------------------------------------------------- injection
// This guard's faults live in the DATABASE and it is deliberately read-only, so the
// detectors are exercised by perturbing the fetched snapshot in memory. Nothing is
// written anywhere. Cases are named at the bottom of this file.
if (INJECT) {
  log(`  !! --inject=${INJECT} — perturbing the in-memory snapshot to test a detector`);
  // Perturb a row INSIDE the scope about to be audited. An earlier draft picked the first
  // matching row in the whole 47k-row catalog, which for the default Washington scope
  // handed --inject=path an Alaska area: the detector never saw it and the test "passed"
  // by reporting a clean tree. A guard that reports green because the fault was out of
  // frame is worse than no guard.
  const inj = ALL ? areas
    : areas.filter(a => a.path && (a.path.startsWith(`${STATE}.`) || a.path.includes(`.${STATE}.`)));
  if (!inj.length) { console.error(`--inject: no areas inside "${STATE}" to perturb`); process.exit(2); }
  if (INJECT === "stray") {
    // Pull a peak out of its group and re-file it as the group's sibling. This is the
    // Liberty Bell defect exactly; D1 must name it.
    const g = byId.get("wa_liberty_bell_group") || inj.find(a => ch(a.id).length > 2);
    const victim = ch(g.id).find(k => k.route_count > 0);
    victim.parent_id = g.parent_id;
    log(`     re-filed ${victim.id} as a sibling of ${g.id}`);
  } else if (INJECT === "stub") {
    // Clone a populated peak as a 0-route stub a few metres away. D2 must pair them.
    const real = inj.find(a => a.area_type === "peak" && a.route_count > 0 && a.lat && a.lng);
    const stub = { ...real, id: real.id + "_stub", name: real.name + "s", area_type: "crag",
                   route_count: 0, lat: real.lat + 0.0001, elevation_ft: null };
    areas.push(stub); byId.set(stub.id, stub);
    if (!kids.has(stub.parent_id)) kids.set(stub.parent_id, []);
    kids.get(stub.parent_id).push(stub);
    log(`     added 0-route stub ${stub.id} ~11 m from ${real.id}`);
  } else if (INJECT === "path") {
    // Break an ltree path without touching parent_id. D3 must catch the disagreement.
    const v = inj.find(a => a.parent_id && a.path && a.path.includes("."));
    v.path = "usa.bogus." + v.id;
    log(`     rewrote ${v.id}.path to a chain its parent_id does not produce`);
  } else if (INJECT === "orphan") {
    const v = inj.find(a => a.parent_id && byId.has(a.parent_id));
    v.parent_id = "no_such_area";
    log(`     pointed ${v.id}.parent_id at a row that does not exist`);
  } else {
    console.error(`unknown --inject=${INJECT}`); process.exit(2);
  }
  reindex();   // see the note on reindex() — without this every injection is a no-op
}

// ---------------------------------------------------------------- scope
// Scope is the UNION of two answers to "is this row in Washington?" -- the parent_id chain
// and the ltree path -- and never an id prefix (`id like 'wa_%'` misses legacy ids such as
// `stuart_west_ridge`).
//
// Taking either one ALONE hides exactly the corruption D3 exists to find, and both
// failures were caught by injection rather than by reading the code:
//
//   walking parent_id only  -- a row whose parent_id points at nothing has already fallen
//                              out of the walk, so it is not in scope and never checked.
//                              --inject=orphan reported a clean tree.
//   path prefix only        -- a row whose path was rewritten no longer says "washington",
//                              so it drops out too. --inject=path then reported clean,
//                              with the scope count one lower than the baseline.
//
// Each detector's blind spot is the other's evidence, so a row is in scope if EITHER
// source claims it. That is also why the scope count can exceed a healthy subtree: a row
// claimed by only one of the two is precisely a finding.
let inScope, scopeLabel;
if (ALL) { inScope = areas.slice(); scopeLabel = "whole catalog"; }
else {
  const root = byId.get(STATE);
  if (!root) { console.error(`no area with id "${STATE}" — pass --state <area id> or --all`); process.exit(2); }
  const byDescent = new Set();
  (function walk(id) { byDescent.add(id); for (const k of ch(id)) walk(k.id); })(root.id);
  inScope = areas.filter(a => a.id !== STATE &&
    (byDescent.has(a.id) || (a.path && a.path.split(".").includes(STATE))));
  scopeLabel = `${root.name} subtree`;
}
log(`  scope: ${scopeLabel} (${inScope.length} areas)\n`);

// ---------------------------------------------------------------- helpers
const R_EARTH = 6371;
const km = (a, b) => {
  const t = Math.PI / 180, dLa = (b.lat - a.lat) * t, dLo = (b.lng - a.lng) * t;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLo / 2) ** 2;
  return R_EARTH * 2 * Math.asin(Math.sqrt(h));
};
const XY = a => typeof a.lat === "number" && typeof a.lng === "number" && (a.lat !== 0 || a.lng !== 0);
const ancestors = a => { const p = []; let c = byId.get(a.parent_id); while (c) { p.unshift(c); c = byId.get(c.parent_id); } return p; };
const where = a => ancestors(a).map(x => x.name).slice(-3).join(" > ");
const FORMATION = new Set(["peak", "crag", "wall", "sector"]);
let findings = 0;
const section = t => log(`\n${"─".repeat(72)}\n${t}\n${"─".repeat(72)}`);

// ---------------------------------------------------------------- D1: stray peaks
// A formation GROUP (a region/range whose children are all formations, never sub-regions)
// with a peak-typed SIBLING standing inside its own footprint.
//
// Two design decisions that took a rewrite each:
//
//   * Radius comes from the GROUP ROW's coordinates, not its children's centroid. The
//     first version used the centroid and was blind to precisely the worst cases --
//     Kangaroo Ridge's only children were two 0-route stubs, so the group with the most
//     missing peaks produced the least usable footprint.
//   * Only `peak`-typed siblings are considered, and only groups of formations. Allowing
//     region-vs-region made Index's Lower Town Wall "belong inside" its own sibling Side
//     Walls, and allowing crags made every Icicle boulder a candidate for every other.
section("D1  a peak stands inside a formation group's footprint, but is its SIBLING");
const strays = [];
for (const g of inScope) {
  if (g.area_type !== "region" && g.area_type !== "range") continue;
  const gk = ch(g.id);
  if (!gk.length || !gk.every(k => FORMATION.has(k.area_type))) continue;
  if (!XY(g)) continue;
  // Floor at 1.2 km: an alpine formation group spans roughly that, and a group whose
  // children are all stubs has no measurable extent of its own.
  const radius = Math.max(1.2, ...gk.filter(XY).map(k => km(g, k)));
  const cands = ch(g.parent_id)
    .filter(s => s.id !== g.id && s.area_type === "peak" && XY(s) && km(g, s) <= radius * 1.3)
    .sort((a, b) => km(g, a) - km(g, b));
  if (cands.length) strays.push({ g, radius, cands });
}
strays.sort((a, b) => b.cands.reduce((s, c) => s + c.route_count, 0) - a.cands.reduce((s, c) => s + c.route_count, 0));
for (const { g, radius, cands } of strays) {
  findings += cands.length;
  log(`\n  GROUP "${g.name}" [${g.area_type}] route_count=${g.route_count}  ${g.id}`);
  log(`        in ${where(g)}   footprint r=${radius.toFixed(2)}km`);
  log(`        holds: ${ch(g.id).map(k => `${k.name}(${k.route_count})`).join(", ")}`);
  for (const s of cands) log(`     -> "${s.name}" [peak] ${s.route_count} routes, ${km(g, s).toFixed(2)}km away   ${s.id}`);
}
if (!strays.length) log("  none");

// ---------------------------------------------------------------- D2: hollow stubs
// A 0-route, childless area sitting within 100 m of a POPULATED area whose name reduces to
// the same thing. That is the fingerprint of the two-load mechanism: the crag tree's shell
// and the peak list's real row, both present, neither aware of the other.
//
// 100 m, not "same name anywhere". Loose name matching produced 37 pairs of which 3 were
// real -- WA holds five unrelated "South Face" crags up to 375 km apart, and "Temple, The"
// on Kangaroo Ridge is a genuine formation, not a duplicate of "The Temple" 114 km away in
// the Enchantments.
section("D2  a hollow 0-route stub duplicating a populated area metres away");
// Strip the plural BEFORE dropping generic words, not after. The reverse order -- which is
// what the first draft did -- removes "Peak" but keeps "Peaks", so "Abernathy Peak" and
// "Abernathy Peaks" canonicalise differently and the pair is never compared. Found by
// --inject=stub, which pluralises the name it clones and went undetected.
const GENERIC = new Set(["the", "mount", "mt", "peak", "mountain"]);
const canon = s => s.toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9 ]/g, " ")
  .split(/\s+/).filter(Boolean)
  .map(w => w.replace(/s$/, ""))
  .filter(w => !GENERIC.has(w))
  .sort().join(" ");
const byName = new Map();
for (const a of inScope) { const k = canon(a.name); if (!k) continue; if (!byName.has(k)) byName.set(k, []); byName.get(k).push(a); }
let stubs = 0;
for (const arr of byName.values()) {
  if (arr.length < 2) continue;
  const hollow = arr.filter(a => a.route_count === 0 && !ch(a.id).length && XY(a));
  const solid = arr.filter(a => a.route_count > 0 && XY(a));
  for (const e of hollow) for (const f of solid) {
    const d = km(e, f);
    if (d > 0.1) continue;
    stubs++; findings++;
    log(`\n  STUB "${e.name}" [${e.area_type}] 0 routes   ${e.id}`);
    log(`        in ${where(e)}`);
    log(`  REAL "${f.name}" [${f.area_type}] ${f.route_count} routes   ${f.id}`);
    log(`        in ${where(f)}`);
    log(`       separation: ${(d * 1000).toFixed(0)} m`);
  }
}
if (!stubs) log("  none");

// ---------------------------------------------------------------- D3: path integrity
// The ltree `path` is what every subtree query uses, and trg_areas_set_path (0001)
// recomputes it ONLY for the row whose parent_id changed -- it does not cascade to
// descendants. So a reparent that forgets to touch the children leaves paths that disagree
// with parent_id, and the two then answer the same question differently. 0097 hit exactly
// this and had to re-assign Boston Basin's seven children to fire the trigger.
section("D3  ltree path disagrees with the parent_id chain (or the parent is missing)");
let broken = 0;
for (const a of inScope) {
  const p = byId.get(a.parent_id);
  if (!p) { broken++; findings++; log(`  ORPHAN  ${a.id} — parent_id "${a.parent_id}" is not a row`); continue; }
  if (!a.path || !p.path) { broken++; findings++; log(`  NULL PATH  ${a.id} path=${a.path} parent=${p.id} path=${p.path}`); continue; }
  const expected = `${p.path}.${a.path.split(".").pop()}`;
  if (a.path !== expected) {
    broken++; findings++;
    log(`  MISMATCH  ${a.id}`);
    log(`       path   = ${a.path}`);
    log(`       parent = ${p.id} (${p.path})  ->  expected ${expected}`);
  }
}
if (!broken) log("  none");

// ---------------------------------------------------------------- summary
section("SUMMARY");
log(`  scope            ${scopeLabel} (${inScope.length} areas)`);
log(`  D1 stray peaks   ${strays.reduce((s, x) => s + x.cands.length, 0)} across ${strays.length} groups`);
log(`  D2 hollow stubs  ${stubs}`);
log(`  D3 path breaks   ${broken}`);
log(`\n  ${findings} thing(s) to look at. These are CANDIDATES, not verdicts —`);
log(`  D1 and D2 reason from coordinates and names, and both lie in crag terrain.`);
log(`  Confirm each against the group's own name and a guidebook before moving anything.`);
process.exit(0);

// ---------------------------------------------------------------- injection tests
// Run each and confirm the named detector fires. All operate on the in-memory snapshot;
// nothing is ever written. Against the tree as of 2026-08-09 the baseline is
// 2532 areas / D1 41 / D2 4 / D3 0, and each case below moves exactly one counter.
//
// WORTH KNOWING BEFORE YOU TRUST A GREEN RUN. Three separate defects in the first draft
// each made every injection report a clean tree, and none was visible by reading the
// detector -- only by injecting:
//
//   1. byId/kids were built ONCE, before injection. The injections mutate parent_id, so a
//      peak "moved" out of its group was still in the frozen child list and never showed
//      up as a sibling. Hence reindex() after any perturbation.
//   2. Injections picked their victim from the whole 47k-row catalog, so --inject=path
//      perturbed an ALASKA row while the default scope is Washington. Victims now come
//      from the scope being audited.
//   3. Scope was computed from one source at a time, and each choice hid one fault:
//      by parent_id, an orphan has already left the walk; by path, a rewritten path no
//      longer says "washington". Scope is now the union of both.
//
// The tell for all three was the same and is worth watching for: the injection log line
// printed, the counter did not move. Re-run all four after any change to scoping,
// indexing, or the detectors.
//
//   node scripts/audit-area-parents.mjs --inject=stray
//       pulls a populated peak out of the Liberty Bell Group and re-files it as the
//       group's sibling. D1 must list it under that group (41 -> 43: the peak is also
//       picked up by a second group whose radius overlaps). This is 0106's defect.
//
//   node scripts/audit-area-parents.mjs --inject=stub
//       clones a populated peak as a 0-route crag ~11 m away with a PLURALISED name.
//       D2 must pair them and print "separation: 11 m"  (4 -> 5).
//       The plural is the point: it is what caught canon() dropping "Peak" but keeping
//       "Peaks", which made the two names canonicalise differently and never compare.
//
//   node scripts/audit-area-parents.mjs --inject=path
//       rewrites one row's ltree path without touching parent_id. D3 must report
//       MISMATCH and print both the stored and the expected chain  (0 -> 1).
//
//   node scripts/audit-area-parents.mjs --inject=orphan
//       points a parent_id at a row that does not exist. D3 must report ORPHAN  (0 -> 1).
