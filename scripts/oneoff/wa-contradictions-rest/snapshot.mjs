// Snapshot every route filed on a WA area (subtree via areas.region), all columns, to JSON.
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, selectAll } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const OUT = new URL("../../../audits/wa-contradictions-rest", import.meta.url).pathname;
const areas = (await selectAll("areas", "id,name,parent_id,path,area_type,elevation_ft,lat,lng,avy_zone,region", "", { key, pageSize: 1000 })).filter(a => a.path && (a.path === "usa.washington" || a.path.startsWith("usa.washington.")));
console.log("WA areas", areas.length);
fs.writeFileSync(`${OUT}/wa-areas.json`, JSON.stringify(areas));
const ids = areas.map(a => a.id);
const routes = [];
for (let i = 0; i < ids.length; i += 80) {
  const chunk = ids.slice(i, i + 80).map(encodeURIComponent).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&area_id=in.(${chunk})&limit=5000`, { headers: headers(key) });
  const t = await r.text();
  if (!r.ok) throw new Error(r.status + " " + t.slice(0, 300));
  routes.push(...JSON.parse(t));
}
console.log("WA routes", routes.length, "non-wa_ ids", routes.filter(r => !r.id.startsWith("wa_")).length);
fs.writeFileSync(`${OUT}/wa-routes.json`, JSON.stringify(routes));
