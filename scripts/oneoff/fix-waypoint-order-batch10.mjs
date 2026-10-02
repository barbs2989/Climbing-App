// Waypoint batch 10 (2026-10-01): the last unread flags of audit:waypoint-order — five routes listing
// one place twice, and two pins after the summit the descent prose does not name. Read route by route;
// none had been adjudicated by batches 1-9.
//
//   * Kendall Peak (Standard Scramble): "Kendall Katwalk" and "Kendall Katwalk (PCT)" are one point
//     (0 m apart). The bare copy — no height, no note — goes; the one with 5,387 ft stays.
//   * Western Dihedral: "Grassy saddle (South Face routes)" and "South Face grassy saddle" are one
//     point at one height (0 m, both 3,249 ft). The bare copy goes; the one with the route note stays.
//   * Mount Goode (NE Buttress): the last pin, "Park Creek Trail to PCT", is the PCT / North Fork
//     junction's coordinate verbatim (0 m) under a name the route never walks: the descent prose
//     reverses the approach "down the North Fork Bridge Creek drainage to the PCT and trailhead". It
//     was the return pass of pin 1 under a wrong name. Removed; the app already merged it away.
//   * Mount Cruiser (NW Face/Corner): "Base of Alpha (ridge gain)" has no coordinate and sat after the
//     summit. The approach reaches the climb along Sawtooth Ridge from Needle Pass; the descent raps
//     the South Corner and never returns past Alpha. A ridge gain is an approach point — moved ahead
//     of the summit, as the sibling South Corner row lists Needle Pass. Nothing else changes.
//   * Pinnacle Peak (Saddle / South Gully): "Cliff Bands Below Trail" claims 5,600 ft at mile 0.9 on
//     the trail; its coordinate stands 94 m from the summit pin (whose ground, 6,474 ft, verifies it)
//     on 6,338 ft of ground. The ground box REFUSES it (lo 5,673 at 183 m slop), and the geometry does
//     too: 960 ft below a summit 94 m away is a 72-degree average, not a trail. Coordinate CLEARED,
//     the pin kept with its height and mileage, as the row's own "Seasonal Stream Crossing" already is.
//
// LEFT, measured (see docs/guards/waypoints-and-tracks.md, batch 10):
//   * Pinnacle's "Pinnacle Saddle" and "Base of Summit Gully" share a point (2 m) 43 m from the summit
//     on ~6,530 ft ground — the summit block, not a 5,920 ft col. A 60 m DEM grid puts the col ~400 m
//     SW (~5,915 ft). But the 183 m box ADMITS both claims through the north face, so the ground is
//     not a second record, and a coordinate read off a grid would be invented. Not written.
//   * Prusik's "North face rappel descent" shares the P5 chockstone pin's coordinate (0 m), 190 m SW
//     of the summit while its note puts it on the north face. The box admits 7,600 ft there; one
//     record only, and no sibling stores a rappel pin to copy. Not written.
//   * Chair Peak's "Notch/saddle in main ridge" after the summit is CORRECT: its own note is the
//     descent (downclimb the SE gully from the summit to the notch, then rappel), which the descent
//     prose walks without using the word "notch".
//
// If the drawn line is just the row's waypoints joined up, a vertex on a coordinate no pin keeps is
// dropped too, so the "not a recorded GPS track" caption survives; it refuses if the caption flips.
//
// Snapshot: audits/waypoint-order-batch10/rollback-before-batch10.json (written on the dry run).
//
//   node scripts/oneoff/fix-waypoint-order-batch10.mjs          # dry run
//   node scripts/oneoff/fix-waypoint-order-batch10.mjs --apply
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";

const APPLY = process.argv.includes("--apply");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SNAP = join(ROOT, "audits", "waypoint-order-batch10", "rollback-before-batch10.json");
const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;
const near = (a, b) => a != null && b != null && Math.abs(Number(a) - b) < 1e-6;
const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));
const ptOf = (p) => p && (Array.isArray(p) ? { lat: +p[0], lng: +p[1] } : p.lat != null ? { lat: +p.lat, lng: +(p.lng ?? p.lon) } : null);

const EDITS = [
  { route: "wa_kendall_peak_standard", op: "remove", pin: "Junction|Kendall Katwalk", lat: 47.451796, lng: -121.378716,
    why: "the bare copy of 'Kendall Katwalk (PCT)', 0 m apart" },
  { route: "wa_western_dihedral", op: "remove", pin: "Base/bivy|South Face grassy saddle", lat: 48.19575, lng: -121.65485,
    why: "the bare copy of 'Grassy saddle (South Face routes)', 0 m apart, same height" },
  { route: "wa_mount_goode_northeast_buttress", op: "remove", pin: "Junction|Park Creek Trail to PCT", lat: 48.487365, lng: -120.853537,
    why: "the PCT / North Fork junction verbatim, under a trail the descent never takes" },
  { route: "wa_mount_cruiser_nw_face_corner", op: "move", pin: "Junction|Base of Alpha (ridge gain)", to: 1,
    why: "a ridge gain on the approach; the descent raps the South Corner" },
  { route: "wa_pinnacle_peak_tatoosh_r1", op: "uncoord", pin: "Hazard|Cliff Bands Below Trail", lat: 46.757321, lng: -121.733304,
    why: "ground box refuses 5,600 ft (lo 5,673); 94 m from a verified summit 960 ft higher" },
];

