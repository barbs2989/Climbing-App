// Which of the two recorded trailheads does the route's own waypoint CHAIN start from?
//
// Answered by geometry, with no research and no judgement, using an invariant that cannot
// be argued with: **a waypoint's straight-line distance from the trailhead can never exceed
// its recorded trail mileage.** Trail distance is the walked path; the straight line is the
// chord. A candidate that puts a pin further away in a straight line than the climber
// supposedly walked to reach it is not that pin's trailhead.
//
// This is a THIRD record adjudicating between the two that disagree — the same move as
// audit:waypoints' trackOffItsPeak, which anchors on the peak coordinate rather than trying
// to decide between a pin and a line that merely disagree with each other.
//
// It measured decisively on wa_chikamin_peak_southeast_slopes: "Kendall Katwalk" is recorded
// at 6.6 trail miles (10.6 km) and sits 11.3 km straight-line from the Mineral Creek pin —
// impossible — against 3.7 km from the PCT North blob. The chain is the PCT approach and the
// pin is the wrong record.
//
// A route whose chain carries no distMi cannot be judged here, and says so rather than
// returning a verdict. Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const IDS = [
  "rainier_central_mowich_face", "wa_chikamin_peak_southeast_slopes", "wa_classic_route_3",
  "wa_liberty_bell_independence_route", "wa_lundin_peak_west_ridge", "wa_mount_carru_scramble",
  "wa_mount_howard_south_slope", "wa_phantom_peak_south_route", "wa_remmel_mountain_nw_ridge",
  "wa_ridge_traverse_from_east_fury", "wa_south_face_5", "wa_the_direct_north_ridge_w_gendarme",
];
const KM_PER_MI = 1.609344;
/* Tolerance covers only what is genuinely uncertain: a mileage rounded to one decimal
   (±0.05 mi) and a hand-placed pin (a few hundred metres). It must NOT be generous — at 15%
   it absorbed the Chikamin case entirely, rating a pin 11.3 km away across 10.6 km of walking
   as acceptable, which is the false-pass direction on the one test that can settle these. */
const SLACK = 0.03, FLOOR_KM = 0.15;
/* The hard violation is decisive but rare. The robust comparative signal is the ratio of
   straight-line distance to trail distance: on the real trailhead it is well under 1 (a trail
   wanders), and a candidate whose median ratio is several times the other's is not the start
   of this chain. Require a clear margin so two genuine approaches, which both fit, stay
   unseparated rather than being forced to a verdict. */
const RATIO_MARGIN = 2.5;
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

const k = anonKey();
function hv(p, q) {
  const R = 6371, t = (d) => (d * Math.PI) / 180;
  const a = Math.sin(t(q.lat - p.lat) / 2) ** 2 + Math.cos(t(p.lat)) * Math.cos(t(q.lat)) * Math.sin(t(q.lng - p.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
const isTh = (w) => /trailhead/i.test(String((w && w.type) || ""));
const num = (v) => (v != null && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,approach_logistics&id=in.(${IDS.join(",")})`, { headers: headers(k) })).json();

for (const id of IDS) {
  const r = rows.find((x) => x.id === id);
  if (!r) { console.log(`\n### ${id}: NOT FOUND`); continue; }
  const wps = (r.waypoints || []).filter(Boolean);
  const pinWp = wps.find(isTh);
  const al = r.approach_logistics || {};
  const pin = pinWp && num(pinWp.lat) != null ? { lat: num(pinWp.lat), lng: num(pinWp.lng) } : null;
  const blob = num(al.trailheadLat) != null ? { lat: num(al.trailheadLat), lng: num(al.trailheadLng) } : null;

  console.log(`\n### ${r.id}`);
  if (!pin || !blob) { console.log(`    cannot judge — ${!pin ? "no placed trailhead pin" : "no blob coordinate"}`); continue; }

  // Only waypoints that are NOT the trailhead and that carry a mileage can testify.
  const judges = wps.filter((w) => !isTh(w) && num(w.distMi) != null && num(w.lat) != null && num(w.distMi) > 0);
  if (!judges.length) { console.log(`    cannot judge — no non-trailhead waypoint carries distMi`); continue; }

  let pinBad = 0, blobBad = 0;
  const pinR = [], blobR = [];
  const lines = [];
  for (const w of judges) {
    const p = { lat: num(w.lat), lng: num(w.lng) };
    const trailKm = num(w.distMi) * KM_PER_MI;
    const cap = trailKm * (1 + SLACK) + FLOOR_KM;
    const dPin = hv(pin, p), dBlob = hv(blob, p);
    if (dPin > cap) pinBad++;
    if (dBlob > cap) blobBad++;
    pinR.push(dPin / trailKm); blobR.push(dBlob / trailKm);
    lines.push(`      ${String(w.distMi).padStart(5)}mi (${trailKm.toFixed(1)}km walked)  ${String(w.name).slice(0, 38).padEnd(38)} pin ${dPin.toFixed(1)}km${dPin > cap ? " IMPOSSIBLE" : ""}   blob ${dBlob.toFixed(1)}km${dBlob > cap ? " IMPOSSIBLE" : ""}`);
  }
  /* The EARLIEST waypoints are the diagnostic ones, and using the median over the whole
     chain hid the clearest case in the set. On Chikamin the late waypoints sit between the
     two candidate trailheads — both are ~8-9 km from the summit — so they testify to nothing
     and drag both medians together (0.45 vs 0.38, "both fit"). The first waypoint after the
     start is where the two candidates are furthest apart: Kendall Katwalk at 6.6 mi is a
     chord/trail ratio of 1.07 from the pin (over 1.0, i.e. a straight line longer than the
     walk) against 0.35 from the blob. Judge on the near end of the chain, report the median
     as context. */
  const near = judges.map((w, i) => i).sort((a, b) => num(judges[a].distMi) - num(judges[b].distMi)).slice(0, 3);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const np = mean(near.map((i) => pinR[i])), nb = mean(near.map((i) => blobR[i]));
  const mp = median(pinR), mb = median(blobR);
  /* Decided on the physical invariant ALONE — a chord longer than the walk — with tolerance
     only for a mileage rounded to one decimal and a hand-placed pin. The near-start and
     median ratios below are REPORTED as context and deliberately do not vote: adding them
     meant picking a margin, and every margin I tried was one I had chosen because it
     produced the answer I already believed about Chikamin. A threshold fitted to the case
     it is meant to judge proves nothing. FLOOR_KM matters more than it looks — at 0.4 km it
     alone rated Chikamin's Kendall Katwalk (11.30 km chord across 10.62 km of trail) as
     acceptable, by 20 metres. */
  let verdict;
  if (pinBad && !blobBad) verdict = "BLOB is the chain's trailhead — the PIN is the wrong record";
  else if (blobBad && !pinBad) verdict = "PIN is the chain's trailhead — the BLOB is the wrong record";
  else if (pinBad && blobBad) verdict = "NEITHER fits the chain — both records are wrong for these waypoints";
  else verdict = "both fit — the chain cannot separate them (likely two genuine approaches)";
  console.log(`    ${judges.length} testify · impossible: pin ${pinBad}, blob ${blobBad} · chord/trail near start: pin ${np.toFixed(2)}, blob ${nb.toFixed(2)} · median: pin ${mp.toFixed(2)}, blob ${mb.toFixed(2)}`);
  console.log(`    VERDICT: ${verdict}`);
  lines.forEach((l) => console.log(l));
}
