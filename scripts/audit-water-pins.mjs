// IS EVERY WATER SOURCE A ROUTE NAMES ON ITS MAP?  (audit:water-pins)
//
// Owner note, 2026-10-28: "Audit water waypoints. Make sure we have all of them per route."
//
// The route map draws a blue Water pin for every waypoint whose type maps to Water (WP_TYPE_MAP:
// water / lake / lake/basin). "All of them" is read as: every water source the route's OWN record
// names — its approach and itinerary prose, its camps' `water` notes, its other pins' notes — is a
// pin on the map. It does NOT mean inventing pins for water nobody named: a coordinate for "last
// water below the col" would be manufactured (fabricated-waypoint-pins). What a source is, is
// decided by scripts/lib/water-sources.mjs, shared with the solver (scripts/oneoff/add-water-pins.mjs).
//
// Classes, per route that has waypoints (no waypoints = no map to put a pin on):
//   MISSING            a named source with no pin of any type carrying its name.
//   AT ANOTHER PIN     a named source whose place is already a pin of another type (a camp "Lake
//                      Ann camp", a junction "Fisher Creek crossing"). Not a defect: a second pin
//                      30 m away would draw two markers for one place.
//   NO COORDINATE      a Water pin with no lat/lng — listed under WAYPOINTS, not drawn on the map.
//   OFF THE TRACK      a Water pin more than 500 m from the route's RECORDED track (the tolerance
//                      audit:waypoints and audit:camp-pins use for "on the route").
//   UNNAMED ONLY       the record promises water ("snowmelt at camp", "last water at the col") but
//                      names no place. Counted, never pinned.
//   NO WATER STATED    an alpine / mountaineering / scrambling route with waypoints whose record
//                      neither pins nor mentions water. The denominator line, not a defect list.
//
// Read-only. Fails closed on an empty read.
//   npm run audit:water-pins                          live (anon key, small primary-key windows)
//   npm run audit:water-pins -- --from routes.json    a saved dump (~/dev/water-pins-run/dump.mjs)
//   npm run audit:water-pins -- --verbose --json out.json
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
import fs from "fs";
import { SUPABASE_URL, anonKey, headers } from "./lib/supabase-env.mjs";
import { recordedTrackPts, pointOf } from "../lib/track.js";
import { distanceToTrackM, trackLine } from "./lib/track-geometry.mjs";
import { waterSourcesOf, pinFor } from "./lib/water-sources.mjs";

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const VERBOSE = argv.includes("--verbose");
const JSON_OUT = arg("--json");
const FROM = arg("--from");
const WP_TOL = 500;
const COLS = "id,name,area_id,discipline,waypoints,bivy,approach,approach_variants,approach_logistics,description,overview,descent_text,itinerary,gpx";

async function q(p) {
  for (let t = 0; t < 4; t++) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: headers(anonKey()), signal: AbortSignal.timeout(60000) });
      if (r.ok) return r.json();
    } catch { /* backed off below */ }
    await new Promise((res) => setTimeout(res, 30000 * (t + 1)));
  }
  console.log(`FAIL: read failed (${p.slice(0, 80)}) — this is NOT "every water source is pinned".`);
  process.exit(1);
}
// A filtered scan of 316k rows times out on a busy database (2026-10-28), so: every id by primary
// key, then which of each 2,000-id window carry waypoints, then the columns 30 rows at a time.
async function readLive() {
  const all = [];
  for (let last = ""; ;) {
    const rows = await q(`routes?select=id&order=id&limit=2000${last ? `&id=gt.${encodeURIComponent(last)}` : ""}`);
    if (!rows.length) break;
    all.push(...rows.map((r) => r.id)); last = rows[rows.length - 1].id;
  }
  const ids = [];
  for (let i = 0; i < all.length; i += 2000) {
    const lo = all[i], hi = all[Math.min(i + 2000, all.length) - 1];
    ids.push(...(await q(`routes?select=id&waypoints=not.is.null&id=gte.${encodeURIComponent(lo)}&id=lte.${encodeURIComponent(hi)}`)).map((r) => r.id));
  }
  const out = [];
  for (let i = 0; i < ids.length; i += 30) {
    const chunk = ids.slice(i, i + 30).map((x) => `"${x}"`).join(",");
    out.push(...await q(`routes?select=${COLS}&id=in.(${encodeURIComponent(chunk)})`));
  }
  if (out.length !== ids.length) { console.log(`FAIL: matched ${ids.length} routes but read ${out.length}`); process.exit(1); }
  return out;
}

