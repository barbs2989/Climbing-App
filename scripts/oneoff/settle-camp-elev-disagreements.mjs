// FOUR CAMPS WHERE THE CATALOG AND THE GROUND DISAGREE — ASK A THIRD RECORD NOBODY HAS ASKED.
//
// solve-camp-elevations.mjs refuses a name when the catalog's own waypoint and the DEM under the
// gazetteer's feature disagree, on the correct reasoning that one record is wrong and picking
// silently is worse than leaving the blank. CLAUDE.md records Skagit Queen Camp that way — catalog
// 4,000 ft against DEM 3,093 ft — and leaves it unwritten.
//
// But the refusal compares the waypoint's STATED ELEVATION against the DEM at the OSM FEATURE's
// coordinate: two different places. The waypoint carries its OWN coordinate, and nothing has asked
// what the ground is under THAT. It is the same question audit:waypoint-elevations asks, pointed
// at the four rows where it would settle something:
//
//   waypoint's stated elevation ~= DEM under the waypoint's OWN coordinate
//       -> the waypoint is self-consistent, so OSM matched a DIFFERENT place. Keep the waypoint,
//          and the gazetteer hit is the wrong half.
//   they disagree
//       -> the waypoint's stated elevation is wrong, and the ground under its own pin is the
//          better number.
//   the waypoint has NO coordinate
//       -> the third record does not exist and the refusal stands. Say so; do not fall back to
//          the gazetteer, because that is the very record under suspicion.
//
// REPORT-ONLY. This decides which record to believe; it does not write. A camp elevation renders on
// the Planner tab, and the standing rule for this catalog is that a wrong number is worse than a
// blank — so a verdict here has to be read before anything is applied.
import { SUPABASE_URL, anonKey, headers, selectAll } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

const NAMES = [
  "Skagit Queen Camp",
  "Five Mile Camp, Park Creek trail",
  "Twin Lakes basin, under the west face of Columbia",
  "Massie Lake basin",
];

const H = headers(anonKey());
const M_FT = 3.28084;

const rows = await selectAll("routes", "id,area_id,bivy,waypoints", "bivy=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL CLOSED: zero routes read"); process.exit(1); }

// Strip a trailing camp word so "Pelton Basin" and "Pelton Basin Camp" are one place — the same
// rule solve-camps uses. A FEATURE TYPE (pass, lake, basin) is never stripped: Whatcom Pass and
// Whatcom Camp are two places sharing a proper noun.
const CAMPWORDS = /\b(camp|campsite|camps|bivouac|bivy|bivies|site|sites)\b/gi;
const norm = (s) => s.toLowerCase().split(",")[0].replace(CAMPWORDS, " ").replace(/\s+/g, " ").trim();

let anyChecked = 0;
for (const name of NAMES) {
  console.log(`\n=== ${name}`);
  const target = norm(name);

  // every waypoint in the catalog whose name is the same PLACE, with a coordinate
  const donors = [];
  for (const r of rows) {
    for (const w of (Array.isArray(r.waypoints) ? r.waypoints : [])) {
      if (!w || !w.name) continue;
      if (norm(w.name) !== target) continue;
      const lat = Number(w.lat), lng = Number(w.lng);
      const stated = w.elev != null ? Number(w.elev) : (w.elevM != null ? Number(w.elevM) * M_FT : null);
      donors.push({ routeId: r.id, wpName: w.name, lat, lng, stated });
    }
  }
  if (!donors.length) { console.log("   no catalog waypoint of this name — the refusal stands"); continue; }

  const placed = donors.filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng)
    && !(d.lat === 0 && d.lng === 0));
  console.log(`   ${donors.length} catalog waypoint(s) of this name, ${placed.length} with a coordinate`);
  if (!placed.length) {
    console.log("   THE THIRD RECORD DOES NOT EXIST: no coordinate to ask the ground about.");
    console.log("   Refusal stands. Do NOT fall back to the gazetteer — that is the record under suspicion.");
    continue;
  }

  for (const d of placed) {
    let ground = null;
    try { ground = await elevationAt(d.lat, d.lng); } catch (e) { console.log(`   DEM error: ${e.message}`); }
    anyChecked++;
    const gf = ground == null ? null : Math.round(ground);
    const diff = (gf != null && d.stated != null) ? Math.round(gf - d.stated) : null;
    console.log(`   ${d.routeId}`);
    console.log(`      "${d.wpName}"  ${d.lat.toFixed(5)},${d.lng.toFixed(5)}`);
    console.log(`      states ${d.stated == null ? "—" : Math.round(d.stated) + " ft"}` +
      `   ground under its OWN pin ${gf == null ? "—" : gf + " ft"}` +
      (diff == null ? "" : `   diff ${diff > 0 ? "+" : ""}${diff} ft`));
    if (diff != null) {
      if (Math.abs(diff) <= 300)
        console.log("      -> SELF-CONSISTENT: the waypoint agrees with the ground beneath itself.");
      else
        console.log("      -> THE WAYPOINT'S OWN ELEVATION IS REFUSED BY THE GROUND UNDER ITS OWN PIN.");
    }
  }
}

if (!anyChecked) {
  console.log("\nFAIL CLOSED: no waypoint coordinate was checked — this settled nothing.");
  process.exit(1);
}
console.log("\nREPORT-ONLY. 300 ft is the tolerance the repaired-pin measurement already uses for");
console.log("a sourced coordinate; a camp pin is hand-placed, so read the number rather than the");
console.log("verdict. A wrong elevation on the Planner tab is worse than a blank.");
