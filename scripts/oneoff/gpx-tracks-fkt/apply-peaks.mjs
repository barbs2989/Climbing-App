// Write researched FKT tracks onto routes matched by their PEAK's coordinate (routes with no
// trailhead/summit pins), and add a Summit pin at the peak's coordinate when the route has none
// (owner, 2026-10-29: "if we already have the coordinates for the summit, add that pin").
// The track passing within SUMMIT_M of that coordinate is the check that the coordinate is right.
// Only lat/lng/elevation are stored: never an FKT time.
// Usage: FKT_GPX_DIR=<dir> node apply-peaks.mjs decisions.json [--write]
//   decisions.json: [{ id, slug, tier, why, peak: { id, name, lat, lng, elevation_ft },
//                      trailhead?: { name, confirmed: true } }]
// A Trailhead pin is added at the track's FIRST point (owner: "the start of the gpx track is most
// likely the trailhead"), only when research CONFIRMED that the start is that named trailhead and
// the route has no trailhead pin yet. It goes first in the list, where a trailhead belongs.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const { haversineM } = await import("./rule.mjs");
const { recordedTrackPts, reachesTheSummit } = await import(`${REPO}/lib/track.js`);
const { SUPABASE_URL, anonKey, headers, patchRow } = await import(`${REPO}/scripts/lib/supabase-env.mjs`);
const decisions = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const WRITE = process.argv.includes("--write");
const GPX_DIR = process.env.FKT_GPX_DIR;
const SUMMIT_M = 150, LOOP_M = 300, MAX_PTS = 3000;

