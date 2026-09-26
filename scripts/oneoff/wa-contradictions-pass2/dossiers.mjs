// Build one compact dossier file per research batch: every rich WA route, grouped by area,
// batches of ~4-6 routes (whole areas kept together), with the detector's hints attached.
import fs from "node:fs";
const T = new URL("../../../audits/wa-contradictions-pass2", import.meta.url).pathname;
const R = JSON.parse(fs.readFileSync(`${T}/wa-routes.json`));
const A = Object.fromEntries(JSON.parse(fs.readFileSync(`${T}/wa-areas.json`)).map(a => [a.id, a]));
const F = JSON.parse(fs.readFileSync(`${T}/findings.json`));
const hints = {};
for (const f of F) (hints[f.id] ||= []).push(`[${f.check}] ${f.detail}`);
const SKIP = new Set(["name_search", "auto_generated", "sort_order", "gpx", "elev_pts", "data_quality", "corrections", "gear_confidence", "verif", "classic", "stars", "gps_contributor_name"]);
// --exclude <ids.json>: skip routes already read; --start N: first batch number (keeps group numbers unique)
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i < 0 ? null : argv[i + 1]; };
const EXCL = new Set(opt("--exclude") ? JSON.parse(fs.readFileSync(opt("--exclude"))) : []);
const START = +(opt("--start") || 1);
const rich = R.filter(r => !EXCL.has(r.id)).filter(r => r.overview || r.approach || r.timing || r.itinerary || r.pitch_detail || r.waypoints || hints[r.id]);
const byArea = {};
for (const r of rich) (byArea[r.area_id] ||= []).push(r);
const areaIds = Object.keys(byArea).sort((a, b) => (A[a]?.path || "").localeCompare(A[b]?.path || ""));
const batches = [];
let cur = [], size = 0;
const LIMIT = 90000; // chars per batch file
for (const aid of areaIds) {
  const a = A[aid] || {};
  const docs = byArea[aid].map(r => {
    const o = {};
    for (const [k, v] of Object.entries(r)) if (v != null && v !== "" && !SKIP.has(k) && !(Array.isArray(v) && !v.length)) o[k] = v;
    return { route: o, detector_hints: hints[r.id] || [] };
  });
  const head = { id: aid, name: a.name, type: a.area_type, elevation_ft: a.elevation_ft, lat: a.lat, lng: a.lng, path: a.path };
  // an area bigger than a batch is split by route, so no batch exceeds LIMIT unless one ROW does
  let part = [];
  const flush = () => { if (!part.length) return; const block = { area: head, routes: part }; const s = JSON.stringify(block).length;
    if (cur.length && size + s > LIMIT) { batches.push(cur); cur = []; size = 0; } cur.push(block); size += s; part = []; };
  for (const d of docs) { if (part.length && JSON.stringify(part).length + JSON.stringify(d).length > LIMIT) flush(); part.push(d); }
  flush();
}
if (cur.length) batches.push(cur);
fs.rmSync(`${T}/batches`, { recursive: true, force: true }); fs.mkdirSync(`${T}/batches`, { recursive: true });
batches.forEach((b, i) => fs.writeFileSync(`${T}/batches/b${String(i + START).padStart(3, "0")}.json`, JSON.stringify(b, null, 1)));
const sizes = batches.map(b => JSON.stringify(b).length);
console.log("rich routes", rich.length, "areas", areaIds.length, "batches", batches.length, "max chars", Math.max(...sizes), "routes/batch avg", (rich.length / batches.length).toFixed(1));
const big = rich.map(r => [r.id, JSON.stringify(r).length]).sort((a, b) => b[1] - a[1]).slice(0, 5);
console.log("largest rows", big);
