import fs from "fs";
const Q = [
 ["ca_lamont_peak_trail", 35.7940, -118.0440, 12, ["Lamont Peak Trailhead", "Lamont Peak trail parking", "Lamont Peak"]],
 ["ca_granite_chief", 39.1976, -120.2357, 8, ["Granite Chief Trailhead", "Granite Chief Trail", "Granite Chief Trail parking"]],
 ["ca_mokelumne", 38.5383, -120.0940, 20, ["Tanglefoot Trailhead", "Tanglefoot Trail", "Tanglefoot trail parking"]],
 ["ca_pinchot", 36.9470, -118.4050, 15, ["Armstrong Canyon", "Armstrong Canyon Road", "Scotty Spring"]],
 ["ca_maggie", 36.2760, -118.5990, 15, ["Shake Camp Trailhead", "Long Meadow Trailhead", "Shake Camp trail parking", "Shake Camp"]],
 ["ca_sirretta", 35.9280, -118.3350, 12, ["Sirretta Peak Trailhead", "Big Meadow Trailhead", "Sirretta Trailhead", "Sirretta Pass Trailhead"]],
 ["ca_pyramid", 38.8450, -120.1580, 10, ["Rocky Canyon Trailhead", "Pyramid Peak Trailhead", "Rocky Canyon"]],
 ["ca_recess", 37.4120, -118.9030, 15, ["Bear Ridge Trailhead", "Bear Ridge Trail parking", "Vermilion Valley dam trailhead"]],
 ["ca_spanish", 36.909, -118.8914, 25, ["Crown Valley Trailhead", "Rancheria Trailhead", "Crown Valley"]],
 ["ca_blackhawk", 38.2760, -119.7000, 15, ["Kennedy Meadows Trailhead", "Kennedy Meadows trail parking", "Kennedy Meadows Resort"]],
 ["bc_ossa", 49.9600, -123.3300, 25, ["Sigurd Creek Trailhead", "Sigurd Creek Trail", "Sigurd Creek parking"]],
 ["co_niagara", 37.8947, -107.5780, 8, ["Burns Gulch Trailhead", "Burns Gulch", "Burns Gulch parking"]],
 ["ca_maclure", 37.7440, -119.2800, 20, ["Lyell Canyon Trailhead", "Dog Lake parking", "John Muir Trail parking Tuolumne Meadows", "Wilderness Permit parking Tuolumne"]],
];
const m = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
const out = {}; const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [key, lat, lng, km, qs] of Q) { out[key] = []; const seen = new Set();
  for (const q of qs) { try { const j = await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${lat}&lon=${lng}&limit=8`, { signal: AbortSignal.timeout(20000), headers: { "User-Agent": "trailhead-research/1.0" } })).json();
      for (const f of j.features || []) { const p = f.properties, c = { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }, d = m({ lat, lng }, c), k = p.osm_type + p.osm_id; if (d > km * 1000 || seen.has(k)) continue; seen.add(k);
        if (/^(tertiary|unclassified|residential|track|service|secondary|primary|path|footway|trunk)$/.test(p.osm_value) || /waterway|place|boundary|natural|landuse/.test(p.osm_key)) continue;
        out[key].push({ q, name: p.name, key: p.osm_key, val: p.osm_value, id: (p.osm_type === "N" ? "node/" : p.osm_type === "W" ? "way/" : "relation/") + p.osm_id, ...c, km: +(d / 1000).toFixed(1) }); } } catch (e) { out[key].push({ err: q + " " + String(e.message).slice(0, 40) }); }
    await sleep(1600); }
  console.log("##", key); for (const h of out[key]) console.log("  ", h.err ? "ERR " + h.err : `${h.km} km | ${h.name} | ${h.key}=${h.val} ${h.id} ${h.lat.toFixed(6)},${h.lng.toFixed(6)}`); }
fs.writeFileSync("photon7.json", JSON.stringify(out, null, 1));
