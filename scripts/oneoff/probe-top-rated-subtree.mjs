// Does the "Best rated here" section have anything to render?
//
// It calls routes_in_subtree with sort_by=stars_desc and min_stars=4. If no real container area
// returns rows, the section renders for nobody — which is precisely the defect it exists to fix,
// rebuilt. So this asks the live RPC before the render is believed.
import { SUPABASE_URL, headers, anonKey } from "../lib/supabase-env.mjs";

const ro = headers(anonKey());

async function rpc(rootId, lim = 6) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/routes_in_subtree`, {
    method: "POST",
    headers: { ...ro, "Content-Type": "application/json" },
    body: JSON.stringify({
      root_id: rootId, q: null, disc: null, min_grade: null, max_grade: null,
      min_stars: 4, min_pitches: null, min_length_m: null, max_length_m: null,
      sort_by: "stars_desc", lim, off: 0,
    }),
  });
  if (!r.ok) return { err: `${r.status} ${(await r.text()).slice(0, 160)}` };
  return { rows: await r.json() };
}

// Container areas a climber actually browses through — NOT leaves, since the section is gated on
// isLeaf === false and a leaf lists its routes directly anyway.
const r0 = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,area_type,route_count&area_type=in.(range,region,state,canyon)&route_count=gte.20&order=route_count.desc&limit=8`, { headers: ro });
if (!r0.ok) { console.error("FAIL — areas read " + r0.status); process.exit(1); }
const areas = await r0.json();
if (!areas.length) { console.error("FAIL — no container areas came back; a broken read, not an empty catalog."); process.exit(1); }

console.log("container area                              type      routes   4-star rows returned\n");
let any = 0;
for (const a of areas) {
  const { rows, err } = await rpc(a.id);
  if (err) { console.log(`  ${a.name.slice(0, 40).padEnd(42)} ${String(a.area_type).padEnd(9)} ${String(a.route_count).padStart(6)}   ERROR ${err}`); continue; }
  if (rows.length) any++;
  console.log(`  ${a.name.slice(0, 40).padEnd(42)} ${String(a.area_type).padEnd(9)} ${String(a.route_count).padStart(6)}   ${rows.length}`);
  for (const x of rows.slice(0, 3)) console.log(`      ${(x.name || "").slice(0, 46).padEnd(48)} ${x.stars ?? "-"}★  ${x.grade || ""}`);
}
console.log(`\n${any} of ${areas.length} container areas return rows.`);
if (!any) { console.error("The section would render for NOBODY — do not ship it."); process.exit(1); }
