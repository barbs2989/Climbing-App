// One recording belongs to ONE route (owner, 2026-11-04). shared-track-census.mjs found 10 WA groups of
// routes storing the SAME track. Read group by group (track start/end vs each route's own pins, and the
// rollbacks that wrote it):
//   keep on ONE route where the track is that route's line —
//     Olympus West Ridge (ends on West Peak; the Traverse also goes to Middle + East),
//     Olympus Blue Glacier (the North Face Direct Finish is a finish variation it never reaches),
//     Mount Si Haystack Scramble (reaches the Haystack summit; copied to Mount Si Trail later by apply-peaks).
//   keep on NONE where it fits no single route (rule 1: a shared approach/summit proves nothing) —
//     Liberty Bell (a Blue Lake walk-up on 14 technical lines; the Beckey Route has its own track),
//     Colchuck Balanced Rock (13 roped lines), Prusik (two approach lines ending ~200 m below the summit,
//     3 routes each), Morning Star (an approach on 2 routes), Unicorn (3 summit-block lines).
// Dragontail East Route / East Ridge via Aasgard is one climb in two rows: merged by migration, not here.
// elev_pts goes with the track only when it is the same profile. Dry run unless --write.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { patchRow, selectAll } from "../../lib/supabase-env.mjs";
import { sameTrack } from "./dedupe.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const WRITE = process.argv.includes("--write");
const PLAN = [
  { area: "wa_liberty_bell", keep: null, clear: ["wa_a_servant_to_liberty", "wa_dark_side_of_liberty", "wa_liberty_and_injustice_for_all", "wa_liberty_bell_independence_route", "wa_liberty_bell_nw_face", "wa_liberty_bell_overexposure", "wa_liberty_bell_serpentine_crack", "wa_liberty_bell_thin_red_line", "wa_liberty_crack", "wa_liberty_crack_free", "wa_liberty_traverse", "wa_live_free_or_die", "wa_nw_face_var_remsberg_variation", "wa_rapple_grapple"] },
  { area: "wa_colchuck_balanced_rock", keep: null, clear: ["wa_accendo_lunae_lib_west_face_var", "wa_colchuck_balanced_rock_col_east_lake_side_approch", "wa_colchuck_balanced_rock_west_face", "wa_full_tilt_tempest_wall_free_version", "wa_leche_la_vaca", "wa_let_it_burn", "wa_milk_n_honey", "wa_nw_ridge_2", "wa_rikki_tikki_tavi", "wa_scarface_3", "wa_the_balanced_rock", "wa_the_scoop_2", "wa_the_tempest"] },
  { area: "wa_prusik_peak", keep: null, clear: ["wa_beckey_davis", "wa_boving_christensen", "wa_energizer_bunny"] },
  { area: "wa_prusik_peak", keep: null, clear: ["wa_prusik_peak_der_sportsman", "wa_prusik_peak_solid_gold", "wa_prusik_peak_south_face_burgner_stanley"] },
  { area: "wa_morning_star_peak", keep: null, clear: ["wa_beyond_redlining", "wa_marvin_s_ear"] },
  { area: "wa_unicorn_peak", keep: null, clear: ["wa_classic_route_2", "wa_open_book_2", "wa_the_roof"] },
  { area: "wa_mount_olympus", keep: "wa_mount_olympus_blue_glacier", clear: ["wa_olympus_summit_block_north_face"] },
  { area: "wa_mount_olympus", keep: "wa_mount_olympus_west_ridge", clear: ["wa_olympus_traverse"] },
  { area: "wa_mount_si", keep: "wa_mount_si_haystack_scramble", clear: ["wa_mount_si_trail"] },
];
const writes = [];
for (const g of PLAN) {
  const ids = [g.keep, ...g.clear].filter(Boolean);
  const rows = await selectAll("routes", "id,area_id,name,gpx,elev_pts", `id=in.(${ids.join(",")})`, { pageSize: 50 });
  const by = new Map(rows.map(r => [r.id, r]));
  const ref = by.get(g.keep || g.clear[0]);
  for (const id of g.clear) {
    const r = by.get(id);
    if (!r || r.area_id !== g.area) { console.log(`REFUSE ${id}: not on ${g.area} now`); continue; }
    if (!sameTrack(r.gpx, ref.gpx) || (r !== ref && !sameTrack(ref.gpx, r.gpx))) { console.log(`REFUSE ${id}: no longer the shared track`); continue; }
    const after = { gpx: null };
    if (r.elev_pts != null && JSON.stringify(r.elev_pts) === JSON.stringify(ref.elev_pts)) after.elev_pts = null;
    writes.push({ id, before: { gpx: r.gpx, ...(after.elev_pts === null ? { elev_pts: r.elev_pts } : {}) }, after });
    console.log(`clear ${id.padEnd(52)} ${r.gpx.length} pts${"elev_pts" in after ? " +elev_pts" : ""}${g.keep ? "  (kept on " + g.keep + ")" : ""}`);
  }
  await new Promise(r => setTimeout(r, 400));
}
console.log(`routes to clear: ${writes.length}`);
if (!WRITE) process.exit(0);
const rb = path.join(REPO, "scripts", `rollback-gpx-any-source-shared-tracks-${Date.now()}.json`);
fs.writeFileSync(rb, JSON.stringify({ at: new Date().toISOString(), note: "restore with patchRow(routes, id, before)", rows: writes.map(w => ({ id: w.id, before: w.before })) }));
console.log("rollback saved", rb);
for (const w of writes) await patchRow("routes", w.id, w.after);
let bad = 0;
for (let i = 0; i < writes.length; i += 20) {
  const now = await selectAll("routes", "id,gpx,elev_pts", `id=in.(${writes.slice(i, i + 20).map(w => w.id).join(",")})`, { pageSize: 50 });
  for (const w of writes.slice(i, i + 20)) { const r = now.find(x => x.id === w.id); for (const k of Object.keys(w.after)) if (!r || r[k] != null) { bad++; console.log("RECONCILE", w.id, k); } }
}
console.log(`cleared ${writes.length}, reconcile problems ${bad}`);
