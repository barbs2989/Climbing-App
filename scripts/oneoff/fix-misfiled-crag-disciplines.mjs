// Eleven WA routes are filed under an alpine-family discipline that their OWN gear list and
// beta contradict. `discipline` is not a label: `catOf()` drives the per-discipline safety
// advice, the rack, the approach/summit planner and the CAMPING & BIVY panel, and the finder
// RPCs filter and rank on it. A 4-pitch bolted line on a roadside tuff plug is being handed
// alpine hazard advice and asked where it will spend the night.
//
// Every reassignment below is justified from the ROUTE'S OWN row — its gear array or its beta —
// with the crag's sibling disciplines as corroboration. The area type is deliberately NOT used
// as evidence; see measure-alpine-routes-on-crags.mjs, where that proxy returned 4,389 rows and
// was mostly wrong.
//
// THREE ROUTES ARE DELIBERATELY NOT CHANGED, and that is the important half:
//   wa_gully_1, wa_gully_2 (The Amphitheater, Cape Disappointment) and wa_east_gully (Agathla
//   Tower, Frenchman Coulee) are 3rd-class gullies filed as `scrambling`. That is TRUE. They
//   only look wrong because `catOf()` folds scrambling into the alpine bucket, so they draw a
//   camping panel at sea level and in the desert. Editing correct data to dodge a UI gate is
//   the wrong repair; if those panels are noise there, the gate is what should change.
//
// Assert-then-set: each row must still hold the discipline recorded here, so a route somebody
// else has since corrected is skipped rather than overwritten.
//
// --dry prints and writes nothing.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");

const FIXES = [
  { id: "wa_bowling_alley_aka_regular_route", from: "alpine", to: "sport",
    why: "its own beta says 'Ground-up bolted route'; gear is 12 quickdraws, a 60m rope and a belay device with NO rack at all" },
  { id: "wa_cobbles_101", from: "alpine", to: "sport",
    why: "same wall, same authors, same 'ground-up bolted' beta and the identical draws-only gear list" },
  { id: "wa_nest_route", from: "alpine", to: "trad",
    why: "gear names a 'Light trad rack: small-to-medium nuts and cams' alongside draws for the bolted sections" },
  { id: "wa_spectacle_route", from: "alpine", to: "trad",
    why: "gear names a 'Light trad rack for gaps between bolts'" },
  { id: "wa_top_gun", from: "alpine", to: "sport",
    why: "a 30 ft toprope rigged off Sidewinder's chains, placing no gear; the catalog has no toprope discipline, so sport is the closest true value" },
  { id: "wa_dirty_sanchez", from: "alpine", to: "trad",
    why: "single rack to 3 inches on a 7-pitch line whose five siblings on the same row are all trad" },
  { id: "wa_ride_the_lightning_2", from: "alpine", to: "trad",
    why: "its own beta calls it a 'Sport-and-trad' climb with bolted belays low and natural protection higher; siblings all trad" },
  { id: "wa_direct_finish", from: "alpine", to: "trad",
    why: "a single pitch taking 'rock protection'; all five siblings on Steeple Rock are trad" },
  { id: "wa_junior_s_farm", from: "alpine", to: "trad",
    why: "gear carries nuts and slings beside the draws — a mixed line, not an alpine one" },
  { id: "wa_prey", from: "alpine", to: "trad",
    why: "its own beta says protection is 'a mix of bolts and natural gear'; gear lists doubled cams and offsets; both siblings trad" },
  { id: "wa_chelan_butte_chelan_butte_trail", from: "mountaineering", to: "scrambling",
    why: "a WDFW trail hike to a drive-up summit; gear is a sun hat, hiking shoes and water. NOTE the catalog has no hiking discipline, so scrambling is the least-wrong available value and this row stays in alpine scope" },
];

requireServiceKey();
const ids = FIXES.map(f => f.id);
const rows = await selectAll("routes", "id,name,discipline", `id=in.(${ids.join(",")})`, { pageSize: 50 });
if (rows.length !== FIXES.length) {
  console.log(`FAIL: expected ${FIXES.length} rows, read ${rows.length} — ${ids.filter(i => !rows.some(r => r.id === i)).join(", ")} missing`);
  process.exit(1);
}
const byId = new Map(rows.map(r => [r.id, r]));

let changed = 0, skipped = 0;
for (const f of FIXES) {
  const r = byId.get(f.id);
  if (r.discipline === f.to) { console.log(`  already ${f.to}: ${f.id}`); skipped++; continue; }
  if (r.discipline !== f.from) { console.log(`  SKIP ${f.id} — is ${JSON.stringify(r.discipline)}, not the ${JSON.stringify(f.from)} this fix was written against`); skipped++; continue; }
  console.log(`${DRY ? "would set" : "setting"} ${f.id}  "${r.name}"  ${f.from} -> ${f.to}`);
  console.log(`      because ${f.why}`);
  if (!DRY) await patchRow("routes", f.id, { discipline: f.to });
  changed++;
}
console.log(`\n${DRY ? "would change" : "changed"} ${changed}; ${skipped} skipped`);
if (DRY || !changed) process.exit(0);

const after = await selectAll("routes", "id,discipline", `id=in.(${ids.join(",")})`, { pageSize: 50 });
const wrong = after.filter(r => { const f = FIXES.find(x => x.id === r.id); return f && r.discipline !== f.to; });
console.log(wrong.length ? `FAIL: ${wrong.length} row(s) did not take: ${wrong.map(r => `${r.id}=${r.discipline}`).join(", ")}` : "verified — every reassignment is stored");
process.exit(wrong.length ? 1 : 0);
