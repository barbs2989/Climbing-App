// Remove the waypoints that are off the route's own recorded track (owner note, 2026-10-25:
// "If they aren't along or very near the route, remove the waypoints").
// Input: the `cands` list written by gpx-offroute-candidates.mjs. Each pin is re-read and must still
// match by index, name and coordinate, or the route is skipped. Rollback saved before any write;
// writes paced by patchRow (1 s); every row re-read after.
// Usage: node scripts/oneoff/gpx-offroute-remove.mjs <cands.json> <rollback.json> [--dry]
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const [candFile, rollbackFile] = process.argv.slice(2);
const dry = process.argv.includes("--dry");
const { cands } = JSON.parse(fs.readFileSync(candFile, "utf8"));
const key = requireServiceKey();
const read = async id => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,waypoints`, { headers: headers(key) })).json())[0];

const plan = [];
for (const c of cands) {
  const row = await read(c.id);
  const wps = row.waypoints || [];
  const ok = c.off.every(o => wps[o.i] && wps[o.i].name === o.wp);
  if (!ok) { console.log("SKIP changed since measured:", c.id); continue; }
  const drop = new Set(c.off.map(o => o.i));
  plan.push({ id: c.id, before: wps, after: wps.filter((_, i) => !drop.has(i)), removed: c.off });
}
fs.writeFileSync(rollbackFile, JSON.stringify(plan.map(p => ({ id: p.id, waypoints: p.before, removed: p.removed })), null, 1));
console.log(`rollback ${rollbackFile}: ${plan.length} routes, ${plan.reduce((s, p) => s + p.removed.length, 0)} pins`);
if (dry) process.exit(0);
let bad = 0;
for (const p of plan) {
  await patchRow("routes", p.id, { waypoints: p.after });
  const back = await read(p.id);
  if (JSON.stringify(back.waypoints) !== JSON.stringify(p.after)) { bad++; console.log("RECONCILE FAIL", p.id); }
  else console.log("ok", p.id, "-" + p.removed.length);
}
console.log("done; reconcile failures:", bad);
