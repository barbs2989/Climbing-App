// Which routes of one state still lack a track the map would draw as complete or trailhead -> summit?
// Read-only, from the LIVE catalog (the 2026-10-29 CSV predates the FKT waves).
// Usage: node scripts/oneoff/gpx-any-source/worklist.mjs wa out.json
import fs from "fs";
import { selectAll } from "../../lib/supabase-env.mjs";
import { recordedTrackPts } from "../../../lib/track.js";
import { assessTrack, haversineM } from "../gpx-tracks-fkt/rule.mjs";

const [st = "wa", out] = process.argv.slice(2);
// ids first (cheap), then the heavy gpx/waypoints columns 40 ids at a time: one range scan that also
// carried gpx timed out page 1 and slowed the whole database (2026-11-04).
const hi = `${st.slice(0, -1)}${String.fromCharCode(st.charCodeAt(st.length - 1) + 1)}`;
// (a discipline filter on the range also times out: filter it here)
const ids = (await selectAll("routes", "id,discipline", `id=gte.${st}_&id=lt.${hi}`, { pageSize: 1000 })).filter(r => r.id.startsWith(st + "_") && /^(alpine|mountaineering|scrambling)$/.test(r.discipline || "")).map(r => r.id);
const rows = [];
for (let k = 0; k < ids.length; k += 40) rows.push(...await selectAll("routes", "id,name,area_id,discipline,gpx,waypoints", `id=in.(${ids.slice(k, k + 40).map(encodeURIComponent).join(",")})`, { pageSize: 40 }));
const oneWayOk = (pts, wps) => {
  const th = wps.filter(w => w.lat != null && /trailhead/i.test(w.type || "")).map(w => [w.lat, w.lng]);
  const sm = wps.filter(w => w.lat != null && /summit/i.test(w.type || "")).map(w => [w.lat, w.lng]);
  if (!th.length || !sm.length) return false;
  if (Math.min(...th.map(t => haversineM(pts[0], t))) > 300) return false;
  let best = Infinity; for (const q of pts) for (const s of sm) best = Math.min(best, haversineM(q, s));
  return best <= 300;
};
const list = [], counts = {};
for (const r of rows) {
  const wps = r.waypoints || [];
  const drawn = recordedTrackPts(r.gpx, wps);
  const pts = drawn ? drawn.map(p => [p[0], p[1]]) : null;
  let status;
  if (!pts) status = "no track";
  else if (assessTrack(pts, wps).complete) status = "complete";
  else if (oneWayOk(pts, wps)) status = "trailhead to summit";
  else status = "partial";
  const hasTh = wps.some(w => w.lat != null && /trailhead/i.test(w.type || ""));
  const hasSm = wps.some(w => w.lat != null && /summit/i.test(w.type || ""));
  counts[status] = (counts[status] || 0) + 1;
  // the owner's rule: a stored complete or trailhead -> summit track is never replaced
  if (status === "no track" || status === "partial")
    list.push({ id: r.id, name: r.name, area_id: r.area_id, discipline: r.discipline, status, pts: pts ? pts.length : 0, hasTh, hasSm });
}
console.log(st, "routes", rows.length, JSON.stringify(counts), "worklist", list.length);
if (out) fs.writeFileSync(out, JSON.stringify(list, null, 1));
