// load-wa-rock-safe.mjs — reinstate WA's rock (sport/trad) catalog into Supabase without
// clobbering the alpine data already loaded by import-alpine.mjs.
//
// Handles two collision classes found at runtime against the live DB:
//   1. Id collisions (94 areas, 1 route): rock-catalog rows that share an id with an
//      already-loaded alpine row. Skipped outright so curated elevation_ft/area_type/
//      parent_id/route beta isn't overwritten.
//   2. Leaf/parent collisions (4 peaks: Eldorado, Guye, Chair, Mount Index): the DB enforces
//      "an area can't both hold routes directly and have child areas". Those 4 peaks already
//      hold an alpine route directly, but the rock catalog wants to nest new sub-areas
//      (formations/season-splits) under them. Those 10 new sub-areas are reparented one level
//      up, to the peak's own existing DB parent (a region, not a leaf), instead of under the peak.
//
//   SUPABASE_SERVICE_KEY="<service_role key>" node load-wa-rock-safe.mjs
//
import { readFileSync } from "node:fs";

const PREFIX = "wa";

let url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
if (!url) { try { url = (readFileSync(".env.local", "utf8").match(/VITE_SUPABASE_URL=(.+)/) || [])[1]?.trim(); } catch {} }
const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Need VITE_SUPABASE_URL (in .env.local) and SUPABASE_SERVICE_KEY (the service_role secret)."); process.exit(1); }
url = url.replace(/\/$/, "");
const H = { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json" };

const A = JSON.parse(readFileSync(`catalog/${PREFIX}/${PREFIX}_areas.json`, "utf8"));
const R = JSON.parse(readFileSync(`catalog/${PREFIX}/${PREFIX}_routes.json`, "utf8"));

function gradeSystem(d) { if (d === "bouldering") return "v"; if (["scrambling", "mountaineering", "hiking"].includes(d)) return "class"; if (["trad", "sport", "alpine", "rock"].includes(d)) return "yds"; if (d === "ice") return "wi"; if (d === "mixed") return "m"; if (d === "aid") return "aid"; return null; }
function gradeNum(g, s) { if (!g) return null; let m; if (s === "yds" && (m = g.match(/5\.(\d+)([a-d]?)/))) return parseInt(m[1]) + (m[2] ? ("abcd".indexOf(m[2]) + 1) / 4 : 0); if (s === "v" && (m = g.match(/V(\d+)/))) return parseInt(m[1]); if (s === "wi" && (m = g.match(/WI(\d+)/i))) return parseInt(m[1]); if (s === "m" && (m = g.match(/M(\d+)/))) return parseInt(m[1]); if (s === "aid" && (m = g.match(/[AC](\d)/))) return parseInt(m[1]); if ((m = g.match(/5\.(\d+)([a-d]?)/))) return parseInt(m[1]) + (m[2] ? ("abcd".indexOf(m[2]) + 1) / 4 : 0); if ((m = g.match(/\b(?:WI|AI)(\d+)/i))) return parseInt(m[1]); if ((m = g.match(/\bV(\d+)/))) return parseInt(m[1]); if ((m = g.match(/\b(TD|PD|AD|ED)\b/)) || (m = g.match(/^(D|F)[+-]?$/))) { const ag = { F:1, PD:2, AD:3, D:4, TD:5, ED:6 }; return ag[m[1]]; } if ((m = g.match(/class\s*(\d)/i)) || (m = g.match(/(\d)\s*(?:rd|th|nd)?\s*class/i))) return parseInt(m[1]); if ((m = g.match(/^\s*(VII|VI|IV|III|II|I|V)\b/))) { const rm = { I:1, II:2, III:3, IV:4, V:5, VI:6, VII:7 }; return rm[m[1]]; } return null; }

async function existingIds(table, ids) {
  const found = new Set();
  for (let i = 0; i < ids.length; i += 200) {
    const batch = ids.slice(i, i + 200);
    const r = await fetch(`${url}/rest/v1/${table}?id=in.(${batch.join(",")})&select=id`, { headers: H });
    if (!r.ok) throw new Error(`${table} lookup: ${r.status} ${(await r.text()).slice(0, 200)}`);
    (await r.json()).forEach(row => found.add(row.id));
  }
  return found;
}

const collideAreas = await existingIds("areas", A.map(a => a.id));
const collideRoutes = await existingIds("routes", R.map(r => r.id));
console.log(`Area id collisions with existing (alpine) data: ${collideAreas.size} — skipping those, keeping curated alpine rows intact.`);
console.log(`Route id collisions: ${collideRoutes.size} — skipping those, keeping curated alpine route rows intact.`);

// Leaf/parent collision handling: any already-existing area that a NEW catalog area wants to
// nest under, and that already holds routes directly, would violate the DB's leaf-XOR-parent
// trigger. Walk each such parent up its existing DB ancestry until a non-route-holding ancestor
// is found, and reparent the new child there instead.
const candidateParents = new Set(A.map(a => a.parentId).filter(id => id && collideAreas.has(id)));
const parentInfo = {}; // id -> { hasRoutes, dbParentId }
if (candidateParents.size) {
  const ids = [...candidateParents];
  const routeRows = new Set();
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const r = await fetch(`${url}/rest/v1/routes?area_id=in.(${batch.join(",")})&select=area_id`, { headers: H });
    (await r.json()).forEach(row => routeRows.add(row.area_id));
  }
  const ar = await fetch(`${url}/rest/v1/areas?id=in.(${ids.join(",")})&select=id,parent_id`, { headers: H });
  (await ar.json()).forEach(row => { parentInfo[row.id] = { hasRoutes: routeRows.has(row.id), dbParentId: row.parent_id }; });
}
async function safeAncestor(id, depth = 0) {
  const info = parentInfo[id];
  if (!info || !info.hasRoutes) return id; // not a leaf-with-routes, safe to nest under
  if (!info.dbParentId || depth > 5) return null; // no safe ancestor found (unexpected)
  if (!(info.dbParentId in parentInfo)) {
    const r = await fetch(`${url}/rest/v1/areas?id=eq.${info.dbParentId}&select=id,parent_id`, { headers: H });
    const row = (await r.json())[0];
    const rr = await fetch(`${url}/rest/v1/routes?area_id=eq.${info.dbParentId}&select=id&limit=1`, { headers: H });
    parentInfo[info.dbParentId] = { hasRoutes: (await rr.json()).length > 0, dbParentId: row?.parent_id ?? null };
  }
  return safeAncestor(info.dbParentId, depth + 1);
}
let reparented = 0;
for (const a of A) {
  if (a.parentId && parentInfo[a.parentId]?.hasRoutes) {
    const safe = await safeAncestor(a.parentId);
    if (safe && safe !== a.parentId) { console.log(`  reparenting ${a.id} from ${a.parentId} -> ${safe} (leaf/parent collision)`); a.parentId = safe; reparented++; }
  }
}
if (reparented) console.log(`Reparented ${reparented} areas to avoid leaf/parent violations.`);