function parseGpx(xml) {
  for (const tag of ["trkpt", "rtept"]) {
    const pts = [];
    const re = new RegExp(`<${tag}\\b([^>]*?)(\\/>|>([\\s\\S]*?)<\\/${tag}>)`, "g");
    let m;
    while ((m = re.exec(xml))) {
      const la = /\blat="([-\d.]+)"/.exec(m[1]), lo = /\blon="([-\d.]+)"/.exec(m[1]);
      if (!la || !lo) continue;
      const e = m[3] ? /<ele>([-\d.]+)<\/ele>/.exec(m[3]) : null;
      pts.push({ lat: +la[1], lng: +lo[1], ele: e ? +e[1] : null });
    }
    if (pts.length >= 2) return pts;
  }
  return [];
}
const dist = (a, b) => haversineM([a.lat, a.lng], [b.lat, b.lng]);
// equal-distance resample, endpoints kept; elevation in feet where the file has <ele>
function resample(raw) {
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + dist(raw[i - 1], raw[i]));
  const total = cum.at(-1), n = Math.max(2, Math.min(MAX_PTS, Math.round(total / 10)));
  const hasEle = raw.filter(p => p.ele != null).length >= raw.length * 0.9;
  const out = [], elev = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const d = (total * k) / (n - 1);
    while (j < raw.length - 2 && cum[j + 1] < d) j++;
    const t = Math.min(1, Math.max(0, (d - cum[j]) / (cum[j + 1] - cum[j] || 1)));
    const a = raw[j], b = raw[j + 1] || raw[j];
    out.push([+(a.lat + (b.lat - a.lat) * t).toFixed(5), +(a.lng + (b.lng - a.lng) * t).toFixed(5)]);
    if (hasEle) { const ea = a.ele ?? b.ele, eb = b.ele ?? a.ele; elev.push(ea + (eb - ea) * t); }
  }
  const elevFt = hasEle ? elev.map((_, i) => { const w = elev.slice(Math.max(0, i - 2), i + 3); return Math.round(w.reduce((s, v) => s + v, 0) / w.length * 3.28084); }) : null;
  return { gpx: out, elev: elevFt, km: total / 1000 };
}
async function getRow(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,gpx,elev_pts,waypoints&id=eq.${encodeURIComponent(id)}`, { headers: headers(anonKey()) });
  if (!r.ok) throw new Error(`read ${id} ${r.status}`);
  const rows = await r.json();
  if (rows.length !== 1) throw new Error(`read ${id}: ${rows.length} rows`);
  return rows[0];
}

const plan = [];
for (const d of decisions) {
  const row = await getRow(d.id);
  if (row.area_id !== d.peak.id) { console.log(`SKIP ${d.id}: area is ${row.area_id}, not ${d.peak.id}`); continue; }
  const wps = Array.isArray(row.waypoints) ? row.waypoints : [];
  const hasSummit = wps.some(w => /summit/i.test(w.type || "") && w.lat != null && w.lng != null);
  const drawn = recordedTrackPts(row.gpx, row.waypoints);
  // owner 2026-10-30: skip ONLY a stored track that is complete (a round trip reaching the summit) or
  // already runs trailhead -> summit (starts within LOOP_M of a Trailhead pin and reaches the summit)
  if (drawn) {
    const reaches = reachesTheSummit(drawn, row.waypoints);
    const ths = wps.filter(w => /trailhead/i.test(w.type || "") && w.lat != null && w.lng != null);
    const fromTh = ths.some(w => haversineM(drawn[0], [w.lat, w.lng]) <= LOOP_M);
    const round = haversineM(drawn[0], drawn.at(-1)) <= LOOP_M;
    if (reaches && (fromTh || round)) { console.log(`SKIP ${d.id}: stored track is already ${fromTh ? "trailhead -> summit" : "a round trip"}`); continue; }
  }
  const raw = parseGpx(fs.readFileSync(path.join(GPX_DIR, d.slug + ".gpx"), "utf8"));
  const pts = raw.map(p => [p.lat, p.lng]);
  let best = Infinity; for (const q of pts) best = Math.min(best, haversineM(q, [d.peak.lat, d.peak.lng]));
  if (best > SUMMIT_M) { console.log(`SKIP ${d.id}: track misses the peak coordinate by ${Math.round(best)} m`); continue; }
  if (d.tier === "round" && haversineM(pts[0], pts.at(-1)) > LOOP_M) { console.log(`SKIP ${d.id}: not a round trip`); continue; }
  const rs = resample(raw);
  const summitPin = { type: "Summit", name: `${d.peak.name} summit`, lat: d.peak.lat, lng: d.peak.lng, ...(d.peak.elevation_ft ? { elev: d.peak.elevation_ft } : {}) };
  const hasTrailhead = wps.some(w => /trailhead/i.test(w.type || "") && w.lat != null && w.lng != null);
  const addTrailhead = !hasTrailhead && d.trailhead && d.trailhead.confirmed === true && d.trailhead.name;
  const thPin = addTrailhead ? { type: "Trailhead", name: d.trailhead.name, lat: rs.gpx[0][0], lng: rs.gpx[0][1] } : null;
  const waypoints = [...(thPin ? [thPin] : []), ...wps, ...(hasSummit ? [] : [summitPin])];
  if (!reachesTheSummit(rs.gpx, waypoints)) { console.log(`SKIP ${d.id}: the app would not count the resampled track as reaching the summit`); continue; }
  plan.push({ d, row, rs, waypoints, addSummit: !hasSummit, addTrailhead: !!thPin });
  console.log(`${d.id.padEnd(52)} ${d.slug.padEnd(40)} ${String(rs.gpx.length).padStart(5)} pts ${rs.km.toFixed(1).padStart(6)} km  ${d.tier}  ${!hasSummit ? "+summit pin " : ""}${thPin ? "+trailhead pin" : ""}`);
}
console.log(`plan: ${plan.length} writes (${plan.filter(p => p.addSummit).length} add a Summit pin, ${plan.filter(p => p.addTrailhead).length} a Trailhead pin)`);
if (!WRITE) process.exit(0);

const rb = path.join(REPO, "scripts", `rollback-fkt-peak-tracks-${Date.now()}.json`);
fs.writeFileSync(rb, JSON.stringify({ note: "gpx/elev_pts/waypoints before apply-peaks.mjs; restore with patchRow(routes, id, before)", at: new Date().toISOString(), rows: plan.map(p => ({ id: p.d.id, before: { gpx: p.row.gpx ?? null, elev_pts: p.row.elev_pts ?? null, waypoints: p.row.waypoints ?? null } })) }, null, 1));
console.log(`rollback saved ${rb}`);
let failures = 0;
for (const p of plan) {
  const body = { gpx: p.rs.gpx, elev_pts: p.rs.elev, ...(p.addSummit || p.addTrailhead ? { waypoints: p.waypoints } : {}) };
  for (let attempt = 1; ; attempt++) {
    try { await patchRow("routes", p.d.id, body); break; }
    catch (e) {
      console.log(`WRITE FAILED ${p.d.id} (attempt ${attempt}): ${e.message.slice(0, 160)}`);
      if (attempt >= 3) { failures++; break; }
      await new Promise(r => setTimeout(r, 60000));   // back off a minute; never retry fast
    }
  }
  await new Promise(r => setTimeout(r, 1000));
}
// JSONB reorders an object's keys, so compare pins by content, not by their text
const canon = v => JSON.stringify(v, (k, x) => x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(y => [y, x[y]])) : x);
let bad = 0;
for (const p of plan) {
  const now = await getRow(p.d.id);
  const ok = JSON.stringify(now.gpx) === JSON.stringify(p.rs.gpx) && (!(p.addSummit || p.addTrailhead) || canon(now.waypoints) === canon(p.waypoints));
  const reaches = reachesTheSummit(now.gpx, now.waypoints);
  if (!ok || !reaches) { bad++; console.log(`RECONCILE ${p.d.id}: stored=${ok} reaches=${reaches}`); }
}
console.log(`written ${plan.length - failures}, failed ${failures}, reconcile problems ${bad}`);
