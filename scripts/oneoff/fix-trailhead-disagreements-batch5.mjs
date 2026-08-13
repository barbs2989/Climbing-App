// Slice ac: 34 more routes where the two trailhead records disagree, settled by their own prose.
//
// This is the slice #898 deliberately held back. Its triage cited a cross-route CONSENSUS on many
// routes ("the 8-route consensus", "9 records place it there") rather than the other record on the
// row — and a consensus value is precisely what this applier cannot express, by design.
//
// Rather than eyeball 34 verdicts, the question was MEASURED:
// verify-slice-ac-fixes-reference-the-row.mjs computes what the winner-copy would actually write
// and compares it to what the triage recommended. 26 matched the row exactly (24 of them to 0 m).
// The 8 that did not are all ONE group — Goodell Creek — every one off by exactly 454 m, which is
// a coherent disagreement about which of two adjacent points is "the" trailhead, not scattered
// noise. Their verdict still holds (the pin sits ~1.5 km south at the SR-20 campground), so they
// ship taking the ROW own log value rather than the consensus. That is the whole argument for
// this applier: the row decides, and a recommendation from elsewhere cannot sneak through.
//
// THE PLAN DECLARES A WINNER, NEVER A COORDINATE. The script reads both records off the row and
// copies the winner into the loser, so nothing is invented, no coordinate is transcribed by hand,
// and a fix needing a THIRD coordinate cannot be written here at all.
//
//   winner:"log" — the waypoint pin is wrong; overwrite the pin name+coords from approach_logistics
//   winner:"pin" — approach_logistics is wrong; overwrite its trailhead+coords from the pin, and
//                  DELETE trailheadDirection, since that prose describes the trailhead being removed
//
// EXCLUDED from this slice: wa_south_face_5 (its own prose names the campground pullout its pin
// already holds, while its log and eight sibling Picket routes name the Upper Group Camp — resolve
// the prose first) and wa_lundin_peak_west_ridge (no defect: the prose documents TWO standard ways
// and each record correctly holds one of them).
//
// Pass --apply to write; default is a dry run.

import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

// winner:"log" -> the pin is wrong.  winner:"pin" -> approach_logistics is wrong.
const PLAN = [
  // Slice ac. Every entry verified by verify-slice-ac-fixes-reference-the-row.mjs: the winning
  // record is the one the route own prose names, and the applier copies it off this row.
  ["wa_cutthroat_south_buttress","pin"], ["wa_northwest_ridge_2","pin"],
  ["wa_mount_larrabee_south_ridge","pin"], ["wa_huckleberry_mountain_west_route","pin"],
  ["wa_mount_index_north_face","pin"], ["wa_castle_peak_tatoosh_southeast_face","pin"],
  ["wa_treen_peak_scramble","pin"],
  ["wa_mount_rainier_kautz_headwall","log"], ["wa_bryant_peak_southeast_slopes","log"],
  ["wa_mount_shuksan_white_salmon_glacier","log"], ["wa_mount_adams_lyman_glacier","log"],
  ["wa_south_face","log"], ["wa_mount_adams_lava_glacier_headwall","log"],
  ["wa_the_hitchhiker","log"], ["wa_liberty_and_injustice_for_all","log"],
  ["wa_liberty_bell_east_face","log"], ["wa_liberty_crack","log"],
  ["wa_liberty_crack_free","log"], ["wa_lost_peak_pasayten_scramble","log"],
  ["wa_esmeralda_peaks_scramble","log"], ["wa_mount_index_north_norwegian_buttress","log"],
  ["wa_goode_mountain_megalodon_ridge","log"], ["wa_goode_mountain_northeast_face","log"],
  ["wa_goode_mountain_southwest_couloir","log"], ["wa_nooksack_tower_beckey_route","log"],
  ["wa_nooksack_tower_south_face","log"],
  // The Goodell Creek eight. The verdict is sound and the pin is ~1.5 km south at the SR-20
  // campground, but the triage recommended a CROSS-ROUTE CONSENSUS point 454 m from each rows
  // own log value. These take the rows own record, which is the whole point of this applier.
  ["wa_plan_9_from_outer_space","log"], ["wa_east_ridge_4","log"],
  ["wa_frenzel_spitz_south_route","log"], ["wa_mcmillan_spire_west_southwest_ridge","log"],
  ["wa_mcmillan_spire_west_west_ridge","log"], ["wa_mount_degenhardt_southwest_route","log"],
  ["wa_the_rake_traverse_route","log"], ["wa_west_twin_needle_south_route","log"],
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
