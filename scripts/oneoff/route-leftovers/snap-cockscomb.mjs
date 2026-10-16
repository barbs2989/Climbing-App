// Cockscomb's line already began at Heliotrope Ridge (35 m from the trailhead pin moved there from Artist Point),
// so audit:stranded-track-vertices reads it as a stranded vertex. Snap that one vertex onto the pin, copying the
// coordinate the row already holds; compare-and-set on the whole line.
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const id = "wa_mount_baker_cockscomb_ridge";
const expect = [[48.80201, -121.89597], [48.7893, -121.86777], [48.785, -121.868], [48.782, -121.865], [48.776797, -121.814467]];
const get = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=gpx,waypoints&id=eq.${id}`, { headers: headers(key) })).json())[0];
const r = await get();
if (JSON.stringify(r.gpx) !== JSON.stringify(expect) || r.waypoints[0].name !== "Heliotrope Ridge Trailhead") { console.log("state not as expected; no write"); process.exit(1); }
const gpx = [[r.waypoints[0].lat, r.waypoints[0].lng], ...expect.slice(1)];
await patchRow("routes", id, { gpx });
console.log(JSON.stringify((await get()).gpx[0]));
