// Evidence pack for routes whose recorded track and pins describe different ways: our own text,
// every pin with its distance off the track, and the track sampled to ~25 points. Read-only.
// Usage: node scripts/oneoff/gpx-disagree-evidence.mjs <offroute.json> <out.json>
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
import { haversineM } from "../audit-track-completeness.mjs";

const [inFile, outFile] = process.argv.slice(2);
const { disagree } = JSON.parse(fs.readFileSync(inFile, "utf8"));
const key = requireServiceKey();
const out = [];
for (const c of disagree) {
  const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${c.id}&select=id,name,approach,descent_text,overview,gpx,waypoints,bivy`, { headers: headers(key) })).json())[0];
  const pts = r.gpx.map(p => [p[0], p[1]]);
  const step = Math.max(1, Math.floor(pts.length / 25));
  out.push({
    id: r.id, name: r.name, approach: r.approach, descent: r.descent_text, overview: r.overview,
    bivyNames: (r.bivy || []).map(b => b.name),
    pins: (r.waypoints || []).map((w, i) => ({ i, name: w.name, type: w.type, lat: w.lat, lng: w.lng, elev: w.elev,
      offTrackM: w.lat == null ? null : Math.round(Math.min(...pts.map(q => haversineM(q, [w.lat, w.lng])))) })),
    trackSample: pts.filter((_, i) => i % step === 0 || i === pts.length - 1).map(p => [+p[0].toFixed(5), +p[1].toFixed(5)]),
    trackPoints: pts.length,
  });
  await new Promise(res => setTimeout(res, 300));
}
fs.writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log("routes", out.length);
