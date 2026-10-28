// Read-only. Runs each fix in a fixes.json (the apply-timing-fixes.mjs format) through lib/planTimes.js
// with the live row's walk inputs, and prints the Planner's legs before and after, so a repair is checked
// on the screen's own arithmetic BEFORE it is written (route time audit, 2026-10-28).
// Usage: node scripts/oneoff/preview-timing-fixes.mjs fixes.json
import "../lib/load-env.mjs";
import { build } from "esbuild";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixes = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ptf-"));
const bundle = path.join(dir, "planTimes.cjs");
await build({
  entryPoints: [path.join(ROOT, "lib", "planTimes.js")], bundle: true, format: "cjs", platform: "node",
  outfile: bundle, jsx: "automatic", loader: { ".js": "jsx", ".jsx": "jsx" }, logLevel: "silent",
  define: { "import.meta.env": "{}" },
});
const { planTimes } = createRequire(import.meta.url)(bundle);
const ids = fixes.map((f) => `"${f.id}"`).join(",");
const rows = await selectAll("routes", "id,discipline,grade,pitches,length_m,gain_ft,loss_ft,dist_km,timing,itinerary,outing_shape", `id=in.(${ids})`, { pageSize: 200 });
const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
const legs = (r, timing) => {
  const p = planTimes({ id: r.id, discipline: r.discipline, grade: r.grade, pitches: r.pitches,
    routeFt: r.length_m != null ? Math.round(r.length_m * 3.28084) : null,
    gainM: r.gain_ft != null ? Math.round(r.gain_ft / 3.28084) : null, lossM: r.loss_ft != null ? Math.round(r.loss_ft / 3.28084) : null,
    distKm: r.dist_km, itinerary: r.itinerary, outingShape: r.outing_shape, timing }, {});
  return `to summit ${p.totalH.toFixed(1)}  down ${p.downH.toFixed(1)}  car-to-car ${p.tripH.toFixed(1)}${p.legsFloor ? " (≥)" : ""}`;
};
for (const f of fixes) {
  const r = byId[f.id];
  if (!r) { console.log(`${f.id}: NOT FOUND`); continue; }
  console.log(`${f.id}\n  before  ${legs(r, f.from)}\n  after   ${legs(r, f.to)}`);
}
