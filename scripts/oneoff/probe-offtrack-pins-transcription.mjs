// Is an off-track waypoint RESEARCHED wrong, or TRANSCRIBED wrong?
//
// audit:waypoint-track reports 218 routes with pins off an otherwise-matching track. If each
// needs a source consulted, that is a 218-route reading job. But a pin that is wildly off
// while every other pin on the same route sits on the line is usually not a wrong place — it
// is the right place written down wrong: a flipped longitude sign, lat and lng swapped, a
// decimal point moved, a digit dropped.
//
// Those are TESTABLE rather than researchable, and the test is the same shape as the chord
// test: apply the candidate transformation and ask whether the pin lands on the route's own
// track. If it does, that is proof — the transformed coordinate agreeing with an independent
// record (the gpx line) is not something a wrong guess does by luck.
//
// This measures ONLY. It writes nothing, and its output is the input to the decision about
// whether the off-track backlog is a mechanical job or a reading job.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints } from "../../lib/track.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const LIMIT = Number(arg("--limit", 30));

const k = anonKey();
const R = 6371000;
const toR = (d) => (d * Math.PI) / 180;
function hvM(a, b) {
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const pt = (p) => Array.isArray(p) ? { lat: Number(p[0]), lng: Number(p[1]) } : (p && p.lat != null ? { lat: Number(p.lat), lng: Number(p.lng) } : null);
function nearestOnTrack(p, track) {
  let best = Infinity;
  for (const q of track) { const d = hvM(p, q); if (d < best) best = d; }
  return best;
}
// Per-type tolerance, copied in spirit from audit:waypoint-track — a Bailout pin is SUPPOSED
// to be off the line, so it cannot testify here either way.
const TOL = { Trailhead: 120, Summit: 120, Junction: 120, Topout: 120, Water: 400, Campsite: 500, Hazard: 600, Bailout: 2000 };
const tolOf = (t) => TOL[t] ?? 250;

/* The candidate transcription errors, each a pure function of the stored value. A repair is
   only credible if the transformed pin lands ON the track when the stored one does not — and
   the track has to be a real recorded line, not this route's own pins joined up, or the whole
   test is circular. */
const CANDIDATES = [
  { name: "lng sign flipped", f: (w) => ({ lat: w.lat, lng: -w.lng }) },
  { name: "lat sign flipped", f: (w) => ({ lat: -w.lat, lng: w.lng }) },
  { name: "lat/lng swapped", f: (w) => ({ lat: w.lng, lng: w.lat }) },
  { name: "lat/lng swapped + lng sign", f: (w) => ({ lat: -w.lng, lng: -w.lat }) },
  { name: "lat decimal shifted (x10)", f: (w) => ({ lat: w.lat * 10, lng: w.lng }) },
  { name: "lat decimal shifted (/10)", f: (w) => ({ lat: w.lat / 10, lng: w.lng }) },
  { name: "lng decimal shifted (x10)", f: (w) => ({ lat: w.lat, lng: w.lng * 10 }) },
  { name: "lng decimal shifted (/10)", f: (w) => ({ lat: w.lat, lng: w.lng / 10 }) },
];

async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,gpx&waypoints=not.is.null&gpx=not.is.null&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}

const SELFTEST = argv.includes("--selftest");
/* A zero result is exactly what a BROKEN detector prints, so prove the detector can fire
   before believing it. --selftest takes pins that are genuinely ON their track and flips the
   longitude sign; every one of those must come back "mechanically explained". If they do not,
   the run has measured nothing and says so. */
const rows = await readAll();
if (SELFTEST) {
  let injected = 0;
  for (const r of rows) {
    const track = (Array.isArray(r.gpx) ? r.gpx : []).map(pt).filter(Boolean);
    if (track.length < 4) continue;
    for (const w of (r.waypoints || [])) {
      if (!w || w.lat == null || w.lng == null || injected >= 25) continue;
      const p = { lat: Number(w.lat), lng: Number(w.lng) };
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      if (nearestOnTrack(p, track) > tolOf(String(w.type))) continue;
      w.lng = -w.lng; injected++;
    }
  }
  console.log(`--selftest: flipped the longitude sign on ${injected} pin(s) that were ON their track`);
}

if (!rows.length) { console.error("FAIL — read 0 routes"); process.exit(1); }

