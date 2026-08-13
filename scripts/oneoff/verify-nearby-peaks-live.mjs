// Drive the REAL nearby-peaks selection against the LIVE areas table, using the exported pure
// functions plus the same query shape useNearbyAreas issues.
import { SUPABASE_URL, anonKey } from "./scripts/lib/supabase-env.mjs";
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs"; import os from "os"; import path from "path";

const ROOT = process.cwd();
const require_ = createRequire(path.join(ROOT, "x.js"));
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "np-")), "b.cjs");
await build({
  stdin: { contents: `export { nearbyPeaksBounds, nearbyPeaksRows } from ${JSON.stringify(path.join(ROOT, "lib/DbAreaBrowser.jsx"))};`, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" },
  define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error",
});
const { nearbyPeaksBounds, nearbyPeaksRows } = require_(out);

const U = SUPABASE_URL, K = anonKey(), h = { apikey: K, Authorization: "Bearer " + K };
const get = async q => {
  const r = await fetch(`${U}/rest/v1/${q}`, { headers: h, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 160));
  return r.json();
};
await get("areas?select=id&limit=1");

for (const name of ["Mount Stuart", "Mount Baker", "Liberty Bell"]) {
  const found = await get(`areas?select=*&name=eq.${encodeURIComponent(name)}&area_type=eq.peak&limit=1`);
  if (!found.length) { console.log(`\n${name}: no peak row`); continue; }
  const area = found[0];
  const b = nearbyPeaksBounds(area);
  if (!b) { console.log(`\n${name}: not live (type=${area.area_type} lat=${area.lat})`); continue; }
  // The same query useNearbyAreas issues.
  const rows = await get(`areas?select=*&lat=gte.${b.minLat}&lat=lte.${b.maxLat}&lng=gte.${b.minLng}&lng=lte.${b.maxLng}&area_type=eq.peak&route_count=gt.0&limit=400`);
  const picked = nearbyPeaksRows(area, rows, 6);
  console.log(`\n${area.name} (${area.lat.toFixed(3)}, ${area.lng.toFixed(3)}) — box returned ${rows.length} areas`);
  console.log(`  peaks with routes in box: ${rows.filter(r => r.area_type === "peak" && r.route_count > 0 && r.id !== area.id).length}`);
  if (!picked.length) console.log("  -> renders NOTHING");
  for (const { a, mi } of picked) console.log(`  ${a.name.padEnd(34)} ${mi.toFixed(1).padStart(5)} mi · ${a.route_count} climbs`);
}
