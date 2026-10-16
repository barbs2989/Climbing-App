// Read-only. Joins the probe's candidates to their peak/area names so a researcher can search the
// right mountain ("wa_main_peak" alone is Eldorado Peak's area, not a name anyone googles).
// usage: node prep-mountaineering-research-briefs.mjs <tiers.json> <out.json>
import fs from "node:fs";
import { selectAll } from "../lib/supabase-env.mjs";

const [tiersPath, outPath] = process.argv.slice(2);
const T = JSON.parse(fs.readFileSync(tiersPath, "utf8"));
const all = [].concat(...Object.entries(T).map(([tier, rows]) => rows.map((r) => ({ ...r, tier }))));
const ids = [...new Set(all.map((r) => r.area_id))];
const names = {};
for (let i = 0; i < ids.length; i += 40) {
  const rows = await selectAll("areas", "id,name,area_type,parent_id", `id=in.(${ids.slice(i, i + 40).map(encodeURIComponent).join(",")})`, { pageSize: 100 });
  for (const a of rows) names[a.id] = a;
}
for (const a of Object.values(names)) if (a.parent_id && !names[a.parent_id]) {
  const p = await selectAll("areas", "id,name", `id=eq.${encodeURIComponent(a.parent_id)}`, { pageSize: 5 });
  if (p[0]) names[p[0].id] = p[0];
}
const out = all.map((r) => {
  const a = names[r.area_id] || {};
  const par = a.parent_id ? (names[a.parent_id] || {}).name : null;
  return { id: r.id, tier: r.tier, route: r.name, area: a.name || r.area_id, parent: par, areaType: a.area_type, storedGrade: r.grade, evidence: r.why.join(" "), disciplines: r.disciplines };
});
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log("briefs:", out.length, "unresolved areas:", out.filter((r) => r.area === r.id).length);
