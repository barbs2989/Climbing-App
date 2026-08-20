// wa_phantom_peak_south_route stores its trailhead twice and the two disagree — and unlike every
// other case in that audit, the route's own waypoint chain matches NEITHER. CLAUDE.md records the
// chain as looking like the Big Beaver / Luna Creek approach while the two records name Hannegan
// Pass and Nooksack Cirque.
//
// A test that always picks one of the two offered answers would have picked a wrong one here, so
// this prints all three records plus the route's own prose and lets the geometry speak. It also
// asks which PEAK each candidate is actually near, since a trailhead 30 km from the mountain is
// not automatically wrong in the North Cascades — that is what remote means.
//
// Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();
const ID = "wa_phantom_peak_south_route";
const R = 6371000, toR = (d) => (d * Math.PI) / 180;
function hvM(a, b) {
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const num = (v) => { if (v == null || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

const SEL = "id,name,area_id,discipline,waypoints,gpx,approach,approach_logistics,road,dist_km,gain_ft";
const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${SEL}&id=eq.${ID}`, { headers: headers(k) })).json())[0];
if (!r) { console.error("route not found"); process.exit(1); }
const area = (await (await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,lat,lng,path&id=eq.${r.area_id}`, { headers: headers(k) })).json())[0];

console.log(`\n### ${r.id} — ${r.name}`);
console.log(`  peak: ${area ? `${area.name} @ ${area.lat},${area.lng}` : r.area_id}`);
console.log(`  dist_km=${r.dist_km ?? "-"}  gain_ft=${r.gain_ft ?? "-"}`);

const wps = (r.waypoints || []).filter((w) => w && num(w.lat) != null);
console.log(`\n  waypoint chain (${wps.length} placed of ${(r.waypoints || []).length}):`);
for (const w of r.waypoints || []) {
  const has = num(w.lat) != null;
  const d = has && area && area.lat != null ? Math.round(hvM({ lat: num(w.lat), lng: num(w.lng) }, { lat: area.lat, lng: area.lng }) / 100) / 10 : null;
  console.log(`    [${String(w.type).padEnd(10)}] ${String(w.name).slice(0, 42).padEnd(42)} ${has ? `${w.lat},${w.lng}` : "(no coordinate)"}  ${d == null ? "" : `${d} km from the peak`}  distMi=${w.distMi ?? "-"}`);
}

const bl = r.approach_logistics || {};
console.log(`\n  approach_logistics.trailhead: ${bl.trailhead ?? "—"}  ${bl.trailheadLat ?? "—"},${bl.trailheadLng ?? "—"}`);
if (bl.trailheadLat != null && area && area.lat != null)
  console.log(`     that blob coordinate is ${(hvM({ lat: num(bl.trailheadLat), lng: num(bl.trailheadLng) }, { lat: area.lat, lng: area.lng }) / 1000).toFixed(1)} km from the peak`);
const thPin = wps.find((w) => /trailhead/i.test(String(w.type)));
if (thPin && area && area.lat != null)
  console.log(`  trailhead PIN "${thPin.name}" is ${(hvM({ lat: num(thPin.lat), lng: num(thPin.lng) }, { lat: area.lat, lng: area.lng }) / 1000).toFixed(1)} km from the peak`);
if (thPin && bl.trailheadLat != null)
  console.log(`  the two trailhead records are ${(hvM({ lat: num(thPin.lat), lng: num(thPin.lng) }, { lat: num(bl.trailheadLat), lng: num(bl.trailheadLng) }) / 1000).toFixed(1)} km apart`);

console.log(`\n  road.name: ${(r.road && r.road.name) || "—"}`);
console.log(`\n  approach:\n${String(r.approach || "—")}`);

/* Which named trailhead-ish area is nearest each candidate? An independent third record, the way
   trackOffItsPeak anchors on the peak instead of refereeing a pin against a line. */
const cands = [];
if (thPin) cands.push(["waypoint PIN", num(thPin.lat), num(thPin.lng), thPin.name]);
if (bl.trailheadLat != null) cands.push(["logistics BLOB", num(bl.trailheadLat), num(bl.trailheadLng), bl.trailhead]);
const first = wps[0]; if (first) cands.push(["chain START", num(first.lat), num(first.lng), first.name]);
const allAreas = await (await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,lat,lng&lat=not.is.null&lat=gte.48&lat=lte.49.2&lng=gte.-122.2&lng=lte.-120.5&limit=2000`, { headers: headers(k) })).json();
console.log(`\n  nearest named areas to each candidate (from ${allAreas.length} in the region):`);
for (const [label, la, ln, nm] of cands) {
  const near = allAreas.map((a) => ({ a, d: hvM({ lat: la, lng: ln }, { lat: a.lat, lng: a.lng }) })).sort((x, y) => x.d - y.d).slice(0, 3);
  console.log(`    ${label.padEnd(15)} "${String(nm).slice(0, 34)}" ${la},${ln}`);
  for (const n of near) console.log(`        ${(n.d / 1000).toFixed(1).padStart(6)} km  ${n.a.name}`);
}
