// Which waypoints are off the route's own recorded track, by the per-type tolerance the app uses?
// Read-only. Usage: node scripts/oneoff/gpx-offroute-candidates.mjs <out.json>
//
// Set A: the track is complete (trailhead -> summit -> trailhead): every pin is judged.
// Set B: the track starts at the trailhead and reaches the summit but does not come back: only the
//        pins listed BEFORE the summit pin are judged, since a different descent is not recorded.
// Trailhead and Summit pins are never candidates: the track is measured against them.
// A route where half or more of its judged pins are off is NOT a pin problem: the track and the
// pins describe different ways up, so it is reported separately, not edited.
import fs from "fs";
import { selectAll } from "../lib/supabase-env.mjs";
import { assessTrack, haversineM } from "../audit-track-completeness.mjs";
import { recordedTrackPts } from "../../lib/track.js";

const tol = t => (/hazard/i.test(t) ? 600 : /campsite|camp|bivy/i.test(t) ? 500 : /water|lake/i.test(t) ? 400 : 300);
const rows = (await selectAll("routes", "id,name,gpx,waypoints,approach_variants,bivy", "gpx=not.is.null", { pageSize: 200 }))
  .filter(r => Array.isArray(r.gpx) && r.gpx.length > 1 && recordedTrackPts(r.gpx, r.waypoints));
const cands = [], disagree = [];
for (const r of rows) {
  const a = assessTrack(r.gpx, r.waypoints);
  const startsAtTh = !a.problems.some(p => /starts|no trailhead|misses|no summit/.test(p));
  if (!a.complete && !startsAtTh) continue;
  const wps = r.waypoints || [];
  const sumIdx = wps.findIndex(w => /summit/i.test(w.type || ""));
  const pts = r.gpx.map(p => [p[0], p[1]]);
  const judged = [];
  wps.forEach((w, i) => {
    if (w.lat == null || w.lng == null) return;
    if (/trailhead|summit|start|parking/i.test(w.type || "")) return;
    if (!a.complete && i > sumIdx) return;
    const offM = Math.round(Math.min(...pts.map(q => haversineM(q, [w.lat, w.lng]))));
    judged.push({ i, wp: w.name, type: w.type, offM, tolM: tol(w.type || ""), off: offM > tol(w.type || "") });
  });
  const off = judged.filter(j => j.off);
  if (!off.length) continue;
  const entry = { id: r.id, name: r.name, set: a.complete ? "A" : "B", variants: Array.isArray(r.approach_variants) ? r.approach_variants.length : 0, judged: judged.length, off,
    bivyNames: (r.bivy || []).map(b => b.name) };
  (off.length * 2 >= judged.length && judged.length >= 2 ? disagree : cands).push(entry);
}
fs.writeFileSync(process.argv[2], JSON.stringify({ cands, disagree }, null, 1));
console.log("candidate routes", cands.length, "pins", cands.reduce((s, c) => s + c.off.length, 0), "| A", cands.filter(c => c.set === "A").length, "B", cands.filter(c => c.set === "B").length);
console.log("track/pins disagree routes", disagree.length, "pins", disagree.reduce((s, c) => s + c.off.length, 0));
