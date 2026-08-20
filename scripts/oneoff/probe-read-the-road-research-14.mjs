// The routes `audit:road-coverage` leaves in the RESEARCH bucket: they describe a walk, carry no
// `road` block and no `approach_logistics`, and no same-area sibling carries a block for a road
// their own prose names. Filling these needs sources outside the catalog.
//
// Read them in full FIRST. Three things decide what to research and they are all in the row:
//   - which trailhead the approach actually starts from (not which peak it climbs)
//   - what its area-siblings say about the drive, since a sibling block is a lead even when it is
//     not a donor — `audit:trailhead-road` records that one road serves many climbs
//   - whether the row already contains a road fact filed in the wrong column, which would make it
//     re-homing after all rather than research
import { selectAll } from "../lib/supabase-env.mjs";

const IDS = [
  "wa_cashmere_mountain_northeast_ridge",
  "wa_don_t_climb_that_she_said",
  "wa_east_mcmillan_spire_northeast_buttress",
  "wa_east_ridge_7",
  "wa_hoodoo_peak_sawtooth_raven_ridge_traverse",
  "wa_hozomeen_mountain_south_peak_southeast_buttress",
  "wa_hozomeen_mountain_south_peak_southwest_route",
  "wa_little_annapurna_south_face",
  "wa_mount_despair_northeast_buttress",
  "wa_mount_spickard_silver_glacier",
  "wa_mount_washington_olympic_winter_direct",
  "wa_north_star_mountain_cloudy_peak_traverse",
  "wa_south_face_7",
  "wa_upper_castle_toprope_wall",
];

const rows = await selectAll("routes",
  "id,name,area_id,discipline,grade,pitches,dist_km,gain_ft,approach,beta,overview,waypoints,access,season,best_season,road,approach_logistics",
  `id=in.(${IDS.join(",")})`, { pageSize: 50 });
if (rows.length !== IDS.length) {
  console.error(`FAIL — expected ${IDS.length} rows, got ${rows.length}. Missing: ${IDS.filter((i) => !rows.some((r) => r.id === i)).join(", ")}`);
  process.exit(1);
}

const aids = [...new Set(rows.map((r) => r.area_id))];
const areas = await selectAll("areas", "id,name,path,area_type", `id=in.(${aids.join(",")})`, { pageSize: 100 });
const areaBy = Object.fromEntries(areas.map((a) => [a.id, a]));

const leaves = (v, out = []) => {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
};

for (const r of rows.sort((a, b) => a.id.localeCompare(b.id))) {
  const a = areaBy[r.area_id];
  console.log(`\n${"=".repeat(96)}`);
  console.log(`${r.id}  [${r.discipline}]  "${r.name}"  grade=${r.grade}  pitches=${r.pitches}`);
  console.log(`  area ${r.area_id} "${a ? a.name : "?"}"`);
  console.log(`  path ${a ? a.path : "?"}`);
  console.log(`  dist_km=${r.dist_km}  gain_ft=${r.gain_ft}  season=${JSON.stringify(r.season)}  waypoints=${(r.waypoints || []).length}`);

  const th = (r.waypoints || []).filter((w) => w && /trailhead|parking/i.test(String(w.type || "") + String(w.name || "")));
  if (th.length) for (const w of th) console.log(`  TRAILHEAD PIN: "${w.name}"  ${w.lat},${w.lng}  elev=${w.elev}`);

  for (const f of ["overview", "approach", "beta", "best_season"]) {
    const v = r[f];
    if (typeof v === "string" && v.trim()) console.log(`\n  --- ${f} ---\n  ${v.trim().replace(/\n/g, "\n  ")}`);
  }

  /* Sibling road blocks are LEADS, never answers — printed so the research starts from what the
     catalog already knows about that drive rather than from nothing. */
  const sibs = await selectAll("routes", "id,name,road,approach_logistics", `area_id=eq.${r.area_id}`, { pageSize: 100 });
  const withRoad = sibs.filter((s) => s.id !== r.id && s.road && leaves(s.road).length);
  console.log(`\n  --- ${withRoad.length} sibling block(s) on this area (LEADS, not donors) ---`);
  const seen = new Set();
  for (const s of withRoad) {
    const k = JSON.stringify(s.road);
    if (seen.has(k)) continue;
    seen.add(k);
    console.log(`  [${s.id}]`);
    for (const [kk, vv] of Object.entries(s.road)) if (typeof vv === "string" && vv.trim()) console.log(`     ${kk}: ${vv.slice(0, 240)}`);
  }
  const wl = sibs.filter((s) => s.id !== r.id && s.approach_logistics && (s.approach_logistics.trailhead));
  const seenT = new Set();
  for (const s of wl) {
    const t = s.approach_logistics.trailhead;
    if (seenT.has(t)) continue;
    seenT.add(t);
    console.log(`     sibling trailhead: "${t}"`);
  }
}
