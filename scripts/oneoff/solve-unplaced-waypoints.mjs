#!/usr/bin/env node
// Find coordinates for waypoints that have NONE — and refuse the ones nothing can locate.
//
// These 39 pins render as "No coordinate on file — this point is not on the map above" and are
// deliberately not tappable (check:waypoint-placement). A coordinate would put them on the map.
//
// THE CORROBORATION THIS REPO NORMALLY USES IS UNAVAILABLE HERE, and that shapes everything:
// verify-researched-pin-coords.mjs writes a researched pin only when it lands on the route's own
// gpx track. NONE of the 16 routes carrying an unplaced pin has a track — measured, 0 of 16 — and
// that is not a coincidence: a route whose pins were placed by an enrichment pass got a track from
// the same pass. So the gate is rebuilt from three records that ARE available:
//
//   1. GNIS supplies the coordinate.                     (federal gazetteer)
//   2. The USGS DEM supplies the ground under it.        (a record nobody consulted when publishing)
//   3. The row itself states the waypoint's elevation.   (written by a different pass)
//
// Three sources, no two sharing an input. The control: "Headlee Pass" resolves to 48.00706,
// -121.49763 where the DEM reads 4,678 ft against the row's stated 4,720 ft — 42 ft apart.
//
// A NAME MATCH IS NOT AN IDENTITY MATCH. That is this catalog's most expensive recorded lesson and
// every refusal below is one of its forms.
import { selectAll, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";
import { gnis } from "./probe-gnis-reachable.mjs";

const APPLY = process.argv.includes("--apply");
const M_PER_FT = 0.3048;

const placed = (w) => {
  if (!w) return false;
  const { lat: la, lng: ln } = w;
  if (la == null || ln == null || la === "" || ln === "") return false;
  return Number.isFinite(Number(la)) && Number.isFinite(Number(ln));
};
const dist = (a, b) => {
  const R = 6371000, t = Math.PI / 180;
  const dla = (b.lat - a.lat) * t, dln = (b.lng - a.lng) * t;
  const h = Math.sin(dla / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dln / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// A LABEL POINT CANNOT LOCATE AN EDGE. GNIS publishes one coordinate per feature; for a Gap or a
// Summit that coordinate IS the place, for a Stream or a Ridge it hangs at an arbitrary point along
// the length. Layer 6 is literally named "Streams (Mouth)" — where a creek ENDS, the one point on
// it a route never crosses.
const POINT_CLASSES = new Set(["Gap", "Summit", "Lake", "Pit", "Crater", "Spring", "Falls", "Well", "Bench"]);

// The pin names a STRUCTURE the feature's name does not — a junction, a crossing, a bend. The pin
// is a different kind of thing standing NEAR that feature, so borrowing its coordinate is wrong by
// however far the two are apart. Chasing prepositions catches one of four; test the OBJECT.
const STRUCTURE = /\bjunction\b|\bcrossing\b|\bcontour\b|\bbend\b|\bswitchback\b|\btrail\b|\bfork\b|\bcamp\b|\bheadwaters\b/i;

// The distinctive proper noun(s) a name is ABOUT. One distinctive token is not an identity —
// Whatcom Pass and Whatcom Camp are two places sharing a proper noun — so the feature TYPE words
// are kept out of the comparison and matched separately by class.
const GENERIC = new Set(["the", "of", "and", "at", "to", "near", "below", "above", "upper", "lower",
  "north", "south", "east", "west", "northwest", "northeast", "southwest", "southeast", "mt", "mount",
  "pass", "col", "saddle", "gap", "notch", "summit", "lake", "camp", "basin", "creek", "ridge",
  "peak", "point", "ft", "trailhead", "junction", "crossing", "high", "old", "new"]);
const nouns = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/)
  .filter((w) => w.length > 2 && !GENERIC.has(w) && !/^\d+$/.test(w)));

const ELEV_TOL_FT = 300;   // 96% of this catalog's 427 repaired pins sit within 400 ft of the DEM.
const MAX_KM = 15;         // A pin on the route; beyond this it is a namesake somewhere else.

const rows = await selectAll("routes", "id,name,area_id,waypoints", "waypoints.not.is.null", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about data this never saw."); process.exit(1); }
const touched = rows.filter((r) => (Array.isArray(r.waypoints) ? r.waypoints : []).some((w) => !placed(w)));
const areas = await selectAll("areas", "id,name,lat,lng", `id=in.(${[...new Set(touched.map((r) => r.area_id))].join(",")})`, { pageSize: 500 });
const areaById = new Map(areas.map((a) => [a.id, a]));

const applicable = [], refused = [];
for (const r of touched) {
  const area = areaById.get(r.area_id);
  if (!area || area.lat == null) { for (const w of r.waypoints.filter((x) => !placed(x))) refused.push({ r, w, why: "no peak coordinate to bound the search" }); continue; }
  const peak = { lat: Number(area.lat), lng: Number(area.lng) };
  const box = [peak.lng - 0.3, peak.lat - 0.3, peak.lng + 0.3, peak.lat + 0.3];

  for (const w of r.waypoints.filter((x) => !placed(x))) {
    const nm = String(w.name ?? "").trim();
    const want = nouns(nm);
    if (!want.size) { refused.push({ r, w, why: "no distinctive proper noun to search on" }); continue; }
    if (STRUCTURE.test(nm)) { refused.push({ r, w, why: `names a STRUCTURE (${nm.match(STRUCTURE)[0]}) — a different kind of thing standing near a named feature` }); continue; }

    let hits = [];
    for (const term of [...want]) {
      try { hits = hits.concat(await gnis(term, box)); } catch (e) { refused.push({ r, w, why: `GNIS error: ${String(e.message).slice(0, 60)}` }); hits = null; break; }
      await new Promise((s) => setTimeout(s, 250));
    }
    if (hits === null) continue;
    if (!hits.length) { refused.push({ r, w, why: "no GNIS feature of that name near the peak — a climbers' name, not a federal one" }); continue; }

    // Identity, not overlap: every distinctive noun the pin names must appear in the feature name.
    const named = hits.filter((h) => { const have = nouns(h.name); return [...want].every((k) => have.has(k)); });
    if (!named.length) { refused.push({ r, w, why: `GNIS has ${hits.map((h) => h.name).slice(0, 3).join(" / ")} — a shared word, not the same place` }); continue; }
    const pointy = named.filter((h) => POINT_CLASSES.has(h.cls));
    if (!pointy.length) { refused.push({ r, w, why: `only LINEAR/AREAL matches (${named.map((h) => `${h.name} [${h.cls}]`).slice(0, 2).join(", ")}) — a label point cannot locate an edge` }); continue; }

    const scored = [];
    for (const h of pointy) {
      const km = dist(peak, h) / 1000;
      if (km > MAX_KM) continue;
      const dem = await elevationAt(h.lat, h.lng);
      scored.push({ ...h, km, dem });
    }
    if (!scored.length) { refused.push({ r, w, why: `nearest match is over ${MAX_KM} km from the peak — a namesake elsewhere` }); continue; }

    const stated = w.elev != null ? Number(w.elev) : (w.elevM != null ? Number(w.elevM) / M_PER_FT : null);
    if (stated == null) { refused.push({ r, w, why: `found ${scored[0].name} but the row states NO elevation, so nothing independent can check it`, cand: scored[0] }); continue; }
    const agreeing = scored.filter((h) => h.dem != null && Math.abs(h.dem - stated) <= ELEV_TOL_FT);
    if (!agreeing.length) {
      const best = scored[0];
      refused.push({ r, w, why: `DEM disagrees — ${best.name} sits at ${best.dem == null ? "?" : Math.round(best.dem)} ft, the row states ${Math.round(stated)} ft`, cand: best });
      continue;
    }
    if (agreeing.length > 1) { refused.push({ r, w, why: `${agreeing.length} features agree — one number here would be a silent pick` }); continue; }
    applicable.push({ r, w, cand: agreeing[0], stated });
  }
}

console.log(`${touched.length} route(s) carry an unplaced pin.\n`);
console.log(`APPLICABLE — ${applicable.length}:\n`);
for (const a of applicable) {
  console.log(`  ${a.r.id}  "${a.w.name}"`);
  console.log(`     GNIS ${a.cand.name} [${a.cand.cls}]  ${a.cand.lat.toFixed(5)},${a.cand.lng.toFixed(5)}  ${a.cand.km.toFixed(1)} km from the peak`);
  console.log(`     DEM ${Math.round(a.cand.dem)} ft vs the row's ${Math.round(a.stated)} ft  (${Math.round(Math.abs(a.cand.dem - a.stated))} ft apart)\n`);
}
console.log(`\nREFUSED — ${refused.length}. These are the RESULT, not a backlog:\n`);
const byWhy = new Map();
for (const x of refused) {
  const k = x.why.replace(/—.*/, "").replace(/\(.*?\)/, "").trim();
  if (!byWhy.has(k)) byWhy.set(k, []);
  byWhy.get(k).push(x);
}
for (const [k, v] of [...byWhy.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${v.length}  ${k}`);
  for (const x of v) console.log(`       ${x.r.id}  "${x.w.name}"${x.why.length > k.length ? `\n           ${x.why}` : ""}`);
  console.log("");
}

if (!APPLY) { console.log(`\n(dry run — pass --apply to write ${applicable.length} coordinate(s))`); process.exit(0); }
if (!applicable.length) { console.log("nothing to write."); process.exit(0); }
requireServiceKey();
for (const a of applicable) {
  const next = a.r.waypoints.map((w) => (w === a.w ? { ...w, lat: a.cand.lat, lng: a.cand.lng } : w));
  await patchRow("routes", a.r.id, { waypoints: next });
  console.log(`wrote ${a.r.id} "${a.w.name}" -> ${a.cand.lat.toFixed(5)},${a.cand.lng.toFixed(5)}`);
}
