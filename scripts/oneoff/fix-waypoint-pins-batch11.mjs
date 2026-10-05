// Waypoint batch 11 (2026-10-01): the pins batch 10 LEFT because it had one record and no source to copy —
// Pinnacle Saddle and Prusik Peak — re-read against outside sources. Every coordinate written here is
// COPIED (an OSM node, a Mountain Project coordinate, or a sibling row's verified pin), never read off a grid.
//
//   * "Pinnacle Saddle" (Pinnacle Peak and Plummer Peak rows): OSM node 891288375, name=Pinnacle Saddle,
//     46.7561418,-121.7357068 — the last node of the NPS "Pinnacle Peak Trail" way, which is what both
//     pins' notes say the saddle is. Pinnacle's OWN recorded track ends 2 m from it; Plummer's passes 7 m
//     from it. Ground there 5,935 ft against a claimed 5,920. The Pinnacle pin stood on the summit block
//     (6,531 ft ground, 43 m from the summit); Plummer's on Plummer's flank (6,265 ft). Moved.
//   * Prusik "south face base" (4 rows) is Mountain Project's AREA coordinate verbatim (47.48786,-120.78373),
//     81 m NORTH-EAST of the summit — the wrong side of the peak for a south-face start. Two records: the
//     source says what the coordinate is, and the geometry. On the two Burgner-Stanley rows it takes MP's
//     own published start-of-route coordinate for P1 (47.48681,-120.78457; 65 m S of the summit, ground
//     7,386 ft, against the 7,350 ft base the row's own Gnome Tarn note states). Der Sportsman and
//     Beckey-Davis start elsewhere on the face and no source places them: coordinate CLEARED, pin kept.
//   * The same MP area coordinate is the SUMMIT pin on 4 rows. The ground box refuses 8,008 ft there
//     (hi 7,902); the sibling rows' summit pin (47.487398,-120.784552, ground 8,003) is copied in.
//   * Prusik "North face rappel descent" is the P5 chockstone pin's coordinate (0 m), 193 m SW of the
//     summit. Its own note and every source (MP Stanley-Burgner / Beckey-Davis / Der Sportsman, two trip
//     reports) put the raps on the NORTH face from at or just east of the summit. No source publishes a
//     rappel coordinate: CLEARED, pin kept.
//
// LEFT: Pinnacle's "Base of Summit Gully" (2 m from the old saddle point, on the summit block). The box
// admits its 6,150 ft and no source names a gully start — OSM's change of sac_scale is not one.
//
// Snapshot: audits/waypoint-pins-batch11/rollback-before-batch11.json (written on the dry run).
//
//   node scripts/oneoff/fix-waypoint-pins-batch11.mjs          # dry run
//   node scripts/oneoff/fix-waypoint-pins-batch11.mjs --apply
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";

const APPLY = process.argv.includes("--apply");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SNAP = join(ROOT, "audits", "waypoint-pins-batch11", "rollback-before-batch11.json");
const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;
const near = (a, b) => a != null && b != null && Math.abs(Number(a) - b) < 1e-6;

const OSM_SADDLE = { lat: 46.7561418, lng: -121.7357068 };   // OSM node 891288375
const MP_AREA = { lat: 47.48786, lng: -120.78373 };          // MP Prusik Peak area GPS
const MP_P1 = { lat: 47.48681, lng: -120.78457 };            // MP Stanley-Burgner "approx coords of P1"
const SUMMIT = { lat: 47.487398, lng: -120.784552 };         // the sibling rows' verified summit pin
const BASE = "Campsite|Prusik Peak south face base";

