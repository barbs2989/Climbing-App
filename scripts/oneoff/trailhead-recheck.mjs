// Re-verify the 13 writes still hold the values we wrote.
//
// A DB write is not protected by having a merged PR: concurrent sessions do write these rows,
// and a trailhead repair has already been silently clobbered once in this repo within the hour
// ([[both-trailhead-records-can-agree-and-both-be-wrong]]). Verifying at write time did not
// protect it, because the clobber came later. So re-check AFTER other work lands.
import { selectAll } from "../lib/supabase-env.mjs";
import { WRITE } from "./trailhead-nocard-plan.mjs";

const routes = await selectAll("routes","id,approach_logistics,waypoints",{}, {pageSize:1000});
const byId = new Map(routes.map(r => [r.id, r]));
let ok = 0, drift = 0;

for (const e of WRITE) {
  const r = byId.get(e.id);
  const al = (r && r.approach_logistics) || {};
  const pin = (Array.isArray(r && r.waypoints) ? r.waypoints : []).find(w => /trailhead/i.test(String(w && w.type || "")));
  const nameOk = al.trailhead === e.trailhead;
  const dirOk = al.trailheadDirection === e.direction;
  const coordOk = e.coord
    ? (Math.abs(Number(al.trailheadLat) - e.coord[0]) < 1e-9 && Math.abs(Number(al.trailheadLng) - e.coord[1]) < 1e-9)
    : (al.trailheadLat == null && al.trailheadLng == null);
  const good = nameOk && dirOk && coordOk;
  if (good) ok++; else {
    drift++;
    console.log("  DRIFT " + e.id);
    if (!nameOk) console.log("        name now: " + JSON.stringify(al.trailhead));
    if (!dirOk) console.log("        direction changed");
    if (!coordOk) console.log("        coord now: " + al.trailheadLat + "," + al.trailheadLng);
  }
  // a pin appearing later would create the agreement claim we deliberately avoided
  if (pin) console.log("  NOTE  " + e.id + " now ALSO has a Trailhead pin (" + pin.name + ") — audit:trailhead-agreement now compares them; that is fine if someone added it deliberately from an independent source.");
}
console.log("\n" + ok + "/" + WRITE.length + " still hold what we wrote" + (drift ? "  — " + drift + " DRIFTED" : ""));
process.exit(drift ? 1 : 0);