const ids = [...new Set(EDITS.map((e) => e.route))];
const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${ids.join(",")})&select=id,waypoints,gpx`;
const res = await fetch(url, { headers: headers(KEY) });
if (!res.ok) { console.error(`read failed: ${res.status}`); process.exit(1); }
const rows = await res.json();
if (rows.length !== ids.length) { console.error(`read ${rows.length} of ${ids.length} rows — refusing`); process.exit(1); }
const before = new Map(rows.map((r) => [r.id, r]));
const live = new Map(rows.map((r) => [r.id, { waypoints: r.waypoints.map((w) => ({ ...w })), gpx: Array.isArray(r.gpx) ? [...r.gpx] : r.gpx }]));
const cols = new Map(ids.map((id) => [id, new Set()]));
const dropped = new Map(ids.map((id) => [id, []]));   // coordinates no pin may keep any more

const refusals = [];
for (const e of EDITS) {
  const w = live.get(e.route).waypoints, hits = w.filter((p) => sig(p) === e.pin);
  if (hits.length !== 1) { refusals.push(`${e.route}: ${hits.length} live pin(s) match ${e.pin}`); continue; }
  const p = hits[0];
  if ((e.op === "remove" || e.op === "uncoord") && (!near(p.lat, e.lat) || !near(p.lng, e.lng))) { refusals.push(`${e.route}: ${e.pin} is at ${p.lat},${p.lng}, expected ${e.lat},${e.lng}`); continue; }
  if (e.op === "remove") { w.splice(w.indexOf(p), 1); dropped.get(e.route).push({ lat: e.lat, lng: e.lng }); }
  else if (e.op === "move") { w.splice(w.indexOf(p), 1); w.splice(e.to, 0, p); }
  else if (e.op === "uncoord") { p.lat = null; p.lng = null; dropped.get(e.route).push({ lat: e.lat, lng: e.lng }); }
  else { refusals.push(`${e.route}: unknown op ${e.op}`); continue; }
  cols.get(e.route).add("waypoints");
}

// The drawn line: drop a vertex only where no remaining pin stands, and only on a waypoint sketch.
for (const id of ids) {
  const b = before.get(id), L = live.get(id);
  if (!Array.isArray(b.gpx) || !trackIsJustTheWaypoints(b.gpx, b.waypoints)) continue;
  const pins = L.waypoints.map(ptOf).filter((p) => p && p.lat != null && Number.isFinite(p.lat));
  const orphan = (v) => { const q = ptOf(v); return q && dropped.get(id).some((d) => metres(q, d) < 5) && !pins.some((p) => metres(q, p) < 5); };
  const kept = b.gpx.filter((v) => !orphan(v));
  if (kept.length !== b.gpx.length) { L.gpx = kept; cols.get(id).add("gpx"); }
  if (!trackIsJustTheWaypoints(L.gpx, L.waypoints)) refusals.push(`${id}: the sketch caption would stop rendering`);
}
if (refusals.length) { console.error(`REFUSED — ${refusals.length}:\n  ` + refusals.join("\n  ") + "\nNothing was written."); process.exit(1); }

const show = (l) => l.map((p) => `${sig(p)}${p.lat == null ? " (no coord)" : ` @${p.lat},${p.lng}`}`).join("\n          ");
for (const id of ids) {
  const b = before.get(id), L = live.get(id);
  console.log(`\n### ${id}  [${[...cols.get(id)].join(", ")}]`);
  console.log(`   was: ${show(b.waypoints)}\n   now: ${show(L.waypoints)}`);
  if (cols.get(id).has("gpx")) console.log(`   gpx: ${b.gpx.length} -> ${L.gpx.length} vertices`);
}
console.log(`\n${EDITS.length} edit(s) on ${ids.length} route(s).`);

if (!existsSync(SNAP)) {
  mkdirSync(dirname(SNAP), { recursive: true });
  writeFileSync(SNAP, JSON.stringify({ takenAt: new Date().toISOString(), rows: rows.map((r) => ({ id: r.id, waypoints: r.waypoints, gpx: r.gpx })) }, null, 1) + "\n");
  console.log(`snapshot written: ${SNAP}`);
}
if (!APPLY) { console.log("DRY RUN — pass --apply to write."); process.exit(0); }

for (const id of ids) {
  const patch = {};
  for (const c of cols.get(id)) patch[c] = live.get(id)[c];
  await patchRow("routes", id, patch);
}
// jsonb returns an object's keys in its own order, so compare key-sorted (batch 9's lesson).
const canon = (x) => JSON.stringify(x, (k, val) => val && typeof val === "object" && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a < b ? -1 : 1)) : val);
const v = await (await fetch(url, { headers: headers(KEY) })).json();
let bad = 0;
for (const r of v) for (const c of cols.get(r.id)) {
  if (canon(r[c]) !== canon(live.get(r.id)[c])) { console.error(`NOT APPLIED: ${r.id}.${c}`); bad++; }
}
console.log(bad ? `VERIFY FAILED: ${bad}` : `verified: ${ids.length} row(s) re-read and match.`);
process.exit(bad ? 1 : 0);
