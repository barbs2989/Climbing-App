// Undo the Primus trailhead move (p07) and line clear: a retry pass found Thunder Creek is the most-used approach,
// so moving the start to Eldorado Creek was a judgement call the evidence does not settle. Restores waypoints,
// approach_logistics and gpx from the full-row backup taken before p07, guarded on the live row still holding
// exactly what p07 wrote, then verifies.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const id = "wa_primus_peak_south_ridge";
const D = new URL("../../../audits/route-tab-contradictions/decisions/structural-_route_leftovers_pins_out_p07_json-1790777596178.json", import.meta.url).pathname;
const b = JSON.parse(fs.readFileSync(D)).backups.find(r => r.id === id);
const get = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=waypoints,approach_logistics,gpx&id=eq.${id}`, { headers: headers(key) })).json())[0];
const live = await get();
if (live.gpx !== null || live.waypoints[0].name !== "Eldorado Creek Trailhead (Cascade River Road)" || !Array.isArray(b.gpx)) { console.log("state not as expected; no write"); process.exit(1); }
await patchRow("routes", id, { waypoints: b.waypoints, approach_logistics: b.approach_logistics, gpx: b.gpx });
const after = await get();
console.log(JSON.stringify(after.waypoints) === JSON.stringify(b.waypoints) && after.gpx.length === b.gpx.length ? `restored: ${after.waypoints[0].name}, line ${after.gpx.length} pts` : "VERIFY FAILED");
