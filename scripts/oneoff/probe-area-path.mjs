// Read-only: area path + trailhead pins + approach head for route ids.
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const get = async q => (await (await fetch(`${SUPABASE_URL}/rest/v1/${q}`, { headers: headers(key) })).json());
for (const id of process.argv.slice(2)) {
  const r = (await get(`routes?id=eq.${encodeURIComponent(id)}&select=id,name,area_id,approach,waypoints`))[0];
  const chain = []; let a = r.area_id;
  while (a && chain.length < 8) { const x = (await get(`areas?id=eq.${encodeURIComponent(a)}&select=id,name,parent_id`))[0]; if (!x) break; chain.push(x.name); a = x.parent_id; }
  console.log(r.id, "|", r.name, "|", chain.join(" < "), "\n  TH:", (r.waypoints || []).filter(w => /trailhead/i.test(w.type || "")).map(w => `${w.name} (${w.lat},${w.lon})`).join("; "), "\n  approach:", String(r.approach || "").replace(/\s+/g, " ").slice(0, 250));
}
