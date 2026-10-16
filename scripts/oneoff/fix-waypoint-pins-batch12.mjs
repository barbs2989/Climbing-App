// Waypoint batch 12 (2026-10-01): the pins batch 11 LEFT, plus the one new detour flag, re-read
// against outside sources. Nothing here publishes a coordinate for any of the three pins, so each
// is CLEARED (pin and note kept) on two records — never moved to a point read off a grid.
//
//   * Pinnacle Peak "Base of Summit Gully" (46.757797,-121.732683) is a 2 m copy of the saddle
//     coordinate batch 11 proved wrong (46.757782,-121.732663, on the summit block), and it sits
//     CLOSER to the summit than the "Summit Gully Scramble" pin that follows it. Sources (MP SW
//     Scramble "200 ft", two WTA reports, willhiteweb) put the gully on the south side and publish
//     no point or height for its foot.
//   * Prusik Peak "Chockstone squeeze / upper chimney (P5)" (47.48615,-120.786352) is 193 m SW of
//     the summit on 7,283 ft ground, three times farther out than MP's own P1 (65 m S). MP and
//     Wenatchee Outdoors: the route starts "directly below the summit" and P5 is the second-to-last
//     pitch, one pitch below the top. It was also the coordinate batch 11 removed from the
//     north-face rappel pin. No source places the pitch.
//   * Klawatti Peak "Eldorado Glacier gain point" (48.547934,-121.124876) claims 6,800 ft; the
//     ground box refuses it (8,055 ft, lo 7,723), and it lies 1.8 km NORTH of the high camp, while
//     every source (MP Eldorado East Ridge, The Outbound, skimo.co) gains the glacier at ~6,800 ft
//     above Roush Creek Basin, south of the camp. This is the audit:waypoint-order detour flag.
//     The row's line is a 4-vertex SKETCH through its pins, so the cleared pin's vertex goes too,
//     and its first vertex (48.5136,-121.1964 — WTA's Eldorado Peak pin, which OSM places on the
//     Hidden Lake Trail, 6 km from the trailhead the row's own pin and prose name) is replaced by
//     the row's own trailhead pin, so the sketch is drawn through the pins it claims to join.
//   * That WTA point is a vertex on three more Eldorado-area sketches (Dorado Needle Direct SW Buttress
//     and East Ridge, Klawatti SW Buttress), mid-line on two; each line now starts at its own trailhead pin.
//
// LEFT: Buck Mountain South Ridge's detour flag — its Buck Creek Pass pin is GNIS 1517033 to 2 m,
// and its own track passes the pass before the summit. Correct as stored.
//
// Snapshot: audits/waypoint-pins-batch12/rollback-before-batch12.json (written on the dry run).
//
//   node scripts/oneoff/fix-waypoint-pins-batch12.mjs          # dry run
//   node scripts/oneoff/fix-waypoint-pins-batch12.mjs --apply
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";

const APPLY = process.argv.includes("--apply");
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SNAP = join(ROOT, "audits", "waypoint-pins-batch12", "rollback-before-batch12.json");
const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;
const near = (a, b) => a != null && b != null && Math.abs(Number(a) - b) < 1e-6;

const KLAWATTI_TH = { lat: 48.49261, lng: -121.11761 };      // the row's own trailhead pin
const EDITS = [
  { route: "wa_pinnacle_peak_tatoosh_r1", pin: "Junction|Base of Summit Gully", from: { lat: 46.757797, lng: -121.732683 } },
  { route: "wa_prusik_peak_south_face_burgner_stanley", pin: "Hazard|Chockstone squeeze / upper chimney (P5)", from: { lat: 47.48615, lng: -120.786352 } },
  { route: "wa_klawatti_peak_southeast_face", pin: "Junction|Eldorado Glacier gain point", from: { lat: 48.547934, lng: -121.124876 } },
];
// Sketch edits, each asserted against the exact live line before it is written.
const SKETCH = {
  wa_klawatti_peak_southeast_face: {
    from: [[48.5136, -121.1964], [48.547934, -121.124876], [48.531491, -121.125156], [48.554293, -121.1042829]],
    to: [[KLAWATTI_TH.lat, KLAWATTI_TH.lng], [48.531491, -121.125156], [48.554293, -121.1042829]],
  },
  // The same WTA point is a vertex on three more Eldorado-area sketches — mid-line on two of them, so
  // the drawn path drops 6 km to the Hidden Lake Trail and climbs back. Each row's own trailhead pin is
  // the Eldorado Creek trailhead twelve rows agree on; the line now starts there.
  wa_direct_southwest_buttress: {
    from: [[48.5136, -121.1964], [48.538, -121.118], [48.54542, -121.14548976190476], [48.548, -121.14136190476191], [48.54929, -121.13929797619048], [48.54972, -121.13861]],
    to: [[48.4926, -121.1176], [48.538, -121.118], [48.54542, -121.14548976190476], [48.548, -121.14136190476191], [48.54929, -121.13929797619048], [48.54972, -121.13861]],
  },
  wa_dorado_needle_east_ridge: {
    from: [[48.53755, -121.13436], [48.5136, -121.1964], [48.54972, -121.13861]],
    to: [[48.49261, -121.11761], [48.53755, -121.13436], [48.54972, -121.13861]],
  },
  wa_klawatti_peak_sw_buttress: {
    from: [[48.533, -121.129], [48.5529, -121.1062], [48.5136, -121.1964], [48.55444, -121.10444]],
    to: [[48.49261, -121.11761], [48.533, -121.129], [48.5529, -121.1062], [48.55444, -121.10444]],
  },
};

