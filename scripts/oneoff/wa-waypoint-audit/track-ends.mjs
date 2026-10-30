// For routes whose recorded track never reaches their summit: where does the track START, END,
// and top out, and what does the ground say there? A track recorded on another peak tops out on
// THAT peak. Read-only.
//   node scripts/oneoff/wa-waypoint-audit/track-ends.mjs OUT.json id1 id2 ...
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
import { elevationAt } from "../../lib/terrain.mjs";
import { recordedTrackPts, pointOf } from "../../../lib/track.js";
const [, , OUT, ...ids] = process.argv;
const key = requireServiceKey();
const R = 6371000, rad = Math.PI / 180;
const m = (a, b) => Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(Math.sin((b.lat - a.lat) * rad / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin((b.lng - a.lng) * rad / 2) ** 2))));
const out = [];
for (const id of ids) {
  const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,name,area_id,gpx,waypoints`, { headers: headers(key) })).json())[0];
  if (!r) { console.log("missing", id); continue; }
  const raw = Array.isArray(r.gpx) ? r.gpx : (r.gpx && r.gpx.points) || [];
  const pts = raw.map(pointOf).filter(Boolean);
  const drawn = recordedTrackPts(raw);
  const summit = (r.waypoints || []).find(w => /^summit$/i.test(w.type || "") && w.lat != null);
  const th = (r.waypoints || []).find(w => /trailhead/i.test(w.type || "") && w.lat != null);
  // the highest vertex on the ground (sampled: every vertex would be thousands of requests)
  const step = Math.max(1, Math.floor(pts.length / 40));
  let top = null;
  for (let i = 0; i < pts.length; i += step) { const e = await elevationAt(pts[i].lat, pts[i].lng); if (e != null && (!top || e > top.e)) top = { ...pts[i], e: Math.round(e) }; }
  const rec = { id, name: r.name, pts: pts.length, drawn: !!(drawn && drawn.length), start: pts[0], end: pts[pts.length - 1], top,
    startToTrailheadM: th && pts[0] ? m(pts[0], { lat: +th.lat, lng: +th.lng }) : null,
    topToSummitM: summit && top ? m(top, { lat: +summit.lat, lng: +summit.lng }) : null, summit: summit && { name: summit.name, lat: +summit.lat, lng: +summit.lng, elev: summit.elev } };
  out.push(rec);
  console.log(id, "pts", rec.pts, "drawn", rec.drawn, "| start->TH", rec.startToTrailheadM, "m | top", rec.top && rec.top.e, "ft at", rec.top && `${rec.top.lat.toFixed(5)},${rec.top.lng.toFixed(5)}`, "| top->summit", rec.topToSummitM, "m | summit", rec.summit && rec.summit.elev);
  await new Promise(s => setTimeout(s, 800));
}
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
