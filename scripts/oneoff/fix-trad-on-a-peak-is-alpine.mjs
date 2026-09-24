// POLICY, decided by the user: "trad routes that climb a peak should be called alpine always."
//
// catOf() now applies that rule in the app, but the area browser's labels, its discipline filter
// and search read routes.discipline straight from the database, so the column has to say it too.
// Scope is the app's own signal: discipline `trad` (or legacy `rock`) on an area typed `peak`,
// exactly what climbsAPeak() reads. Measured 2026-09-24: 132 rows, all WA
// (scripts/oneoff/measure-trad-routes-on-peak-areas.mjs).
//
// Grades are unaffected: gradeSystemForDiscipline maps trad and alpine to the same YDS system.
//
// Dry run by default. --apply writes each row through patchRow (throws unless exactly one row
// changed), then re-reads every id and reconciles, because a 200 is not evidence the data changed.
// The ids written are printed so the change can be reversed row for row.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
if (APPLY) requireServiceKey();

const areas = await selectAll("areas", "id,name,area_type", "area_type=eq.peak", { pageSize: 1000 });
if (areas.length < 100) { console.error(`FAIL: only ${areas.length} peak-typed areas read — a broken scan, not an answer`); process.exit(1); }
const peak = new Map(areas.map(a => [a.id, a.name]));

const routes = await selectAll("routes", "id,name,area_id,discipline", "discipline=in.(trad,rock)", { pageSize: 1000 });
if (routes.length < 1000) { console.error(`FAIL: only ${routes.length} trad/rock routes read — a broken scan`); process.exit(1); }

const hits = routes.filter(r => peak.has(r.area_id));
console.log(`${hits.length} trad/rock route(s) on a peak-typed area will become alpine${APPLY ? "" : " (dry run — pass --apply to write)"}`);
for (const r of hits) console.log(`  ${r.id}  [${r.discipline} -> alpine]  on ${peak.get(r.area_id)}`);
if (!APPLY) process.exit(0);

let written = 0;
for (const r of hits) { await patchRow("routes", r.id, { discipline: "alpine" }); written++; }

// Reconcile: re-read every id and require all of them to say alpine now.
const ids = hits.map(r => r.id);
const back = [];
for (let i = 0; i < ids.length; i += 100) {
  const chunk = ids.slice(i, i + 100).map(x => `"${x}"`).join(",");
  back.push(...await selectAll("routes", "id,discipline", `id=in.(${chunk})`, { pageSize: 1000 }));
}
const wrong = back.filter(r => r.discipline !== "alpine");
console.log(`wrote ${written}; re-read ${back.length}; still not alpine: ${wrong.length}`);
if (back.length !== ids.length || wrong.length) { console.error("FAIL: reconcile did not match"); process.exit(1); }
console.log("ok — every row reads alpine on re-read");
