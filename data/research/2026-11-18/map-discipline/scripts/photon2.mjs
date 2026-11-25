// Photon lookups for CO/ME holds: several phrasings per trailhead, biased to a point; keeps hits within maxKm.
import fs from "fs";
const Q = [
 ["mccullough", 39.3985, -106.0693, ["McCullough Gulch Trailhead", "McCullough Gulch parking"]],
 ["lilylake_huerfano", 37.6235, -105.4729, ["Lily Lake Trailhead Huerfano", "Lily Lake Trailhead", "Upper Huerfano Trailhead"]],
 ["southhalfmoon", 39.1506, -106.4553, ["South Halfmoon Creek Trailhead", "Halfmoon Creek Trailhead", "North Halfmoon Creek Trailhead"]],
 ["iowagulch", 39.2297, -106.2009, ["Iowa Gulch Trailhead", "Iowa Gulch parking"]],
 ["rockdale", 38.99, -106.41, ["Rockdale Trailhead", "Clohesy Lake Trailhead"]],
 ["bluelakes", 39.3867, -106.1004, ["Blue Lakes Trailhead", "Blue Lakes parking Quandary"]],
 ["carson", 37.8563, -107.3681, ["Carson Trailhead", "Wager Gulch", "Cataract Gulch Trailhead"]],
 ["burnsgulch", 37.9180, -107.5580, ["Burns Gulch Trailhead", "Burns Gulch"]],
 ["needleton", 37.6335, -107.6928, ["Needleton", "Needleton Trailhead", "Needle Creek Trailhead"]],
 ["princeton", 38.74, -106.18, ["Mount Princeton Trailhead", "Mt. Princeton Road Trailhead", "Mount Princeton parking"]],
 ["fourmile", 39.21, -106.17, ["Fourmile Creek Trailhead", "Mount Sherman Trailhead", "Leavick"]],
 ["winfield", 38.9542, -106.4090, ["South Winfield Trailhead", "Winfield Trailhead", "Lake Ann Trailhead", "Huron Peak Trailhead"]],
 ["nutras", 38.05, -106.87, ["Nutras Creek Trailhead", "Stewart Creek Trailhead", "Eddiesville Trailhead"]],
 ["molas", 37.7479, -107.6888, ["Molas Pass Trailhead", "Molas Trailhead", "Elk Park", "Molas Lake Trailhead"]],
 ["wheeler", 39.3568, -106.0829, ["Wheeler Lake Trailhead", "Montgomery Reservoir"]],
 ["lakehope", 37.8049, -107.8516, ["Lake Hope Trailhead", "Hope Lake Trailhead"]],
 ["katahdin", 45.8874, -68.9982, ["Hunt Trail", "Katahdin Stream Campground", "Hunt Trail parking", "Katahdin Stream day use parking"]],
 ["crocker27", 45.10, -70.35, ["Appalachian Trail parking Route 27", "Appalachian Trail Crossing Carrabassett Valley", "AT parking Stratton"]],
 ["saddleback4", 44.8869, -70.5406, ["Appalachian Trail parking Route 4", "Appalachian Trail Rangeley parking", "Piazza Rock"]],
 ["caribou", 45.0395, -70.3446, ["Caribou Valley Road", "Caribou Pond Road", "Caribou Valley Road parking"]],
];
const m = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
const out = {}; const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [key, lat, lng, qs] of Q) { out[key] = []; const seen = new Set();
  for (const q of qs) { const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${lat}&lon=${lng}&limit=8`;
    try { const ctl = AbortSignal.timeout(20000); const j = await (await fetch(url, { signal: ctl, headers: { "User-Agent": "trailhead-research/1.0" } })).json();
      for (const f of j.features || []) { const p = f.properties, c = { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }, d = m({ lat, lng }, c), k = p.osm_type + p.osm_id;
        if (d > 12000 || seen.has(k)) continue; seen.add(k); out[key].push({ q, name: p.name, key: p.osm_key, val: p.osm_value, type: p.osm_type, id: p.osm_id, ...c, m: Math.round(d) }); } } catch (e) { out[key].push({ q, err: String(e.message).slice(0, 60) }); }
    await sleep(1600); }
  console.log("##", key); for (const h of out[key]) console.log("  ", h.err ? "ERR " + h.err : `${h.m} m | ${h.name} | ${h.key}=${h.val} ${h.type}${h.id} ${h.lat.toFixed(6)},${h.lng.toFixed(6)}`); }
fs.writeFileSync("photon2.json", JSON.stringify(out, null, 1));
