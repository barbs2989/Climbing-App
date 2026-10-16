// Does each proposed slice-ac fix actually come from the OTHER RECORD ON THE ROW, or did the
// triage reach for a third coordinate?
//
// #898 shipped 68 routes through an applier that only ever copies one of a row's two trailhead
// records into the other, so nothing can be invented. Slice ac was held back because many of its
// fixes cite a cross-route CONSENSUS ("the 8-route consensus", "9 records place it there") rather
// than the row itself — and a consensus value is exactly what that applier cannot express.
//
// Rather than eyeball 34 verdicts, this MEASURES the question. For each candidate it reads both
// records, computes what the winner-copy would actually write, and compares that against the
// coordinate the triage recommended:
//
//   MATCH     the recommendation IS the other record — safe to ship through the #898 applier
//   THIRD     the recommendation is neither record — must NOT go through it; it is research,
//             and shipping it would smuggle an invented coordinate in behind a verdict
//
// The distinction is not pedantry. A consensus coordinate may well be RIGHT; it is simply not
// evidence that lives on this row, so it needs a different and more careful path than "copy the
// field next door".
//
// Read-only. node scripts/oneoff/verify-slice-ac-fixes-reference-the-row.mjs
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const key = requireServiceKey();
const TOL_M = 200;   // generous: a recommendation rounded to 4dp still counts as the same point

// [id, winner, recommendedLat, recommendedLng] — winner "log" = pin was wrong, "pin" = log was wrong.
const CAND = [
  ["wa_cutthroat_south_buttress", "pin", 48.529, -120.692],
  ["wa_mount_rainier_kautz_headwall", "log", 46.78669, -121.73454],
  ["wa_bryant_peak_southeast_slopes", "log", 47.44542, -121.42353],
  ["wa_mount_shuksan_white_salmon_glacier", "log", 48.8502, -121.6861],
  ["wa_northwest_ridge_2", "pin", 48.48055, -121.07979],
  ["wa_mount_adams_lyman_glacier", "log", 46.2885, -121.5525],
  ["wa_south_face", "log", 48.549, -120.630965],
  ["wa_mount_adams_lava_glacier_headwall", "log", 46.288612, -121.551532],
  ["wa_the_hitchhiker", "log", 48.5191, -120.6742],
  ["wa_liberty_and_injustice_for_all", "log", 48.51454, -120.64332],
  ["wa_liberty_bell_east_face", "log", 48.51454, -120.64332],
  ["wa_liberty_crack", "log", 48.51454, -120.64332],
  ["wa_liberty_crack_free", "log", 48.51454, -120.64332],
  ["wa_lost_peak_pasayten_scramble", "log", 48.65617, -120.51276],
  ["wa_mount_larrabee_south_ridge", "pin", 48.9526, -121.6358],
  ["wa_huckleberry_mountain_west_route", "pin", 47.4278, -121.4135],
  ["wa_esmeralda_peaks_scramble", "log", 47.43656, -120.93697],
  ["wa_mount_index_north_norwegian_buttress", "log", 47.80925, -121.57409],
  ["wa_mount_index_north_face", "pin", 47.809189, -121.573693],
  ["wa_goode_mountain_megalodon_ridge", "log", 48.5181, -120.7331],
  ["wa_goode_mountain_northeast_face", "log", 48.5181, -120.7331],
  ["wa_goode_mountain_southwest_couloir", "log", 48.5181, -120.7331],
  ["wa_castle_peak_tatoosh_southeast_face", "pin", 46.76861, -121.72969],
  ["wa_treen_peak_scramble", "pin", 47.5262, -121.4729],
  ["wa_nooksack_tower_beckey_route", "log", 48.894, -121.652],
  ["wa_nooksack_tower_south_face", "log", 48.894, -121.652],
  ["wa_plan_9_from_outer_space", "log", 48.68276, -121.26928],
  ["wa_east_ridge_4", "log", 48.68276, -121.26928],
  ["wa_frenzel_spitz_south_route", "log", 48.68276, -121.26928],
  ["wa_mcmillan_spire_west_southwest_ridge", "log", 48.68276, -121.26928],
  ["wa_mcmillan_spire_west_west_ridge", "log", 48.68276, -121.26928],
  ["wa_mount_degenhardt_southwest_route", "log", 48.68276, -121.26928],
  ["wa_the_rake_traverse_route", "log", 48.68276, -121.26928],
  ["wa_west_twin_needle_south_route", "log", 48.68276, -121.26928],
];

