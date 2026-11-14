// WA area ids, names and coordinates, once, for the summit-vs-GNIS sweep.
//   node scripts/oneoff/wa-waypoint-audit/areas-snapshot.mjs OUT.json
import fs from "fs";
import { selectAll, requireServiceKey } from "../../lib/supabase-env.mjs";
const rows = await selectAll("areas", "id,name,lat,lng,elevation_ft", "id=like.wa_*", { pageSize: 1000, key: requireServiceKey() });
fs.writeFileSync(process.argv[2], JSON.stringify(rows));
console.log(rows.length, "WA areas");
