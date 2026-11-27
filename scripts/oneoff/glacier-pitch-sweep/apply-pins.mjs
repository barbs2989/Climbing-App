// Kautz note, other routes: pin distances that are impossible (shorter than the straight line from the
// trailhead) or out of order, and pins / camps that are not on the route at all. Researched in
// research-data/glacier-pitch-sweep/pin-research-1.json; the accepted subset is listed here by hand.
// Refuses a pin whose stored distMi is no longer what the research read. Paced 1500 ms per write, re-read after.
// Rollback: scripts/rollback-glacier-pins-<ts>.json (waypoints + bivy as they were).
//   node scripts/oneoff/glacier-pitch-sweep/apply-pins.mjs --dry
import fs from "node:fs";
import { patchRow, selectAll, requireServiceKey } from "../../lib/supabase-env.mjs";
const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const DIST = [ // [route, pin name, old distMi, new distMi]
  ["wa_ragged_ridge", "Fisher Camp, Fisher Creek basin", 14.7, 5.5],           // NPS: Easy Pass 3.5 + 2 to Fisher Camp
  ["wa_burnt_boot_peak_north_route", "Hardscrabble Creek crossing", 2.8, 0.1], // WTA: at the horse-camp end, beside the trailhead
  ["wa_guye_peak_improbable_traverse", "Talus cone base / climbing start", 0.3, 0.8], // straight line from the trailhead pin is 0.7
  ["wa_guye_peak_improbable_traverse", "Lunch Ledge belay (~300 ft on route)", 0.4, 0.9], // straight line 0.77
  ["wa_mount_redoubt_south_face", "Depot Creek Falls", 3, 4.3],               // ~3 mi past Monument 65 (1.3); SE Mox stores 4.5
  ["wa_mount_carrie_se_route", "Heart Lake", 18.5, 8],                         // WTA 8.0 mi; the route's own text sums to 8
];
const DROP_PINS = { wa_hagan_mountain_south: ["Upper Watson Lake", "Uppermost Diobsud Lake", "~5,300-ft saddle below Mt. Watson"], wa_mount_carrie_se_route: ["Deer Lake"] };
const DROP_CAMPS = { wa_hagan_mountain_south: ["Upper Watson Lake", "Uppermost Diobsud Lake"] };
const ids = [...new Set([...DIST.map((d) => d[0]), ...Object.keys(DROP_PINS), ...Object.keys(DROP_CAMPS)])];
const rollback = {}, done = [], refused = [];
for (const id of ids) {
  const [row] = await selectAll("routes", "id,waypoints,bivy", `id=eq.${id}`, { key });
  if (!row) { refused.push({ id, why: "no row" }); continue; }
  const wp = JSON.parse(JSON.stringify(row.waypoints || [])); let bivy = row.bivy ? JSON.parse(JSON.stringify(row.bivy)) : row.bivy;
  let ok = true;
  for (const [rid, name, from, to] of DIST.filter((d) => d[0] === id)) {
    const w = wp.find((x) => x && x.name === name);
    if (!w || w.distMi !== from) { refused.push({ id, name, why: "pin changed", now: w && w.distMi }); ok = false; continue; }
    w.distMi = to; done.push({ id: rid, name, from, to });
  }
  const before = wp.length;
  const keep = wp.filter((x) => !(DROP_PINS[id] || []).includes(x && x.name));
  if ((DROP_PINS[id] || []).length && before - keep.length !== DROP_PINS[id].length) { refused.push({ id, why: "pins to drop not all found" }); ok = false; }
  if (Array.isArray(bivy) && DROP_CAMPS[id]) {
    const b2 = bivy.filter((c) => !DROP_CAMPS[id].includes(c && c.name));
    if (bivy.length - b2.length !== DROP_CAMPS[id].length) { refused.push({ id, why: "camps to drop not all found" }); ok = false; }
    bivy = b2;
  }
  if (!ok) continue;
  for (const n of DROP_PINS[id] || []) done.push({ id, removedPin: n });
  for (const n of DROP_CAMPS[id] || []) done.push({ id, removedCamp: n });
  rollback[id] = { waypoints: row.waypoints, bivy: row.bivy };
  const body = { waypoints: keep }; if (DROP_CAMPS[id]) body.bivy = bivy;
  if (!DRY) { await patchRow("routes", id, body); await new Promise((r) => setTimeout(r, 1500)); }
}
if (!DRY && Object.keys(rollback).length) {
  fs.writeFileSync(`scripts/rollback-glacier-pins-${Date.now()}.json`, JSON.stringify(rollback, null, 1));
  for (const id of Object.keys(rollback)) {
    const [r] = await selectAll("routes", "id,waypoints,bivy", `id=eq.${id}`, { key });
    for (const d of done.filter((x) => x.id === id)) {
      if (d.to != null && (r.waypoints.find((w) => w.name === d.name) || {}).distMi !== d.to) refused.push({ id, name: d.name, why: "re-read disagrees" });
      if (d.removedPin && r.waypoints.some((w) => w.name === d.removedPin)) refused.push({ id, name: d.removedPin, why: "re-read: pin still there" });
      if (d.removedCamp && (r.bivy || []).some((c) => c.name === d.removedCamp)) refused.push({ id, name: d.removedCamp, why: "re-read: camp still there" });
    }
  }
}
console.log(JSON.stringify({ dry: DRY, done, refused }, null, 1));
