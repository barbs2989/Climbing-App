// Read-only: print a route's approach, access, trailhead pins and descent in full.
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
for (const id of process.argv.slice(2)) {
  const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,name,approach,approach_variants,access,waypoints,descent_text`, { headers: headers(key) })).json())[0];
  console.log("=== " + id + " | " + r.name);
  console.log("APPROACH:", r.approach);
  console.log("VARIANTS:", JSON.stringify(r.approach_variants));
  console.log("ACCESS:", JSON.stringify(r.access));
  console.log("TRAILHEADS:", JSON.stringify((r.waypoints || []).filter(w => /trailhead/i.test(w.type || ""))));
  console.log("DESCENT:", r.descent_text, "\n");
}