const ids = [...new Set([...EDITS.map((e) => e.route), ...Object.keys(SKETCH)])];
const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${ids.join(",")})&select=id,waypoints,gpx`;
const res = await fetch(url, { headers: headers(KEY) });
if (!res.ok) { console.error(`read failed: ${res.status}`); process.exit(1); }
const rows = await res.json();
if (rows.length !== ids.length) { console.error(`read ${rows.length} of ${ids.length} rows — refusing`); process.exit(1); }
const before = new Map(rows.map((r) => [r.id, r]));
const live = new Map(rows.map((r) => [r.id, r.waypoints.map((w) => ({ ...w }))]));
const gpxOut = new Map();

const refusals = [];
for (const e of EDITS) {
  const hits = live.get(e.route).filter((p) => sig(p) === e.pin);
  if (hits.length !== 1) { refusals.push(`${e.route}: ${hits.length} live pin(s) match ${e.pin}`); continue; }
  const p = hits[0];
  if (!near(p.lat, e.from.lat) || !near(p.lng, e.from.lng)) { refusals.push(`${e.route}: ${e.pin} is at ${p.lat},${p.lng}, expected ${e.from.lat},${e.from.lng}`); continue; }
  p.lat = null; p.lng = null;
}
for (const r of rows) {
  const sk = SKETCH[r.id];
  const isSketch = Array.isArray(r.gpx) && r.gpx.length > 0 && trackIsJustTheWaypoints(r.gpx, r.waypoints);
  if (!sk) {
    // Clearing a pin under a line drawn through the pins would strand a vertex.
    if (isSketch) refusals.push(`${r.id}: its line is a waypoint sketch and no sketch edit is planned`);
    continue;
  }
  if (JSON.stringify(r.gpx) !== JSON.stringify(sk.from)) { refusals.push(`${r.id}: live line ${JSON.stringify(r.gpx)} is not the expected sketch`); continue; }
  if (!isSketch || !trackIsJustTheWaypoints(sk.to, live.get(r.id))) refusals.push(`${r.id}: the sketch-line caption would change`);
  gpxOut.set(r.id, sk.to);
}
if (refusals.length) { console.error(`REFUSED — ${refusals.length}:\n  ` + refusals.join("\n  ") + "\nNothing was written."); process.exit(1); }

const show = (l) => l.map((p) => `${sig(p)}${p.lat == null ? " (no coord)" : ` @${p.lat},${p.lng}`}`).join("\n          ");
for (const id of ids) {
  console.log(`\n### ${id}\n   was: ${show(before.get(id).waypoints)}\n   now: ${show(live.get(id))}`);
  if (gpxOut.has(id)) console.log(`   line was: ${JSON.stringify(before.get(id).gpx)}\n   line now: ${JSON.stringify(gpxOut.get(id))}`);
}
console.log(`\n${EDITS.length} pin edit(s), ${gpxOut.size} line edit(s) on ${ids.length} route(s).`);

if (!existsSync(SNAP)) {
  mkdirSync(dirname(SNAP), { recursive: true });
  writeFileSync(SNAP, JSON.stringify({ takenAt: new Date().toISOString(), rows: rows.map((r) => ({ id: r.id, waypoints: r.waypoints, gpx: gpxOut.has(r.id) ? r.gpx : undefined })) }, null, 1) + "\n");
  console.log(`snapshot written: ${SNAP}`);
}
if (!APPLY) { console.log("DRY RUN — pass --apply to write."); process.exit(0); }

for (const id of ids) await patchRow("routes", id, gpxOut.has(id) ? { waypoints: live.get(id), gpx: gpxOut.get(id) } : { waypoints: live.get(id) });
// jsonb returns an object's keys in its own order, so compare key-sorted (batch 9's lesson).
const canon = (x) => JSON.stringify(x, (k, val) => val && typeof val === "object" && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a < b ? -1 : 1)) : val);
const v = await (await fetch(url, { headers: headers(KEY) })).json();
let bad = 0;
for (const r of v) {
  if (canon(r.waypoints) !== canon(live.get(r.id))) { console.error(`NOT APPLIED (waypoints): ${r.id}`); bad++; }
  if (gpxOut.has(r.id) && canon(r.gpx) !== canon(gpxOut.get(r.id))) { console.error(`NOT APPLIED (gpx): ${r.id}`); bad++; }
}
console.log(bad ? `VERIFY FAILED: ${bad}` : `verified: ${ids.length} row(s) re-read and match.`);
process.exit(bad ? 1 : 0);
