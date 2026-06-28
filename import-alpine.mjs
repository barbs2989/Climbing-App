// import-alpine.mjs — reusable importer for a state's mountaineering/alpine pull.
// Usage:  SUPABASE_SERVICE_KEY=... node import-alpine.mjs <state-prefix>
//   Reads catalog/<prefix>-alpine/  (an *areas*.json + *routes*.json from a Claude pull).
//
// Reconciles the alpine data onto the EXISTING OpenBeta tree, idempotently:
//   1. ranges hang off the existing <state> node (matches OpenBeta's geography)
//   2. peaks colliding with an existing OpenBeta CRAG (a leaf): routes attach to the
//      existing area, and that area is RETYPED "crag"->"peak" (a summit shouldn't read
//      "crag" — Mountain Project has no such split; this keeps summits consistent)
//   3. peaks/ranges colliding with an existing PARENT area (region): renamed
//      <prefix>_alp_* so they don't fight the existing hierarchy
//   4. elevation_ft / prominence_ft backfilled onto every matching area
// Safe to re-run. Writes nothing to disk.
import { readFileSync, readdirSync } from "node:fs";

const PREFIX = process.argv[2];
if (!PREFIX) { console.error("Usage: SUPABASE_SERVICE_KEY=... node import-alpine.mjs <prefix>"); process.exit(1); }
const dir = `catalog/${PREFIX}-alpine/`;
const env = readFileSync(".env.local", "utf8");
let url = (env.match(/VITE_SUPABASE_URL=(.+)/) || [])[1]?.trim().replace(/\/$/, "");
const SK = process.env.SUPABASE_SERVICE_KEY;
const AK = (env.match(/VITE_SUPABASE_ANON_KEY=(.+)/) || [])[1]?.trim();
if (!url || !SK) { console.error("Need VITE_SUPABASE_URL in .env.local and SUPABASE_SERVICE_KEY env"); process.exit(1); }
const Hs = { apikey: SK, Authorization: "Bearer " + SK, "Content-Type": "application/json" };
const Ha = { apikey: AK, Authorization: "Bearer " + AK };

const afs = readdirSync(dir).filter(f => /area/i.test(f) && f.endsWith(".json"));
const rfs = readdirSync(dir).filter(f => /route/i.test(f) && f.endsWith(".json"));
if (!afs.length || !rfs.length) { console.error("Need at least one *areas*.json and one *routes*.json in " + dir); process.exit(1); }
const loadJ = f => { try { const x = JSON.parse(readFileSync(dir + f, "utf8")); return Array.isArray(x) ? x : (x.areas || x.routes || x.data || []); } catch (e) { throw new Error("Malformed JSON in " + dir + f + "  ->  " + e.message + "\n  (open that file, or ask Claude to re-check its brackets, then re-run)"); } };
const dedupe = arr => { const s = new Set(); return arr.filter(o => o && o.id && !s.has(o.id) && s.add(o.id)); };
let A = dedupe(afs.flatMap(loadJ)), R = dedupe(rfs.flatMap(loadJ));
console.log("  merged " + afs.length + " area file(s) + " + rfs.length + " route file(s) -> " + A.length + " areas, " + R.length + " routes");
const slug = s => ((s || "x").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 55) || "x");
const region = (A.find(a => a.region) || {}).region || "";
const stateNode = slug(region);

// ── pre-flight: catch common data mistakes before any upsert ──
(function preflight() {
  const ids = new Set(A.map(a => a.id));
  const DISC = new Set(["alpine","mountaineering","scrambling","ice","mixed","rock","trad","sport","aid","bouldering","tr"]);
  const issues = [];
  A.forEach(a => {
    if (!a.id || !a.name) issues.push("MISSING area id/name: " + JSON.stringify(a).slice(0, 70));
    if (a.lat != null && (a.lat < 45 || a.lat > 49.5)) issues.push("area " + a.id + " lat outside WA: " + a.lat);
    if (a.lng != null && (a.lng < -125 || a.lng > -116)) issues.push("area " + a.id + " lng outside WA: " + a.lng);
  });
  R.forEach(r => {
    if (!r.id || !r.name) issues.push("MISSING route id/name: " + JSON.stringify(r).slice(0, 70));
    if (!ids.has(r.mountainId) && r.mountainId !== stateNode) issues.push("ORPHAN route " + r.id + " -> mountainId '" + r.mountainId + "' (no matching area)");
    if (r.discipline && !DISC.has(r.discipline)) issues.push("route " + r.id + " unknown discipline: " + r.discipline);
    if (Array.isArray(r.disciplines) && r.disciplines.some(d => !DISC.has(d))) issues.push("route " + r.id + " unknown discipline in array: " + JSON.stringify(r.disciplines));
  });
  if (!issues.length) { console.log("  pre-flight: data clean"); return; }
  console.log("\n!! PRE-FLIGHT found " + issues.length + " issue(s):");
  issues.slice(0, 40).forEach(s => console.log("   - " + s));
  if (issues.length > 40) console.log("   ... +" + (issues.length - 40) + " more");
  const fatal = issues.filter(s => s.startsWith("ORPHAN") || s.startsWith("MISSING"));
  if (fatal.length) { console.error("\nABORT: " + fatal.length + " fatal (orphan/missing) — fix these or ask Claude to, then re-run."); process.exit(1); }
  console.log("   (all non-fatal — proceeding)\n");
})();


