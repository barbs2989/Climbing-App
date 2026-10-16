// 57 routes where the two trailhead records disagree and the route's own prose says which is right.
//
// The disagreements come from probe-trailhead-vs-logistics.mjs; the verdicts come from reading each
// route's approach prose with probe-trailhead-prose.mjs. Distance could not settle these — they are
// all well under the 25 km threshold #886 used, and several are two REAL trailheads on opposite
// sides of one mountain, where being close to the peak proves nothing.
//
// THE PLAN DECLARES A WINNER, NEVER A COORDINATE. The script reads both records off the row and
// copies the winner into the loser. That is deliberate and it is the whole safety argument:
//   - nothing is invented — every value written already existed on that row;
//   - no coordinate is transcribed by hand, so a typo cannot put a climber somewhere new;
//   - a verdict that would require a THIRD coordinate cannot be expressed here at all, which is
//     exactly the class that has to be excluded (see EXCLUDED below).
//
// WHAT "WINNER" MEANS
//   winner:"log" — the waypoint pin is wrong; overwrite the pin's name+coords from approach_logistics
//   winner:"pin" — approach_logistics is wrong; overwrite its trailhead+coords from the pin, and
//                  DELETE trailheadDirection, because that prose describes the trailhead being
//                  removed. Keeping it would leave a paragraph of directions to the wrong place
//                  attached to the right coordinate — worse than either record alone.
//
// EXCLUDED ON PURPOSE, and each exclusion is a real limit rather than laziness:
//   both records wrong          wa_glacier_peak_sitkum_glacier, wa_mount_cameron_standard
//   fix needs a coordinate      wa_little_big_chief_mountain_northeast_face, wa_northwest_face_4,
//     neither record holds      wa_phantom_peak_south_route
//   prose names both, ranks     wa_mount_noyes_standard, wa_mount_carru_scramble,
//     neither                   wa_chikamin_peak_southeast_slopes, wa_remmel_mountain_nw_ridge
//   route's own fields          wa_mount_meany_standard (beta contradicts approach)
//     contradict each other
//   low confidence on read      wa_the_direct_north_ridge_w_gendarme, wa_lizard_mountain_south_route
//
// Two systematic findings worth keeping. wa_mount_baker_easton_glacier and _squak_glacier carry the
// IDENTICAL wrong pin 48.8105,-121.8945 — the Heliotrope Ridge trailhead, on the opposite side of
// the mountain from the south-side route each describes; one bad value copied to both.
// And wa_mount_rainier_fuhrer_thumb's approach_logistics trailhead is byte-identical to its own
// peakLat/peakLng: the summit was written into the trailhead fields.
//
// Pass --apply to write; default is a dry run.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

// winner:"log" -> the pin is wrong.  winner:"pin" -> approach_logistics is wrong.
const PLAN = [
  // ---- slice aa
  ["wa_poltergeist_pinnacle", "log"], ["wa_storm_king_southwest_scramble", "log"],
  ["wa_mount_lyall_south_route", "log"], ["wa_primus_peak_south_ridge", "log"],
  ["wa_mount_rainier_edmunds_headwall", "log"], ["wa_the_devils_club", "log"],
  ["wa_mount_appleton_standard", "log"], ["wa_mount_ballard_south", "log"],
  ["wa_iron_cap_mountain_south_route", "log"], ["wa_mount_rainier_ptarmigan_ridge", "log"],
  ["wa_mount_rainier_willis_wall", "log"], ["wa_mount_baker_cockscomb_ridge", "log"],
  ["wa_glacier_peak_kennedy_glacier", "log"], ["wa_mount_rainier_liberty_ridge", "log"],
  ["wa_bacon_peak_diobsud", "log"], ["wa_southwest_rib_2", "log"],
  ["wa_mount_baker_easton_glacier", "log"], ["wa_mount_baker_squak_glacier", "log"],
  ["wa_mount_seattle_south", "pin"], ["wa_mount_steel_standard", "pin"],
  ["wa_kololo_peaks_standard", "pin"], ["wa_mcgregor_mountain_scramble", "pin"],
  ["wa_mount_barnes_scramble", "pin"], ["wa_north_gardner_mountain_nw_couloir", "pin"],
  ["wa_kyes_peak_glaciated_scramble", "pin"], ["wa_blackcap_mountain_scramble", "pin"],
  ["wa_cloudy_peak_southwest_slopes", "pin"], ["wa_dumbell_mountain_west", "pin"],
  ["wa_king_kong_gorillas_direct_direct", "pin"],
  // ---- slice ab
  ["wa_mount_mathias_scramble", "log"], ["wa_mount_baker_boulder_park_cleaver", "log"],
  ["wa_playing_not_spraying", "log"], ["wa_the_chalice", "log"],
  ["wa_andersons_thumb_standard", "log"], ["wa_hagan_mountain_south", "log"],
  ["wa_prusik_peak_west_ridge", "log"], ["wa_smears_jugs_and_rock_roll", "log"],
  ["wa_clean_break", "log"], ["wa_east_face_2", "log"],
  ["wa_austera_peak_southwest_ridge", "log"], ["wa_dorado_needle_east_ridge", "log"],
  ["wa_klawatti_peak_southeast_face", "log"], ["wa_klawatti_peak_sw_buttress", "log"],
  ["wa_north_face_of_the_mole", "log"], ["wa_inner_constance_standard", "log"],
  ["wa_flora_mountain_southwest_slope", "log"],
  ["wa_mount_redoubt_south_face", "pin"], ["wa_mount_stone_lake_of_angels", "pin"],
  ["wa_glacier_peak_cool_glacier_gerdine", "pin"], ["wa_buckhorn_marmot_pass", "pin"],
  ["wa_mount_rainier_fuhrer_thumb", "pin"], ["wa_bear_mountain_chilliwack_north_buttress", "pin"],
  ["wa_cutthroat_peak_cauthorn_wilson_couloir", "pin"], ["wa_cutthroat_peak_northeast_face", "pin"],
  ["wa_cutthroat_peak_southeast_buttress", "pin"], ["wa_cutthroat_west_ridge", "pin"],
  ["wa_azurite_peak_southeast", "pin"],
  // ---- slice ad
  ["wa_blue_s_buttress", "log"], ["wa_east_face_3", "log"], ["wa_beckey_tate", "log"],
  ["wa_big_kangaroo_west_face", "log"], ["wa_half_moon_southwest_slopes", "log"],
  ["wa_unnamed_5", "log"], ["wa_first_amendment", "log"],
  ["wa_spontaneity_arete", "log"], ["wa_spontaneous_distraction", "log"],
  ["wa_lane_peak_r3", "pin"], ["wa_liberty_traverse", "pin"],
];

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };

