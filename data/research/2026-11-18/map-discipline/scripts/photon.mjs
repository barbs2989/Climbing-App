import fs from "fs";
const v = JSON.parse(fs.readFileSync("verified.json"));
const items = new Map(JSON.parse(fs.readFileSync("items.json")).map(i => [i.id, i]));
const file = "photon.json"; const done = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const m = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
const FILL = new Set("trailhead trail head th parking lot area the of at and a to road rd usfs fs fr forest service national park nps day use overflow access tr no".split(" "));
const toks = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\bmt\b/g, "mount").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(t => t && !FILL.has(t) && !/^\d+$/.test(t));
const mainName = s => String(s || "").replace(/\(.*?\)/g, " ").split(/\s*[\/,;]\s*/)[0];
const match = (ours, theirs) => { const A = toks(mainName(ours)), B = new Set(toks(theirs)); return A.length >= 1 && A.every(t => B.has(t)); };
const pool = v.hold.filter(h => h.reasons.some(r => /no placement|non-land/.test(r)) && !h.reasons.some(r => /weak|disagree/.test(r)));
let q = 0;
for (const h of pool) {
  if (done[h.id] && done[h.id].name === h.trailhead) continue;
  const p = items.get(h.id).peak; if (p.lat == null) continue;
  const name = mainName(h.trailhead).trim();
  await sleep(1500); q++;
  let hits = [];
  try {
    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(name)}&lat=${p.lat}&lon=${p.lng}&limit=10`, { headers: { "User-Agent": "climbmatch-research/1.0 (one-off batch)" }, signal: AbortSignal.timeout(30000) });
    if (r.status !== 200) { console.log("status", r.status); if (r.status === 429 || r.status === 403) break; continue; }
    const j = await r.json();
    hits = (j.features || []).map(f => ({ name: f.properties.name, key: f.properties.osm_key, val: f.properties.osm_value, type: f.properties.osm_type, id: f.properties.osm_id, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }))
      .filter(e => /trailhead|parking/.test(e.val) || /trailhead/i.test(e.name || "")).filter(e => m(p, e) < 30000 && match(h.trailhead, e.name || ""));
  } catch (e) { console.log("err", String(e).slice(0, 60)); continue; }
  done[h.id] = { name: h.trailhead, hits }; fs.writeFileSync(file, JSON.stringify(done, null, 1));
  if (hits.length) console.log(h.id.padEnd(55), "|", h.trailhead.slice(0, 35).padEnd(35), "|", hits.map(e => `${e.name} [${e.val}] ${(m(p, e) / 1000).toFixed(1)}km`).join(" ; "));
}
console.log("DONE", pool.length, "routes,", q, "queries");
