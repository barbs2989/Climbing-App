#!/usr/bin/env node
// Stage 1 of the all-states crag PARKING pass (0255). Pulls (a) every area, (b) which areas hold crag
// routes directly, (c) every NAMED OpenStreetMap parking lot / trailhead within reach of those crags,
// fetched in 1° blocks and cached per 0.25° tile so a run can resume after Overpass 504s / 429s.
// Usage: node scripts/oneoff/crag-parking-osm-pull.mjs <cacheDir> [--shard k/n]
import fs from "node:fs";
import path from "node:path";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const dir = process.argv[2]; if (!dir) { console.error("usage: crag-parking-osm-pull.mjs <cacheDir>"); process.exit(2); }
fs.mkdirSync(path.join(dir, "tiles"), { recursive: true });
const key = requireServiceKey();
const areasF = path.join(dir, "areas.json"), cragF = path.join(dir, "crag-area-ids.json");
if (!fs.existsSync(areasF)) fs.writeFileSync(areasF, JSON.stringify(await selectAll("areas", "id,name,parent_id,path,lat,lng,route_count,area_type,parking_lat", "", { key, pageSize: 1000 })));
if (!fs.existsSync(cragF)) { const rs = await selectAll("routes", "id,area_id", "discipline=in.(trad,sport,toprope,aid,bouldering)", { key, pageSize: 1000 }); const n = {}; for (const r of rs) n[r.area_id] = (n[r.area_id] || 0) + 1; fs.writeFileSync(cragF, JSON.stringify(n)); }
const areas = JSON.parse(fs.readFileSync(areasF, "utf8")), crag = JSON.parse(fs.readFileSync(cragF, "utf8"));
const T = 0.25, tiles = new Set();
for (const a of areas) if (crag[a.id] && a.lat != null && a.lng != null && Math.abs(a.lat) > 0.01) tiles.add(Math.floor(a.lat / T) + "_" + Math.floor(a.lng / T));
console.log(`${areas.length} areas, ${Object.keys(crag).length} hold crag routes, ${tiles.size} tiles`);
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.private.coffee/api/interpreter"];
// 0.25° tiles one request each ran ~37 s/tile (3,110 tiles ≈ 30 h of 504 retries). Fetch 1° BLOCKS instead
// and split each into the 0.25° tile files the matcher reads (every subtile written, empty ones too).
const B = 4, pad = 0.03, blocks = new Map(); // a lot just over the tile edge still counts
for (const t of tiles) { const [i, j] = t.split("_").map(Number), b = Math.floor(i / B) + "_" + Math.floor(j / B); if (!blocks.has(b)) blocks.set(b, []); blocks.get(b).push(t); }
console.log(`${blocks.size} 1° blocks`);
// --shard k/n: run n copies in parallel, each starting on its own mirror (overpass-api.de allows ~2 slots per IP).
const si = process.argv.indexOf("--shard"), [sk, sn] = (si > 0 ? process.argv[si + 1] : "0/1").split("/").map(Number);
let done = 0, fetched = 0, failed = 0, bx = -1;
for (const [b, need] of blocks) {
  if (++bx % sn !== sk) continue; done++; if (need.every((t) => fs.existsSync(path.join(dir, "tiles", t + ".json")))) continue;
  const [bi, bj] = b.split("_").map(Number), bb = `${bi * B * T - pad},${bj * B * T - pad},${(bi + 1) * B * T + pad},${(bj + 1) * B * T + pad}`;
  const ql = `[out:json][timeout:180];(nwr[amenity=parking][name](${bb});nwr[highway=trailhead](${bb}););out center tags;`;
  let els = null;
  for (let k = 0; k < 9 && !els; k++) {
    try { const r = await fetch(OVERPASS[(k + sk) % 3] + "?data=" + encodeURIComponent(ql), { headers: { "User-Agent": "ClimbMatch-parking-pull/1.0" } }); /* no UA = 406 */
      if (r.ok) els = (await r.json()).elements.map((e) => ({ t: e.type[0] + e.id, lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon, name: e.tags?.name || null, kind: e.tags?.amenity === "parking" ? "parking" : "trailhead", access: e.tags?.access || null, fee: e.tags?.fee || null })).filter((e) => e.lat != null);
    } catch {}
    if (!els) await new Promise((z) => setTimeout(z, 5000 * (k + 1)));
  }
  if (!els) { failed++; console.log(`block ${b} failed`); continue; }
  fetched++;
  for (let di = 0; di < B; di++) for (let dj = 0; dj < B; dj++) { const i = bi * B + di, j = bj * B + dj, lo = i * T - pad, hi = (i + 1) * T + pad, wl = j * T - pad, eh = (j + 1) * T + pad;
    fs.writeFileSync(path.join(dir, "tiles", i + "_" + j + ".json"), JSON.stringify(els.filter((e) => e.lat >= lo && e.lat <= hi && e.lng >= wl && e.lng <= eh))); }
  if (done % 10 === 0) console.log(`${done}/${blocks.size} blocks (${fetched} fetched, ${failed} failed)`);
  await new Promise((z) => setTimeout(z, 1500));
}
console.log(`blocks: ${done}/${blocks.size}, fetched ${fetched} this run, ${failed} failed — re-run to retry failures`);