let wrote = 0, skipped = 0;
for (const [id, winner] of PLAN) {
  const [r] = await selectAll("routes", "id,name,waypoints,approach_logistics", `id=eq.${id}`, { pageSize: 3, key });
  if (!r) { console.error(`${id}: NOT FOUND`); process.exit(1); }
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const i = wps.findIndex(w => w && String(w.type || "").toLowerCase() === "trailhead");
  const al = (r.approach_logistics && typeof r.approach_logistics === "object" && !Array.isArray(r.approach_logistics))
    ? r.approach_logistics : null;
  if (i < 0 || !al) { console.error(`${id}: missing a record (pin=${i >= 0}, log=${!!al}) — refusing`); process.exit(1); }

  const pLat = num(wps[i].lat), pLng = num(wps[i].lng);
  const lLat = num(al.trailheadLat), lLng = num(al.trailheadLng);
  if (pLat === null || lLat === null) { console.error(`${id}: a record has no coordinate — refusing`); process.exit(1); }

  /* If they already agree, someone has corrected this since the triage. Skip rather than write:
     the verdict was made about two records that no longer disagree. */
  const apart = Math.round(hav(pLat, pLng, lLat, lLng));
  if (apart <= 500) { console.log(`${id}: records now agree (${apart} m) — skipping, already corrected`); skipped++; continue; }

  let body, before, after;
  if (winner === "log") {
    before = `pin "${wps[i].name}" @${pLat},${pLng}`;
    after = `"${al.trailhead}" @${lLat},${lLng}`;
    body = { waypoints: wps.map((w, n) => n === i ? { ...w, name: al.trailhead || w.name, lat: lLat, lng: lLng } : w) };
  } else {
    const next = { ...al, trailhead: wps[i].name, trailheadLat: pLat, trailheadLng: pLng };
    delete next.trailheadDirection;   // describes the trailhead being removed
    before = `log "${al.trailhead}" @${lLat},${lLng}`;
    after = `"${wps[i].name}" @${pLat},${pLng}`;
    body = { approach_logistics: next };
  }
  console.log(`${id}  (${apart} m apart, ${winner} wins)\n   ${before}\n   -> ${after}`);
  if (!APPLY) { console.log("   (dry run)\n"); continue; }

  await patchRow("routes", id, body);

  const [chk] = await selectAll("routes", "id,waypoints,approach_logistics", `id=eq.${id}`, { pageSize: 3, key });
  const w2 = (chk.waypoints || []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
  const a2 = chk.approach_logistics || {};
  const gotLat = winner === "log" ? num(w2 && w2.lat) : num(a2.trailheadLat);
  const want = winner === "log" ? lLat : pLat;
  if (gotLat === null || Math.abs(gotLat - want) > 1e-6) {
    console.error(`   RECONCILE FAILED — got ${gotLat}, wanted ${want}`); process.exit(1);
  }
  if ((chk.waypoints || []).length !== wps.length) { console.error("   WAYPOINT COUNT CHANGED"); process.exit(1); }
  const now = Math.round(hav(num(w2.lat), num(w2.lng), num(a2.trailheadLat), num(a2.trailheadLng)));
  if (now > 500) { console.error(`   RECONCILE FAILED — records still ${now} m apart`); process.exit(1); }
  console.log(`   reconciled: both records now agree to ${now} m\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote} route(s), skipped ${skipped}.` : `DRY RUN — ${PLAN.length} planned. Pass --apply to write.`);
