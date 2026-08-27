// #641 WAS FIXED AT THE CALLER, NOT IN THE FUNCTION — so the question is whether every caller got
// the guard.
//
// `scarfHrs` still opens `distKm=+distKm||0;gainM=+gainM||0;lossM=+lossM||0`, which is fine in
// itself: the headline estimate now gates on `hasHikeInputs` and names what is missing via
// `_missHike`, so a route with no approach data is told so rather than shown a 0.0hr leg.
//
// There are FOUR call sites. Two are the headline. The other two are per-SEGMENT, inside the
// itinerary table, and carry no visible guard:
//
//   const sh = scarfHrs(seg.distKm, seg.gainM, seg.lossM, fit, pack) + …
//   const cumH = depart + route.segments.slice(0,i+1).reduce((s,sg) => s + scarfHrs(sg.distKm, …
//
// If a segment can lack distKm or gainM, it contributes 0.0hr to a CUMULATIVE arrival time — the
// same defect as #641, one level down, and cumulative times are what a party reads to decide when
// to turn around.
//
// This asks the only question that settles it: do real routes have segments with those fields
// missing? Report-only.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,segments", "segments=not.is.null", { pageSize: 1000 });
if (!rows.length) {
  console.log("No route in the catalog carries a `segments` array at all.");
  console.log("The two unguarded call sites are therefore unreachable on real data — a latent shape,\nnot a live defect. Worth recording rather than fixing.");
  process.exit(0);
}

let withSegs = 0, totalSegs = 0, missingDist = 0, missingGain = 0, segsAllPresent = 0;
const examples = [];
for (const r of rows) {
  const segs = Array.isArray(r.segments) ? r.segments : null;
  if (!segs || !segs.length) continue;
  withSegs++;
  for (const s of segs) {
    totalSegs++;
    const d = s && s.distKm != null && s.distKm !== "" && Number.isFinite(Number(s.distKm));
    const g = s && s.gainM != null && s.gainM !== "" && Number.isFinite(Number(s.gainM));
    if (!d) missingDist++;
    if (!g) missingGain++;
    if (d && g) segsAllPresent++;
    else if (examples.length < 8) examples.push({ id: r.id, name: s && (s.label || s.name || s.type) || "(unnamed)", distKm: s && s.distKm, gainM: s && s.gainM });
  }
}

console.log(`${rows.length} route(s) carry a non-null segments column · ${withSegs} have a non-empty array`);
console.log(`${totalSegs} segment(s) total · ${segsAllPresent} carry both distKm and gainM`);
console.log(`${missingDist} missing distKm · ${missingGain} missing gainM\n`);
for (const e of examples) console.log(`   ${e.id}  "${e.name}"  distKm=${JSON.stringify(e.distKm)} gainM=${JSON.stringify(e.gainM)}`);

const bad = totalSegs - segsAllPresent;
console.log(bad
  ? `\n>> ${bad} segment(s) would contribute 0.0hr to a CUMULATIVE arrival time with no indication\n   that the leg is unmeasured. That is #641's shape at the segment level.`
  : `\nEvery segment carries both inputs, so the unguarded call sites cannot currently produce a\nsilent zero. LATENT, not live — the guard is the data, not the code, and nothing enforces it.`);
process.exit(0);
