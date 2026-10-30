// Write chosen complete tracks into routes.gpx (and elev_pts), throttled, with rollback and re-read.
// Usage:
//   node apply.mjs decisions.json            dry run: preflight + summary, writes nothing
//   node apply.mjs decisions.json --write    write, paced, verified; rollback saved first
// decisions.json: [{ id, slug, fktTitle, why, tier? }]   (slug -> <FKT_GPX_DIR or gpx>/<slug>.gpx)
// tier "oneway" (2026-10-29): a track from the trailhead to the summit, written ONLY when the route
// draws no recorded track today; anything else must be a complete round trip.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const { assessTrack, haversineM } = await import("./rule.mjs");
const { recordedTrackPts } = await import(`${REPO}/lib/track.js`);
const GPX_DIR = process.env.FKT_GPX_DIR || null;
const { SUPABASE_URL, anonKey, headers, patchRow } = await import(`${REPO}/scripts/lib/supabase-env.mjs`);

const here = path.dirname(new URL(import.meta.url).pathname);
const decisions = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const WRITE = process.argv.includes("--write");
const PACE_MS = 1000;
const MAX_PTS = 3000;

// track points; a file holding only route points (<rtept>, some FKT uploads) falls back to those
function parseGpx(xml) {
  for (const tag of ["trkpt", "rtept"]) {
    const pts = [];
    // attributes in either order, and self-closing points
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
const R = 6371000, rad = d => d * Math.PI / 180;
const dist = (a, b) => {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

// Equal-distance resample, endpoints kept. Elevation (feet) interpolated where the file has <ele>.
function resample(raw) {
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + dist(raw[i - 1], raw[i]));
  const total = cum[cum.length - 1];
  const n = Math.max(2, Math.min(MAX_PTS, Math.round(total / 10)));
  const hasEle = raw.filter(p => p.ele != null).length >= raw.length * 0.9;
  const out = [], elev = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const d = (total * k) / (n - 1);
    while (j < raw.length - 2 && cum[j + 1] < d) j++;
    const span = cum[j + 1] - cum[j] || 1;
    const t = Math.min(1, Math.max(0, (d - cum[j]) / span));
    const a = raw[j], b = raw[j + 1] || raw[j];
    out.push([+(a.lat + (b.lat - a.lat) * t).toFixed(5), +(a.lng + (b.lng - a.lng) * t).toFixed(5)]);
    if (hasEle) {
      const ea = a.ele ?? b.ele, eb = b.ele ?? a.ele;
      elev.push(ea + (eb - ea) * t);
    }
  }
  let elevFt = null;
  if (hasEle) {
    const sm = elev.map((_, i) => { const w = elev.slice(Math.max(0, i - 2), i + 3); return w.reduce((s, v) => s + v, 0) / w.length; });
    elevFt = sm.map(m => Math.round(m * 3.28084));
  }
  return { gpx: out, elev: elevFt, lengthKm: total / 1000, raw: raw.length };
}

// trailhead -> summit: starts within 300 m of a Trailhead pin and passes within 300 m of the Summit
function oneWay(pts, waypoints) {
  const wps = (waypoints || []).filter(w => w.lat != null && w.lng != null);
  const th = wps.filter(w => /trailhead/i.test(w.type || "")).map(w => [w.lat, w.lng]);
  const sm = wps.filter(w => /summit/i.test(w.type || "")).map(w => [w.lat, w.lng]);
  const problems = [];
  if (!th.length || !sm.length) problems.push("no trailhead or summit pin");
  else {
    if (Math.min(...th.map(t => haversineM(pts[0], t))) > 300) problems.push("does not start at the trailhead");
    let best = Infinity; for (const q of pts) for (const s of sm) best = Math.min(best, haversineM(q, s));
    if (best > 300) problems.push(`misses the summit by ${Math.round(best)} m`);
  }
  return { complete: problems.length === 0, problems };
}

async function getRow(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,gpx,elev_pts,waypoints&id=eq.${encodeURIComponent(id)}`, { headers: headers(anonKey()) });
  if (!r.ok) throw new Error(`read ${id} ${r.status}`);
  const rows = await r.json();
  if (rows.length !== 1) throw new Error(`read ${id}: ${rows.length} rows`);
  return rows[0];
}

const plan = [];
for (const d of decisions) {
  const row = await getRow(d.id);
  // what the MAP draws today: a line made from the pins, or under MIN_RECORDED_PTS, is no track
  const drawn = recordedTrackPts(row.gpx, row.waypoints);
  // replaceDrawn: the stored "complete" line is an FKT route file with no timestamps — a DRAWN line,
  // not a recording (audit-recorded.mjs) — so an athlete's recorded round trip replaces it
  if (!d.replaceDrawn && drawn && assessTrack(drawn.map(p => [p[0], p[1]]), row.waypoints || []).complete) { console.log(`SKIP ${d.id}: stored track already complete`); continue; }
  // owner 2026-10-30: skip ONLY a stored track that is complete or already runs trailhead -> summit
  if (d.tier === "oneway" && drawn && oneWay(drawn.map(p => [p[0], p[1]]), row.waypoints || []).complete) { console.log(`SKIP ${d.id}: stored track already runs trailhead -> summit`); continue; }
  const xml = fs.readFileSync(path.join(GPX_DIR || path.join(here, "gpx"), d.slug + ".gpx"), "utf8");
  const raw = parseGpx(xml);
  if (raw.length < 2) throw new Error(`${d.id}: ${d.slug} has no track points`);
  const verdict = d.tier === "oneway" ? oneWay(raw.map(p => [p.lat, p.lng]), row.waypoints || []) : assessTrack(raw.map(p => [p.lat, p.lng]), row.waypoints || []);
  if (!verdict.complete) { console.log(`SKIP ${d.id}: no longer passes the completeness rule (${verdict.problems.join("; ")})`); continue; }
  const rs = resample(raw);
  plan.push({ d, row, rs, verdict });
  console.log(`${d.id.padEnd(52)} ${d.slug.padEnd(40)} ${String(rs.gpx.length).padStart(5)} pts ${rs.lengthKm.toFixed(1).padStart(6)} km  elev ${rs.elev ? "yes" : "no"}  was ${Array.isArray(row.gpx) ? row.gpx.length : 0} pts`);
}
console.log(`plan: ${plan.length} writes`);
if (!WRITE) process.exit(0);

// Rollback first, so a bad batch can be restored with patchRow(routes, id, before).
const rb = path.join(REPO, "scripts", `rollback-fkt-gpx-tracks-${Date.now()}.json`);
fs.writeFileSync(rb, JSON.stringify({ note: "gpx/elev_pts before apply.mjs; restore with patchRow(routes, id, before)", at: new Date().toISOString(), rows: plan.map(p => ({ id: p.d.id, before: { gpx: p.row.gpx ?? null, elev_pts: p.row.elev_pts ?? null } })) }, null, 1));
console.log(`rollback saved ${rb}`);

let failures = 0;
for (const p of plan) {
  const body = { gpx: p.rs.gpx, elev_pts: p.rs.elev };
  for (let attempt = 1; ; attempt++) {
    try {
      await patchRow("routes", p.d.id, body);
      break;
    } catch (e) {
      console.log(`WRITE FAILED ${p.d.id} (attempt ${attempt}): ${e.message.slice(0, 160)}`);
      if (attempt >= 3) { failures++; break; }
      await new Promise(r => setTimeout(r, 60000));   // back off a minute; never retry fast
    }
  }
  await new Promise(r => setTimeout(r, PACE_MS));
}

// Re-read and reconcile every row.
let bad = 0;
for (const p of plan) {
  const now = await getRow(p.d.id);
  const ok = JSON.stringify(now.gpx) === JSON.stringify(p.rs.gpx) && JSON.stringify(now.elev_pts ?? null) === JSON.stringify(p.rs.elev ?? null);
  const nowPts = (now.gpx || []).map(q => [q[0], q[1]]);
  const complete = (p.d.tier === "oneway" ? oneWay(nowPts, now.waypoints || []) : assessTrack(nowPts, now.waypoints || [])).complete;
  if (!ok || !complete) { bad++; console.log(`RECONCILE ${p.d.id}: stored=${ok} complete=${complete}`); }
}
console.log(`written ${plan.length - failures}, failed ${failures}, reconcile problems ${bad}`);
