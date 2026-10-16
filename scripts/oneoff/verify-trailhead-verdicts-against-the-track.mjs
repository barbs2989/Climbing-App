// Re-check every trailhead verdict I shipped against the gpx track, INCLUDING the ones decided
// before the track was being consulted at all.
//
// This exists because of wa_primus_peak_south_ridge. That verdict was reasoned from the route's
// prose — `approach`, `overview` and `trailheadDirection` ALL named Eldorado — and it was wrong,
// because the prose is the contaminated half (it is Dorado Needle's approach, 21.5 km away). The
// route's own gpx said Thunder Creek and nobody asked it, because
// probe-track-start-as-third-trailhead-record.mjs did not exist when that batch was written.
//
// THE GENERAL RULE, which is the reason this file exists rather than a one-off check of one row:
// a verdict reached before a new source of evidence exists should be RE-RUN against it, not left
// standing. New evidence does not only apply forward.
//
// Once a row has been repaired its two records AGREE, so the pin-vs-blob comparison can no longer
// discriminate — there is nothing left to choose between. What can still be asked is whether the
// value that WON sits anywhere near where the route's own track begins.
//
// A LARGE DISTANCE IS NOT PROOF OF ANYTHING, and this must stay report-only for that reason: a
// track legitimately starts mid-route when it covers the climb rather than the approach
// (wa_phantom_peak_south_route begins 29 km out, deep in the Pickets, and is perfectly correct).
// The output is a list to READ, ordered worst first.
//
//   node scripts/oneoff/verify-trailhead-verdicts-against-the-track.mjs
//
// FIRST RUN, 2026-08-14 — 12 verdicts re-checked, 9 confirmed, 2 unanswerable, 3 read by hand:
//
//   51 m  wa_glacier_peak_sitkum_glacier   the most consequential fix in the sweep, confirmed
//   28-166 m  merchant, baker_coleman_deming, bedal, gray_wolf, anderson, primus   confirmed
//   NO TRACK  wa_mount_queets_south, wa_castle_peak_pasayten_scramble   cannot be re-checked
//
//   1332 m  wa_liberty_bell_thin_red_line — track starts at the Blue Lake pin this verdict
//       overrode, so it LOOKS like a contradiction. Not acted on, for three reasons: the track
//       start (48.51913,-120.67427) sits ~6 m from that pin (48.5191,-120.6742), i.e. one is a
//       rounded copy of the other and they are not independent; Thin Red Line is an EAST FACE
//       route whose own approach describes the pond/hairpin pullout in detail, while Blue Lake
//       serves the south/west side; and its three siblings (liberty_crack, liberty_crack_free,
//       liberty_bell_east_face) were resolved to the same pullout in an earlier batch. Recorded
//       as a disagreement rather than silently dismissed.
//   1357 m  wa_lane_peak_r1 / _r2 — track starts at Narada Falls, the route's own documented
//       WINTER trailhead, on a winter/spring couloir climb. A recorded winter ascent starting
//       from the winter option is not a contradiction. The verdict picked Reflection Lakes
//       because the prose leads with it and the pin was internally inconsistent (named
//       "Reflection Lake Pullout" while sitting at Narada Falls) — a choice of headline between
//       two real trailheads, not a correctness call. Worth a second opinion.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();

// Every route repaired by batches 4-8 of this sweep that I can name. Primus is included
// deliberately — it is the one that failed, and a check that quietly drops its own counter-example
// is worth nothing.
const TOUCHED = [
  "wa_mount_queets_south", "wa_castle_peak_pasayten_scramble", "wa_lane_peak_r1", "wa_lane_peak_r2",
  "wa_liberty_bell_thin_red_line", "wa_primus_peak_south_ridge",
  "wa_bedal_peak_standard", "wa_mount_anderson_eel_glacier",
  "wa_glacier_peak_sitkum_glacier", "wa_gray_wolf_ridge_se_slopes",
  "wa_merchant_peak_south_route", "wa_mount_baker_coleman_deming",
];

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };

const firstPoint = g => {
  const arr = Array.isArray(g) ? g : (g && Array.isArray(g.points) ? g.points : null);
  if (!arr || !arr.length) return null;
  const p = arr[0];
  if (Array.isArray(p) && p.length >= 2) {
    const a = num(p[0]), b = num(p[1]);
    return a === null || b === null ? null : { lat: a, lng: b };
  }
  if (p && typeof p === "object") {
    const a = num(p.lat != null ? p.lat : p[1]), b = num(p.lng != null ? p.lng : p.lon);
    return a === null || b === null ? null : { lat: a, lng: b };
  }
  return null;
};

const out = [];
for (const id of TOUCHED) {
  const [r] = await selectAll("routes", "id,waypoints,approach_logistics,gpx", `id=eq.${id}`, { pageSize: 3, key });
  if (!r) { out.push({ id, note: "NOT FOUND" }); continue; }
  const al = r.approach_logistics || {};
  const w = (Array.isArray(r.waypoints) ? r.waypoints : [])
    .find(x => x && String(x.type || "").toLowerCase() === "trailhead");
  const lat = num(al.trailheadLat), lng = num(al.trailheadLng);
  const t = firstPoint(r.gpx);
  const pts = Array.isArray(r.gpx) ? r.gpx.length : 0;
  if (lat === null) { out.push({ id, note: "no logistics coordinate" }); continue; }
  if (!t) { out.push({ id, note: "NO TRACK — cannot re-check", name: al.trailhead }); continue; }
  const agree = w && num(w.lat) !== null ? Math.round(hav(num(w.lat), num(w.lng), lat, lng)) : null;
  out.push({ id, name: al.trailhead, d: Math.round(hav(t.lat, t.lng, lat, lng)), pts, agree });
}

out.sort((a, b) => (b.d ?? -1) - (a.d ?? -1));
console.log(`re-checking ${TOUCHED.length} shipped verdicts against each route's own track\n`);
for (const o of out) {
  if (o.note) { console.log(`${"".padStart(9)}  ${o.id}  — ${o.note}`); continue; }
  const flag = o.d > 3000 ? "  <-- READ THIS ROW" : "";
  console.log(`${String(o.d).padStart(7)} m  ${o.id}  (${o.pts} pts, records agree to ${o.agree} m)${flag}`);
  console.log(`${"".padStart(9)}  trailhead now: "${o.name}"`);
}
console.log(`\nDistance is from the track's FIRST POINT to the trailhead that won. A large number is a`);
console.log(`QUESTION, not a defect — a track that covers only the climb starts nowhere near a road.`);
console.log(`Read the row; do not rewrite anything from this list alone.`);
