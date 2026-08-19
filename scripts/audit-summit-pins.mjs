// Summit pin vs the peak's own coordinate, WITH the precision rule that makes it usable.
//
// Raw distance alone is a noisy detector: a route may legitimately top out on a NAMED
// SUB-FEATURE (six Rainier routes finish on Liberty Cap, 2.25 km from Columbia Crest, and say
// so in the pin name). Flagging those is the "audit tells you to break correct data" trap.
//
// The discriminator is whether the pin claims to BE this peak. If the pin name and the area
// name are the same feature, a large distance is a CONTRADICTION — the two records disagree
// about one point. If the pin names something else, the distance is expected and is context.
// Same shape as audit:aspect-name's ridge/face split.
import { readFileSync } from "node:fs";
const env = {};
for (const line of readFileSync("/Users/nathanbarber/dev/Climbing-App/.env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
}
const URL_ = env.VITE_SUPABASE_URL, KEY = env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: KEY, Authorization: "Bearer " + KEY };
const WP_TYPE_MAP = { trailhead:"Trailhead","trailhead/pass":"Trailhead",summit:"Summit",topout:"Topout",junction:"Junction",
  camp:"Campsite",campsite:"Campsite","pass/camp":"Campsite","base/bivy":"Campsite",bivy:"Campsite",
  water:"Water",lake:"Water","lake/basin":"Water",hazard:"Hazard",base:"Base","route base":"Base",crag_base:"Base",
  "crag base":"Base","route start":"Base","route-start":"Base",route_start:"Base",start:"Base",climb:"Base",
  "crag/route start":"Base",route:"Base",crag:"Crag","climbing area":"Crag",pass:"Pass",col:"Pass",saddle:"Pass",
  approach:"Approach",landmark:"Landmark",feature:"Landmark",viewpoint:"Landmark",waypoint:"Landmark",
  route_reference:"Landmark","area/route reference point":"Landmark" };
const wpType = w => { const raw = String((w && w.type) || "").trim(); if (!raw) return "";
  const k = raw.toLowerCase(); return WP_TYPE_MAP[k] || (raw.charAt(0).toUpperCase() + raw.slice(1)); };