const EDITS = [
  { route: "wa_pinnacle_peak_tatoosh_r1", op: "recoord", pin: "Junction|Pinnacle Saddle", from: { lat: 46.757782, lng: -121.732663 }, to: OSM_SADDLE },
  { route: "wa_plummer_peak_r1", op: "recoord", pin: "Junction|Pinnacle Saddle", from: { lat: 46.754055, lng: -121.739672 }, to: OSM_SADDLE },
  { route: "wa_prusik_peak_south_face_burgner_stanley", op: "recoord", pin: BASE, from: MP_AREA, to: MP_P1 },
  { route: "wa_stanley_burgner", op: "recoord", pin: BASE, from: MP_AREA, to: MP_P1 },
  { route: "wa_prusik_peak_der_sportsman", op: "uncoord", pin: BASE, from: MP_AREA },
  { route: "wa_beckey_davis", op: "uncoord", pin: BASE, from: MP_AREA },
  { route: "wa_stanley_burgner", op: "recoord", pin: "Summit|Prusik Peak", from: MP_AREA, to: SUMMIT },
  { route: "wa_beckey_davis", op: "recoord", pin: "Summit|Prusik Peak", from: MP_AREA, to: SUMMIT },
  { route: "wa_energizer_bunny", op: "recoord", pin: "Summit|Prusik Peak", from: MP_AREA, to: SUMMIT },
  { route: "wa_boving_christensen", op: "recoord", pin: "Summit|Prusik Peak", from: MP_AREA, to: SUMMIT },
  { route: "wa_prusik_peak_south_face_burgner_stanley", op: "uncoord", pin: "Hazard|North face rappel descent", from: { lat: 47.48615, lng: -120.786352 } },
];

const ids = [...new Set(EDITS.map((e) => e.route))];
const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${ids.join(",")})&select=id,waypoints,gpx`;
const res = await fetch(url, { headers: headers(KEY) });
if (!res.ok) { console.error(`read failed: ${res.status}`); process.exit(1); }
const rows = await res.json();
if (rows.length !== ids.length) { console.error(`read ${rows.length} of ${ids.length} rows — refusing`); process.exit(1); }
const before = new Map(rows.map((r) => [r.id, r]));
const live = new Map(rows.map((r) => [r.id, r.waypoints.map((w) => ({ ...w }))]));

const refusals = [];
// Moving a pin under a line drawn through the pins would strand a vertex; none of these rows is one.
for (const r of rows) if (Array.isArray(r.gpx) && r.gpx.length && trackIsJustTheWaypoints(r.gpx, r.waypoints)) refusals.push(`${r.id}: its line is a waypoint sketch`);
for (const e of EDITS) {
  const hits = live.get(e.route).filter((p) => sig(p) === e.pin);
  if (hits.length !== 1) { refusals.push(`${e.route}: ${hits.length} live pin(s) match ${e.pin}`); continue; }
  const p = hits[0];
  if (!near(p.lat, e.from.lat) || !near(p.lng, e.from.lng)) { refusals.push(`${e.route}: ${e.pin} is at ${p.lat},${p.lng}, expected ${e.from.lat},${e.from.lng}`); continue; }
  if (e.op === "recoord") { p.lat = e.to.lat; p.lng = e.to.lng; }
  else if (e.op === "uncoord") { p.lat = null; p.lng = null; }
  else refusals.push(`${e.route}: unknown op ${e.op}`);
}
if (refusals.length) { console.error(`REFUSED — ${refusals.length}:\n  ` + refusals.join("\n  ") + "\nNothing was written."); process.exit(1); }

const show = (l) => l.map((p) => `${sig(p)}${p.lat == null ? " (no coord)" : ` @${p.lat},${p.lng}`}`).join("\n          ");
for (const id of ids) console.log(`\n### ${id}\n   was: ${show(before.get(id).waypoints)}\n   now: ${show(live.get(id))}`);
console.log(`\n${EDITS.length} edit(s) on ${ids.length} route(s).`);

if (!existsSync(SNAP)) {
  mkdirSync(dirname(SNAP), { recursive: true });
  writeFileSync(SNAP, JSON.stringify({ takenAt: new Date().toISOString(), rows: rows.map((r) => ({ id: r.id, waypoints: r.waypoints })) }, null, 1) + "\n");
  console.log(`snapshot written: ${SNAP}`);
}
if (!APPLY) { console.log("DRY RUN — pass --apply to write."); process.exit(0); }

for (const id of ids) await patchRow("routes", id, { waypoints: live.get(id) });
// jsonb returns an object's keys in its own order, so compare key-sorted (batch 9's lesson).
const canon = (x) => JSON.stringify(x, (k, val) => val && typeof val === "object" && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a < b ? -1 : 1)) : val);
const v = await (await fetch(url, { headers: headers(KEY) })).json();
let bad = 0;
for (const r of v) if (canon(r.waypoints) !== canon(live.get(r.id))) { console.error(`NOT APPLIED: ${r.id}`); bad++; }
console.log(bad ? `VERIFY FAILED: ${bad}` : `verified: ${ids.length} row(s) re-read and match.`);
process.exit(bad ? 1 : 0);