const areas = [{ id: "usa", name: "United States", parentId: null, areaType: "country", region: "USA", lat: 39.83, lng: -98.58 }, ...A];
const byId = {}; areas.forEach(a => byId[a.id] = a);
const ordered = [], seen = new Set();
function emit(a) { if (seen.has(a.id)) return; if (a.parentId && byId[a.parentId]) emit(byId[a.parentId]); seen.add(a.id); ordered.push(a); }
areas.forEach(emit);

const safeOrdered = ordered.filter(a => a.id === "usa" || !collideAreas.has(a.id));
const safeRoutes = R.filter(r => !collideRoutes.has(r.id));

const aRow = a => ({ id: a.id, name: a.name, parent_id: a.parentId, area_type: a.areaType, region: a.region, lat: a.lat, lng: a.lng, elevation_ft: a.elevationFt ?? null, prominence_ft: a.prominenceFt ?? null, parent_peak: a.parentPeak ?? null, source: a.source ?? null });
const rRow = r => { const disc = r.discipline === "rock" ? (r.style ? r.style.toLowerCase() : "rock") : r.discipline; const sys = r.gradeSystem || gradeSystem(disc); return { id: r.id, area_id: r.mountainId, name: r.name, discipline: disc, grade: r.grade, grade_system: sys, grade_num: gradeNum(r.grade, sys), pitches: r.pitches, sort_order: r.sortOrder ?? null, length_m: r.routeFt != null ? Math.round(r.routeFt / 3.28084) : null, aspect: r.aspect ?? null, season: r.season ?? null, fa: r.fa ?? null, gain_ft: r.gainFt ?? (r.gainM != null ? Math.round(r.gainM * 3.28084) : null), loss_ft: r.lossFt ?? (r.lossM != null ? Math.round(r.lossM * 3.28084) : null), dist_km: r.distKm ?? null, max_angle: r.maxAngle ?? null, rappels: r.rappels ?? null, commitment: r.commitment ?? null, face: r.face ?? null, permit: r.permit ?? null, comms: r.comms ?? null, descent: r.descent ?? null, obj_haz: r.objHaz ?? null, waypoints: r.waypoints ?? null, gpx: r.gpxPts ?? null, elev_pts: r.elevPts ?? null, overview: r.overview ?? null, beta: r.beta ?? null, turnaround: r.turnaround ?? null, auto_generated: r.autoGenerated ?? false, source: r.source ?? null, alpine_grade: r.alpineGrade ?? null, rock_grade: r.rockGrade ?? null, ice_grade: r.iceGrade ?? null, disciplines: r.disciplines ?? null, high_point_ft: r.highPointFt ?? null, aid_grade: r.aidGrade ?? null, gear: r.gear ?? null, hazards: r.hazards ?? null, approach: r.approach ?? null, descent_text: r.descentText ?? null, bail: r.bail ?? null, pitch_detail: r.pitchDetail ?? null, itinerary: r.itinerary ?? null, access: r.access ?? null, road: r.road ?? null, climate: r.climate ?? null, emergency: r.emergency ?? null, lists: r.lists ?? null }; };

