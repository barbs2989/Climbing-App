// What can the CAMPING & BIVY panel honestly say about each site's elevation, its gain from the
// trailhead, and its distance from the trailhead?
//
// This runs BEFORE any UI is written, deliberately. Two of those three numbers are the exact
// shape this codebase keeps fabricating: a distance that is really a straight-line chord
// (audit:waypoint-distances — a trail cannot be SHORTER than the straight line), and an
// elevation-derived figure resting on pins that audit:synthetic-waypoints shows were
// manufactured on 199 routes. Building the column first and sourcing it afterwards is how a
// plausible number ends up on screen with nothing behind it.
//
// Read-only, anon key. Fails closed on an empty read: zero rows would make every coverage
// number look like 0% and read as "there is nothing here" rather than "the read failed".
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";

const H = headers(anonKey());
async function q(path) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: H });
  if (!r.ok) { console.log(`FAIL: read failed (${r.status}) ${await r.text()}`); process.exit(1); }
  return r.json();
}

// Unordered on purpose: a sparse filter with order=id.asc walks the id index across a 205k-row
// table and hits the 3s anon statement_timeout. CLAUDE.md records the measurement.
const rows = await q("routes?select=id,bivy,waypoints,gain_ft,dist_km&bivy=not.is.null&limit=1000");
if (!rows.length) { console.log("FAIL: read no routes carrying bivy — an empty measurement proves nothing"); process.exit(1); }

const wpRows = await q("routes?select=id,waypoints&waypoints=not.is.null&limit=1000");
if (!wpRows.length) { console.log("FAIL: read no routes carrying waypoints"); process.exit(1); }

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (v) => v != null && String(v).trim() !== "";
const wpType = (w) => String((w && (w.type || w.kind)) || "").trim().toLowerCase();
const isCamp = (w) => /camp|bivy|bivouac/.test(wpType(w));
const isTrailhead = (w) => /trailhead|trail head/.test(wpType(w));

// ---- 1. What keys does a bivy entry actually carry?
const keyCount = new Map();
let sites = 0;
for (const r of rows) for (const b of arr(r.bivy)) {
  sites++;
  for (const k of Object.keys(b || {})) keyCount.set(k, (keyCount.get(k) || 0) + 1);
}
console.log(`== bivy[] entries: ${sites} across ${rows.length} routes\n`);
console.log("   keys present, by share of sites:");
[...keyCount.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, n]) =>
  console.log(`      ${k.padEnd(18)} ${String(n).padStart(4)}  ${Math.round((n / sites) * 100)}%`));

// ---- 2. Elevation coverage on bivy sites (elev feet OR elevM metres — the column holds both)
const bElev = arr([]).length;
let be = 0, bem = 0, bnone = 0;
for (const r of rows) for (const b of arr(r.bivy)) {
  if (has(b && b.elev)) be++;
  else if (has(b && b.elevM)) bem++;
  else bnone++;
}
console.log(`\n== ELEVATION on bivy sites`);
console.log(`   elev (feet)   : ${be}`);
console.log(`   elevM (metres): ${bem}`);
console.log(`   NEITHER       : ${bnone}   <- panel can say nothing`);
console.log(`   covered       : ${be + bem}/${sites} (${Math.round(((be + bem) / sites) * 100)}%)`);

// ---- 3. Campsite WAYPOINTS: elevation and trail distance
let wSites = 0, wElev = 0, wDist = 0, wBoth = 0;
for (const r of wpRows) for (const w of arr(r.waypoints)) {
  if (!isCamp(w)) continue;
  wSites++;
  const e = has(w.elev) || has(w.elevM), d = has(w.distMi) || has(w.distKm);
  if (e) wElev++;
  if (d) wDist++;
  if (e && d) wBoth++;
}
console.log(`\n== CAMPSITE WAYPOINTS: ${wSites}`);
console.log(`   with an elevation      : ${wElev} (${wSites ? Math.round((wElev / wSites) * 100) : 0}%)`);
console.log(`   with a TRAIL DISTANCE  : ${wDist} (${wSites ? Math.round((wDist / wSites) * 100) : 0}%)  <- distMi/distKm, the walked path`);
console.log(`   with both              : ${wBoth}`);

// ---- 4. Can GAIN be derived? It needs a trailhead elevation on the SAME route.
// gain = site elevation - trailhead elevation. Arithmetic on two displayed numbers, not research.
let routesWithCamp = 0, withTh = 0, withThElev = 0;
const thElevByRoute = new Map();
for (const r of wpRows) {
  const ws = arr(r.waypoints);
  if (!ws.some(isCamp)) continue;
  routesWithCamp++;
  const th = ws.find(isTrailhead);
  if (th) withTh++;
  if (th && (has(th.elev) || has(th.elevM))) { withThElev++; thElevByRoute.set(r.id, true); }
}
console.log(`\n== GAIN FROM TRAILHEAD (derivable?)`);
console.log(`   routes with a campsite waypoint     : ${routesWithCamp}`);
console.log(`   ...that have a Trailhead waypoint   : ${withTh}`);
console.log(`   ...whose trailhead has an ELEVATION : ${withThElev} (${routesWithCamp ? Math.round((withThElev / routesWithCamp) * 100) : 0}%)  <- the ceiling for a derived gain`);

// Same question for the bivy store, which is where most sites live.
let bRoutes = 0, bRoutesTh = 0;
const wpById = new Map(wpRows.map((r) => [r.id, arr(r.waypoints)]));
for (const r of rows) {
  if (!arr(r.bivy).length) continue;
  bRoutes++;
  const ws = wpById.get(r.id) || arr(r.waypoints);
  const th = ws.find(isTrailhead);
  if (th && (has(th.elev) || has(th.elevM))) bRoutesTh++;
}
console.log(`   routes with a bivy[] site           : ${bRoutes}`);
console.log(`   ...with a trailhead elevation       : ${bRoutesTh} (${bRoutes ? Math.round((bRoutesTh / bRoutes) * 100) : 0}%)`);

// ---- 5. Does any bivy entry carry a distance at all, under ANY spelling?
const distish = [...keyCount.keys()].filter((k) => /dist|mile|mi$|km|from/i.test(k));
console.log(`\n== DISTANCE on bivy sites`);
console.log(`   keys that look like a distance: ${distish.length ? distish.join(", ") : "(none)"}`);
if (!distish.length) console.log("   -> the researched store records NO distance from the trailhead.");