const hav = (a,b,c,d) => { const p=Math.PI/180,R=6371000,dφ=(c-a)*p,dλ=(d-b)*p;
  const s=Math.sin(dφ/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(dλ/2)**2; return 2*R*Math.asin(Math.sqrt(s)); };

// Strip everything that is not the feature's identity: parenthetical explanations, a leading
// "Mount/Mt", the trailing word "summit", and punctuation.
const norm = s => String(s || "").toLowerCase()
  .replace(/\(.*?\)/g, " ")
  .replace(/\b(mount|mt\.?|peak|mountain|the)\b/g, " ")
  .replace(/\b(summit|true summit|highpoint|high point|top|topout)\b/g, " ")
  .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

async function get(p, tries = 5) {
  for (let a = 0; a < tries; a++) {
    try { const r = await fetch(`${URL_}/rest/v1/${p}`, { headers: H }); if (r.ok) return r.json();
      if (a === tries-1) return { __err: `${r.status}` }; } catch (e) { if (a === tries-1) return { __err: e.message }; }
    await new Promise(s => setTimeout(s, 500 * 2 ** a));
  }
}

const rows = await get(`routes?select=id,name,discipline,waypoints,area_id,areas(id,name,area_type,lat,lng,elevation_ft)&discipline=in.(alpine,mountaineering,scrambling)&waypoints=not.is.null&limit=3000`);
if (rows.__err || !rows.length) { console.error("READ FAILED / EMPTY — failing closed", rows.__err || ""); process.exit(1); }

const ELEV_TOL = 12;   // feet. Two records naming one summit should agree on its height.
const DIST_TOL = 300;  // metres. Below this the pin is on the summit for any practical purpose.

const contradiction = [], subFeature = [], namedElsewhere = [];
let judged = 0, noPin = 0, noPeakCoord = 0, inScope = 0;

for (const r of rows) {
  const a = r.areas; if (!a || a.area_type !== "peak") continue;
  inScope++;
  if (a.lat == null || a.lng == null) { noPeakCoord++; continue; }
  const wps = (Array.isArray(r.waypoints) ? r.waypoints : []).filter(w => w && w.lat != null && w.lng != null);
  const pin = wps.find(w => wpType(w) === "Summit") || wps.find(w => wpType(w) === "Topout");
  if (!pin) { noPin++; continue; }
  judged++;
  const m = Math.round(hav(pin.lat, pin.lng, a.lat, a.lng));
  if (m <= DIST_TOL) continue;

  const pn = norm(pin.name), an = norm(a.name);
  const claimsSamePeak = pn && an && (pn === an || pn.includes(an) || an.includes(pn));
  const dElev = (pin.elev != null && a.elevation_ft != null) ? Math.abs(pin.elev - a.elevation_ft) : null;
  const rec = { id: r.id, disc: r.discipline, wp: pin.name, peak: a.name, m,
                pinElev: pin.elev ?? null, peakElev: a.elevation_ft ?? null, dElev };

  if (!claimsSamePeak) { namedElsewhere.push(rec); continue; }
  /* SAME NAME, and the elevations agree -> the two records describe ONE point and disagree only
     about where it is. That is a coordinate error in one of them.
     SAME NAME but the elevations DIFFER -> a named sub-summit whose name merely contains the
     peak's (Chimney Rock, South Summit; Bonanza Peak - Southwest Peak). Correct data that the
     name test alone over-matches, which is why the elevation is consulted at all. */
  if (dElev == null || dElev <= ELEV_TOL) contradiction.push(rec); else subFeature.push(rec);
}
const by = k => (x, y) => y[k] - x[k];
contradiction.sort(by("m")); subFeature.sort(by("m")); namedElsewhere.sort(by("m"));

const line = f => `  ${String(f.m).padStart(6)} m  ${f.id.padEnd(42)} [${f.disc.slice(0,5)}] ` +
  `${String(f.wp).slice(0,32).padEnd(32)} peak=${String(f.peak).slice(0,22).padEnd(22)}` +
  (f.dElev == null ? "  (no elev to compare)" : `  Δelev ${f.dElev} ft`);

console.log(`alpine / mountaineering / scrambling routes with waypoints : ${rows.length}`);
console.log(`  under an area_type='peak'                               : ${inScope}`);
console.log(`  peak carries no coordinate (cannot judge)               : ${noPeakCoord}`);
console.log(`  no Summit/Topout pin at all                             : ${noPin}`);
console.log(`  judged                                                  : ${judged}`);
console.log(`  within ${DIST_TOL} m of the peak                                  : ${judged - contradiction.length - subFeature.length - namedElsewhere.length}`);

console.log(`\n=== 1. COORDINATE CONTRADICTIONS (${contradiction.length}) ===`);
console.log(`The pin names THIS peak and agrees on its ELEVATION, but sits >${DIST_TOL} m away.`);
console.log(`One of the two coordinates is wrong. WHICH is not mechanically decidable — areas.lat/lng`);
console.log(`has been wrong before (transposed pairs; a WA peak holding an Idaho route). Read both.`);
console.log(`Where several routes on one peak share a pin, the PIN is the corroborated record.\n`);
contradiction.forEach(f => console.log(line(f)));

console.log(`\n=== 2. NAMED SUB-SUMMITS (${subFeature.length}) — NOT findings ===`);
console.log(`Name contains the peak's, but the elevations differ, so it is a distinct point.\n`);
subFeature.forEach(f => console.log(line(f)));

console.log(`\n=== 3. PIN NAMES A DIFFERENT FEATURE (${namedElsewhere.length}) — NOT findings ===`);
console.log(`e.g. six Rainier routes top out on Liberty Cap, 2.25 km from Columbia Crest, and say so.\n`);
namedElsewhere.forEach(f => console.log(line(f)));

console.log(`\nreport-only: exit 0 regardless. ${contradiction.length} thing(s) to read.`);
