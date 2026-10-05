// Waypoint batch 8 (2026-10-01): the routes batch 7 left, plus a class no audit measured.
//
// HOW THE CANDIDATES WERE FOUND. For every WA route the app cannot sort (orderWaypoints declines,
// so the STORED order is what renders) with 4+ placed pins, ask: does moving ONE pin to its best
// slot cut the drawn line by more than a quarter and more than 1 km? 157 routes were tested and
// 13 flagged. Read one by one, a flag almost never meant "wrong order":
//   * where the suggested move is the TRAILHEAD, a winding trail is beating straight-line geometry
//     (Colfax Cosley-Houston, Sherman, South Early Winter, Whistler, Mt Baker side) — NOT defects;
//   * Buck Mountain is real geography: the trail passes Buck Creek Pass, then doubles back south;
//   * four were a WRONG COORDINATE — the order was right and one pin was somewhere else;
//   * two were a descent pin listed before the summit, which the route's OWN descent prose names.
// A shortest path is not a walking order, so this measurement chose what to READ, never an edit.
//
// FOUR OPERATIONS. Nothing here writes a coordinate somebody had to supply.
//   clear  — lat/lng to null, only on TWO independent records: the USGS 3DEP ground (the same
//            box verdict as audit:waypoint-elevations --ground) and/or GEOMETRY — a pin cannot be
//            farther in a straight line from the trailhead than the trail distance it states.
//   move   — permutation of one pin, by TYPE|NAME, to a stated slot.
//   copy   — insert a pin COPIED VERBATIM from a sibling route that stores the same place, refused
//            unless the sibling's pin still matches. (Meany's Whiskey Bend — see below.)
//
// Snapshot: audits/waypoint-order-batch8/rollback-before-batch8.json. Refuses if any live row has
// moved; all-or-nothing; re-reads after writing.
//
//   node scripts/oneoff/fix-waypoint-order-batch8.mjs          # dry run
//   node scripts/oneoff/fix-waypoint-order-batch8.mjs --apply
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const sig = (w) => `${(w && w.type) || "?"}|${((w && w.name) || "").trim()}`;

const EDITS = [
  // ---- Claywood: Cameron Pass and Grand Pass are both ~1,100 ft BELOW what they claim, and the
  //      ground box attributes it (gaps 700 / 622 ft past slop, relief 299 / 417). Cameron Pass is
  //      also 6 mi in a straight line from Grand Pass with 1.65 trail miles between them.
  { route: "wa_mount_claywood_standard", op: "clear", pin: "Hazard|Cameron Pass", lat: 47.9485, lng: -123.2591,
    why: "ground 5,382 vs claimed 6,448 (box gap 700 ft); 6 mi straight-line from Grand Pass vs 1.65 mi of trail" },
  { route: "wa_mount_claywood_standard", op: "clear", pin: "Junction|Grand Pass", lat: 47.8793929, lng: -123.3577144,
    why: "ground 5,386 vs claimed 6,488 (box gap 622 ft) — a pass reading 1,100 ft low is in a valley" },

  // ---- Tailgunner: the creek crossing "a quarter mile past the trailhead" (distMi 0.3) sits 1.2 mi
  //      from the trailhead in a straight line, on ground reading 5,519 ft against its own 2,400 —
  //      up by Tailgunner Pass. (The box calls the terrain too rough to ATTRIBUTE; geometry decides.)
  { route: "wa_tailgunner_peak_w_route", op: "clear", pin: "Junction|Barclay Creek crossing / leave trail", lat: 47.809636, lng: -121.452545,
    why: "1.2 mi straight-line from the trailhead vs 0.3 mi stated; ground 5,519 vs claimed 2,400" },

  // ---- Colfax Polish: the Hogsback junction at 2 trail miles is 5.5 mi from the trailhead in a
  //      straight line, south of Colfax itself, and 4 mi from the camp listed one mile after it.
  { route: "wa_colfax_peak_polish_route", op: "clear", pin: "Junction|Climbers' Trail / Hogsback Ridge junction", lat: 48.731607, lng: -121.838836,
    why: "5.5 mi straight-line from the trailhead vs 2 mi stated; 4 mi from Hogsback Camp vs 1 mi" },

  // ---- Lichtenberg West Rib: the descent_text descends "toward the basin holding Lichtenwasser
  //      Lake at 4,708 ft" — the pin's own name says "(Northeast Slope descent basin)". After the summit.
  { route: "wa_lichtenberg_mountain_west_face_west_rib", op: "move",
    pin: "Junction|Lichtenwasser Lake (Northeast Slope descent basin)", to: "end",
    why: "descent_text descends via Lichtenwasser Lake" },

  // ---- Boston SE Face: approach is Boston Basin; descent_text ends "descend Sahale Arm and the
  //      Cascade Pass Trail back to the trailhead". The Cascade Pass pin (ground-confirmed in batch 7
  //      on Le Conte, same coordinate) is the way DOWN. After the summit.
  { route: "wa_boston_peak_southeast_face", op: "move", pin: "Junction|Cascade Pass", to: "end",
    why: "descent_text descends the Cascade Pass Trail" },

  // ---- Mount Meany: every walk-in pin is the Elwha from Whiskey Bend (Hayes River at 16.1 mi is
  //      the Whiskey Bend figure), and the approach prose names Whiskey Bend FIRST ("Most parties
  //      approach via the Elwha River Trail from Whiskey Bend"). The only trailhead pin was the
  //      ALTERNATIVE, North Fork Quinault, stored second-to-last. Whiskey Bend is copied verbatim
  //      from wa_mount_wilder_scramble, which shares Meany's Hayes River pin (ground 1,150 ft at it).
  //      North Fork Quinault is KEPT — the prose offers it — and moved after the summit, so the
  //      sketch line no longer runs 20 km south mid-walk. approach_logistics is left naming
  //      Quinault: trailheadPoint() already handles a pin and a logistics record >1 km apart as two
  //      genuine approaches (the card's title follows the pin).
  { route: "wa_mount_meany_standard", op: "copy", from: "wa_mount_wilder_scramble", pin: "Trailhead|Whiskey Bend Trailhead",
    lat: 47.968, lng: -123.583, to: 0, why: "the approach the route's pins walk and its prose names first" },
  { route: "wa_mount_meany_standard", op: "move", pin: "Trailhead|North Fork Quinault Trailhead / Ranger Station", to: "end",
    why: "the alternative approach; mid-list it drew a 20 km detour before the summit" },
];

