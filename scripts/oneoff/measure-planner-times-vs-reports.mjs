// Read-only. Bundles lib/planTimes.js (the Planner's own time maths, rest included) and prints the
// modelled time to summit, descent and car-to-car for WA routes with a stored timing or a walk.
// Used to choose which rows to research against online trip reports (route time audit, 2026-10-25).
// Usage: node scripts/oneoff/measure-planner-times-vs-reports.mjs [--ids id1,id2] [--out file.json]
import "../lib/load-env.mjs";
import { build } from "esbuild";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const idFile = flag("--id-file");
const ids = flag("--ids") ? new Set(flag("--ids").split(",")) : idFile ? new Set(JSON.parse(fs.readFileSync(idFile, "utf8"))) : null;
const outFile = flag("--out");

const dir = fs.mkdtempSync(path.join(process.env.CLAUDE_JOB_DIR || os.tmpdir(), "tmp", "ptm-"));
const bundle = path.join(dir, "planTimes.cjs");
await build({
  entryPoints: [path.join(ROOT, "lib", "planTimes.js")], bundle: true, format: "cjs", platform: "node",
  outfile: bundle, jsx: "automatic", loader: { ".js": "jsx", ".jsx": "jsx" }, logLevel: "silent",
  // lib/supabase.js reads import.meta.env at load; no DB client is needed for the time maths.
  define: { "import.meta.env": "{}" },
});
const { planTimes } = createRequire(import.meta.url)(bundle);

const SELECT = "id,name,area_id,discipline,grade,pitches,length_m,gain_ft,loss_ft,dist_km,timing";
// Whole-table scans with a timing filter hit the statement timeout, so ids are the normal path
// (--ids or --id-file, read 60 to a request to keep the URL short).
const inList = (xs) => `in.(${xs.map((i) => `"${i}"`).join(",")})`;
const rows = [];
if (ids) { const all = [...ids]; for (let i = 0; i < all.length; i += 60) rows.push(...await selectAll("routes", SELECT, `id=${inList(all.slice(i, i + 60))}`, { pageSize: 200 })); }
else rows.push(...await selectAll("routes", SELECT, "timing=not.is.null&discipline=in.(alpine,mountaineering,scrambling)", { pageSize: 200 }));
const areaIds = [...new Set(rows.map((r) => r.area_id).filter(Boolean))];
const areaName = {};
for (let i = 0; i < areaIds.length; i += 60) for (const a of await selectAll("areas", "id,name,path", `id=${inList(areaIds.slice(i, i + 60))}`, { pageSize: 200 })) areaName[a.id] = a.name;
const out = [];
for (const r of rows) {
  if (ids && !ids.has(r.id)) continue;
  const route = {
    id: r.id, discipline: r.discipline, grade: r.grade, pitches: r.pitches,
    routeFt: r.length_m != null ? Math.round(r.length_m * 3.28084) : null,
    gainM: r.gain_ft != null ? Math.round(r.gain_ft / 3.28084) : null,
    lossM: r.loss_ft != null ? Math.round(r.loss_ft / 3.28084) : null,
    distKm: r.dist_km, timing: r.timing,
  };
  let p;
  try { p = planTimes(route, {}); } catch (e) { out.push({ id: r.id, error: String(e.message || e) }); continue; }
  out.push({
    id: r.id, name: r.name, area: areaName[r.area_id] || null, discipline: r.discipline, grade: r.grade, pitches: r.pitches,
    gainFt: r.gain_ft, lossFt: r.loss_ft, distKm: r.dist_km, stored: r.timing,
    timeToSummitH: +p.totalH.toFixed(2), descentH: +p.downH.toFixed(2),
    carToCarH: +p.tripH.toFixed(2), approachH: +p.hikeH.toFixed(2), climbH: +p.techH.toFixed(2), floor: !!p.legsFloor,
  });
}
if (outFile) fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(`${out.length} routes measured`);
console.log(JSON.stringify(out.slice(0, 3), null, 1));
