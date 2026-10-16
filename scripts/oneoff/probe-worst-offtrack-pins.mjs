// The stored coordinate of each pin on the sharpened off-track worklist, so it can be
// compared against the FEATURE's own published coordinate rather than against the track.
// Comparing a pin to a line only says they disagree; comparing it to the named feature says
// which one is wrong. Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const WANT = [
  ["wa_mount_olson_standard", "Sundown Pass"],
  ["wa_mount_olson_standard", "Olympic National Park boundary"],
  ["wa_argonaut_peak_east_ridge", "Long's Pass"],
  ["wa_argonaut_peak_east_ridge", "Colchuck Lake"],
  ["wa_sherman_peak_baker_route", "Railroad Grade Trail 603.2 junction"],
  ["wa_east_face_6", "PCT Junction near Lemah Meadows"],
  ["wa_chimney_rock_west_face", "PCT Junction near Lemah Meadows"],
  ["wa_spire_point_southwest_face", "Sixmile Camp / Bachelor Creek Trail junction"],
  ["wa_chiwawa_mountain_southwest", "Buck Creek Trail / Chiwawa River Trail fork"],
  ["wa_chiwawa_mountain_southwest", "Red Mountain Trail junction"],
  ["wa_tower_mountain_southwest_route", "Cutthroat Pass"],
  ["wa_mount_rahm_standard", "Trailhead / border return"],
  ["wa_bacon_peak_diobsud", "Wilderness-boundary saddle"],
];

const k = anonKey();
const ids = [...new Set(WANT.map((w) => w[0]))];
const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,gpx&id=in.(${ids.join(",")})`, { headers: headers(k) })).json();

const pt = (p) => Array.isArray(p) ? { lat: Number(p[0]), lng: Number(p[1]) } : null;
for (const id of ids) {
  const r = rows.find((x) => x.id === id);
  if (!r) { console.log(`\n### ${id} NOT FOUND`); continue; }
  const track = (Array.isArray(r.gpx) ? r.gpx : []).map(pt).filter(Boolean);
  console.log(`\n### ${r.id} — ${r.name}   (track ${track.length} pts, ${track.length ? `${track[0].lat.toFixed(4)},${track[0].lng.toFixed(4)} -> ${track[track.length - 1].lat.toFixed(4)},${track[track.length - 1].lng.toFixed(4)}` : "none"})`);
  for (const w of r.waypoints || []) {
    const wanted = WANT.some(([i, n]) => i === id && n === w.name);
    console.log(`   ${wanted ? ">>" : "  "} [${String(w.type).padEnd(9)}] ${String(w.name).slice(0, 48).padEnd(48)} ${w.lat},${w.lng}  distMi=${w.distMi ?? "-"}`);
  }
}
