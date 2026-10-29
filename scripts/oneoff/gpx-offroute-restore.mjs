// Restore round-1 pins whose removal was judged against a line of fewer than MIN_RECORDED_PTS
// points: a hand-drawn chord, not a recording, so "off the line" was not evidence of "off the
// route". Restores the route's whole pre-removal waypoint list, only if the row still holds exactly
// what the removal wrote (else it stops for that route). Paced by patchRow; re-read after.
// Usage: node scripts/oneoff/gpx-offroute-restore.mjs <rollback.json> <id> [<id> ...]
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const [rbFile, ...ids] = process.argv.slice(2);
const rb = new Map(JSON.parse(fs.readFileSync(rbFile, "utf8")).map(r => [r.id, r]));
const key = requireServiceKey();
const read = async id => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=waypoints`, { headers: headers(key) })).json())[0];
let bad = 0;
for (const id of ids) {
  const r = rb.get(id);
  const drop = new Set(r.removed.map(o => o.i));
  const expectNow = r.waypoints.filter((_, i) => !drop.has(i));
  const now = await read(id);
  if (JSON.stringify(now.waypoints) !== JSON.stringify(expectNow)) { console.log("SKIP changed since removal:", id); bad++; continue; }
  await patchRow("routes", id, { waypoints: r.waypoints });
  const back = await read(id);
  if (JSON.stringify(back.waypoints) !== JSON.stringify(r.waypoints)) { console.log("RECONCILE FAIL", id); bad++; }
  else console.log("restored", id, "+" + r.removed.length);
}
console.log("done; problems:", bad);
