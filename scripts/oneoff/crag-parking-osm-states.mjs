#!/usr/bin/env node
// Stage 1b of the all-states crag PARKING pass (0255): the FAST pull. One Overpass request per state /
// province (all of Utah: 17 s) instead of one per 1° block (~40 s each, 792 of them). Each region's
// named parking lots + trailheads are cached raw, then binned into the same 0.25° tile files the
// matcher reads. A tile is written only once EVERY region its crags are filed under has been fetched,
// so a crag on a border sees the lots on both sides. Run crag-parking-osm-pull.mjs after it: that
// fetches whatever this left (it skips every block whose tiles exist).
// Usage: node scripts/oneoff/crag-parking-osm-states.mjs <cacheDir> [--reverse]   (needs areas.json + crag-area-ids.json from stage 1)
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2]; if (!dir) { console.error("usage: crag-parking-osm-states.mjs <cacheDir>"); process.exit(2); }
const areas = JSON.parse(fs.readFileSync(path.join(dir, "areas.json"), "utf8")), crag = JSON.parse(fs.readFileSync(path.join(dir, "crag-area-ids.json"), "utf8"));
const US = { alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV", new_hampshire: "NH", new_jersey: "NJ", new_mexico: "NM", new_york: "NY", north_carolina: "NC", north_dakota: "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", rhode_island: "RI", south_carolina: "SC", south_dakota: "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", west_virginia: "WV", wisconsin: "WI", wyoming: "WY" };
const iso = (p) => { const [c, s] = String(p).split("."); return c === "usa" && US[s] ? "US-" + US[s] : c === "canada" && s ? "CA-" + s.toUpperCase() : null; };
const T = 0.25, pad = 0.03, tileRegions = new Map();
for (const a of areas) { if (!crag[a.id] || a.lat == null || a.lng == null || Math.abs(a.lat) <= 0.01) continue; const k = Math.floor(a.lat / T) + "_" + Math.floor(a.lng / T); if (!tileRegions.has(k)) tileRegions.set(k, new Set()); tileRegions.get(k).add(iso(a.path)); }
const regions = [...new Set([...tileRegions.values()].flatMap((s) => [...s]))].filter(Boolean).sort(); if (process.argv.includes("--reverse")) regions.reverse(); // a second copy from the other end halves the wall-clock
console.log(`${tileRegions.size} tiles, ${regions.length} regions`);
const MIRRORS = ["https://overpass.private.coffee/api/interpreter", "https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
fs.mkdirSync(path.join(dir, "regions"), { recursive: true }); fs.mkdirSync(path.join(dir, "tiles"), { recursive: true });
const got = new Map();
for (const r of regions) {
  const f = path.join(dir, "regions", r + ".json"); if (fs.existsSync(f)) { got.set(r, JSON.parse(fs.readFileSync(f, "utf8"))); continue; }
  const ql = `[out:json][timeout:900];area["ISO3166-2"="${r}"][admin_level=4]->.a;(nwr[amenity=parking][name](area.a);nwr[highway=trailhead](area.a););out center tags;`;
  let els = null, t0 = Date.now();
  for (let k = 0; k < 9 && !els; k++) {
    try { const res = await fetch(MIRRORS[(k + (process.argv.includes("--reverse") ? 1 : 0)) % 3], { method: "POST", body: "data=" + encodeURIComponent(ql), headers: { "User-Agent": "ClimbMatch-parking-pull/1.0", "Content-Type": "application/x-www-form-urlencoded" } }); /* no UA = 406 */
      if (res.ok) { const js = await res.json(); if (js.remark && /error|timed out/i.test(js.remark)) throw new Error(js.remark); els = js.elements.map((e) => ({ t: e.type[0] + e.id, lat: e.lat ?? e.center?.lat, lng: e.lon ?? e.center?.lon, name: e.tags?.name || null, kind: e.tags?.amenity === "parking" ? "parking" : "trailhead", access: e.tags?.access || null, fee: e.tags?.fee || null })).filter((e) => e.lat != null); }
    } catch {}
    if (!els) await new Promise((z) => setTimeout(z, 5000 * (k + 1)));
  }
  // An EMPTY answer for a whole state is a failed area lookup, not a state with no parking.
  if (!els || !els.length) { console.log(`${r} FAILED`); continue; }
  fs.writeFileSync(f, JSON.stringify(els)); got.set(r, els); console.log(`${r} ${els.length} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  await new Promise((z) => setTimeout(z, 2000));
}
const all = new Map(); for (const els of got.values()) for (const e of els) all.set(e.t, e);
const bins = new Map();
for (const e of all.values()) for (let i = Math.floor((e.lat - pad) / T); i <= Math.floor((e.lat + pad) / T); i++) for (let j = Math.floor((e.lng - pad) / T); j <= Math.floor((e.lng + pad) / T); j++) { const k = i + "_" + j; if (tileRegions.has(k)) { if (!bins.has(k)) bins.set(k, []); bins.get(k).push(e); } }
let wrote = 0, left = 0;
for (const [k, rs] of tileRegions) { if ([...rs].some((r) => !r || !got.has(r))) { left++; continue; } fs.writeFileSync(path.join(dir, "tiles", k + ".json"), JSON.stringify(bins.get(k) || [])); wrote++; }
console.log(`regions ${got.size}/${regions.length}; tiles written ${wrote}, left for the block pull ${left}`);
