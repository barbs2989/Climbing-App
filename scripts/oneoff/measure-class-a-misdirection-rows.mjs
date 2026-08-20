// The remaining CLASS A "misdirection" rows from DATA-DEFECTS-INDEX-2026-08-19.
//
// Each was recorded as a 1-v-1 disagreement (prose says one place, waypoints say another), and a
// 1-v-1 is NOT decidable from the disagreement -- Little Annapurna is on record here where the
// reported repair was backwards. wa_sherpa_balanced_rock_standard turned out to be 2-v-1 once
// its gpx track was consulted, and the track settled it in one measurement.
//
// So: which of the rest carry a THIRD record that can break the tie? That is what this asks. It
// writes nothing.
//
// A gpx only counts as evidence if it is NOT the waypoint list joined up -- lib/track.js records
// that 201 of 580 WA routes store exactly that, and on those "is the pin on the track" is
// answered yes by construction. Checked per row, and reported, so a row where the track is a
// copy is marked UNUSABLE rather than quietly measured.
import { loadEnv } from "../lib/supabase-env.mjs";
const env = loadEnv();
const U = env.VITE_SUPABASE_URL, K = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const IDS = [
  "wa_lincoln_peak_standard",
  "wa_lincoln_peak_north_ridge",
  "wa_mount_skokomish_standard",
  "wa_buckner_mountain_north_face",
  "wa_three_queens_standard",
  "wa_primus_peak_south_ridge",
  "wa_colchuck_peak_east_ridge",
  "wa_east_ridge_7",
  "wa_mount_hinman_hinman_glacier",
  "wa_huckleberry_mountain_west_route",
  "wa_south_face_12",
  "wa_south_gully_south_spur",
];

const hav = (a1, o1, a2, o2) => {
  const R = 6371000, t = Math.PI / 180;
  const dLat = (a2 - a1) * t, dLon = (o2 - o1) * t;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a1 * t) * Math.cos(a2 * t) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
const COLS = "id,name,area_id,waypoints,gpx,approach,approach_logistics";

for (const id of IDS) {
  const r = await fetch(`${U}/rest/v1/routes?id=eq.${id}&select=${COLS}`, { headers: H });
  if (!r.ok) { console.log(`\n### ${id}\n  READ FAILED ${r.status}`); continue; }
  const [row] = await r.json();
  if (!row) { console.log(`\n### ${id}\n  NO ROW — phantom id?`); continue; }
  const a = await fetch(`${U}/rest/v1/areas?id=eq.${row.area_id}&select=name,lat,lng`, { headers: H });
  const [area] = a.ok ? await a.json() : [];

  const wps = (row.waypoints || []).filter((w) => w && w.lat != null);
  const pts = (Array.isArray(row.gpx) ? row.gpx : []).map((p) => Array.isArray(p) ? { lat: p[0], lng: p[1] } : p)
    .filter((p) => p && p.lat != null);

  console.log(`\n### ${id}   ${row.name}`);
  if (!area || area.lat == null) { console.log("  peak has no coordinate — cannot anchor"); }
  else console.log(`  peak ${area.name} (${area.lat}, ${area.lng})`);

  const al = row.approach_logistics || null;
  const thPin = (row.waypoints || []).find((w) => /trailhead/i.test(w.type || ""));
  console.log(`  approach_logistics trailhead : ${al && al.trailhead ? al.trailhead : "(none)"}`);
  console.log(`  trailhead PIN                : ${thPin ? thPin.name : "(none)"}`);
  if (al && al.trailheadLat != null && thPin && thPin.lat != null) {
    console.log(`  the two trailhead records are ${(hav(al.trailheadLat, al.trailheadLng, thPin.lat, thPin.lng) / 1000).toFixed(1)} km apart`);
  }

  if (!pts.length) { console.log("  gpx: NONE — no third record, needs a human read"); continue; }
  const isWp = (p) => wps.some((w) => hav(p.lat, p.lng, w.lat, w.lng) < 25);
  const copied = pts.every(isWp);
  let ext = 0;
  for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(pts.length / 40)))
    for (let j = 0; j < pts.length; j += Math.max(1, Math.floor(pts.length / 40)))
      ext = Math.max(ext, hav(pts[i].lat, pts[i].lng, pts[j].lat, pts[j].lng));
  console.log(`  gpx: ${pts.length} pts, extent ${(ext / 1000).toFixed(1)} km — ${copied ? "COPY OF THE WAYPOINTS (unusable as evidence)" : "independent"}`);
  if (copied) continue;

  const nearest = (lat, lng) => Math.min(...pts.map((p) => hav(lat, lng, p.lat, p.lng)));
  if (area && area.lat != null) {
    console.log(`  track start -> peak ${(hav(pts[0].lat, pts[0].lng, area.lat, area.lng) / 1000).toFixed(1)} km · end -> peak ${(hav(pts[pts.length - 1].lat, pts[pts.length - 1].lng, area.lat, area.lng) / 1000).toFixed(2)} km`);
  }
  let off = 0;
  for (const w of wps) {
    const d = nearest(w.lat, w.lng);
    if (d > 500) { off++; console.log(`    OFF ${(d / 1000).toFixed(2)} km  [${w.type}] ${w.name}`); }
  }
  console.log(`  ${off} of ${wps.length} pins are >500 m off this route's own track`);
}