const ids = [...new Set(EDITS.flatMap((e) => [e.route, e.from].filter(Boolean)))];
const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${ids.join(",")})&select=id,waypoints`;
const res = await fetch(url, { headers: headers(KEY) });
if (!res.ok) { console.error(`read failed: ${res.status}`); process.exit(1); }
const rows = await res.json();
if (rows.length !== ids.length) { console.error(`read ${rows.length} of ${ids.length} rows — refusing`); process.exit(1); }
const before = new Map(rows.map((r) => [r.id, r.waypoints]));
const live = new Map(rows.map((r) => [r.id, r.waypoints.map((w) => ({ ...w }))]));

const near = (a, b) => a != null && b != null && Math.abs(Number(a) - b) < 1e-6;
const refusals = [];
const touched = new Set();
for (const e of EDITS) {
  const w = live.get(e.route);
  if (e.op === "copy") {
    const src = (before.get(e.from) || []).filter((p) => sig(p) === e.pin);
    if (src.length !== 1 || !near(src[0].lat, e.lat) || !near(src[0].lng, e.lng)) { refusals.push(`${e.route}: source ${e.from} ${e.pin} not as recorded`); continue; }
    if (w.some((p) => sig(p) === e.pin)) { refusals.push(`${e.route}: already carries ${e.pin}`); continue; }
    w.splice(e.to, 0, { ...src[0] });
    touched.add(e.route);
    continue;
  }
  const hits = w.filter((p) => sig(p) === e.pin);
  if (hits.length !== 1) { refusals.push(`${e.route}: ${hits.length} live pin(s) match ${e.pin}`); continue; }
  const p = hits[0];
  if (e.op === "clear") {
    if (!near(p.lat, e.lat) || !near(p.lng, e.lng)) { refusals.push(`${e.route}: ${e.pin} is at ${p.lat},${p.lng}, expected ${e.lat},${e.lng}`); continue; }
    p.lat = null; p.lng = null;
  } else if (e.op === "move") {
    w.splice(w.indexOf(p), 1);
    if (e.to === "end") w.push(p); else w.splice(e.to, 0, p);
  } else { refusals.push(`${e.route}: unknown op ${e.op}`); continue; }
  touched.add(e.route);
}
if (refusals.length) { console.error(`REFUSED — ${refusals.length}:\n  ` + refusals.join("\n  ") + "\nNothing was written."); process.exit(1); }

const show = (l) => l.map((p) => `${sig(p)}${p.lat == null ? " (no coord)" : ""}`).join("  ->  ");
for (const id of touched) console.log(`\n### ${id}\n   was: ${show(before.get(id))}\n   now: ${show(live.get(id))}`);
console.log(`\n${EDITS.length} edit(s) on ${touched.size} route(s).`);
if (!APPLY) { console.log("DRY RUN — pass --apply to write."); process.exit(0); }

for (const id of touched) await patchRow("routes", id, { waypoints: live.get(id) });
const v = await (await fetch(url, { headers: headers(KEY) })).json();
let bad = 0;
for (const r of v) {
  if (!touched.has(r.id)) continue;
  if (JSON.stringify(r.waypoints) !== JSON.stringify(live.get(r.id))) { console.error(`NOT APPLIED: ${r.id}`); bad++; }
}
console.log(bad ? `VERIFY FAILED: ${bad}` : `verified: ${touched.size} row(s) re-read and match.`);
process.exit(bad ? 1 : 0);
