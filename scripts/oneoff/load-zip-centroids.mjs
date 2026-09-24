// Load the 2020 Census ZCTA gazetteer into `zip_centroids` (migration 0189).
//
//   curl -sSfLO https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2020_Gazetteer/2020_Gaz_zcta_national.zip
//   unzip 2020_Gaz_zcta_national.zip
//   node scripts/oneoff/load-zip-centroids.mjs path/to/2020_Gaz_zcta_national.txt [--dry]
//
// Idempotent: upserts on the primary key, so a re-run changes nothing. The file is tab-separated
// with a header and TRAILING WHITESPACE on the last column (the longitude), which is why every
// field is trimmed -- Number("-66.749961   ") works, but a zip read with padding would fail the
// table's ^[0-9]{5}$ check. A 200 is not evidence the rows landed, so the table is COUNTED after
// the write and the run fails unless the count matches what was parsed.
import fs from "node:fs";
import { requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";

const file = process.argv[2];
const dry = process.argv.includes("--dry");
if (!file) { console.error("usage: node scripts/oneoff/load-zip-centroids.mjs <2020_Gaz_zcta_national.txt> [--dry]"); process.exit(1); }

const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(l => l.trim());
const head = lines.shift().split("\t").map(s => s.trim());
const iZ = head.indexOf("GEOID"), iLat = head.indexOf("INTPTLAT"), iLng = head.indexOf("INTPTLONG");
if (iZ < 0 || iLat < 0 || iLng < 0) { console.error("FAIL: header lacks GEOID/INTPTLAT/INTPTLONG: " + head.join(",")); process.exit(1); }

const rows = [];
for (const l of lines) {
  const f = l.split("\t").map(s => s.trim());
  const zip = f[iZ], lat = Number(f[iLat]), lng = Number(f[iLng]);
  if (!/^[0-9]{5}$/.test(zip) || !Number.isFinite(lat) || !Number.isFinite(lng)) { console.error("FAIL: unparseable row: " + l.slice(0, 80)); process.exit(1); }
  rows.push({ zip, lat, lng });
}
// Fail closed on a short parse: a truncated download would otherwise load a partial country and
// every climber in the missing zips would be refused as "unrecognised".
if (rows.length < 30000) { console.error("FAIL: parsed only " + rows.length + " zips; the 2020 file has ~33,000"); process.exit(1); }
console.log("parsed " + rows.length + " zips");
if (dry) process.exit(0);

const key = requireServiceKey(), url = SUPABASE_URL;
const H = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };
for (let i = 0; i < rows.length; i += 1000) {
  const res = await fetch(url + "/rest/v1/zip_centroids", { method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows.slice(i, i + 1000)) });
  if (!res.ok) { console.error("FAIL at batch " + i + ": " + res.status + " " + (await res.text())); process.exit(1); }
}
const c = await fetch(url + "/rest/v1/zip_centroids?select=zip&limit=1", { headers: { ...H, Prefer: "count=exact" } });
const total = Number((c.headers.get("content-range") || "").split("/")[1]);
console.log("zip_centroids now holds " + total + " rows");
if (total !== rows.length) { console.error("FAIL: expected " + rows.length); process.exit(1); }
