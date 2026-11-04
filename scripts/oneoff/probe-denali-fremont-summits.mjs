// Where are Denali and Fremont Peak? Their catalog coordinates sit 4.3 km and 1.7 km from the top of
// the FKT tracks that climb them (found 2026-10-30 placing FKT summit tracks, #3095). Asks the GROUND
// (USGS 3DEP, scripts/lib/terrain.mjs) about each candidate: the catalog's point, the track's highest
// point, and the published summit position. Read-only; no database.
// Usage: node scripts/oneoff/probe-denali-fremont-summits.mjs <areas snapshot.json>
import fs from "fs";
import { elevationAt, summitProbe } from "../lib/terrain.mjs";
const areas = new Map(JSON.parse(fs.readFileSync(process.argv[2], "utf8")).map(a => [a.id, a]));
const R = 6371000, rad = d => d * Math.PI / 180;
const hav = (a, b) => { const h = Math.sin(rad(b[0] - a[0]) / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(rad(b[1] - a[1]) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const PEAKS = [
  { area: "ak_denali", name: "Denali", publishedFt: 20310, candidates: { trackTop: null, published: [63.0692, -151.0070] }, slug: "denali-ak" },
  { area: "wy_fremont_peak", name: "Fremont Peak", publishedFt: 13745, candidates: { trackTop: null, published: [43.1251, -109.6182] }, slug: "fremont-peak-wy" },
];
const tops = new Map(JSON.parse(fs.readFileSync(process.argv[3], "utf8")).map(t => [t.slug, t]));
for (const p of PEAKS) {
  const a = areas.get(p.area);
  p.candidates.catalog = [a.lat, a.lng];
  p.candidates.trackTop = tops.get(p.slug).top;
  console.log(`== ${p.name} (published ${p.publishedFt} ft)`);
  for (const [k, c] of Object.entries(p.candidates)) {
    const e = await elevationAt(c[0], c[1], 6);
    const s = await summitProbe(c[0], c[1], 6);
    console.log(`  ${k.padEnd(9)} ${c[0].toFixed(5)}, ${c[1].toFixed(5)}  ground ${e == null ? "?" : Math.round(e)} ft  isSummit ${s.isMax}  ${s.note || ""}  | from catalog ${Math.round(hav(c, p.candidates.catalog))} m`);
  }
}
