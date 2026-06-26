#!/usr/bin/env node
// validate-catalog.mjs — validate a scraped ClimbMatch catalog before importing.
// Checks: id uniqueness, parentId/mountainId resolution, hierarchy integrity,
// valid areaType/discipline/style, grade parsing, coordinates, and that no
// copyrighted/subjective fields leaked in. Exits non-zero on blocking errors.
//
// Usage: node validate-catalog.mjs [utah_areas.json] [utah_routes.json]
import { readFileSync } from "node:fs";

const [, , areasPath = "utah_areas.json", routesPath = "utah_routes.json"] = process.argv;

const AREA_TYPES = new Set(["world", "country", "state", "range", "region", "canyon", "peak", "crag", "wall"]);
const DISCIPLINES = new Set(["rock", "bouldering", "ice", "mixed", "alpine", "aid", "scrambling", "mountaineering", "hiking"]);
const ROUTE_HOST_TYPES = new Set(["crag", "wall", "peak"]); // routes should hang off these
const KNOWN_ROOTS = new Set(["world", "usa"]);              // parentId may point here even if absent from the file
const BANNED_KEYS = ["desc", "blurb", "beta", "description", "photos", "photo", "topo", "topos",
  "gpxPts", "elevPts", "activity", "stars", "rating", "ratings", "comments", "classic", "communityTracks", "itinerary"];
// Accepts YDS, V-scale, WI, M, Aid (A/C), Class, and a few descriptive grades.
const GRADE_RE = /^(5\.\d{1,2}[a-d]?[+/-]?[a-d]?(\s+[AC]\d)?|V\d{1,2}([+-]|[–-]\d{1,2})?|WI\d[+-]?|M\d{1,2}[+-]?|[AC]\d[+-]?|Class\s*\d\+?|Glacier|Snow|Scramble|Easy 5th)$/;

const errors = [], warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function load(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); }
  catch (e) { err(`Cannot read/parse ${p}: ${e.message}`); return null; }
}

const areas = load(areasPath);
const routes = load(routesPath);
if (areas !== null && !Array.isArray(areas)) err(`${areasPath} is not a JSON array`);
if (routes !== null && !Array.isArray(routes)) err(`${routesPath} is not a JSON array`);

if (Array.isArray(areas) && Array.isArray(routes)) {
  // ---------- areas ----------
  const areaById = new Map();
  for (const [i, a] of areas.entries()) {
    const where = `area[${i}] ${a?.id || a?.name || "?"}`;
    if (!a || typeof a !== "object") { err(`${where}: not an object`); continue; }
    if (!a.id) err(`${where}: missing id`);
    else if (areaById.has(a.id)) err(`duplicate area id "${a.id}"`);
    else areaById.set(a.id, a);
    if (!a.name) warn(`${where}: missing name`);
    if (!AREA_TYPES.has(a.areaType)) err(`${where}: invalid areaType "${a.areaType}"`);
    if (typeof a.lat !== "number" || typeof a.lng !== "number") warn(`${where}: missing/invalid lat/lng`);
    else if (a.lat < -90 || a.lat > 90 || a.lng < -180 || a.lng > 180) err(`${where}: lat/lng out of range`);
    for (const k of BANNED_KEYS) if (k in a) warn(`${where}: contains excluded field "${k}" (omit it)`);
  }
  // parentId resolution + cycle detection
  for (const a of areas) {
    if (!a?.id) continue;
    if (a.parentId && !areaById.has(a.parentId) && !KNOWN_ROOTS.has(a.parentId))
      err(`area "${a.id}": parentId "${a.parentId}" does not resolve`);
    if (a.areaType === "state" && a.parentId && !KNOWN_ROOTS.has(a.parentId) && !areaById.has(a.parentId))
      warn(`area "${a.id}": state parentId "${a.parentId}" not found (expected "usa")`);
    const seen = new Set(); let cur = a, hops = 0;
    while (cur && cur.parentId && hops < 60) {
      if (seen.has(cur.id)) { err(`area "${a.id}": parent cycle at "${cur.id}"`); break; }
      seen.add(cur.id);
      if (KNOWN_ROOTS.has(cur.parentId)) break;
      cur = areaById.get(cur.parentId); hops++;
    }
  }

  // ---------- routes ----------
  const routeIds = new Set();
  for (const [i, r] of routes.entries()) {
    const where = `route[${i}] ${r?.id || r?.name || "?"}`;
    if (!r || typeof r !== "object") { err(`${where}: not an object`); continue; }
    if (!r.id) err(`${where}: missing id`);
    else if (routeIds.has(r.id)) err(`duplicate route id "${r.id}"`);
    else routeIds.add(r.id);
    if (!r.name) err(`${where}: missing name`);
    if (!r.mountainId) err(`${where}: missing mountainId`);
    else if (!areaById.has(r.mountainId)) err(`${where}: mountainId "${r.mountainId}" has no matching area`);
    else if (!ROUTE_HOST_TYPES.has(areaById.get(r.mountainId).areaType))
      warn(`${where}: mountainId "${r.mountainId}" is a ${areaById.get(r.mountainId).areaType}, not a crag/wall/peak`);
    if (!DISCIPLINES.has(r.discipline)) err(`${where}: invalid discipline "${r.discipline}"`);
    if (r.discipline === "rock" && r.style != null && r.style !== "Trad" && r.style !== "Sport")
      err(`${where}: rock style must be "Trad"/"Sport" (got "${r.style}")`);
    if (r.discipline === "rock" && r.style == null)
      warn(`${where}: rock route missing style (Trad/Sport) — trad/sport features won't apply`);
    if (r.discipline !== "rock" && r.style != null)
      warn(`${where}: non-rock route has style "${r.style}" (omit it)`);
    if (typeof r.pitches !== "number") warn(`${where}: pitches not a number`);
    for (const k of ["routeFt", "gainFt", "distKm", "bolts"])
      if (r[k] != null && typeof r[k] !== "number") err(`${where}: ${k} must be a number or null`);
    if (typeof r.grade !== "string" || !r.grade) err(`${where}: missing grade`);
    else if (!GRADE_RE.test(r.grade.trim())) warn(`${where}: grade "${r.grade}" doesn't match a known format`);
    if (r.verified !== false) warn(`${where}: verified should be false`);
    if (r.source !== "community") warn(`${where}: source should be "community"`);
    for (const k of BANNED_KEYS) if (k in r) warn(`${where}: contains excluded field "${k}" (omit it)`);
  }

  // ---------- summary ----------
  const orphanRoutes = routes.filter(r => r?.mountainId && !areaById.has(r.mountainId)).length;
  const noCoord = areas.filter(a => typeof a?.lat !== "number" || typeof a?.lng !== "number").length;
  console.log(`\n— Catalog validation —`);
  console.log(`areas: ${areas.length} | routes: ${routes.length}`);
  console.log(`routes with unresolved mountainId: ${orphanRoutes}`);
  console.log(`areas missing lat/lng: ${noCoord}`);
}

console.log(`\nErrors:   ${errors.length}`);
errors.slice(0, 50).forEach(e => console.log(`  x ${e}`));
if (errors.length > 50) console.log(`  ...and ${errors.length - 50} more`);
console.log(`Warnings: ${warnings.length}`);
warnings.slice(0, 50).forEach(w => console.log(`  ! ${w}`));
if (warnings.length > 50) console.log(`  ...and ${warnings.length - 50} more`);

console.log(errors.length
  ? `\nFAIL - fix errors before importing.`
  : `\nPASS - no blocking errors${warnings.length ? ` (${warnings.length} warnings to review)` : ""}.`);
process.exit(errors.length ? 1 : 0);
