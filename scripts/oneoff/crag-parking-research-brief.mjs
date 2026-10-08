#!/usr/bin/env node
// Stage 3 of the all-states crag PARKING pass (0255): a research BRIEF for one destination that name-matching
// cannot reach (one lot serving crags up to 3 km away — Smith Rock, Eldorado, Shelf Road). It lists the
// destination's sub-areas two levels down (id, coordinate, crag routes beneath) and EVERY mapped parking lot and
// trailhead in its box, named or not, each with an id. The researcher only decides WHICH lot each sub-area uses,
// so every coordinate written is a mapped lot, never a guess; apply-crag-parking.mjs then re-checks each one.
// Usage: node scripts/oneoff/crag-parking-research-brief.mjs <cacheDir> <outDir> <destination area_id>...
import fs from "node:fs";
import path from "node:path";

const [dir, outDir, ...dests] = process.argv.slice(2);
if (!dir || !outDir || !dests.length) { console.error("usage: crag-parking-research-brief.mjs <cacheDir> <outDir> <area_id>..."); process.exit(2); }
const areas = JSON.parse(fs.readFileSync(path.join(dir, "areas.json"), "utf8")), crag = JSON.parse(fs.readFileSync(path.join(dir, "crag-area-ids.json"), "utf8"));
const byId = new Map(areas.map((a) => [a.id, a]));
const MIRRORS = ["https://overpass.private.coffee/api/interpreter", "https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
fs.mkdirSync(outDir, { recursive: true });
for (const id of dests) {
  const d = byId.get(id); if (!d) { console.log(`${id}: no such area`); continue; }
  const sub = areas.filter((a) => a.path === d.path || String(a.path).startsWith(d.path + "."));
  const below = new Map(); for (const a of sub) { if (!crag[a.id]) continue; for (let p = a; p && sub.includes(p); p = byId.get(p.parent_id)) below.set(p.id, (below.get(p.id) || 0) + crag[a.id]); }
  const all = sub.filter((a) => a.lat != null && a.lng != null && crag[a.id]); if (!all.length) { console.log(`${id}: no crag coordinates`); continue; }
  // The box is drawn round the crags within 10 km of the median one: a single stray coordinate stretched Lynn
  // Woods' box over half of Boston (2,605 lots). Strays stay in the outline, marked, for the researcher.
  const med = (xs) => xs.slice().sort((p, q) => p - q)[xs.length >> 1], mLat = med(all.map((a) => +a.lat)), mLng = med(all.map((a) => +a.lng));
  const km = (a, b, c, e) => { const R = 6371, x = (c - a) * Math.PI / 180, y = (e - b) * Math.PI / 180; const h = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
  const stray = new Set(all.filter((a) => km(mLat, mLng, +a.lat, +a.lng) > 10).map((a) => a.id)), pts = all.filter((a) => !stray.has(a.id));
  const pad = 0.02, bb = [Math.min(...pts.map((a) => +a.lat)) - pad, Math.min(...pts.map((a) => +a.lng)) - pad, Math.max(...pts.map((a) => +a.lat)) + pad, Math.max(...pts.map((a) => +a.lng)) + pad];
  const ql = `[out:json][timeout:120];(nwr[amenity=parking](${bb.join(",")});nwr[highway=trailhead](${bb.join(",")}););out center tags;`;
  let els = null;
  for (let k = 0; k < 6 && !els; k++) {
    try { const r = await fetch(MIRRORS[k % 3], { method: "POST", body: "data=" + encodeURIComponent(ql), headers: { "User-Agent": "ClimbMatch-parking-brief/1.0", "Content-Type": "application/x-www-form-urlencoded" } }); /* no UA = 406 */
      if (r.ok) els = (await r.json()).elements; } catch {}
    if (!els) await new Promise((z) => setTimeout(z, 5000 * (k + 1)));
  }
  if (!els) { console.log(`${id}: Overpass unreachable`); continue; }
  const lots = els.map((e) => ({ lot: e.type[0] + e.id, lat: +(e.lat ?? e.center?.lat).toFixed(6), lng: +(e.lon ?? e.center?.lon).toFixed(6), kind: e.tags?.amenity === "parking" ? "parking" : "trailhead", name: e.tags?.name || null, access: e.tags?.access || null, fee: e.tags?.fee || null, capacity: e.tags?.capacity || null, surface: e.tags?.surface || null })).filter((l) => !Number.isNaN(l.lat))
    .filter((l) => pts.some((a) => km(+a.lat, +a.lng, l.lat, l.lng) <= 1.5)); // a reservation inside a suburb (Lynn Woods) has a thousand driveways in its box
  const depth = (a) => String(a.path).split(".").length - String(d.path).split(".").length;
  const outline = sub.filter((a) => depth(a) <= 2 && below.get(a.id)).sort((x, y) => String(x.path).localeCompare(String(y.path)))
    .map((a) => ({ area_id: a.id, name: a.name, depth: depth(a), lat: a.lat, lng: a.lng, crag_routes_beneath: below.get(a.id), has_parking: a.parking_lat != null ? a.parking_name : null, ...(stray.has(a.id) ? { stray_coordinate: true } : {}) }));
  fs.writeFileSync(path.join(outDir, id + ".brief.json"), JSON.stringify({ destination: { area_id: d.id, name: d.name, path: d.path }, outline, lots }, null, 1));
  console.log(`${id}: ${outline.length} sub-areas (${below.get(d.id)} crag routes), ${lots.length} mapped lots/trailheads (${lots.filter((l) => l.name).length} named)`);
  await new Promise((z) => setTimeout(z, 2000));
}
