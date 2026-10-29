// How the map's ascent/descent split (splitAtSummit) lands on every track the map draws. Read-only.
// Usage: node scripts/oneoff/gpx-legs-measure.mjs [out.json]
import fs from "fs";
import { selectAll } from "../lib/supabase-env.mjs";
import { recordedTrackPts, splitAtSummit } from "../../lib/track.js";

const rows = (await selectAll("routes", "id,name,gpx,waypoints", "gpx=not.is.null", { pageSize: 200 }))
  .filter(r => Array.isArray(r.gpx) && r.gpx.length > 1 && recordedTrackPts(r.gpx, r.waypoints));
const res = rows.map(r => { const s = splitAtSummit(r.gpx, r.waypoints); return { id: r.id, name: r.name, legs: !s ? "one line (no summit pin)" : s.descent ? "ascent + descent" : "ascent only" }; });
const c = {}; for (const r of res) c[r.legs] = (c[r.legs] || 0) + 1;
console.log("drawn tracks", rows.length, c);
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(res, null, 1));
