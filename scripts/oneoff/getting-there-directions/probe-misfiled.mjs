// Read-only: the 5 routes that look filed on the wrong peak, and the candidate peaks they belong to.
import { selectAll } from "../../lib/supabase-env.mjs";
const ids = ["wa_bald_eagle_peak_daniel_glacier", "wa_glacier_peak_south_tahoma_headwall", "wa_glacier_peak_tahoma_cleaver", "wa_big_chiwaukum_mount_temple_ridge", "wa_big_chiwaukum_three_musketeers_ridge"];
const rows = await selectAll("routes", "id,name,area_id,grade,discipline,disciplines,description,waypoints", `id=in.(${ids.join(",")})`);
for (const r of rows) console.log(JSON.stringify(r).slice(0, 900), "\n");
for (const [name, st] of [["Mount Rainier", "Washington"], ["Mount Daniel", "Washington"], ["Temple", "Washington"], ["Three Musketeers", "Washington"], ["Bald Eagle Peak", "Washington"], ["Enchantment Peak", "Washington"]]) {
  const res = await selectAll("areas", "id,name,parent_id,area_type,lat,lng", `name=ilike.*${encodeURIComponent(name)}*&id=like.wa_*`);
  console.log(name, "->", res.map(a => `${a.id} (${a.area_type}, parent ${a.parent_id}, ${a.lat},${a.lng})`).join(" | "));
}
