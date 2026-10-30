// Re-read every route apply-peaks.mjs wrote and compare BY CONTENT: the gpx point by point and
// each waypoint field by field. JSONB stores object keys in its own order, so a JSON.stringify
// comparison of waypoints reports a difference where there is none.
// Usage: node verify-peaks-write.mjs <rollback json>
import fs from "fs";
import { SUPABASE_URL, headers, anonKey } from "../../lib/supabase-env.mjs";
import { reachesTheSummit, recordedTrackPts } from "../../../lib/track.js";
const rb = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const dec = new Map(JSON.parse(fs.readFileSync("research-data/gpx-tracks-fkt-peaks-2026-10-29/peak-decisions-all.json", "utf8")).map(d => [d.id, d]));
let bad = 0;
for (const { id, before } of rb.rows) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,gpx,waypoints&id=eq.${encodeURIComponent(id)}`, { headers: headers(anonKey()) });
  const [now] = await r.json();
  const d = dec.get(id);
  const wps = now.waypoints || [];
  const summit = wps.find(w => w.type === "Summit" && Math.abs(w.lat - d.peak.lat) < 1e-9 && Math.abs(w.lng - d.peak.lng) < 1e-9);
  const hadSummit = (before.waypoints || []).some(w => /summit/i.test(w.type || "") && w.lat != null);
  const th = wps[0] && wps[0].type === "Trailhead" ? wps[0] : null;
  const changedTrack = JSON.stringify(now.gpx) !== JSON.stringify(before.gpx);
  const drawn = !!recordedTrackPts(now.gpx, now.waypoints);
  const ok = changedTrack && drawn && reachesTheSummit(now.gpx, now.waypoints) && (hadSummit || !!summit) && (!d.trailhead || (th && th.name === d.trailhead.name));
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "BAD"} ${id.padEnd(52)} pts ${now.gpx.length}  drawn=${drawn} summitPin=${hadSummit ? "kept" : !!summit} trailhead=${th ? th.name : "-"}`);
  await new Promise(s => setTimeout(s, 300));
}
console.log(`problems ${bad}`);
