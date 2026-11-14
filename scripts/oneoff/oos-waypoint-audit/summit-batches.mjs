// Write the census's FLAGGED summit pins into research batches: more than 300 m from the same-named
// GNIS Summit, not a 3DEP local maximum, ground more than 300 ft from the stated elev, or no GNIS
// match at all (every Canadian pin). Read-only.
//   node scripts/oneoff/oos-waypoint-audit/summit-batches.mjs CENSUS.json OUTDIR [SIZE]
import fs from "fs";
const [, , CENSUS, OUTDIR, SIZE = "10"] = process.argv;
const census = JSON.parse(fs.readFileSync(CENSUS, "utf8"));
const all = census.flatMap(r => r.summits.map(s => ({ id: r.id, route: r.name, state: r.state, peak: r.peak, ...s })));
const flagged = all.filter(s => s.gnis_m > 300 || s.isMax === false || (s.gap != null && Math.abs(s.gap) > 300) || !s.gnis);
flagged.sort((a, b) => a.state.localeCompare(b.state) || String(a.peak && a.peak.name).localeCompare(String(b.peak && b.peak.name)));
let n = 0;
for (let i = 0; i < flagged.length; i += +SIZE) fs.writeFileSync(`${OUTDIR}/summits-${++n}.json`, JSON.stringify(flagged.slice(i, i + +SIZE), null, 1));
console.log(all.length, "summit pins;", flagged.length, "flagged ->", n, "batches");
for (const s of flagged) console.log(s.state.slice(0, 5), s.id, "#" + s.i, s.name, "| gnis_m", s.gnis_m ?? "-", "| max", s.isMax, "| gap", s.gap, "| peak_m", s.peak_m);
