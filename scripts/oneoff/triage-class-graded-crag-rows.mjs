// The 225 class-graded rows filed under a crag discipline, triaged by evidence.
//
// I argued against a blanket reclassify and still do: for a real crag climb whose grade
// merely arrived as "3rd", `scrambling` is the wrong answer and would bury it under the
// wrong filter chip. But the 225 are not homogeneous. A large share are not climbs at all —
// they are the crag's DESCENT and APPROACH written up as routes ("Descent Route", "Approach
// Gully", "rap station", "Downclimb", "Access Scramble"). For those the class grade is
// CORRECT and the discipline is what is wrong: a 3rd-class descent gully IS scrambling.
//
// So: bucket by the name, which is the only trustworthy signal available (there is no
// overview, no gear, no length on any of them). Writes only bucket A.
//   A  name states it is descent/approach/access infrastructure  -> scrambling
//   B  everything else: a real crag climb with a bad grade       -> LEAVE ALONE
//
// --apply writes bucket A. Without it, dry run. --snapshot writes the before-state first.
import fs from "fs";
import { SUPABASE_URL, anonKey, headers, selectAll, patchRow } from "../lib/supabase-env.mjs";

const CRAG = new Set(["trad", "sport", "bouldering"]);
// `routes` has no `style` column, so the app's catOf() resolves discipline "rock" to "trad".
const catOf = (r) => r.discipline === "rock" ? "trad" : r.discipline;
const isClassGrade = (g) => {
  if (!g) return false;
  const s = String(g).trim();
  if (/^5\.\d/.test(s)) return false;
  return /^(?:class\s*)?[1-4](?:st|nd|rd|th)?(?:\s*class)?$/i.test(s) || /^class\s*[1-4]\b/i.test(s) || /^[1-4](?:st|nd|rd|th)\s*class$/i.test(s);
};
// Names that say outright "this is how you get down / in", not a climb.
const INFRA = /\b(descent|descend|downclimb|down-climb|rap station|rappel station|walk[- ]?off|approach|access|talus|scramble|scrambling|gully)\b/i;
// …but a named climb can contain "gully"/"scramble" too, so require the name to be
// dominated by the infrastructure word rather than merely contain it.
const CLIMBY = /\b(arete|crack|face|dihedral|corner|roof|slab|wall|route\s+\d|project|direct|variation)\b/i;

const APPLY = process.argv.includes("--apply");

const rows = (await selectAll("routes",
  "id,area_id,name,discipline,grade,grade_system,pitches,length_m,gear,overview,source",
  null, { pageSize: 1000 }))
  .filter((r) => CRAG.has(catOf(r)) && (isClassGrade(r.grade) || r.grade_system === "class"));
console.log("class-graded under a crag discipline:", rows.length);

// Never touch a row that shows signs of being a researched climb.
const researched = (r) => !!(r.overview || r.source || r.length_m || (Array.isArray(r.gear) && r.gear.length) || r.pitches > 0);

const A = [], B = [];
for (const r of rows) {
  const infra = INFRA.test(r.name) && !CLIMBY.test(r.name);
  (infra && !researched(r) ? A : B).push(r);
}
console.log("A  descent/approach infrastructure, unresearched -> scrambling:", A.length);
console.log("B  leave alone (real crag climb, or has research on it):      ", B.length);

console.log("\n--- bucket A ---");
for (const r of A) console.log("  " + r.id.padEnd(46) + r.name.slice(0, 46).padEnd(47) + "disc=" + r.discipline + " grade=" + JSON.stringify(r.grade));
console.log("\n--- bucket B, first 20 (left alone) ---");
for (const r of B.slice(0, 20)) console.log("  " + r.id.padEnd(46) + r.name.slice(0, 46).padEnd(47) + "disc=" + r.discipline + " grade=" + JSON.stringify(r.grade));

// Reversible: record the exact before-state of everything we will touch.
const snapPath = new URL("../../audits/2026-08-08-class-graded-crag-rows-before.json", import.meta.url).pathname;
fs.writeFileSync(snapPath, JSON.stringify({
  takenAt: "2026-08-08", note: "before-state for triage-class-graded-crag-rows.mjs --apply; restore by writing `discipline` back",
  bucketA: A.map((r) => ({ id: r.id, area_id: r.area_id, name: r.name, discipline: r.discipline, grade: r.grade })),
  bucketBLeftAlone: B.map((r) => ({ id: r.id, name: r.name, discipline: r.discipline, grade: r.grade })),
}, null, 1));
console.log("\nsnapshot ->", snapPath);

if (!APPLY) { console.log("\ndry run — re-run with --apply to write bucket A."); process.exit(0); }

let done = 0, failed = 0;
for (const r of A) {
  try { await patchRow("routes", r.id, { discipline: "scrambling" }, { filter: "discipline=eq." + encodeURIComponent(r.discipline) }); done++; }
  catch (e) { failed++; console.log("  FAILED " + r.id + ": " + e.message.slice(0, 120)); }
}
console.log(`\nwrote ${done}, failed ${failed}`);

// Reconcile: re-read and prove it landed.
const key = anonKey();
const ids = A.map((r) => r.id);
let confirmed = 0;
for (let i = 0; i < ids.length; i += 40) {
  const chunk = ids.slice(i, i + 40);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,discipline&id=in.(${chunk.map(encodeURIComponent).join(",")})`, { headers: headers(key) });
  for (const x of JSON.parse(await res.text())) if (x.discipline === "scrambling") confirmed++;
}
console.log(`reconciled: ${confirmed}/${A.length} now scrambling`);
if (confirmed !== A.length) { console.log("MISMATCH — investigate before trusting this run."); process.exit(1); }
