import fs from "fs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const m = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
async function op(q) { for (let i = 0; i < 4; i++) { try { const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", signal: AbortSignal.timeout(60000), headers: { "User-Agent": "trailhead-research/1.0", Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(q) }); const t = await res.text(); if (res.ok) return JSON.parse(t).elements; } catch (e) { } await sleep(10000 * (i + 1)); } return null; }
const P = [
 ["atlantic", 39.39851, -106.06926, 400], ["casco_french", 39.150567, -106.455289, 400], ["dyer", 39.22972, -106.20085, 400], ["half", 37.856264, -107.368058, 400],
 ["horseshoe", 39.195803, -106.137725, 400], ["n_apostle", 38.954214, -106.409017, 400], ["owens", 35.7153686, -117.9743586, 500], ["sirretta", 35.89708, -118.33812, 500],
 ["pyramid", 38.807805, -120.136722, 400], ["maggie", 36.24929, -118.67118, 500], ["earl", 47.3515, -120.8412, 400], ["persis", 47.7931, -121.6449, 500],
 ["klawatti_eldorado", 48.5136, -121.1964, 400], ["mixup_cascadepass", 48.4754, -121.0751, 400], ["drycreek_westside", 46.7424, -121.8995, 6000],
 ["lamont", 35.7940, -118.0440, 6000], ["nutras", 38.05, -106.86, 9000], ["pioneer_gulch", 43.49, -122.20, 9000], ["caribou_gate", 45.0395, -70.3446, 5000],
 ["recess_bear_ridge", 37.369028, -118.980686, 1200], ["garfield_wash", 47.5606, -121.4840, 5000], ["smith_albanita", 36.12804, -118.26063, 1500], ["granite_chief", 39.1976, -120.2357, 1200],
 ["kennedy", 38.316876, -119.747038, 300], ["tanglefoot", 38.523551, -120.173510, 300], ["burns", 37.91798, -107.55799, 800], ["thirtymile", 48.822806, -120.019715, 300], ["lightning_creek", 48.8747, -121.0190, 4000],
];
const out = {};
for (const [k, lat, lng, r] of P) {
  const els = await op(`[out:json][timeout:40];(nwr(around:${r},${lat},${lng})[amenity=parking];nwr(around:${r},${lat},${lng})[highway=trailhead];nwr(around:${r},${lat},${lng})[information~"board|guidepost|map"];nwr(around:${r},${lat},${lng})[barrier=gate];);out center tags;`);
  out[k] = els; console.log("##", k, els === null ? "FAILED" : els.length);
  for (const e of (els || []).slice(0, 14)) { const c = e.center || e; const t = e.tags || {}; console.log("  ", Math.round(m({ lat, lng }, { lat: c.lat, lng: c.lon })), "m |", t.name || "-", "|", t.amenity || t.highway || t.information || t.barrier, e.type + "/" + e.id, c.lat.toFixed(6) + "," + c.lon.toFixed(6)); }
  await sleep(2500);
}
fs.writeFileSync("op7.json", JSON.stringify(out));
