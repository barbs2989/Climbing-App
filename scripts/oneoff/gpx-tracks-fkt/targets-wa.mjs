// Washington routes an FKT track could fill: a Trailhead pin and a Summit pin to match against,
// and no complete (trailhead -> summit -> trailhead) recorded track drawn today. Read-only.
// Writes research-data/gpx-tracks-fkt-wa-2026-10-29/targets.json.
import fs from "fs";
import { selectAll } from "../../lib/supabase-env.mjs";
import { recordedTrackPts } from "../../../lib/track.js";
import { assessTrack } from "./rule.mjs";
const D = "research-data/gpx-tracks-fkt-wa-2026-10-29";
fs.mkdirSync(D, { recursive: true });
const rows = await selectAll("routes", "id,name,area_id,discipline,waypoints,gpx", "id=like.wa_*&waypoints=not.is.null", { pageSize: 20 });   // gpx rows are heavy: 100 a page timed out
const placed = w => w.lat != null && w.lng != null && w.lat !== "" && w.lng !== "";
const out = []; const tally = {};
for (const r of rows) {
  const wps = (r.waypoints || []).filter(placed);
  if (!wps.some(w => /trailhead/i.test(w.type || "")) || !wps.some(w => /summit/i.test(w.type || ""))) { tally.noPins = (tally.noPins || 0) + 1; continue; }
  const drawn = recordedTrackPts(r.gpx, r.waypoints);
  const status = !drawn ? "none drawn" : assessTrack(drawn.map(p => Array.isArray(p) ? p : [p.lat, p.lng]), wps).complete ? "complete" : "partial";
  tally[status] = (tally[status] || 0) + 1;
  if (status !== "complete") out.push({ id: r.id, name: r.name, area_id: r.area_id, discipline: r.discipline, status, waypoints: wps });
}
fs.writeFileSync(`${D}/targets.json`, JSON.stringify(out));
console.log(rows.length, "WA routes with pins;", tally, "->", out.length, "targets");
