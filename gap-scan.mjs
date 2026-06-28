// gap-scan.mjs — report missing FACTUAL fields in a region's catalog so they can be
// researched + backfilled. Read-only (anon key, no service key needed).
//   node gap-scan.mjs [region]      (default "Washington")
import { readFileSync } from "node:fs";

const REGION = process.argv[2] || "Washington";
const env = readFileSync(".env.local", "utf8");
const url = (env.match(/VITE_SUPABASE_URL=(.+)/) || [])[1]?.trim().replace(/\/$/, "");
const AK = (env.match(/VITE_SUPABASE_ANON_KEY=(.+)/) || [])[1]?.trim();
if (!url || !AK) { console.error("Need VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY in .env.local"); process.exit(1); }
const H = { apikey: AK, Authorization: "Bearer " + AK };
const get = async p => (await fetch(url + "/rest/v1/" + p, { headers: H })).json();

const areas = await get(`areas?region=eq.${encodeURIComponent(REGION)}&select=id,name,area_type,lat,lng,elevation_ft,prominence_ft`);
if (!Array.isArray(areas)) { console.error("query failed:", JSON.stringify(areas).slice(0, 200)); process.exit(1); }
const aIds = new Set(areas.map(a => a.id));
let routes = [];
for (let i = 0; i < [...aIds].length; i += 100) {
  const chunk = [...aIds].slice(i, i + 100);
  const r = await get(`routes?area_id=in.(${chunk.join(",")})&select=id,name,area_id,grade,gain_ft,dist_km,aspect,fa,overview,comms,face`);
  if (Array.isArray(r)) routes.push(...r);
}
const peaks = areas.filter(a => a.area_type === "peak");
const pct = (arr, f) => arr.length ? Math.round(arr.filter(x => x[f] == null).length / arr.length * 100) : 0;

console.log(`\n=== ${REGION}: ${areas.length} areas (${peaks.length} peaks), ${routes.length} routes ===\n`);
console.log("PEAK factual gaps  (safe to auto-fill from USGS GNIS/3DEP, cross-referenced):");
console.log(`  elevation_ft : ${pct(peaks, "elevation_ft")}% missing (${peaks.filter(a => a.elevation_ft == null).length})`);
console.log(`  prominence_ft: ${pct(peaks, "prominence_ft")}% missing`);
console.log(`  coordinates  : ${peaks.filter(a => a.lat == null || a.lng == null).length} missing`);
console.log("\nROUTE gaps:");
["grade", "gain_ft", "dist_km", "aspect", "fa", "overview", "comms", "face"].forEach(f => console.log(`  ${f.padEnd(9)}: ${pct(routes, f)}% missing`));
console.log("\nPeaks missing elevation (backfill targets, first 30):");
peaks.filter(a => a.elevation_ft == null).slice(0, 30).forEach(a => console.log(`  - ${a.name}  (${a.id})`));
console.log("");
