// READ-ONLY. How good is the climbing time planTimes() estimates from a route's LENGTH (climbPitches: length
// over 35 m pitches) when no pitch count is stored? The owner (2026-11-23) asked for the fix "based on
// research": Slipstream (914 m, no count) read >=18.6 hr of climbing against about 7.5 hr in trip reports.
//
// The yardstick is the route's OWN published climb time: routes storing a summit leg beside a separate
// approach (timing.summitTimeHrs + approachTimeHrs, not a whole-day figure) and a length. For each, the
// route is re-timed as if it had no timing and no pitch count -- the length estimate exactly as a bare route
// gets it -- and compared with the published leg, by length band. The descent's rappel allowance (0.7 x the
// modelled climb) is compared with the published descent the same way.
//   node scripts/oneoff/measure-length-pitch-estimate.mjs [--out file.json]
import "../lib/load-env.mjs";
import { build } from "esbuild";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = fs.mkdtempSync(path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, "tmp") : os.tmpdir(), "lpe-"));
const entry = path.join(dir, "entry.js");
fs.writeFileSync(entry, `export { planTimes, climbPitches } from ${JSON.stringify(path.join(ROOT, "lib", "planTimes.js"))};\n`);
const bundle = path.join(dir, "bundle.cjs");
await build({ entryPoints: [entry], bundle: true, format: "cjs", platform: "node", outfile: bundle, jsx: "automatic", loader: { ".js": "jsx", ".jsx": "jsx" }, logLevel: "silent", define: { "import.meta.env": "{}" } });
const { planTimes, climbPitches } = createRequire(import.meta.url)(bundle);

const rows = await selectAll("routes", "id,name,discipline,grade,pitches,length_m,timing",
  "discipline=in.(alpine,ice,mixed,trad)&length_m=gt.0&timing=not.is.null", { key: requireServiceKey(), pageSize: 1000 });
const bands = [[0, 150], [150, 300], [300, 500], [500, 800], [800, 5000]];
const pts = [];
for (const r of rows) {
  const t = r.timing || {};
  if (t.summitTimeHrs == null || t.approachTimeHrs == null || !(t.summitTimeHrs > 0)) continue;
  if (t.totalHrs != null && Math.abs(t.approachTimeHrs + t.summitTimeHrs - t.totalHrs) < 0.01 && t.descentTimeHrs == null) continue; // summit+descent push
  const bare = { discipline: r.discipline, grade: r.grade, pitches: null, routeFt: Math.round(r.length_m * 3.28084) };
  const P = planTimes(bare, {});
  if (!(P.techH > 0)) continue;
  pts.push({ id: r.id, name: r.name, len: r.length_m, est: P.techH, pub: t.summitTimeHrs, rap: P.downH, pubDown: t.descentTimeHrs, n: climbPitches(bare) });
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
console.log(`${rows.length} rows read; ${pts.length} carry a published climb leg beside a length`);
console.log(`length band | n | published hr (median) | estimate hr (median) | est/pub median | p25-p75 | est > pub`);
for (const [a, b] of bands) {
  const s = pts.filter((p) => p.len >= a && p.len < b);
  if (!s.length) continue;
  const ratio = s.map((p) => p.est / p.pub);
  console.log(`${a}-${b} m | ${s.length} | ${med(s.map((p) => p.pub)).toFixed(1)} | ${med(s.map((p) => p.est)).toFixed(1)} | ${med(ratio).toFixed(2)} | ${q(ratio, 0.25).toFixed(2)}-${q(ratio, 0.75).toFixed(2)} | ${s.filter((p) => p.est > p.pub).length}`);
}
const allR = pts.map((p) => p.est / p.pub);
console.log(`ALL | ${pts.length} | est/pub median ${med(allR).toFixed(2)}, p25 ${q(allR, 0.25).toFixed(2)}, p75 ${q(allR, 0.75).toFixed(2)}; estimate above published on ${pts.filter((p) => p.est > p.pub).length}`);
// Published climb hours per 100 m of route, by band: what a length-based estimate SHOULD charge.
for (const [a, b] of bands) {
  const s = pts.filter((p) => p.len >= a && p.len < b);
  if (s.length) console.log(`  ${a}-${b} m: published ${med(s.map((p) => (p.pub / p.len) * 100)).toFixed(2)} hr per 100 m (p25 ${q(s.map((p) => (p.pub / p.len) * 100), 0.25).toFixed(2)}, p75 ${q(s.map((p) => (p.pub / p.len) * 100), 0.75).toFixed(2)}); estimate ${med(s.map((p) => (p.est / p.len) * 100)).toFixed(2)}`);
}
const d = pts.filter((p) => p.pubDown > 0);
console.log(`DESCENT (no walk data, so the estimate is the 0.7 x climb rappel allowance): ${d.length} with a published descent; est/pub median ${med(d.map((p) => p.rap / p.pubDown)).toFixed(2)}, p25 ${q(d.map((p) => p.rap / p.pubDown), 0.25).toFixed(2)}, p75 ${q(d.map((p) => p.rap / p.pubDown), 0.75).toFixed(2)}; descent/climb published median ${med(d.map((p) => p.pubDown / p.pub)).toFixed(2)}`);
const i = process.argv.indexOf("--out");
if (i > 0) fs.writeFileSync(process.argv[i + 1], JSON.stringify(pts, null, 1));
