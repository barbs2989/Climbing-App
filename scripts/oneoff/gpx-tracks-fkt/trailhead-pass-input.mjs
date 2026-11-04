// Input for the trailhead pass: every route in peak-decisions-all.json with the trailhead name a
// reviewer gave (confirmed or not) and the track's start, split in two halves for two reviewers.
// Offline. Usage: node trailhead-pass-input.mjs <tracks.json> [...]
import fs from "fs";
const D = "research-data/gpx-tracks-fkt-peaks-2026-10-29";
const dec = JSON.parse(fs.readFileSync(`${D}/peak-decisions-all.json`, "utf8"));
const names = {};
for (const f of fs.readdirSync(D).filter(f => /^peak-verdict-\d+\.json$/.test(f))) for (const v of JSON.parse(fs.readFileSync(`${D}/${f}`, "utf8"))) if (v.routeId) names[`${v.routeId}|${v.slug}`] = v.trailhead || null;
const start = {};
for (const f of process.argv.slice(2)) for (const t of JSON.parse(fs.readFileSync(f, "utf8"))) start[t.slug] = t.pts[0];
const items = dec.map(d => ({ id: d.id, slug: d.slug, fktUrl: `https://fastestknowntime.com/route/${d.slug}`, peak: d.peak.name,
  trailheadName: names[`${d.id}|${d.slug}`] || null, start: start[d.slug] ? { lat: +start[d.slug][0].toFixed(5), lng: +start[d.slug][1].toFixed(5) } : null }));
const half = Math.ceil(items.length / 2);
fs.writeFileSync(`${D}/trailhead-pass-1.json`, JSON.stringify(items.slice(0, half), null, 1));
fs.writeFileSync(`${D}/trailhead-pass-2.json`, JSON.stringify(items.slice(half), null, 1));
console.log(items.length, "routes;", items.filter(i => !i.start).length, "without a start");
