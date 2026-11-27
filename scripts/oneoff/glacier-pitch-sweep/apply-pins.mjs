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
  ["wa_mount_redoubt_south_face", "Depot Creek Falls", 3, 4.5],               // 3 is under the 4.2 mi straight line; SE Mox stores 4.5
  ["wa_mount_redoubt_south_face", "Monument 65 (US-Canada border)", 1.3, 1.6],  // the moved trailhead is 1.43 mi straight; OSM road 1.55 mi
  ["wa_southeast_mox_peak_se_rib", "Monument 65 (US-Canada border)", 1.2, 1.6],
  ["wa_mount_carrie_se_route", "Heart Lake", 18.5, 8],                         // WTA 8.0 mi; the route's own text sums to 8
];
// [route, pin name, old lat, old lng, new lat, new lng] — round 2 (research-data/glacier-pitch-sweep/round2-research.json)
const MOVE = [
  // Depot Creek Road washout: the old pin read 2,042 ft on USGS 3DEP against the 2,600 ft reports give; the new point is
  // on OSM's Depot FS Road, 1.55 road-miles from Monument 65, at 2,580 ft.
  ["wa_mount_redoubt_south_face", "Depot Creek Road washout", 49.033, -121.4025, 49.0114, -121.3621],
  ["wa_southeast_mox_peak_se_rib", "Depot Creek Road parking / trailhead", 49.033, -121.4025, 49.0114, -121.3621],
  // Early Winters Creek crossing: the old point is 1.2 mi north of the pullout at 3,748 ft; the new one is 0.17 mi
  // from it at 4,085 ft (the pin claims 4,080 ft and 0.2-0.3 mi).
  ["wa_ultramega_ok", "Early Winters Creek Crossing", 48.56803, -120.629805, 48.5515, -120.6275],
  ["wa_vasiliki_ridge_standard", "Early Winters Creek log crossing", 48.56803, -120.629805, 48.5515, -120.6275],
];
const DROP_PINS = { wa_hagan_mountain_south: ["Upper Watson Lake", "Uppermost Diobsud Lake", "~5,300-ft saddle below Mt. Watson"], wa_mount_carrie_se_route: ["Deer Lake"] };
const DROP_CAMPS = { wa_hagan_mountain_south: ["Upper Watson Lake", "Uppermost Diobsud Lake"] };
const ids = [...new Set([...DIST.map((d) => d[0]), ...MOVE.map((d) => d[0]), ...Object.keys(DROP_PINS), ...Object.keys(DROP_CAMPS)])];
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
  for (const [rid, name, la, lo, nla, nlo] of MOVE.filter((d) => d[0] === id)) {
    const w = wp.find((x) => x && x.name === name);
    if (!w || w.lat !== la || w.lng !== lo) { refused.push({ id, name, why: "pin moved since research", now: w && [w.lat, w.lng] }); ok = false; continue; }
    w.lat = nla; w.lng = nlo; done.push({ id: rid, name, moved: [nla, nlo] });
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
      if (d.moved && (r.waypoints.find((w) => w.name === d.name) || {}).lat !== d.moved[0]) refused.push({ id, name: d.name, why: "re-read: not moved" });
      if (d.removedPin && r.waypoints.some((w) => w.name === d.removedPin)) refused.push({ id, name: d.removedPin, why: "re-read: pin still there" });
      if (d.removedCamp && (r.bivy || []).some((c) => c.name === d.removedCamp)) refused.push({ id, name: d.removedCamp, why: "re-read: camp still there" });
    }
  }
}
console.log(JSON.stringify({ dry: DRY, done, refused }, null, 1));