const routes = (FROM ? JSON.parse(fs.readFileSync(FROM, "utf8")) : await readLive())
  .filter((r) => Array.isArray(r.waypoints) && r.waypoints.length);
if (!routes.length) { console.log("FAIL: read no routes with waypoints — an empty audit proves nothing"); process.exit(1); }

const isWaterPin = (w) => w && /^(water|lake|lake\/basin)$/i.test(String(w.type || "").trim());
const WALK_DISC = /alpine|mountaineering|scrambl|snow|glacier/i;

const F = { missing: [], atOther: [], noCoord: [], off: [], unnamedOnly: [], noneStated: [] };
let sources = 0, pinnedWater = 0, waterPins = 0, routesWithWaterPin = 0;
const routesWithMissing = new Set();
for (const r of routes) {
  const pins = r.waypoints.filter(Boolean);
  const wpins = pins.filter(isWaterPin);
  waterPins += wpins.length;
  if (wpins.length) routesWithWaterPin++;
  const rec = recordedTrackPts(r.gpx, pins);
  const track = rec && trackLine(rec).length >= 2 ? rec : null;
  for (const w of wpins) {
    const p = pointOf(w);
    if (!p) { F.noCoord.push({ id: r.id, pin: w.name }); continue; }
    if (track) { const d = distanceToTrackM(p, track); if (d > WP_TOL) F.off.push({ id: r.id, pin: w.name, offM: Math.round(d) }); }
  }
  const { sources: src, unnamed } = waterSourcesOf(r);
  for (const s of src) {
    sources++;
    const pin = pinFor(s, pins);
    const row = { id: r.id, route: r.name, source: s.name, where: s.where, sentence: s.sentence };
    if (!pin) { F.missing.push(row); routesWithMissing.add(r.id); continue; }
    if (isWaterPin(pin)) pinnedWater++;
    else F.atOther.push({ ...row, pin: pin.name, type: pin.type });
  }
  if (!src.length && !wpins.length) {
    if (unnamed) F.unnamedOnly.push({ id: r.id, route: r.name });
    else if (WALK_DISC.test(String(r.discipline || ""))) F.noneStated.push({ id: r.id, route: r.name });
  }
}

const show = (title, list, fmt) => {
  console.log(`\n-- ${title}: ${list.length}`);
  for (const x of (VERBOSE ? list : list.slice(0, 25))) console.log("   " + fmt(x));
  if (!VERBOSE && list.length > 25) console.log(`   ... ${list.length - 25} more (--verbose)`);
};
console.log(`routes with waypoints : ${routes.length}`);
console.log(`  with a Water pin    : ${routesWithWaterPin}  (${waterPins} Water pins)`);
console.log(`named water sources   : ${sources}  (named in the route's own record — lib/water-sources.mjs)`);
console.log(`  pinned as Water     : ${pinnedWater}`);
show("MISSING — a named water source with no pin", F.missing, (x) => `${x.id}  "${x.source}"  [${x.where.join(",")}]`);
show("AT ANOTHER PIN — the place is already a pin of another type (not a defect)", F.atOther, (x) => `${x.id}  "${x.source}" = ${x.type} "${x.pin}"`);
show("NO COORDINATE — a Water pin the map cannot draw", F.noCoord, (x) => `${x.id}  "${x.pin}"`);
show(`OFF THE TRACK — a Water pin more than ${WP_TOL} m from the recorded track`, F.off, (x) => `${x.id}  "${x.pin}"  ${x.offM} m`);
show("UNNAMED ONLY — water promised, no place named (never pinned)", F.unnamedOnly, (x) => `${x.id}`);
show("NO WATER STATED — alpine/scramble route, no water pin or mention (denominator)", F.noneStated, (x) => `${x.id}`);
console.log(`\nroutes with a missing water pin: ${routesWithMissing.size} of ${routes.length}`);
if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ WP_TOL, totals: { routes: routes.length, routesWithWaterPin, waterPins, sources, pinnedWater }, ...F }, null, 1));
