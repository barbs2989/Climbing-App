import fs from "fs";
const v = JSON.parse(fs.readFileSync("verified.json"));
const items = new Map(JSON.parse(fs.readFileSync("items.json")).map(i => [i.id, i]));
const file = "osm-names.json"; const done = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const todo = v.hold.filter(h => h.trailhead && h.reasons.some(r => /no placement|non-land/.test(r)));
const clean = s => String(s).replace(/\(.*?\)/g, " ").replace(/\s*[\/,;].*$/, "").replace(/\s+/g, " ").trim();
const OK = e => /^(highway|amenity|tourism|leisure)$/.test(e.category) && /trailhead|parking|information|picnic_site|camp_site/.test(e.type);
let q = 0;
for (const h of todo) {
  if (done[h.id] && done[h.id].via === "nominatim" && done[h.id].name === h.trailhead) continue;
  const p = items.get(h.id).peak; if (p.lat == null) continue;
  const vb = [p.lng - 0.35, p.lat + 0.3, p.lng + 0.35, p.lat - 0.3].join(",");
  const names = [...new Set([clean(h.trailhead), clean(h.trailhead).replace(/\b(trail ?head|th|parking( lot)?)\b/ig, "").trim() + " Trailhead"])].filter(n => n.length > 3);
  const hits = [];
  for (const n of names) {
    await sleep(1500); q++;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(n)}&format=jsonv2&limit=8&viewbox=${vb}&bounded=1`, { headers: { "User-Agent": "climbmatch-research/1.0 (one-off batch)" }, signal: AbortSignal.timeout(30000) });
      if (r.status !== 200) { console.log("status", r.status); if (r.status === 429 || r.status === 403) { fs.writeFileSync(file, JSON.stringify(done, null, 1)); process.exit(2); } continue; }
      for (const e of await r.json()) if (OK(e)) hits.push({ type: e.osm_type, id: e.osm_id, name: e.name, kind: e.type, lat: +e.lat, lng: +e.lon });
    } catch (e) { console.log("err", String(e).slice(0, 60)); }
    if (hits.length) break;
  }
  done[h.id] = { via: "nominatim", name: h.trailhead, hits };
  fs.writeFileSync(file, JSON.stringify(done, null, 1));
  console.log(h.id.padEnd(55), hits.length, hits[0] ? hits[0].name : "");
}
console.log("DONE", todo.length, "routes,", q, "queries");
