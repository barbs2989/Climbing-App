// Read every WA route that carries waypoints ONCE, into a local JSON snapshot, so the triage
// and research steps of the 2026-10-30 WA waypoint audit do not re-read the table.
//   node scripts/oneoff/wa-waypoint-audit/snapshot.mjs OUT.json
import fs from "fs";
import { selectAll, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const rows = await selectAll("routes", "id,name,area_id,discipline,disciplines,waypoints,approach_logistics,high_point_ft,dist_km,gain_ft",
  "id=like.wa_*&waypoints=not.is.null", { pageSize: 100, key });
fs.writeFileSync(process.argv[2], JSON.stringify(rows));
const ins = rows.filter(r => ["alpine", "mountaineering", "scrambling"].includes(r.discipline));
console.log(rows.length, "wa routes with waypoints;", ins.length, "alpine/mountaineering/scrambling");
