// Slice ad: six routes over 1 km that no earlier slice had looked at.
//
// Re-running this is safe and is how the sixth entry shipped: any row whose records already agree
// within 500 m is SKIPPED, not rewritten, so applying twice is a no-op on everything already done.
//
// #905's audit run surfaced these. They were not deliberately deferred like the routes in batch5's
// header — they were MISFILED. The remaining backlog had been recorded as "sub-kilometre slop plus
// peaks with two genuine approaches", which came from reading the audit's `p95 701 m` as the
// backlog. That percentile is over all 622 routes carrying BOTH records, not over the 42 findings:
// 24 of the 42 are over 1 km, and about ten of those were on no exclusion list at all.
//
// THE PLAN DECLARES A WINNER, NEVER A COORDINATE — the applier reads both records off the row and
// copies the winner into the loser, so nothing is invented and a fix needing a THIRD coordinate
// cannot be written here at all. Four routes were examined and NOT included for exactly that
// reason; they are named at the bottom.
//
//   winner:"log" — the waypoint pin is wrong; overwrite the pin name+coords from approach_logistics
//   winner:"pin" — approach_logistics is wrong; overwrite its trailhead+coords from the pin, and
//                  DELETE trailheadDirection, since that prose describes the trailhead being removed
//   {keepDirection:true} — for a "pin" win whose trailheadDirection describes the SURVIVING
//                  trailhead rather than the one being removed. New in this batch; see Queets.
//
// Pass --apply to write; default is a dry run.

import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

const PLAN = [
  // The blob names "Whiskey Bend Trailhead" — which its OWN trailheadDirection says you cannot
  // drive to: "Olympic Hot Springs Road is closed to vehicles at Madison Falls — walk or bike
  // ~8 miles to the Whiskey Bend Trailhead". The approach agrees ("you now walk or bike an extra
  // ~7 miles from the Madison Falls parking area ... just to reach the Whiskey Bend trailhead").
  // Where a climber parks is Madison Falls, which is what the pin holds. The direction stays: it
  // describes the walk FROM the surviving trailhead and is the reason the coordinate moved.
  ["wa_mount_queets_south", "pin", { keepDirection: true }],

  // The approach opens "This route starts with a boat crossing of Ross Lake (Ross Lake Resort
  // water taxi, or a private/inflatable boat carried in via the 0.6-mile portage trail from the
  // SR-20 pullout)". Both the resort and that portage are reached from the Ross Dam Trailhead,
  // which the blob holds; the pin's East Bank Trailhead (MP 138) is a different start 6.6 km east
  // that the prose never mentions.
  ["wa_castle_peak_pasayten_scramble", "log"],

  // The pin is INTERNALLY inconsistent, which is what settles these two without needing to judge
  // the seasonal question. It is named "Reflection Lake Pullout" while its coordinate
  // (46.77548,-121.74441) sits ~170 m from Narada Falls — the WINTER alternate, 1.3 km away. The
  // Zipper's approach names Reflection Lakes first and Narada Falls only as the snow-gated option;
  // The Fly's names Reflection Lakes and nothing else. The blob's name and coordinate agree with
  // each other and with the prose.
  ["wa_lane_peak_r1", "log"],
  ["wa_lane_peak_r2", "log"],

  // The approach is unambiguous and matches the blob almost word for word: "From Highway 20 hairpin
  // curve on east side of Washington Pass, locate small pond on south side of road; trailhead
  // pullout on north side of highway". The pin holds Blue Lake Trailhead, a different and
  // well-known trailhead 1.3 km west serving the south side of the group.
  ["wa_liberty_bell_thin_red_line", "log"],

  // APPEARED MID-SESSION, between two runs of the audit an hour apart — a parallel session is
  // enriching approaches, so this backlog is a moving target rather than a fixed list. That is an
  // argument FOR the audit existing, not against fixing this row.
  // Both records carry the IDENTICAL name ("Eldorado Creek trailhead (Cascade River Road mile 20)"),
  // so it never showed as [NAME DIFFERS] despite being 21.5 km apart — the widest disagreement in
  // the catalog with no name signal at all. The pin (48.6855,-121.0925) is Colonial Creek /
  // Thunder Creek, and the route's own overview says it approaches "from the opposite (Cascade
  // River Road/Eldorado) side of the mountain RATHER THAN via Thunder Creek". So the pin holds a
  // different route's trailhead under this one's name. The blob matches the prose and the road.
  ["wa_primus_peak_south_ridge", "log"],
];

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };

let wrote = 0, skipped = 0;
for (const [id, winner, opts] of PLAN) {
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
    if (!(opts && opts.keepDirection)) delete next.trailheadDirection;
    before = `log "${al.trailhead}" @${lLat},${lLng}`;
    after = `"${wps[i].name}" @${pLat},${pLng}${opts && opts.keepDirection ? "  (direction kept)" : ""}`;
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
  // A kept direction must actually still be there; a dropped one must actually be gone.
  const keep = !!(opts && opts.keepDirection);
  if (winner === "pin" && keep && !a2.trailheadDirection) { console.error("   DIRECTION LOST — it was meant to be kept"); process.exit(1); }
  if (winner === "pin" && !keep && a2.trailheadDirection) { console.error("   DIRECTION SURVIVED — it describes the removed trailhead"); process.exit(1); }
  const now = Math.round(hav(num(w2.lat), num(w2.lng), num(a2.trailheadLat), num(a2.trailheadLng)));
  if (now > 500) { console.error(`   RECONCILE FAILED — records still ${now} m apart`); process.exit(1); }
  console.log(`   reconciled: both records now agree to ${now} m\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote} route(s), skipped ${skipped}.` : `DRY RUN — ${PLAN.length} planned. Pass --apply to write.`);

// EXAMINED AND DELIBERATELY NOT INCLUDED — all four read, none of them a defect this can express:
//
//   wa_mount_howard_south_slope (5.7 km) — NOT a defect. The approach names TWO trailheads and the
//     beta ranks neither as the route's: "either the Merritt Lake Trailhead (shorter, more direct)
//     or the Rock Mountain Trailhead (longer, more scenic)". Each record correctly holds one. The
//     wa_lundin_peak_west_ridge shape.
//   wa_classic_route_3 (1.4 km) — NOT a defect, and the opposite of the Lane Peak entries above.
//     Its pin is named "Narada Falls Parking Lot" AND sits at Narada Falls, so it is an internally
//     coherent record of the real snow-gated winter start, while the blob holds the summer one.
//     Forcing agreement would delete a correct record.
//   wa_bedal_peak_standard (1.4 km) — needs a THIRD source. Both records name the same climbers'
//     path off FR-4096; the approach places it "roughly 1.3 miles up the spur road near its second
//     or third switchback" at 2,100-2,200 ft, and nothing on the row says which of the two points
//     that is. Peak distance does not separate them (2.65 km vs 1.7 km, both plausible).
//   wa_mount_anderson_eel_glacier (1.4 km) — needs a THIRD source, same shape. Both name the
//     Dosewallips road washout parking; the prose gives a road mileage from US-101, not a point.
