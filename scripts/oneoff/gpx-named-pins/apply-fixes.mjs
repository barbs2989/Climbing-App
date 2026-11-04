// Move the judged pins in research-data/gpx-named-pins-2026-10-29/fixes.json to their gazetteer
// coordinate. Each fix names the pin by index AND name AND its old coordinate; any mismatch with
// the live row skips that fix. Paced, rollback first, every row re-read.  --dry prints only.
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";
const DRY = process.argv.includes("--dry");
const fixes = JSON.parse(fs.readFileSync("research-data/gpx-named-pins-2026-10-29/fixes.json", "utf8"));
const key = requireServiceKey();
const get = async id => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,waypoints`, { headers: headers(key) })).json())[0];
const near = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
const rollback = [];
let problems = 0;
for (const f of fixes) {
  const row = await get(f.id);
  const w = row && row.waypoints && row.waypoints[f.i];
  if (!w || w.name !== f.name || !near([+w.lat, +w.lng], f.from)) { console.log("SKIP (live row differs)", f.id, f.i); problems++; continue; }
  const [eFrom, eTo] = [await elevationAt(...f.from), await elevationAt(...f.to)];
  console.log(f.id, "#" + f.i, f.name, "ground ft", Math.round(eFrom), "->", Math.round(eTo), w.elev ?? w.elevation ?? "");
  if (DRY) continue;
  rollback.push({ id: f.id, waypoints: row.waypoints });
  fs.writeFileSync(`scripts/rollback-named-pins-gnis-${process.pid}.json`, JSON.stringify(rollback, null, 1));
  const wps = row.waypoints.map((x, j) => j === f.i ? { ...x, lat: f.to[0], lng: f.to[1] } : x);
  await patchRow("routes", f.id, { waypoints: wps }, { key });
  const back = (await get(f.id)).waypoints[f.i];
  if (!near([+back.lat, +back.lng], f.to)) { console.log("RECONCILE FAIL", f.id); problems++; }
  await new Promise(s => setTimeout(s, 1500));
}
console.log(DRY ? "dry run" : `written ${rollback.length}`, "problems", problems);