const get = async p => (await fetch(url + "/rest/v1/" + p, { headers: Ha })).json();
const inB = async (ids, fn) => { let o = []; for (let i = 0; i < ids.length; i += 80) { const d = await fn(ids.slice(i, i + 80)); if (Array.isArray(d)) o.push(...d); } return o; };
function gradeSystem(d) { if (d === "bouldering") return "v"; if (["scrambling", "mountaineering"].includes(d)) return "class"; if (["trad", "sport", "alpine", "rock"].includes(d)) return "yds"; if (d === "ice") return "wi"; if (d === "mixed") return "m"; if (d === "aid") return "aid"; return null; }
function gradeNum(g, s) { if (!g) return null; let m; if (s === "yds") { m = g.match(/5\.(\d+)([a-d]?)/); return m ? parseInt(m[1]) + ("abcd".indexOf(m[2]) + 1) / 4 : null; } if (s === "v") { m = g.match(/V(\d+)/); return m ? parseInt(m[1]) : null; } if (s === "wi") { m = g.match(/WI(\d+)/); return m ? parseInt(m[1]) : null; } if (s === "m") { m = g.match(/M(\d+)/); return m ? parseInt(m[1]) : null; } if (s === "class") { m = g.match(/Class\s*(\d)/i); return m ? parseInt(m[1]) : null; } if (s === "aid") { m = g.match(/[AC](\d)/); return m ? parseInt(m[1]) : null; } if (s === "alpine") { const ag = { TD: 5, PD: 2, AD: 3, ED: 6, D: 4, F: 1 }; m = g.match(/(TD|PD|AD|ED|D|F)/); return m ? ag[m[1]] : null; } return null; }
const aRow = a => ({ id: a.id, name: a.name, parent_id: a.parentId, area_type: a.areaType, region: a.region, lat: a.lat, lng: a.lng, elevation_ft: a.elevationFt ?? null, prominence_ft: a.prominenceFt ?? null, parent_peak: a.parentPeak ?? null, source: a.source ?? null });
const rRow = r => { const disc = r.discipline === "rock" ? (r.style ? r.style.toLowerCase() : "rock") : r.discipline; const sys = r.gradeSystem || gradeSystem(disc); return { id: r.id, area_id: r.mountainId, name: r.name, discipline: disc, grade: r.grade, grade_system: sys, grade_num: gradeNum(r.grade, sys), pitches: r.pitches, length_m: r.routeFt != null ? Math.round(r.routeFt / 3.28084) : null, aspect: r.aspect ?? null, season: r.season ?? null, fa: r.fa ?? null, gain_ft: r.gainFt ?? null, loss_ft: r.lossFt ?? null, dist_km: r.distKm ?? null, max_angle: r.maxAngle ?? null, rappels: r.rappels ?? null, commitment: r.commitment ?? null, face: r.face ?? null, permit: r.permit ?? null, comms: r.comms ?? null, descent: r.descent ?? null, obj_haz: r.objHaz ?? null, waypoints: r.waypoints ?? null, gpx: r.gpxPts ?? null, elev_pts: r.elevPts ?? null, overview: r.overview ?? null, beta: r.beta ?? null, turnaround: r.turnaround ?? null, auto_generated: r.autoGenerated ?? false, source: r.source ?? null, alpine_grade: r.alpineGrade ?? null, rock_grade: r.rockGrade ?? null, ice_grade: r.iceGrade ?? null, disciplines: r.disciplines ?? null, high_point_ft: r.highPointFt ?? null, aid_grade: r.aidGrade ?? null, gear: r.gear ?? null, approach: r.approach ?? null, descent_text: r.descentText ?? null, bail: r.bail ?? null, pitch_detail: r.pitchDetail ?? null, itinerary: r.itinerary ?? null, access: r.access ?? null, road: r.road ?? null, climate: r.climate ?? null, emergency: r.emergency ?? null }; };

