// Routes with NO recorded track: which pins sit far to the side of the trailhead -> summit corridor?
// Read-only; a candidate list for research, not a fix. A pin counts when it is more than 3 km from
// the trailhead-summit segment AND further from it than 60% of that segment's length. Drive-in
// campgrounds already listed in the route's camping section are reported separately.
// Usage: node scripts/oneoff/gpx-corridor-measure.mjs <out.json>
import fs from "fs";
import { selectAll } from "../lib/supabase-env.mjs";
import { haversineM } from "../audit-track-completeness.mjs";
import { recordedTrackPts } from "../../lib/track.js";

function offSegM(p, a, b) {
  const k = Math.cos((a[0] * Math.PI) / 180), R = 111320;
  const px = (p[1] - a[1]) * k * R, py = (p[0] - a[0]) * R, bx = (b[1] - a[1]) * k * R, by = (b[0] - a[0]) * R;
  const L2 = bx * bx + by * by, t = L2 ? Math.max(0, Math.min(1, (px * bx + py * by) / L2)) : 0;
  return Math.hypot(px - t * bx, py - t * by);
}
const rows = await selectAll("routes", "id,name,discipline,waypoints,bivy,gpx", "waypoints=not.is.null", { pageSize: 100 });
const out = [];
for (const r of rows) {
  if (Array.isArray(r.gpx) && recordedTrackPts(r.gpx, r.waypoints)) continue;
  const wps = (r.waypoints || []).filter(w => w && w.lat != null && w.lng != null);
  const th = wps.find(w => /trailhead/i.test(w.type || "")), sm = wps.find(w => /summit/i.test(w.type || ""));
  if (!th || !sm) continue;
  const a = [th.lat, th.lng], b = [sm.lat, sm.lng], L = haversineM(a, b);
  const bivy = new Set((r.bivy || []).map(x => x.name));
  for (const w of wps) {
    if (/trailhead|summit|parking|start/i.test(w.type || "")) continue;
    const d = offSegM([w.lat, w.lng], a, b);
    if (d > 3000 && d > 0.6 * L) out.push({ id: r.id, name: r.name, wp: w.name, type: w.type, offM: Math.round(d), segM: Math.round(L), driveInCampInBivy: /campground/i.test(w.name || "") && bivy.has(w.name) });
  }
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log("pins", out.length, "routes", new Set(out.map(o => o.id)).size, "| drive-in campgrounds already in camping list", out.filter(o => o.driveInCampInBivy).length);
