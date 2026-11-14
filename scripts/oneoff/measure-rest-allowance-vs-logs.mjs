// Read-only. Calibrates REST_PER_MOVING_HR (lib/planTimes.js) against the times climbers LOGGED in climb_logs:
// for every log with a car-to-car time, it runs the route through planTimes at the default calc, and splits the
// rows by whether the Planner's car-to-car was MODELLED (the walk and pitch models, where the rest allowance
// applies) or came from STORED legs (where it does not). Only the modelled rows can say whether 10 min per moving
// hour is too little, too much or about right (route time audit, 2026-10-28).
// Usage: node scripts/oneoff/measure-rest-allowance-vs-logs.mjs
import "../lib/load-env.mjs";
import { build } from "esbuild";
import fs from "fs";
import os from "os";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";

const KEY = requireServiceKey(); // climb_logs is RLS-protected: the public key reads it as empty
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rest-"));
const bundle = path.join(dir, "planTimes.cjs");
await build({
  entryPoints: [path.join(ROOT, "lib", "planTimes.js")], bundle: true, format: "cjs", platform: "node",
  outfile: bundle, jsx: "automatic", loader: { ".js": "jsx", ".jsx": "jsx" }, logLevel: "silent",
  define: { "import.meta.env": "{}" },
});
const { planTimes, REST_PER_MOVING_HR } = createRequire(import.meta.url)(bundle);
const logs = await selectAll("climb_logs", "id,user_id,route_id,date_climbed,car_to_car_minutes,approach_minutes,climb_minutes,descent_minutes",
  "or=(car_to_car_minutes.not.is.null,approach_minutes.not.is.null,descent_minutes.not.is.null)", { pageSize: 1000, key: KEY });
console.log(`${logs.length} logs carry a time; ${new Set(logs.map((l) => l.user_id)).size} climbers, ${new Set(logs.map((l) => l.route_id)).size} routes`);
const ids = [...new Set(logs.map((l) => l.route_id))];
const rows = [];
for (let i = 0; i < ids.length; i += 150) rows.push(...await selectAll("routes", "id,name,discipline,grade,pitches,length_m,gain_ft,loss_ft,dist_km,timing,itinerary,outing_shape",
  `id=in.(${ids.slice(i, i + 150).map((x) => `"${x}"`).join(",")})`, { pageSize: 200 }));
const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
const plan = (r) => planTimes({ id: r.id, discipline: r.discipline, grade: r.grade, pitches: r.pitches,
  routeFt: r.length_m != null ? Math.round(r.length_m * 3.28084) : null,
  gainM: r.gain_ft != null ? Math.round(r.gain_ft / 3.28084) : null, lossM: r.loss_ft != null ? Math.round(r.loss_ft / 3.28084) : null,
  distKm: r.dist_km, itinerary: r.itinerary, outingShape: r.outing_shape, timing: r.timing }, {});
const out = [];
for (const l of logs) {
  const r = byId[l.route_id]; if (!r || l.car_to_car_minutes == null) continue;
  const p = plan(r), t = r.timing || {};
  const stored = p.legsStored || t.totalHrs != null || (t.approachTimeHrs != null && t.descentTimeHrs != null);
  out.push({ route: r.name, state: r.id.split("_")[0], logged: l.car_to_car_minutes / 60, planner: p.tripH, floor: !!p.legsFloor, kind: stored ? "stored" : "modelled" });
}
const med = (xs) => { const s = [...xs].sort((a, b) => a - b), k = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2) : null; };
for (const kind of ["modelled", "stored"]) {
  const xs = out.filter((o) => o.kind === kind && !o.floor && o.planner > 0);
  const ratios = xs.map((o) => o.logged / o.planner);
  console.log(`\n${kind.toUpperCase()}: ${xs.length} logs (floors excluded); median logged/planner ${med(ratios)?.toFixed(2) ?? "-"}`);
  for (const o of xs) console.log(`  ${o.route} (${o.state}): logged ${o.logged.toFixed(1)} h, planner ${o.planner.toFixed(1)} h`);
}
const m = med(out.filter((o) => o.kind === "modelled" && !o.floor && o.planner > 0).map((o) => o.logged / o.planner));
if (m != null) console.log(`\nAt REST_PER_MOVING_HR ${REST_PER_MOVING_HR.toFixed(3)}, the implied allowance that would match the median is ${((1 + REST_PER_MOVING_HR) * m - 1).toFixed(3)} per moving hour (an upper bound: it also absorbs pace and route-length error).`);