let realTrack = 0, offPins = 0, offRoutes = 0;
const fixable = [], unexplained = [];
for (const r of rows) {
  const track = (Array.isArray(r.gpx) ? r.gpx : []).map(pt).filter(Boolean);
  if (track.length < 4) continue;
  // Extent gate + the synthetic-track gate, both of which audit:waypoint-track already carries.
  let minLa = 90, maxLa = -90, minLn = 180, maxLn = -180;
  for (const q of track) { minLa = Math.min(minLa, q.lat); maxLa = Math.max(maxLa, q.lat); minLn = Math.min(minLn, q.lng); maxLn = Math.max(maxLn, q.lng); }
  if (hvM({ lat: minLa, lng: minLn }, { lat: maxLa, lng: maxLn }) < 500) continue;
  if (trackIsJustTheWaypoints(r.gpx, r.waypoints)) continue;
  realTrack++;

  const wps = (r.waypoints || []).filter((w) => w && w.lat != null && w.lng != null);
  let routeHasOff = false;
  for (const w of wps) {
    const p = { lat: Number(w.lat), lng: Number(w.lng) };
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
    const tol = tolOf(String(w.type));
    const d = nearestOnTrack(p, track);
    if (d <= tol) continue;
    offPins++; routeHasOff = true;

    let hit = null;
    for (const c of CANDIDATES) {
      const q = c.f(p);
      if (!Number.isFinite(q.lat) || !Number.isFinite(q.lng) || Math.abs(q.lat) > 90 || Math.abs(q.lng) > 180) continue;
      const dq = nearestOnTrack(q, track);
      // Demand a decisive improvement, not a marginal one: on the track, and at least an
      // order of magnitude closer than the stored value.
      if (dq <= tol && dq * 10 < d) { hit = { ...c, from: Math.round(d), to: Math.round(dq), q }; break; }
    }
    if (hit) fixable.push({ id: r.id, wp: w.name, type: w.type, ...hit });
    else unexplained.push({ id: r.id, wp: w.name, type: w.type, off: Math.round(d), tol });
  }
  if (routeHasOff) offRoutes++;
}

console.log(`\n=== are off-track pins transcription errors? ===`);
console.log(`${rows.length} routes carry both waypoints and a gpx · ${realTrack} have a REAL track worth measuring against`);
console.log(`${offPins} pin(s) off the track across ${offRoutes} route(s)`);
console.log(`\n  MECHANICALLY EXPLAINED (a transcription fix puts the pin ON the track): ${fixable.length}`);
for (const f of fixable.slice(0, LIMIT)) {
  console.log(`    ${f.id} — [${f.type}] ${f.wp}`);
  console.log(`        ${f.name}: ${f.from} m off  ->  ${f.to} m  (${f.q.lat.toFixed(5)}, ${f.q.lng.toFixed(5)})`);
}
if (fixable.length > LIMIT) console.log(`    … ${fixable.length - LIMIT} more`);
console.log(`\n  NOT EXPLAINED — needs a source consulted, not a transformation: ${unexplained.length}`);
for (const u of unexplained.slice(0, 8)) console.log(`    ${u.id} — [${u.type}] ${u.wp}: ${u.off} m off (tolerance ${u.tol} m)`);
/* How far off, and by type. The headline count treats a Junction pin 392 m from the line the
   same as a Trailhead 10 km from it, and those are not the same claim: the first is a saddle
   marked at the ridge crest rather than where the trail crosses it, the second is a different
   place. Bucketing is what says whether this backlog is 629 defects or a few dozen. */
{
  const b = { "just over tolerance (<2x)": 0, "2-5x tolerance": 0, "5-20x tolerance": 0, "over 20x tolerance": 0 };
  const byType = {};
  for (const u of unexplained) {
    const r = u.off / u.tol;
    if (r < 2) b["just over tolerance (<2x)"]++;
    else if (r < 5) b["2-5x tolerance"]++;
    else if (r < 20) b["5-20x tolerance"]++;
    else b["over 20x tolerance"]++;
    byType[u.type] = (byType[u.type] || 0) + 1;
  }
  console.log(`\n  how far off, as a multiple of that pin type's own tolerance:`);
  for (const [kk, v] of Object.entries(b)) console.log(`    ${kk.padEnd(28)} ${String(v).padStart(4)}`);
  console.log(`\n  by waypoint type:`);
  for (const [kk, v] of Object.entries(byType).sort((x, y) => y[1] - x[1])) console.log(`    ${String(kk).padEnd(14)} ${String(v).padStart(4)}`);
}
console.log(`\nMeasurement only — nothing was changed.`);
if (SELFTEST) {
  const flipped = fixable.filter((f) => f.name === "lng sign flipped").length;
  console.log(flipped >= 20
    ? `--selftest PASSED: ${flipped} injected sign-flips were detected, so a zero on a real run means zero.`
    : `--selftest FAILED: only ${flipped} of the injected sign-flips were detected — this probe cannot see what it claims to.`);
  process.exit(flipped >= 20 ? 0 : 1);
}
