// Overpass: trailhead / parking / halt features within R m of each named point. One request, with a client name.
import fs from "fs";
const pts = JSON.parse(fs.readFileSync(process.argv[2])); const R = +(process.argv[3] || 350);
const m = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
const cl = Object.values(pts).map(([la, lo]) => `nwr(around:${R},${la},${lo})[amenity=parking];nwr(around:${R},${la},${lo})[highway=trailhead];nwr(around:${R},${la},${lo})[information~"board|guidepost|map"];nwr(around:${R},${la},${lo})[railway~"halt|stop|station"];`).join("");
const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", signal: AbortSignal.timeout(120000), headers: { "User-Agent": "trailhead-research/1.0", Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: "data=" + encodeURIComponent(`[out:json][timeout:90];(${cl});out center tags;`) });
const txt = await res.text(); let j; try { j = JSON.parse(txt); } catch { console.log("FAIL", res.status, txt.slice(0, 200)); process.exit(1); }
const out = {};
for (const [k, [la, lo]] of Object.entries(pts)) { out[k] = j.elements.map(e => ({ id: e.type + "/" + e.id, lat: e.lat ?? e.center.lat, lng: e.lon ?? e.center.lon, tags: e.tags || {} })).map(e => ({ ...e, d: Math.round(m({ lat: la, lng: lo }, e)) })).filter(e => e.d <= R).sort((a, b) => a.d - b.d);
  console.log("##", k); for (const e of out[k].slice(0, 5)) console.log("  ", e.d + " m", e.id, e.lat.toFixed(6) + "," + e.lng.toFixed(6), e.tags.name || "", "[" + (e.tags.amenity || e.tags.highway || e.tags.information || e.tags.railway) + "]"); }
fs.writeFileSync(process.argv[2].replace(".json", "-op.json"), JSON.stringify(out, null, 1));
