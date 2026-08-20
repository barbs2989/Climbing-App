// Does the shared `trailheadPoint()` send the Directions button to the SAME place the two inline
// expressions it replaced did?
//
// Both button sites carried a byte-identical copy of the same precedence, and the map carried none
// of it -- which is how the button came to drive climbers to a point the map never drew. Folding
// them into one function is the fix, but "I reformatted it and it looks the same" is not evidence
// when the thing being changed is where a climber drives to. So: run BOTH over the live catalog and
// require identical output on every route.
//
// The reference here is a VERBATIM copy of the pre-change expression, which is correct in this one
// case -- the original is gone, so a copy of it is the only second opinion available. The function
// under test is EXTRACTED from the real source rather than copied, because a copy of that would
// agree with itself no matter what the app does. See a-probe-that-copies-its-subject-measures-a-fossil.
import fs from "fs";
import { selectAll } from "../lib/supabase-env.mjs";

const SRC = new URL("../../ClimbMatchCore.jsx", import.meta.url).pathname;
const src = fs.readFileSync(SRC, "utf8");

// --- extract the real functions, with ANCHOR LOST rather than a silent fallback ----------------
function lift(name, anchor) {
  const i = src.indexOf(anchor);
  if (i < 0) { console.log(`ANCHOR LOST: ${name} — "${anchor}" is not in ClimbMatchCore.jsx.`); process.exit(1); }
  let d = 0, started = false, j = i;
  for (; j < src.length; j++) {
    if (src[j] === "{") { d++; started = true; }
    else if (src[j] === "}") { d--; if (started && d === 0) { j++; break; } }
  }
  return src.slice(i, j);
}
const WP_TYPE_MAP = lift("WP_TYPE_MAP", "const WP_TYPE_MAP=");
const wpTypeSrc = lift("wpType", "function wpType(");
const wpIsSrc = lift("wpIs", "function wpIs(");
const thSrc = lift("trailheadPoint", "function trailheadPoint(");
const mod = `${WP_TYPE_MAP}\n${wpTypeSrc}\n${wpIsSrc}\n${thSrc}\nexport {trailheadPoint,wpIs};`;
const tmp = new URL("./.trailhead-lift.mjs", import.meta.url).pathname;
fs.writeFileSync(tmp, mod);
let trailheadPoint, wpIs;
try { ({ trailheadPoint, wpIs } = await import(tmp + "?v=" + src.length)); }
finally { try { fs.unlinkSync(tmp); } catch {} }

// --- the pre-change expression, verbatim -------------------------------------------------------
function oldTh(route) {
  const _al = route.approachLogistics || {};
  const th = (route.waypoints || []).find(w => wpIs(w, "Trailhead") && w.lat != null && w.lng != null)
    || ((_al.trailheadLat != null && _al.trailheadLng != null) ? { lat: _al.trailheadLat, lng: _al.trailheadLng } : null)
    || (route.waypoints || []).find(w => w && w.lat != null && /trailhead|parking|\bth\b/i.test(String(w.name || w.label || "")));
  if (!th || th.lat == null) return null;                       // the button's own guard
  return { lat: th.lat, lng: th.lng };
}

// --- the catalog -------------------------------------------------------------------------------
const rows = await selectAll("routes", "id,area_id,waypoints,approach_logistics,gpx", "", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL-CLOSED: empty read — this proves nothing about the catalog."); process.exit(1); }
const areas = new Map((await selectAll("areas", "id,path", "", { pageSize: 1000 })).map(a => [a.id, a]));
const inWa = r => { const a = areas.get(r.area_id); return a && String(a.path || "").split(".").includes("washington"); };

let compared = 0, differ = 0, derived = 0, derivedWithMap = 0, derivedNoMap = 0;
const diffs = [], drawn = [];
for (const r of rows) {
  if (!inWa(r)) continue;
  // dbRouteToCamel spreads the row and adds camelCase aliases; mimic the two keys these read.
  const route = { waypoints: Array.isArray(r.waypoints) ? r.waypoints : [], approachLogistics: r.approach_logistics || null };
  compared++;
  const a = oldTh(route), b = trailheadPoint(route);
  const norm = x => x ? `${Number(x.lat)},${Number(x.lng)}` : "null";
  if (norm(a) !== norm(b)) { differ++; if (diffs.length < 12) diffs.push(`${r.id}: was ${norm(a)}, now ${norm(b)}`); }
  if (b && b.derived) {
    derived++;
    const placed = route.waypoints.filter(w => w && w.lat != null).length;
    const track = Array.isArray(r.gpx) && r.gpx.length > 1;
    if (placed || track) { derivedWithMap++; if (drawn.length < 20) drawn.push(`${r.id} (${placed} placed pin(s)${track ? ", track" : ""}) → ${norm(b)}  ${b.name}`); }
    else derivedNoMap++;
  }
}

console.log(`WA routes compared : ${compared}`);
console.log(`  the button's destination CHANGED on : ${differ}`);
for (const d of diffs) console.log(`    ${d}`);
console.log(`\n  routes whose trailhead is DERIVED (approach_logistics only) : ${derived}`);
console.log(`    …and the map has other content, so the marker DRAWS : ${derivedWithMap}`);
console.log(`    …and no map renders at all, so nothing is drawn or missing : ${derivedNoMap}`);
for (const d of drawn) console.log(`    ${d}`);

if (differ) { console.log(`\nFAILED — the refactor moved where ${differ} route(s) send a climber.`); process.exit(1); }
if (!derivedWithMap) { console.log(`\nFAILED — no route would draw the new marker, so this change is unobservable.`); process.exit(1); }
console.log(`\nok — the shared helper is behaviour-identical for the buttons, and ${derivedWithMap} route(s) gain the derived marker.`);
