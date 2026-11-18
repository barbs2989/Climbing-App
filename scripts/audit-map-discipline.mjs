// Does a PEAK climb's map read as a peak climb? (owner, 2026-11-18)
//
// "Why does route track on golden horn peak look like a sport or bouldering route? There are also
// not any waypoints ... waypoints and things on the map need to be consistent per discipline."
//
// Golden Horn's Northeast Arete (III 5.8, alpine) had no pins and no track, so its map drew ONE dot --
// exactly what a bare crag or boulder draws -- while the Southwest Route beside it drew Trailhead and
// Summit with a legend. GPXMap now draws the empty map by DISCIPLINE (a Summit on a peak, a Crag
// elsewhere, plus the trailhead a peak route records in approach_logistics), but that only reaches
// the TRAILHEAD when the route records one. This audit is the worklist for the rest.
//
// WHY A NEW AUDIT: audit:map-pins reads `waypoints=not.is.null`, so a route with NO pins is not a
// finding there, it is not a row -- the exact class this is about. This one starts from every route
// on a PEAK area, whatever it stores.
//
// What each peak route's map shows, classified the way GPXMap decides it:
//   TRAILHEAD_AND_SUMMIT  a Trailhead (pin or approach_logistics coordinate) and a Summit/Topout pin,
//                         or no pins at all and the area's coordinate drawn as the Summit
//   SUMMIT_ONLY           the map has a summit and NO trailhead: the crag-looking map. The finding.
//   NO_SUMMIT             pins, but none is a Summit/Topout: the peak is not on the map at all
// SUMMIT_ONLY rows say whether a SIBLING on the same peak pins a trailhead -- the cheap fix, but only
// when the route's own text names that same trailhead (2026-11-18: 12 of 28 text matches were
// accepted; the rest named a different trailhead, e.g. Lower vs Upper Goodell Creek). Never copy one
// blind: a peak's routes often start from different roads.
//
// Read-only, public key. Fails closed on an empty read: zero routes would make every map look right.
//   npm run audit:map-discipline [-- --state wa] [--json] [--limit 40]
import { selectAll, stateIdFilter } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? d) : d; };
const STATE = String(arg("--state", "all")).toLowerCase();
const LIMIT = Number(arg("--limit", 40));
const JSON_OUT = argv.includes("--json");

// Disciplines whose map should read trailhead-to-summit. `trad` on a peak is alpine (core catOf).
const PEAK_DISCS = new Set(["alpine", "mountaineering", "scrambling", "trad", "walk-up"]);

const J = (v) => { if (typeof v === "string") { try { return JSON.parse(v); } catch { return null; } } return v; };
const placed = (w) => !!w && w.lat != null && w.lng != null && Number.isFinite(Number(w.lat)) && Number.isFinite(Number(w.lng));
const isType = (w, re) => re.test(String((w && w.type) || ""));

// AREAS FIRST, then routes by area_id. A routes⋈areas inner join filtered on area_type answered HTTP
// 500 (statement timeout) twice on 2026-11-18 -- it walks the 205k-row routes table -- while ~1,000
// peak areas and an indexed area_id=in.(...) read answer in a second.
const peaks = await selectAll("areas", "id,lat,lng", ["area_type=eq.peak", STATE === "all" ? "" : stateIdFilter(STATE)].filter(Boolean).join("&"), { pageSize: 1000 });
if (!peaks.length) { console.error("audit:map-discipline: read ZERO peak areas -- refusing to report a clean catalog."); process.exit(1); }
const peakAt = new Map(peaks.map((a) => [a.id, a]));
const rows = [];
for (let i = 0; i < peaks.length; i += 60) {
  const ids = peaks.slice(i, i + 60).map((a) => `"${a.id}"`).join(",");
  for (const r of await selectAll("routes", "id,name,area_id,discipline,waypoints,approach_logistics", `area_id=in.(${ids})`, { pageSize: 1000 })) rows.push({ ...r, areas: peakAt.get(r.area_id) });
}
if (!rows.length) { console.error("audit:map-discipline: read ZERO routes on peak areas -- refusing to report a clean catalog."); process.exit(1); }

const byArea = new Map();
for (const r of rows) { if (!byArea.has(r.area_id)) byArea.set(r.area_id, []); byArea.get(r.area_id).push(r); }
const pinsOf = (r) => { const w = J(r.waypoints); return Array.isArray(w) ? w.filter(placed) : []; };
const thPin = (r) => pinsOf(r).find((w) => isType(w, /trailhead/i)) || null;

const counts = {}, findings = [];
for (const r of rows) {
  if (!PEAK_DISCS.has(r.discipline)) continue;
  const pins = pinsOf(r);
  const al = J(r.approach_logistics) || {};
  const hasTh = !!thPin(r) || placed({ lat: al.trailheadLat, lng: al.trailheadLng });
  const hasSummit = pins.length ? pins.some((w) => isType(w, /summit|topout/i)) : r.areas && r.areas.lat != null;
  const verdict = !hasSummit ? "NO_SUMMIT" : hasTh ? "TRAILHEAD_AND_SUMMIT" : "SUMMIT_ONLY";
  counts[r.discipline] = counts[r.discipline] || { TRAILHEAD_AND_SUMMIT: 0, SUMMIT_ONLY: 0, NO_SUMMIT: 0 };
  counts[r.discipline][verdict]++;
  if (verdict === "TRAILHEAD_AND_SUMMIT") continue;
  const sib = verdict === "SUMMIT_ONLY" ? (byArea.get(r.area_id) || []).find((s) => s.id !== r.id && thPin(s)) : null;
  findings.push({ id: r.id, name: r.name, discipline: r.discipline, verdict, pins: pins.length, siblingTrailhead: sib ? { route: sib.id, name: thPin(sib).name || null } : null });
}

if (JSON_OUT) { console.log(JSON.stringify({ state: STATE, read: rows.length, counts, findings }, null, 1)); process.exit(0); }
console.log(`audit:map-discipline -- ${rows.length} routes on peak areas (${STATE})\n`);
console.table(counts);
for (const v of ["SUMMIT_ONLY", "NO_SUMMIT"]) {
  const f = findings.filter((x) => x.verdict === v);
  const withSib = f.filter((x) => x.siblingTrailhead).length;
  console.log(`\n${v}: ${f.length}${v === "SUMMIT_ONLY" ? ` (${withSib} have a sibling on the same peak that pins a trailhead -- read the route's own approach before reusing it)` : ""}`);
  f.slice(0, LIMIT).forEach((x) => console.log(`  ${x.id}  [${x.discipline}, ${x.pins} pins]${x.siblingTrailhead ? `  sibling: ${x.siblingTrailhead.route} -> ${x.siblingTrailhead.name}` : ""}`));
  if (f.length > LIMIT) console.log(`  ... ${f.length - LIMIT} more (--limit N, or --json)`);
}