const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const R = Math.PI / 180;
const hav = (a, b, c, d) => { const p = (c - a) * R, q = (d - b) * R;
  const s = Math.sin(p / 2) ** 2 + Math.cos(a * R) * Math.cos(c * R) * Math.sin(q / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(s)); };

const withRetry = async (label, fn, tries = 5) => {
  for (let i = 1; i <= tries; i++) {
    try { return await fn(); }
    catch (e) {
      if (i === tries) throw e;
      console.log(`(${label} attempt ${i} failed — retrying)`);
      await new Promise(r => setTimeout(r, 700 * 2 ** (i - 1)));
    }
  }
};

const ids = CAND.map(c => c[0]);
const rows = await withRetry("routes", () => selectAll("routes", "id,waypoints,approach_logistics",
  `id=in.(${ids.join(",")})`, { pageSize: 40, key }));
if (rows.length !== ids.length) console.log(`NOTE: read ${rows.length} of ${ids.length} rows\n`);
const by = new Map(rows.map(r => [r.id, r]));

const match = [], third = [], broken = [];
for (const [id, winner, rLat, rLng] of CAND) {
  const r = by.get(id);
  if (!r) { broken.push(`${id}: NOT FOUND`); continue; }
  const wps = Array.isArray(r.waypoints) ? r.waypoints : [];
  const w = wps.find(x => x && String(x.type || "").toLowerCase() === "trailhead");
  const al = (r.approach_logistics && typeof r.approach_logistics === "object" && !Array.isArray(r.approach_logistics))
    ? r.approach_logistics : null;
  const pLat = w ? num(w.lat) : null, pLng = w ? num(w.lng) : null;
  const lLat = al ? num(al.trailheadLat) : null, lLng = al ? num(al.trailheadLng) : null;
  if (pLat === null || lLat === null) { broken.push(`${id}: a record has no coordinate`); continue; }

  // What the #898 applier WOULD write for this winner.
  const wLat = winner === "log" ? lLat : pLat, wLng = winner === "log" ? lLng : pLng;
  const d = Math.round(hav(wLat, wLng, rLat, rLng));
  const row = { id, winner, d, wLat, wLng, rLat, rLng,
    otherName: winner === "log" ? al.trailhead : (w && w.name) };
  (d <= TOL_M ? match : third).push(row);
}

console.log(`slice ac: ${CAND.length} candidates, tolerance ${TOL_M} m\n`);
console.log(`-- MATCH (${match.length}) — the recommendation IS the row's other record; safe for the #898 applier --`);
for (const m of match) console.log(`   ${String(m.d).padStart(4)} m  ${m.id}  (${m.winner} wins -> "${m.otherName}")`);
console.log(`\n-- THIRD COORDINATE (${third.length}) — recommendation matches NEITHER record; must not ship this way --`);
for (const t of third) {
  console.log(`   ${String(t.d).padStart(6)} m  ${t.id}  (${t.winner} wins)`);
  console.log(`            row's ${t.winner} record @${t.wLat},${t.wLng}   vs recommended @${t.rLat},${t.rLng}`);
}
if (broken.length) { console.log(`\n-- UNUSABLE (${broken.length}) --`); for (const b of broken) console.log(`   ${b}`); }
console.log(`\nNothing was written. A THIRD-coordinate recommendation is not necessarily wrong — it is`);
console.log(`simply not evidence that lives on this row, so it cannot ride the copy-the-neighbour path.`);
