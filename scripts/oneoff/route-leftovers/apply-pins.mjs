// Apply confirmed pin operations: move a waypoint (compare-and-set on its name + coordinate), or remove one.
// A route whose drawn line passes exactly through the old coordinate has that vertex carried with the pin, so a
// repair does not strand the line (docs/guards/waypoints-and-tracks.md, "A PIN REPAIR HAS TO CARRY ITS SKETCHED LINE").
// Text ops in the same file go through ../route-tab-contradictions/apply-structural.mjs FIRST (indexes are pre-removal).
// usage: node apply-pins.mjs <file under audits/route-leftovers/> [--dry]
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const T = new URL("../../../audits/route-leftovers", import.meta.url).pathname;
const file = process.argv[2], DRY = process.argv.includes("--dry");
const { results } = JSON.parse(fs.readFileSync(`${T}/${file}`));
const one = async id => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,waypoints,gpx&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) })).json())[0];
const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
const same = (a, b) => Math.abs(Number(a) - Number(b)) < 1e-6;
const report = { applied: [], rejected: [], backups: [] };
const byRow = {};
for (const res of results) if (res.verdict === "confirmed") for (const o of res.pin_ops || []) (byRow[o.id] ||= []).push(o);
for (const [id, ops] of Object.entries(byRow)) {
  const row = await one(id); if (!row) { report.rejected.push({ id, why: "row missing" }); continue; }
  report.backups.push(row);
  let wps = structuredClone(row.waypoints), gpx = Array.isArray(row.gpx) ? structuredClone(row.gpx) : row.gpx, changed = false;
  // a coordinate-less summit pin (crag rows) must not become the anchor: null reads as 0,0 and refuses every move
  const summit = wps.find(w => /summit/i.test(w?.type || "") && Number.isFinite(w.lat)) || wps.findLast(w => Number.isFinite(w?.lat) && Number.isFinite(w?.lng));
  const removals = [];
  // clear_line: the drawn line was sketched along the WRONG approach, so no carried vertex can save it; the map then
  // shows pins only. Compare-and-set on the exact current line.
  for (const o of ops.filter(o => o.op === "clear_line")) {
    // "LIVE": clear whatever line the row holds right now (it was just read, and is backed up in full above)
    if (o.expect_gpx === "LIVE") o.expect_gpx = row.gpx;
    if (!Array.isArray(o.expect_gpx) || JSON.stringify(row.gpx) !== JSON.stringify(o.expect_gpx)) { report.rejected.push({ id, op: o.op, why: "line changed" }); continue; }
    gpx = null; changed = true; report.applied.push({ id, op: "clear_line", points: o.expect_gpx.length, why: o.why });
  }
  for (const o of ops.filter(o => o.op !== "clear_line" && o.op !== "add_pin")) {
    const w = wps[o.index], e = o.expect || {};
    let why = null;
    if (!w) why = `no waypoint ${o.index}`;
    // identity is the exact coordinate: the text ops run first and may already have renamed the pin
    else if (!same(w.lat, e.lat) || !same(w.lng, e.lng)) why = `waypoint ${o.index} is "${w.name}" ${w.lat},${w.lng}, expected "${e.name}" ${e.lat},${e.lng}`;
    else if (o.op === "move_pin" && !(Number.isFinite(o.lat) && Number.isFinite(o.lng))) why = "move needs numeric lat/lng";
    else if (o.op === "move_pin" && summit && km(o.lat, o.lng, summit.lat, summit.lng) > 60) why = "new coordinate is >60 km from the route's summit";
    else if (o.op === "move_pin" && (!Array.isArray(o.sources) || o.sources.length < 2)) why = "a move needs 2 sources";
    else if (!["move_pin", "remove_pin"].includes(o.op)) why = `unknown op ${o.op}`;
    if (why) { report.rejected.push({ id, op: o.op, index: o.index, why }); continue; }
    if (o.op === "remove_pin") { removals.push(o.index); continue; }
    const nw = { ...w, lat: o.lat, lng: o.lng };
    for (const k of ["elev", "elevFt"]) if (o[k] != null) nw[k] = o[k];
    let carried = 0;
    if (Array.isArray(gpx)) gpx = gpx.map(p => (Array.isArray(p) && same(p[0], w.lat) && same(p[1], w.lng)) ? (carried++, [o.lat, o.lng, ...p.slice(2)]) : p);
    wps[o.index] = nw; changed = true;
    report.applied.push({ id, op: "move_pin", index: o.index, name: w.name, moved_km: +km(w.lat, w.lng, o.lat, o.lng).toFixed(2), gpx_vertices_carried: carried });
  }
  for (const i of removals.sort((a, b) => b - a)) {
    const w = wps[i]; let dropped = 0;
    if (Array.isArray(gpx)) { const n = gpx.length; gpx = gpx.filter(p => !(Array.isArray(p) && same(p[0], w.lat) && same(p[1], w.lng))); dropped = n - gpx.length; }
    wps.splice(i, 1); changed = true;
    report.applied.push({ id, op: "remove_pin", index: i, name: w.name, gpx_vertices_dropped: dropped });
  }
  // add_pin: insert a new pin after the pin named `after_name` (resolved AFTER removals, so indexes cannot drift);
  // needs 2 sources like a move, and refuses a name the route already has.
  for (const o of ops.filter(o => o.op === "add_pin")) {
    const p = o.pin || {}, at = wps.findIndex(w => w.name === o.after_name);
    let why = null;
    if (at < 0) why = `no pin named "${o.after_name}"`;
    else if (!p.name || !Number.isFinite(p.lat) || !Number.isFinite(p.lng)) why = "pin needs name, lat, lng";
    else if (wps.some(w => w.name === p.name)) why = `pin "${p.name}" already exists`;
    else if (!Array.isArray(o.sources) || o.sources.length < 2) why = "an added pin needs 2 sources";
    else if (summit && km(p.lat, p.lng, summit.lat, summit.lng) > 60) why = "new pin is >60 km from the route's summit";
    if (why) { report.rejected.push({ id, op: o.op, name: p.name, why }); continue; }
    wps.splice(at + 1, 0, p); changed = true;
    report.applied.push({ id, op: "add_pin", name: p.name, after: o.after_name });
  }
  if (!changed) continue;
  const patch = { waypoints: wps }; if (JSON.stringify(gpx) !== JSON.stringify(row.gpx)) patch.gpx = gpx;
  if (!DRY) { await patchRow("routes", id, patch); const after = await one(id); if (JSON.stringify(after.waypoints.map(w => [w.name, w.lat, w.lng])) !== JSON.stringify(wps.map(w => [w.name, w.lat, w.lng]))) throw new Error(`verify failed ${id}`); }
}
const out = `${T}/pins-${file.replace(/\W+/g, "_")}-${Date.now()}${DRY ? "-dry" : ""}.json`;
fs.writeFileSync(out, JSON.stringify(report, null, 1));
console.log(`${DRY ? "DRY " : ""}${file}: applied ${report.applied.length}, rejected ${report.rejected.length} -> ${out}`);
for (const a of report.applied) console.log("  OK", JSON.stringify(a));
for (const r of report.rejected) console.log("  REJECT", JSON.stringify(r));
