// Held trailheads with no / non-official point: look the NAMED trailhead up in the USFS + NPS dumps, 30 km of the peak.
import fs from "fs";
const v = JSON.parse(fs.readFileSync("verified.json"));
const items = new Map(JSON.parse(fs.readFileSync("items.json")).map(i => [i.id, i]));
const usfs = JSON.parse(fs.readFileSync("usfs-trailheads.json")).map(u => ({ ...u, pub: "usfs", names: [u.name, u.site, u.alias].filter(Boolean) }));
const npsRaw = JSON.parse(fs.readFileSync("nps-trailheads.json")); const nps = (npsRaw.features || npsRaw).map(u => ({ ...u, pub: "nps", names: [u.name] }));
const m = (a, b) => { const r = x => x * Math.PI / 180, h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(h)); };
// Stricter: only true filler words are generic; lake/creek/pass/peak count.
const FILL = new Set("trailhead trail head th parking lot area the of at and a to road rd usfs fs fr forest service national park nps day use overflow access tr no".split(" "));
const toks = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\bmt\b/g, "mount").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(t => t && !FILL.has(t) && !/^\d+$/.test(t));
const DIR = new Set("north south east west upper lower main".split(" "));
const mainName = s => String(s || "").replace(/\(.*?\)/g, " ").split(/\s*[\/,;]\s*/)[0];
const match = (ours, theirs) => { const A = toks(mainName(ours)), B = new Set(toks(theirs)); return A.filter(t => !DIR.has(t)).length >= 1 && A.every(t => B.has(t)); };
const pool = v.hold.filter(h => h.reasons.some(r => /no placement|non-land/.test(r)) && !h.reasons.some(r => /weak|disagree/.test(r)));
const out = [];
for (const h of pool) {
  const peak = items.get(h.id).peak; if (peak.lat == null) continue;
  const hits = [...usfs, ...nps].filter(u => u.lat != null && m(peak, u) < 30000 && u.names.some(n => match(h.trailhead, n)));
  if (!hits.length) continue;
  const clusters = []; for (const x of hits) { const c = clusters.find(c => m(c[0], x) < 300); c ? c.push(x) : clusters.push([x]); }
  out.push({ id: h.id, area: h.area, trailhead: h.trailhead, reasons: h.reasons, clusters: clusters.map(c => c.map(x => ({ pub: x.pub, name: x.name, cn: x.cn, lat: x.lat, lng: x.lng, km: +(m(peak, x) / 1000).toFixed(1) }))), agent: h.placements, identifiedBy: h.identifiedBy, notes: h.notes, chunk: h.chunk });
}
fs.writeFileSync("official-match.json", JSON.stringify(out, null, 1));
console.log(`pool ${pool.length} · matched ${out.length} · one cluster ${out.filter(o => o.clusters.length === 1).length}`);
for (const o of out) console.log((o.clusters.length === 1 ? "ONE " : "MANY") , o.id.padEnd(55), "|", o.trailhead.slice(0, 38).padEnd(38), "|", o.clusters.map(c => `${c[0].pub}:${c[0].name}@${c[0].km}km${o.agent.length ? " agent" + Math.round(m(c[0], o.agent[0])) + "m" : ""}`).join(" ; "));
