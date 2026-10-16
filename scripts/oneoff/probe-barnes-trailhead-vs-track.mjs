// Does the new partial-track caveat ever blame the wrong record?
//
// wa_mount_barnes_scramble renders "it starts 18.9 km from the trailhead", which reads as an
// accusation against the TRACK. But probe-whose-track-is-it puts the track's start in the Elwha
// (near Whiskey Bend) and its end 2.2 km from Mount Seattle in the upper Elwha basin — i.e. the
// line is the Elwha River Trail approach, which is exactly right for a peak called "Elwha Basin
// Scramble". And CLAUDE.md already records this route as an audit:trailhead-road finding: its
// `road` block named "Olympic Hot Springs Road (to Whiskey Bend Trailhead)" while the route sat
// at the SOL DUC trailhead, every sentence true and about a road on the other side of the
// Olympics.
//
// If the trailhead PIN is the wrong record, the caveat is factually true — the line really does
// start 18.9 km from that pin — but points a reader at the wrong half. Worth knowing before the
// sentence ships to 62 routes.
//
// Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();

const R = 6371000, toR = (d) => (d * Math.PI) / 180;
function hvM(a, b) {
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const ID = "wa_mount_barnes_scramble";
const SEL = "id,name,area_id,waypoints,gpx,approach,approach_logistics,road";
const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=eq.${ID}`, { headers: headers(k) })).json())[0];
if (!r) { console.error("route not found"); process.exit(1); }

const line = (r.gpx || []).map((p) => ({ lat: Number(p[0]), lng: Number(p[1]) })).filter((p) => Number.isFinite(p.lat));
const start = line[0], end = line[line.length - 1];
console.log(`\n### ${r.id} — ${r.name}  (area ${r.area_id})`);
console.log(`track: ${line.length} pts,  start ${start.lat.toFixed(5)},${start.lng.toFixed(5)}  ->  end ${end.lat.toFixed(5)},${end.lng.toFixed(5)}`);

console.log(`\nwaypoints:`);
for (const w of r.waypoints || []) {
  const has = w && w.lat != null && Number.isFinite(Number(w.lat));
  const d = has ? Math.min(...line.map((q) => hvM({ lat: Number(w.lat), lng: Number(w.lng) }, q))) : null;
  console.log(`  [${String(w.type).padEnd(10)}] ${String(w.name).slice(0, 44).padEnd(44)} ${has ? `${w.lat},${w.lng}` : "(no coordinate)"}   ${d == null ? "" : `${Math.round(d)} m from the track`}   distMi=${w.distMi ?? "-"}`);
}

const bl = r.approach_logistics || {};
console.log(`\napproach_logistics.trailhead: ${bl.trailhead ?? "—"}   ${bl.trailheadLat ?? "—"},${bl.trailheadLng ?? "—"}`);
if (bl.trailheadLat != null) console.log(`   that blob coordinate is ${Math.round(Math.min(...line.map((q) => hvM({ lat: Number(bl.trailheadLat), lng: Number(bl.trailheadLng) }, q))))} m from the track`);
console.log(`\nroad.name: ${(r.road && r.road.name) || "—"}`);
console.log(`\napproach: ${String(r.approach || "").slice(0, 700)}`);
