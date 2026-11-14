// WHICH LINES DOES lineIsBuiltFromPins STOP DRAWING? (2026-10-28)
//
// recordedTrackPts used to ask trackIsJustTheWaypoints, whose PIN half (most pins on the line) is
// about the caption. A pin-join line on a route with extra pins OFF it failed that half and was drawn
// as a recorded track. recordedTrackPts now asks the vertex half alone (lineIsBuiltFromPins). This
// lists every route the change touches — the losing side has to be read, not summarised (the
// measure-majority-slack.mjs lesson). Read-only, anon key; ids first, columns by primary key.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { trackIsJustTheWaypoints, lineIsBuiltFromPins, reachesTheSummit } from "../../lib/track.js";

const H = headers(anonKey());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function q(p) {
  for (let t = 0; t < 5; t++) {
    try { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: H, signal: AbortSignal.timeout(60000) }); if (r.ok) return r.json(); } catch { /* backed off */ }
    await sleep(30000 * (t + 1));
  }
  throw new Error(`read failed: ${p.slice(0, 80)} — this is NOT "no line changes"`);
}
const ids = (await q("routes?select=id&gpx=not.is.null&limit=20000")).map((r) => r.id);
if (!ids.length) throw new Error("no routes with a gpx — an empty measurement proves nothing");
let n = 0, before = 0, after = 0;
const lost = [];
for (let i = 0; i < ids.length; i += 15) {
  const chunk = ids.slice(i, i + 15).map((x) => `"${x}"`).join(",");
  for (const r of await q(`routes?select=id,gpx,waypoints&id=in.(${encodeURIComponent(chunk)})`)) {
    if (!Array.isArray(r.gpx) || !r.gpx.length) continue;
    n++;
    const reach = reachesTheSummit(r.gpx, r.waypoints);
    const old = !trackIsJustTheWaypoints(r.gpx, r.waypoints) && reach;
    const now = !lineIsBuiltFromPins(r.gpx, r.waypoints) && reach;
    if (old) before++;
    if (now) after++;
    if (old && !now) lost.push(`${r.id}  (${r.gpx.length} pts, ${(r.waypoints || []).length} pins)`);
    if (!old && now) console.log(`GAINED (must be none): ${r.id}`);
  }
  await sleep(250);
}
console.log(`${n} routes carry a gpx; drawn as a recorded track before ${before}, after ${after}; no longer drawn: ${lost.length}`);
for (const x of lost) console.log("  " + x);
