// READ-ONLY. Which routes that mount the Plan tab's TRIP PROFILE card (every route not in CRAG_CATS)
// actually draw it, and why the rest do not (owner note, 2026-11-26: "Is trip profile on all routes
// that it should be on? Even if there's no data on it?"). Runs the SHIPPED lib/tripProfile.js through
// dbRouteToCamel, exactly as the card does, and tallies tripProfile()'s own `reason`.
//   node scripts/oneoff/measure-trip-profile-coverage.mjs [--out file.json]
import "../lib/load-env.mjs";
import { build } from "esbuild";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = fs.mkdtempSync(path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, "tmp") : os.tmpdir(), "tpc-"));
const entry = path.join(dir, "entry.js");
const j = (p) => JSON.stringify(path.join(ROOT, p));
fs.writeFileSync(entry, `export { planTimes } from ${j("lib/planTimes.js")};\nexport { tripProfile } from ${j("lib/tripProfile.js")};\nexport { tripLegGeometry } from ${j("lib/tripLegs.js")};\nexport { dbRouteToCamel } from ${j("lib/db-route-row.js")};\nexport { catOf, CRAG_CATS } from ${j("ClimbMatchCore.jsx")};\n`);
const bundle = path.join(dir, "bundle.cjs");
await build({ entryPoints: [entry], bundle: true, format: "cjs", platform: "node", outfile: bundle, jsx: "automatic",
  loader: { ".js": "jsx", ".jsx": "jsx" }, logLevel: "silent", define: { "import.meta.env": "{}" } });
const M = createRequire(import.meta.url)(bundle);
const CRAG = M.CRAG_CATS;
// --snapshot reads the nightly static snapshot (<pages>/states/) instead of the database: no DB slot needed.
let peaks, rows;
if (process.argv.includes("--snapshot")) {
  const PAGES = "https://barbs2989.github.io/Climbing-App/states/";
  const zlib = await import("zlib");
  const index = await (await fetch(PAGES + "index.json")).json();
  peaks = new Set(); rows = [];
  for (const st of Object.values(index.states)) for (const part of st.parts) {
    const buf = Buffer.from(await (await fetch(PAGES + part.file)).arrayBuffer());
    let txt; try { txt = zlib.gunzipSync(buf).toString("utf8"); } catch { txt = buf.toString("utf8"); }
    const j = JSON.parse(txt);
    for (const a of j.areas || []) if (a.area_type === "peak") peaks.add(a.id);
    for (const r of j.routes || []) if (!["sport", "toprope", "bouldering"].includes(r.discipline)) rows.push(r);
  }
} else {
  const key = requireServiceKey();
  peaks = new Set((await selectAll("areas", "id", "area_type=eq.peak", { key, pageSize: 1000 })).map((a) => a.id));
  rows = await selectAll("routes", "*", "discipline=not.in.(sport,toprope,bouldering)", { key, pageSize: 500 });
}
const byReason = {}, byDisc = {}, drawn = [], sample = {}, perRoute = [];
let mounted = 0;
for (const r of rows) {
  let route;
  try { route = M.dbRouteToCamel(r); } catch { continue; }
  route._dbArea = Object.assign({}, route._dbArea, { areaType: peaks.has(r.area_id) ? "peak" : (route._dbArea && route._dbArea.areaType) || null });
  if (CRAG.includes(M.catOf(route))) continue;
  mounted++;
  const d = M.catOf(route);
  byDisc[d] = byDisc[d] || { mounted: 0, drawn: 0 };
  byDisc[d].mounted++;
  let reason;
  try { const tp = M.tripProfile(route, M.planTimes(route, {}), M.tripLegGeometry(route), {}); reason = tp.legs ? "DRAWN by " + tp.measuredBy : tp.reason; } catch (e) { reason = "threw: " + e.message; }
  byReason[reason] = (byReason[reason] || 0) + 1;
  if (/^DRAWN/.test(reason)) { byDisc[d].drawn++; drawn.push(r.id); }
  const wps = Array.isArray(route.waypoints) ? route.waypoints : [];
  perRoute.push({ id: r.id, name: r.name, disc: d, area: r.area_id, reason, wps: wps.length, withDist: wps.filter((w) => w && w.distMi != null && w.distMi !== "").length, th: wps.some((w) => /trailhead/i.test((w && w.type) || "")), summit: wps.some((w) => /summit|topout/i.test((w && w.type) || "")) });
  (sample[reason] = sample[reason] || []).length < 8 && sample[reason].push(r.id);
}
const res = { measured: new Date().toISOString(), rows: rows.length, mounted, byReason, byDisc, sample, drawn, perRoute };
console.log(JSON.stringify({ rows: res.rows, mounted, byReason, byDisc, drawn: drawn.length }, null, 1));
const oi = process.argv.indexOf("--out");
if (oi > 0) fs.writeFileSync(process.argv[oi + 1], JSON.stringify(res, null, 1));
