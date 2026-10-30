// New climbs from FKT summit tracks (owner 2026-10-30: "if they can be added as new climbs for the
// catalog, then add them"): turn the researched verdicts into apply-fkt-state-climbs.mjs data files,
// one per state (scripts/oneoff/data/<st>-fkt-climbs.json). Offline.
//   - every peak was looked up first (name across the whole state, every area within 3 km): none held it
//   - the line is the FKT track, resampled; only lat/lng/elevation, never a time
//   - a Summit pin at the peak; a Trailhead pin at the track's start only where research confirmed it
//   - grade_num from lib/grade.js (the one parser); dist_km left out (the column holds two conventions)
// Usage: FKT_GPX_DIR=<dir> node build-new-climbs.mjs <verdict.json> [...]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const { haversineM } = await import("./rule.mjs");
const { reachesTheSummit } = await import(`${REPO}/lib/track.js`);
const { gradeNumFor } = await import(`${REPO}/lib/grade.js`);
const GPX_DIR = process.env.FKT_GPX_DIR;
// held back: no Hawaii in the area tree yet (adding a state is the owner's call)
const HOLD = new Set(["mount-olomana-hi", "mt-landale-bc-canada"]);   // Landale: its one grade source can no longer be read
// FKT_CLIMBS_WAVE: a later wave writes <st>-fkt-climbs-<wave>.json beside an earlier wave's file
const WAVE = process.env.FKT_CLIMBS_WAVE ? `-${process.env.FKT_CLIMBS_WAVE}` : "";
const MAX_PTS = 3000;

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
// equal-distance resample, endpoints kept; elevation in feet where the file has <ele> (same as apply-peaks.mjs)
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
  return { gpx: out, elev: elevFt };
}

const byState = {};
for (const f of process.argv.slice(2)) for (const v of JSON.parse(fs.readFileSync(f, "utf8"))) {
  if (v.verdict !== "add" || HOLD.has(v.slug)) continue;
  const st = v.area.id.slice(0, 2);
  if (!v.route.id.startsWith(st + "_") || v.route.area_id !== v.area.id) throw new Error(`${v.slug}: ids do not agree (${v.area.id}, ${v.route.id})`);
  const rs = resample(parseGpx(fs.readFileSync(path.join(GPX_DIR, v.slug + ".gpx"), "utf8")));
  const summit = { type: "Summit", name: `${v.area.name} summit`, lat: v.area.lat, lng: v.area.lng, ...(v.area.elevation_ft ? { elev: v.area.elevation_ft } : {}) };
  const th = v.trailheadConfirmed && v.trailhead ? { type: "Trailhead", name: v.trailhead, lat: rs.gpx[0][0], lng: rs.gpx[0][1] } : null;
  const waypoints = [...(th ? [th] : []), summit];
  if (!reachesTheSummit(rs.gpx, waypoints)) throw new Error(`${v.slug}: the app would not count the track as reaching the summit`);
  const { dist_km, ...route } = v.route;   // eslint-disable-line no-unused-vars -- dist_km is dropped on purpose (two conventions)
  const row = { ...route, grade_num: gradeNumFor(route.grade, route.discipline), auto_generated: true, classic: false, gpx: rs.gpx, elev_pts: rs.elev, waypoints };
  const d = (byState[st] ||= { areas: [], routes: [], trackUpdates: [] });
  d.areas.push(v.area); d.routes.push(row);
  console.log(`${st} ${row.id.padEnd(42)} ${row.discipline.padEnd(14)} ${String(row.grade).padEnd(4)} num ${row.grade_num}  ${rs.gpx.length} pts  under ${v.area.parent_id}${th ? "  +TH " + th.name : ""}`);
}
for (const [st, d] of Object.entries(byState)) {
  const f = `${REPO}/scripts/oneoff/data/${st}-fkt-climbs${WAVE}.json`;
  if (fs.existsSync(f)) throw new Error(`${f} exists — refusing to overwrite another wave's record`);
  fs.writeFileSync(f, JSON.stringify(d, null, 1));
}
console.log(Object.entries(byState).map(([st, d]) => `${st}: ${d.routes.length}`).join(", "));
