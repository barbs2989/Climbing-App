// Is wa_south_face_direct a Vasiliki Tower route filed on the wrong area, or a UW Art Building
// boulder problem whose PROSE was contaminated? Those need opposite repairs — a move, or a field
// clear — and `wa_true_grit` is the recorded case where the prose was the wrong half.
//
// The discriminator is NON-PROSE columns. Prose fields agreeing with each other is one claim
// counted five times: a contaminating write lands in several text columns at once. `discipline` and
// `dist_km` are written by a different part of the pipeline, so if they agree with the prose they
// are an independent record.
//
// It also has to be a MOVE rather than a DEDUP: if Vasiliki already holds this climb under another
// id, moving creates a duplicate instead of fixing one. A duplicate flag is a hypothesis.
import { selectAll } from "../lib/supabase-env.mjs";

const r = (await selectAll("routes", "id,name,area_id,discipline,grade,pitches,dist_km,gain_ft,approach,beta,overview,hazards,best_season,season,rappels,waypoints", "id=eq.wa_south_face_direct", { pageSize: 5 }))[0];
if (!r) { console.error("FAIL — wa_south_face_direct returned no row"); process.exit(1); }

console.log("=== the row ===");
for (const k of ["id", "name", "area_id", "discipline", "grade", "pitches", "dist_km", "gain_ft"]) console.log(`  ${k}: ${JSON.stringify(r[k])}`);
console.log(`  waypoints: ${(r.waypoints || []).length}`);
for (const f of ["overview", "approach", "beta", "hazards", "best_season", "season", "rappels"]) {
  const v = r[f];
  if (v == null || (typeof v === "string" && !v.trim())) { console.log(`  ${f}: (empty)`); continue; }
  console.log(`  ${f}: ${(typeof v === "string" ? v : JSON.stringify(v)).slice(0, 300)}`);
}

/* A UW campus boulder problem and a Wine Spires trad route disagree on more than words. */
console.log("\n=== non-prose columns, which a prose contamination would NOT have touched ===");
console.log(`  discipline = ${r.discipline}   (its four area-siblings are all 'bouldering')`);
console.log(`  dist_km    = ${r.dist_km}       (its own approach says "roughly 3 miles to Burgundy Col" = 4.83 km)`);
console.log(`  -> both agree with the PROSE, not with the AREA. The area is the wrong half.`);

console.log("\n=== is this a MOVE or a DEDUP? does Vasiliki already hold this climb? ===");
const vas = await selectAll("routes", "id,name,discipline,grade,pitches", "area_id=eq.wa_vasiliki_tower", { pageSize: 100 });
for (const x of vas) console.log(`  wa_vasiliki_tower: ${x.id}  [${x.discipline}] "${x.name}"  grade=${x.grade}  pitches=${x.pitches}`);
if (vas.some((x) => x.id !== r.id && String(x.name).toLowerCase() === String(r.name).toLowerCase())) {
  console.log("  -> a row of the SAME NAME is already there: this is a DEDUP question, not a move. STOP.");
} else {
  console.log("  -> no row of that name on Vasiliki. A move creates no duplicate.");
}

console.log("\n=== every WA route named 'South Face Direct' (a name is not an identity) ===");
const dup = await selectAll("routes", "id,name,area_id,discipline", "name=eq.South Face Direct", { pageSize: 100 });
for (const x of dup) console.log(`  ${x.id}  area=${x.area_id}  [${x.discipline}]`);

console.log("\n=== what wa_art_building would hold afterwards ===");
const ab = await selectAll("routes", "id,name,discipline", "area_id=eq.wa_art_building", { pageSize: 100 });
for (const x of ab) console.log(`  ${x.id}  [${x.discipline}] "${x.name}"${x.id === r.id ? "   <- leaving" : ""}`);
