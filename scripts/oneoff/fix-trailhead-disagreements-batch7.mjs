// Two trailhead disagreements settled by a THIRD record: the route's own gpx track.
//
// Both were excluded from batch6 for the right reason — the two records name the same place and
// the prose gives a road mileage rather than a point, so nothing ON THE ROW could separate them.
// probe-track-start-as-third-trailhead-record.mjs supplies the missing record.
//
// WHY THE TRACK IS USUALLY NOT ALLOWED TO VOTE, and why it may here. Tracks in this catalog are
// frequently GENERATED from the waypoints — on 4 of 5 Goodell Creek routes the first track point
// equals the pin to the digit — so "the track backs the pin" is normally one claim counted twice.
// That is exactly why the probe classifies rather than scores: a track start within ~1 m of the pin
// is DERIVED and gets no vote. These two are 98 m and 166 m off their pins, so neither was copied
// from one, and each lands 7-15x nearer the pin than the blob.
//
//   wa_bedal_peak_standard          track 98 m from pin, 1477 m from log   (15x)
//   wa_mount_anderson_eel_glacier   track 166 m from pin, 1228 m from log  (7x)
//
// The prose agrees in both cases, which is what turns a vote into a verdict:
//   Bedal   — the approach says the hike starts at an unsigned boot path "roughly 1.3 miles up the
//             spur road near its second or third switchback", NOT at the road end. The pin is named
//             for that path ("FR 4096 Pullout / Merry Brook Climbers' Path"); the blob's
//             trailheadDirection places its trailhead "at the end of FR-4096", which the route's own
//             approach contradicts. So the direction goes with the coordinate it describes.
//   Anderson — the approach says drive "roughly 5.5 miles to the washed-out gate ... park here". The
//             pin sits there; the blob is 1.2 km further. Its trailheadDirection ("From the
//             Dosewallips Road (FR-2610) washout parking near Brinnon: road-walk/bike toward the
//             Olympics east-side trails") still describes the SURVIVING trailhead accurately, so it
//             is KEPT — the distinction batch6 added {keepDirection} for.
//
// The three siblings the probe could NOT settle are left alone and named at the bottom. A probe that
// answers 2 of 5 and says so beats one that answers 5 of 5.
//
// Pass --apply to write; default is a dry run. Re-running is safe: rows already agreeing are skipped.

import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const key = requireServiceKey();

const PLAN = [
  ["wa_bedal_peak_standard", "pin"],
  ["wa_mount_anderson_eel_glacier", "pin", { keepDirection: true }],
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

  const next = { ...al, trailhead: wps[i].name, trailheadLat: pLat, trailheadLng: pLng };
  if (!(opts && opts.keepDirection)) delete next.trailheadDirection;
  console.log(`${id}  (${apart} m apart, pin wins on the track's vote)`);
  console.log(`   log "${al.trailhead}" @${lLat},${lLng}`);
  console.log(`   -> "${wps[i].name}" @${pLat},${pLng}${opts && opts.keepDirection ? "  (direction kept)" : "  (direction dropped)"}`);
  if (!APPLY) { console.log("   (dry run)\n"); continue; }

  await patchRow("routes", id, { approach_logistics: next });

  const [chk] = await selectAll("routes", "id,waypoints,approach_logistics", `id=eq.${id}`, { pageSize: 3, key });
  const w2 = (chk.waypoints || []).find(w => w && String(w.type || "").toLowerCase() === "trailhead");
  const a2 = chk.approach_logistics || {};
  if (num(a2.trailheadLat) === null || Math.abs(num(a2.trailheadLat) - pLat) > 1e-6) {
    console.error(`   RECONCILE FAILED — got ${a2.trailheadLat}, wanted ${pLat}`); process.exit(1);
  }
  if ((chk.waypoints || []).length !== wps.length) { console.error("   WAYPOINT COUNT CHANGED"); process.exit(1); }
  const keep = !!(opts && opts.keepDirection);
  if (keep && !a2.trailheadDirection) { console.error("   DIRECTION LOST — it was meant to be kept"); process.exit(1); }
  if (!keep && a2.trailheadDirection) { console.error("   DIRECTION SURVIVED — it describes the removed trailhead"); process.exit(1); }
  const now = Math.round(hav(num(w2.lat), num(w2.lng), num(a2.trailheadLat), num(a2.trailheadLng)));
  if (now > 500) { console.error(`   RECONCILE FAILED — still ${now} m apart`); process.exit(1); }
  console.log(`   reconciled: both records now agree to ${now} m\n`);
  wrote++;
}
console.log(APPLY ? `wrote ${wrote} route(s), skipped ${skipped}.` : `DRY RUN — ${PLAN.length} planned. Pass --apply to write.`);

// STILL UNSETTLED, and the track cannot help:
//   wa_little_big_chief_mountain_northeast_face, wa_northwest_face_4 — NO TRACK at all. (They are
//     the same 7,914 m disagreement on two routes: Dingford Creek vs Dutch Miller Gap.)
//   wa_phantom_peak_south_route — has a track, but it starts 29 km from the pin and 33 km from the
//     blob, i.e. it covers the climb rather than the approach. Correctly returns AMBIGUOUS rather
//     than voting for whichever it happens to be marginally nearer. That its start is ~30 km from
//     both records is worth a separate look; it may be the wrong track for this route entirely.