async function up(table, rows, size, extra = "") {
  for (let i = 0; i < rows.length; i += size) {
    const r = await fetch(`${url}/rest/v1/${table}${extra}`, { method: "POST", headers: { ...Hs, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(rows.slice(i, i + size)) });
    if (!r.ok) throw new Error(`${table} @${i}: ${r.status} ${(await r.text()).slice(0, 300)}`);
  }
}
async function patch(q, body) { const r = await fetch(`${url}/rest/v1/${q}`, { method: "PATCH", headers: { ...Hs, Prefer: "return=minimal" }, body: JSON.stringify(body) }); if (!r.ok) throw new Error(`patch ${q}: ${r.status} ${(await r.text()).slice(0, 200)}`); }

console.log(`\nImporting ${PREFIX}-alpine: ${A.length} areas + ${R.length} routes  ->  state node "${stateNode}" (${region})`);

// ── 1. detect collisions + which existing areas are PARENTS (have children) ──
const exRows = await inB(A.map(a => a.id), c => get(`areas?id=in.(${c.join(",")})&select=id`));
const exIds = new Set(exRows.map(x => x.id));
const childRows = await inB([...exIds], c => get(`areas?parent_id=in.(${c.join(",")})&select=parent_id`));
const parents = new Set(childRows.map(x => x.parent_id));

// ── 2. rename region-collisions (existing AND a parent) to <prefix>_alp_* everywhere ──
const renameMap = {};
[...exIds].filter(id => parents.has(id)).forEach(id => renameMap[id] = `${PREFIX}_alp_` + id.replace(new RegExp("^" + PREFIX + "_"), ""));
A.forEach(a => { if (renameMap[a.id]) a.id = renameMap[a.id]; if (a.parentId && renameMap[a.parentId]) a.parentId = renameMap[a.parentId]; });
R.forEach(r => { if (renameMap[r.mountainId]) r.mountainId = renameMap[r.mountainId]; });

// ── 3. ranges -> existing state node; stamp region; keep crag-collisions (routes attach) ──
A.forEach(a => { if (!a.region) a.region = region; if (a.areaType === "range") a.parentId = stateNode; });
const cragColl = new Set([...exIds].filter(id => !parents.has(id)));   // existing leaves
const Ains = A.filter(a => !cragColl.has(a.id));

// topological order (parents before children) for the path trigger
const byId = {}; Ains.forEach(a => byId[a.id] = a);
const ordered = [], seen = new Set();
(function emitAll() { function emit(a) { if (seen.has(a.id)) return; if (a.parentId && byId[a.parentId]) emit(byId[a.parentId]); seen.add(a.id); ordered.push(a); } Ains.forEach(emit); })();

console.log(`  collisions: ${exIds.size} (renamed ${Object.keys(renameMap).length} region-parents, ${cragColl.size} leaf summits kept)`);
console.log(`  inserting ${ordered.length} new areas + upserting ${R.length} routes...`);
await up("areas", ordered.map(aRow), 300);
await up("routes", R.map(rRow), 500);

// ── 4. retype the kept leaf-summits crag -> peak (only where currently crag) ──
const cragArr = [...cragColl];
for (let i = 0; i < cragArr.length; i += 60) await patch(`areas?id=in.(${cragArr.slice(i, i + 60).join(",")})&area_type=eq.crag`, { area_type: "peak" });

// ── 5. backfill elevation/prominence onto every matching area (idempotent) ──
const elev = A.filter(a => a.elevationFt != null || a.prominenceFt != null);
let bf = 0;
for (const a of elev) { try { await patch(`areas?id=eq.${a.id}`, { elevation_ft: a.elevationFt ?? null, prominence_ft: a.prominenceFt ?? null }); bf++; } catch {} }

console.log(`  retyped ${cragColl.size} summits crag->peak; backfilled elevation on ${bf} areas`);
console.log(`DONE — ${PREFIX}-alpine merged. Summits consistent, routes attached, hierarchy intact.\n`);
