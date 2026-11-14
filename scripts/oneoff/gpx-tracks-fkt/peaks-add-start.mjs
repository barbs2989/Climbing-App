// Add each track's START coordinate to the peak batches, so a reviewer can confirm the start is a
// named trailhead before a Trailhead pin is added there. Offline.
// Usage: node peaks-add-start.mjs <tracks.json> [...]
import fs from "fs";
const D = "research-data/gpx-tracks-fkt-peaks-2026-10-29";
const start = {};
for (const f of process.argv.slice(2)) for (const t of JSON.parse(fs.readFileSync(f, "utf8"))) start[t.slug] = t.pts[0];
let n = 0;
for (const f of fs.readdirSync(D).filter(f => /^peak-batch-\d+\.json$/.test(f))) {
  const b = JSON.parse(fs.readFileSync(`${D}/${f}`, "utf8"));
  for (const p of b) for (const t of p.tracks) { const s = start[t.slug]; if (s) { t.start = { lat: +s[0].toFixed(5), lng: +s[1].toFixed(5) }; n++; } t.fktUrl = `https://fastestknowntime.com/route/${t.slug}`; }
  fs.writeFileSync(`${D}/${f}`, JSON.stringify(b, null, 1));
}
console.log(n, "track starts added");
