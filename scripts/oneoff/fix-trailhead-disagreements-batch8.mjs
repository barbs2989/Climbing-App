// Slice ae: four trailheads settled by asking the gpx track across the WHOLE remaining backlog.
//
// batch7 asked five hand-picked routes. This asked all 36 that still disagreed
// (`probe-track-start-as-third-trailhead-record.mjs --all`) and got:
//
//     6  VOTES-PIN      2  VOTES-LOG     10  DERIVED     11  AMBIGUOUS     7  NO TRACK
//
// TEN DERIVED is the number worth keeping. Those tracks begin within a metre of the pin because
// they were generated from it, so without the circularity guard they would have "confirmed" the
// pin by restating it — 28% of the sample, silently agreeing with itself.
//
// FOUR OF THE EIGHT VOTES ARE NOT ACTED ON, and the reason is the same each time: a track records
// which trailhead ONE PARTY USED, not which one is canonical. Where a route documents two genuine
// approaches and ranks neither, that vote settles nothing.
//
//   wa_chikamin_peak_southeast_slopes  VOTES-PIN 476x — but the approach opens "Two established
//       approaches reach the southeast-side gullies, and both are worth knowing since parties come
//       at this route from either direction". Each record correctly holds one.
//   wa_mount_carru_scramble            VOTES-PIN 8x — "Two standard approaches leave from the Harts
//       Pass Road (FR 5400) area", same shape.
//   wa_classic_route_3                 VOTES-PIN 42x — the seasonal pair batch6 already declined to
//       touch. The track just says a party went in from Narada Falls, which is the winter start.
//   wa_mount_cameron_standard          VOTES-PIN 3x — below the ratio worth acting on, and both of
//       its records were already suspect.
//
// WHAT IS FIXED, each corroborated by the route's own prose rather than by the vote alone:
//
//   wa_glacier_peak_sitkum_glacier  pin, 9,927 m, track 194x nearer.
//       The route documents BOTH approaches and RANKS them, which is what separates it from
//       Chikamin and Carru above: "White Chuck River Trail #643 (the historic standard)" versus
//       "North Fork Sauk and the PCT (the reliable alternative)". Its own variant notes say the
//       White Chuck road "has been reported blocked — at one point with large boulders placed at
//       the turnoff". The blob held White Chuck. Sending a party on a multi-day wilderness
//       expedition to a blocked road is the most consequential trailhead error found in this
//       whole sweep.
//   wa_gray_wolf_ridge_se_slopes    pin, 732 m, track 7x nearer.
//       The approach says the drive ends at FR-2860-120 and "the Lower Maynard Burn Trail #816
//       crosses Mueller Creek right away" — which is what the pin is named for. The blob held
//       "Upper Dungeness Trailhead (Trail #833.2)", a different trail system.
//   wa_merchant_peak_south_route    log, 516 m, track 19x nearer.
//   wa_mount_baker_coleman_deming   log, 816 m, track 11x nearer.
//       Both are same-name pairs — the two records agree on WHICH trailhead and disagree only on
//       where it is, so copying the winner loses no information at all.
//
// THREE SIBLINGS OF MERCHANT ARE DELIBERATELY LEFT, and it looks inconsistent until you see why.
// wa_gunnshy_peak_standard_route, wa_tailgunner_peak_w_route and wa_vanishing_point carry the
// IDENTICAL 516 m Barclay Lake disagreement, and it is tempting to apply Merchant's answer to all
// four. That is cross-route consensus, which these appliers exclude by construction — and the
// consensus probe has been wrong four times. Asked individually: one has NO TRACK and two are
// AMBIGUOUS. Their own rows do not answer, so they wait.
//
// Pass --apply to write; default is a dry run. Re-running is safe: rows already agreeing are skipped.

import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

const PLAN = [
  ["wa_glacier_peak_sitkum_glacier", "pin"],
  ["wa_gray_wolf_ridge_se_slopes", "pin"],
  ["wa_merchant_peak_south_route", "log"],
  ["wa_mount_baker_coleman_deming", "log"],
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
  if (i < 0 || !al) { console.error(`${id}: missing a record — refusing`); process.exit(1); }

  const pLat = num(wps[i].lat), pLng = num(wps[i].lng);
  const lLat = num(al.trailheadLat), lLng = num(al.trailheadLng);
  if (pLat === null || lLat === null) { console.error(`${id}: a record has no coordinate — refusing`); process.exit(1); }

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
    after = `"${wps[i].name}" @${pLat},${pLng}  (direction dropped)`;
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
  if (winner === "pin" && !(opts && opts.keepDirection) && a2.trailheadDirection) {
    console.error("   DIRECTION SURVIVED — it describes the removed trailhead"); process.exit(1);
  }
  const now = Math.round(hav(num(w2.lat), num(w2.lng), num(a2.trailheadLat), num(a2.trailheadLng)));
  if (now > 500) { console.error(`   RECONCILE FAILED — still ${now} m apart`); process.exit(1); }
  console.log(`   reconciled: both records now agree to ${now} m\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote} route(s), skipped ${skipped}.` : `DRY RUN — ${PLAN.length} planned. Pass --apply to write.`);

// FOLLOW-UP this slice does NOT do, recorded rather than left to be rediscovered:
//   wa_glacier_peak_sitkum_glacier's `approach` column still narrates the White Chuck River Trail
//   step by step, so its trailhead now names the reliable approach while its approach prose
//   describes the historic one. Both are preserved in approach_variants, so nothing is lost, but
//   the two should be brought into line. That is prose work, not a coordinate copy, and mixing it
//   into an applier whose whole guarantee is "declares a winner, never a value" would break that.
