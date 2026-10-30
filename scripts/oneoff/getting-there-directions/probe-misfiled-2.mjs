// Read-only: target peaks' existing routes (duplicates?) and every row that points at the 3 misfiled routes.
import { selectAll, requireServiceKey, SUPABASE_URL } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
for (const a of ["wa_mount_daniel", "wa_the_temple", "wa_enchantment_peak", "wa_big_chiwaukum", "wa_bald_eagle_peak"]) {
  const rs = await selectAll("routes", "id,name,discipline,grade", `area_id=eq.${a}`);
  console.log(a, "->", rs.map(r => `${r.id} "${r.name}" ${r.discipline} ${r.grade || ""}`).join(" | "));
}
const ar = await selectAll("areas", "id,name,parent_id,area_type,lat,lng", "or=(name.ilike.*musketeer*,name.ilike.*edward*,name.ilike.*nada*,name.ilike.*prusik*)&id=like.wa_*");
console.log("areas:", ar.map(a => `${a.id} "${a.name}" ${a.area_type} parent ${a.parent_id} ${a.lat},${a.lng}`).join(" | "));
const ids = ["wa_bald_eagle_peak_daniel_glacier", "wa_big_chiwaukum_mount_temple_ridge", "wa_big_chiwaukum_three_musketeers_ridge"];
// Tables with a route_id-like column: discover from the OpenAPI spec rather than guess.
const spec = await (await fetch(`${SUPABASE_URL}/rest/v1/`, { headers: { apikey: key, Authorization: "Bearer " + key } })).json();
for (const [t, def] of Object.entries(spec.definitions || {})) {
  for (const col of Object.keys(def.properties || {})) {
    if (!/route_id|^route$|routeid/i.test(col)) continue;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=${col}&${col}=in.(${ids.join(",")})`, { headers: { apikey: key, Authorization: "Bearer " + key, Prefer: "count=exact", Range: "0-0" } });
    const cr = res.headers.get("content-range");
    if (!res.ok || !cr?.endsWith("/0")) console.log(`  ${t}.${col}: ${res.status} ${cr}`);
  }
}
console.log("FK scan done");
