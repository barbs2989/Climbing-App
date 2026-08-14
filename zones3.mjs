import { SUPABASE_URL, anonKey } from "./scripts/lib/supabase-env.mjs";
const U = SUPABASE_URL, K = anonKey(), h = { apikey: K, Authorization: "Bearer " + K };
const j = async q => {
  const r = await fetch(`${U}/rest/v1/${q}`, { headers: h, signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 120));
  return r.json();
};
const E = encodeURIComponent;
await j("areas?select=id&limit=1");

for (const root of ["wa_north_cascades_core", "wa_picket_range"]) {
  const a = (await j(`areas?select=id,name,path&id=eq.${root}`))[0];
  if (!a) { console.log(root, "not found"); continue; }
  const kids = await j(`areas?select=id,name,area_type,route_count&path=cd.${E(a.path)}&limit=300`);
  const ids = [a.id, ...kids.map(k => k.id)];
  let routes = [];
  for (let i = 0; i < ids.length; i += 50)
    routes = routes.concat(await j(`routes?select=id,area_id,discipline,bivy&area_id=in.(${ids.slice(i, i + 50).join(",")})&limit=2000`));
  const target = routes.filter(r => ["alpine", "mountaineering", "scrambling"].includes(r.discipline) && r.bivy == null);
  const byArea = {};
  for (const r of target) byArea[r.area_id] = (byArea[r.area_id] || 0) + 1;
  const nm = Object.fromEntries(kids.concat([a]).map(k => [k.id, k.name]));
  console.log(`\n=== ${a.name} — ${target.length} uncovered routes on ${Object.keys(byArea).length} areas ===`);
  for (const [k, n] of Object.entries(byArea).sort((x, y) => y[1] - x[1]))
    console.log(`   ${String(n).padStart(3)}  ${(nm[k] || k)}   [${k}]`);
}
