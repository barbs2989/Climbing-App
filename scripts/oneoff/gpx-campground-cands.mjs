// Round 3: drive-in campground pins 3+ km off the trailhead-summit corridor on routes with no
// recorded track, already listed in the route's camping section. Writes the shape
// gpx-offroute-remove.mjs reads (index found by exact name on a fresh keyed read).
// Usage: node scripts/oneoff/gpx-campground-cands.mjs <corridor.json> <out.json>
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const [inFile, outFile] = process.argv.slice(2);
const hits = JSON.parse(fs.readFileSync(inFile, "utf8")).filter(x => x.driveInCampInBivy);
const byRoute = new Map();
for (const h of hits) (byRoute.get(h.id) || byRoute.set(h.id, []).get(h.id)).push(h);
const key = requireServiceKey(), cands = [];
for (const [id, hs] of byRoute) {
  const row = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=waypoints`, { headers: headers(key) })).json())[0];
  const off = hs.map(h => { const i = (row.waypoints || []).findIndex(w => w && w.name === h.wp); return i < 0 ? null : { i, wp: h.wp, type: h.type, offM: h.offM }; }).filter(Boolean);
  if (off.length) cands.push({ id, off });
  await new Promise(r => setTimeout(r, 200));
}
fs.writeFileSync(outFile, JSON.stringify({ cands }, null, 1));
console.log("routes", cands.length, "pins", cands.reduce((s, c) => s + c.off.length, 0));
