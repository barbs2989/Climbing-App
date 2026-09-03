// IS THE WITNESS'S LIST A SLICE OF THE SHARED ONE? — MEASURED: 9 hits, 0 real. SIGNAL FOUR OF
// FOUR TO FAIL. Kept so nobody rebuilds it.
//
// measure-propagated-camp-lists.mjs found 65 camp lists on more than one area and showed that
// three ranking signals are all unusable. What survived was manual: look for the route on one of
// these areas that does NOT carry the shared list, because that author was not the propagation.
// This tried to make that mechanical.
//
// THE IDEA. In the Mountain Loop corridor the witness (wa_three_fingers_south_peak_lookout)
// carried FOUR camps and all four were the shared list's Three Fingers entries — a SLICE of it,
// one peak's share. That is what a union looks like when a real author takes only their own part.
//
// THE RESULT. Nine witness lists are strict slices and EVERY ONE IS CORRECT DATA:
//   Terror Basin camp        -> the Picket peaks' camp, on 3 Picket routes
//   Colchuck Lake            -> Colchuck Peak's own camp
//   Camp Muir / Ingraham Flats -> exactly Ingraham Direct's camps
//   Glacier Meadows / Snow Dome / Elk Lake -> the Blue Glacier route's camps
//   Wing Lake / Lewis Lake   -> Black Peak's standard camps
//   Mackinaw Shelter / White Pass / Glacier Gap -> the North Fork Sauk approach
//   Eldorado Creek / Roush Creek / the Inspiration saddle -> Eldorado's own camps
//
// WHY IT FAILS, and this was written into the file BEFORE the run rather than discovered after: a
// slice is also exactly what a route with a SHORTER, MORE SPECIFIC camp list looks like on a peak
// that genuinely shares a basin. Being more specific than the zone list is GOOD data. The
// signature was true of Mountain Loop and is not diagnostic of it.
//
// SO THE CLASS IS NOT MECHANICALLY DETECTABLE with what the catalog holds. Four signals, four
// failures, each caught by a control rather than by reading the code. The existing
// audit:camp-route-fit — does a camp name a peak that is not this route's? — remains the only
// working test, and it under-reports by construction, which is a cost to accept rather than a bug
// to fix.
import { selectAll } from "../lib/supabase-env.mjs";

const areas = await selectAll("areas", "id,name,lat,lng", "", { pageSize: 1000 });
if (!areas.length) { console.log("FAIL CLOSED: zero areas"); process.exit(1); }
const areaById = new Map(areas.map((a) => [a.id, a]));

const rows = await selectAll("routes", "id,name,area_id,bivy", "bivy=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes with a bivy list"); process.exit(1); }

const names = (r) => (Array.isArray(r.bivy) ? r.bivy : [])
  .map((s) => (s && s.name) || "").filter(Boolean);
const key = (r) => names(r).slice().sort().join("  ");

// Loose match: one name is the other's prefix once trimmed to its first clause, or either
// contains the other. "Tin Can Gap" vs "Tin Can Gap high camp" must match; "Goat Lake basin" vs
// "Goat Flats" must not.
const head = (s) => s.toLowerCase().split(/[,—-]/)[0].trim().replace(/\s+/g, " ");
const alike = (a, b) => {
  const x = head(a), y = head(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [s, l] = x.length <= y.length ? [x, y] : [y, x];
  return s.length >= 8 && l.startsWith(s);
};

const groups = new Map();
for (const r of rows) {
  const k = key(r);
  if (!k) continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}

const out = [];
for (const [k, rs] of groups) {
  const areaIds = new Set(rs.map((r) => r.area_id));
  if (areaIds.size < 2) continue;                 // one area sharing its own camps is correct
  const shared = names(rs[0]);
  if (shared.length < 3) continue;                // a 2-camp list has no meaningful "slice"

  for (const w of rows) {
    if (!areaIds.has(w.area_id)) continue;
    if (key(w) === k) continue;                   // carries the shared list; not a witness
    const wn = names(w);
    if (!wn.length || wn.length >= shared.length) continue;

    const matched = wn.filter((c) => shared.some((s) => alike(c, s)));
    if (matched.length !== wn.length) continue;   // not a slice — a different list entirely

    out.push({
      witness: w.id,
      witnessArea: (areaById.get(w.area_id) || {}).name || w.area_id,
      witnessCamps: wn.length,
      sharedCamps: shared.length,
      areas: areaIds.size,
      routes: rs.length,
      areaNames: [...areaIds].map((id) => (areaById.get(id) || {}).name || id),
      slice: wn,
    });
  }
}

console.log(`scanned ${rows.length} routes; ${groups.size} distinct lists\n`);
console.log(`${out.length} witness list(s) are a strict SLICE of a shared list\n`);

out.sort((a, b) => (b.areas - a.areas) || (b.sharedCamps - a.sharedCamps));
for (const f of out) {
  console.log(`  ${f.witness}  on ${f.witnessArea}`);
  console.log(`     carries ${f.witnessCamps} camps, all of them in a ${f.sharedCamps}-camp list shared by ${f.routes} route(s) across ${f.areas} area(s)`);
  console.log(`     areas: ${f.areaNames.join(", ")}`);
  console.log(`     its slice: ${f.slice.join(" / ")}`);
}

console.log("\nALL NINE ARE CORRECT DATA — see the header. A slice is the propagation signature,");
console.log("and it is equally what a route with a SHORTER, MORE SPECIFIC list looks like on a peak");
console.log("that genuinely shares a basin. Being more specific than the zone list is GOOD data.");
console.log("Kept as a measurement, not a worklist: signal four of four to fail against a control.");
