// The WA summit pins the 2026-10-30 WA audit (#3083) did NOT research one by one: 100-300 m from
// the same-named GNIS Summit (only >300 m was researched), or with no GNIS match at all. Probe the
// 3DEP ground at each DISTINCT coordinate: is it a local maximum, and how far is the ground from the
// pin's stated elev? Read-only (no database); writes research batches of SIZE coordinates.
//   node scripts/oneoff/oos-waypoint-audit/wa-summit-triage.mjs OUTDIR [SIZE]
import fs from "fs";
import { summitProbe } from "../../lib/terrain.mjs";
const [, , OUTDIR, SIZE = "15"] = process.argv;
const all = JSON.parse(fs.readFileSync("research-data/wa-waypoint-audit-2026-10-30/summit-gnis.json", "utf8"));
const todo = all.filter(o => !o.gnis || (o.off_m > 100 && o.off_m <= 300));
const groups = new Map();
for (const o of todo) {
  const k = `${(+o.from[0]).toFixed(5)},${(+o.from[1]).toFixed(5)}`;
  if (!groups.has(k)) groups.set(k, { at: o.from, gnis: o.gnis, gnis_m: o.off_m, area: o.area, pins: [] });
  groups.get(k).pins.push({ id: o.id, i: o.i, name: o.pin, elev: o.elev });
}
const list = [...groups.values()];
const CACHE = `${OUTDIR}/wa-summit-probe-cache.json`;
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
let next = 0;
async function worker() {
  while (next < list.length) {
    const g = list[next++], k = g.at.join(",");
    if (!cache[k]) { cache[k] = await summitProbe(+g.at[0], +g.at[1]); fs.writeFileSync(CACHE, JSON.stringify(cache)); }
    const p = cache[k]; g.ground_ft = p.centre == null ? null : Math.round(p.centre); g.isMax = p.isMax;
    const e = g.pins.map(x => x.elev).find(x => x != null); g.gap = e != null && g.ground_ft != null ? g.ground_ft - e : null;
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
// Worst first: not on a high point, or ground far from its stated height.
const score = g => (g.isMax === false ? 1000 : 0) + Math.abs(g.gap || 0) + (g.gnis_m || 0);
list.sort((a, b) => score(b) - score(a));
let n = 0;
for (let i = 0; i < list.length; i += +SIZE) fs.writeFileSync(`${OUTDIR}/wa-summits-${++n}.json`, JSON.stringify(list.slice(i, i + +SIZE), null, 1));
console.log(todo.length, "pins,", list.length, "distinct coordinates ->", n, "batches");
console.log(" not a local max:", list.filter(g => g.isMax === false).length, "| ground off >150 ft:", list.filter(g => g.gap != null && Math.abs(g.gap) > 150).length, "| clean (max, within 150 ft):", list.filter(g => g.isMax && g.gap != null && Math.abs(g.gap) <= 150).length);
