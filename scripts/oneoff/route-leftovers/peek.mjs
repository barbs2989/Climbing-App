// Print one route's waypoints and the shape of its gpx (helper).
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
for (const id of process.argv.slice(2)) {
  const [r] = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints,gpx&id=eq.${id}`, { headers: headers(key) })).json();
  console.log("##", r.id, r.name, "gpx:", Array.isArray(r.gpx) ? `array ${r.gpx.length}, first ${JSON.stringify(r.gpx[0])}` : typeof r.gpx === "string" ? `string ${r.gpx.length}` : JSON.stringify(r.gpx)?.slice(0, 200));
  (r.waypoints || []).forEach((w, i) => console.log("  ", i, JSON.stringify(w).slice(0, 260)));
}