async function up(table, rows, size) {
  for (let i = 0; i < rows.length; i += size) {
    const r = await fetch(`${url}/rest/v1/${table}`, { method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows.slice(i, i + size)) });
    if (!r.ok) throw new Error(table + " @" + i + ": " + r.status + " " + (await r.text()).slice(0, 400));
    process.stdout.write(`\r  ${table}: ${Math.min(i + size, rows.length)}/${rows.length}   `);
  }
  console.log("");
}
async function count(table) {
  const r = await fetch(`${url}/rest/v1/${table}?select=id`, { method: "HEAD", headers: { ...H, Prefer: "count=exact" } });
  const cr = r.headers.get("content-range"); return cr ? cr.split("/")[1] : "?";
}

console.log(`Upserting ${safeOrdered.length} areas (of ${ordered.length} total; ${ordered.length - safeOrdered.length} skipped as id collisions)...`);
await up("areas", safeOrdered.map(aRow), 500);
console.log(`Upserting ${safeRoutes.length} routes (of ${R.length} total; ${R.length - safeRoutes.length} skipped as id collisions)...`);
await up("routes", safeRoutes.map(rRow), 1000);

const ac = await count("areas"), rc = await count("routes");
const usa = await (await fetch(`${url}/rest/v1/areas?id=eq.usa&select=route_count`, { headers: H })).json();
console.log(`\nDONE — total areas now: ${ac} | total routes now: ${rc} | USA rolls up: ${usa[0]?.route_count}`);
