import fs from "fs";
const Q = [
 ["ca_foerster_peak_standard_route", 37.6899, -119.2907, 40, ["Isberg Trailhead", "Isberg Pass Trailhead", "Clover Meadow", "Granite Creek Campground trailhead"]],
 ["ca_owens_peak_indian_wells_canyon", 35.7382, -117.997, 15, ["Indian Wells Canyon Trailhead", "Owens Peak Trailhead", "Indian Wells Canyon"]],
 ["ca_san_joaquin_mountain_san_joaquin_ridge", 37.7187, -119.1056, 15, ["Minaret Vista", "Minaret Summit", "Minaret Vista parking", "San Joaquin Ridge Trailhead"]],
 ["ca_smith_mountain_albanita_trail_and_northeast_ridge", 36.1273, -118.2243, 20, ["Albanita Trailhead", "Albanita Meadows", "Smith Mountain Trailhead", "Monache Jeep Road"]],
 ["ca_spanish_mountain_north_ridge", 36.909, -118.8914, 25, ["Crown Valley Trailhead", "Crown Valley trail parking", "Wishon Crown Valley"]],
 ["co_stewart_peak_east_ridge", 38.0231, -106.9234, 20, ["Nutras Creek Trailhead", "Nutras Creek", "Nutras Creek parking"]],
 ["nv_mount_rose_mount_rose_trail", 39.3437, -119.9177, 12, ["Mount Rose Summit Trailhead", "Mt. Rose Trailhead", "Mount Rose Summit Welcome Plaza", "Mount Rose Trailhead parking"]],
 ["or_diamond_peak_southwest_ridge", 43.5207, -122.1496, 20, ["Pioneer Gulch Trailhead", "Pioneer Gulch", "Rockpile Trailhead", "Emigrant Pass Trailhead"]],
 ["wa_sharkfin_tower_flakes_and_chimneys_south_face", 48.4996, -121.0398, 12, ["Boston Basin Trailhead", "Boston Basin", "Boston Basin parking"]],
 ["wa_storm_king_north_face", 48.4913, -120.9228, 25, ["High Bridge", "High Bridge Stehekin", "High Bridge Ranger Station", "High Bridge Campground"]],
 ["me_caribou", 45.0395, -70.3446, 8, ["Caribou Valley Road parking", "Caribou Pond Road parking", "Appalachian Trail Caribou Valley Road"]],
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
fs.writeFileSync("photon3.json", JSON.stringify(out, null, 1));
