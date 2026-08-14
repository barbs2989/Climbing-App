import { SUPABASE_URL, anonKey } from "./scripts/lib/supabase-env.mjs";
const U = SUPABASE_URL, K = anonKey(), h = { apikey: K, Authorization: "Bearer " + K };
const j = async q => {
  const r = await fetch(`${U}/rest/v1/${q}`, { headers: h, signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 120));
  return r.json();
};
await j("areas?select=id&limit=1");
const ids = process.argv.slice(2);
const rows = await j(`areas?select=id,name,path,lat,lng,elevation_ft,parent_id&id=in.(${ids.join(",")})`);
const parentIds = [...new Set(rows.map(r => r.parent_id).filter(Boolean))];
const parents = parentIds.length ? await j(`areas?select=id,name&id=in.(${parentIds.join(",")})`) : [];
const pn = Object.fromEntries(parents.map(p => [p.id, p.name]));
for (const r of rows.sort((a, b) => (pn[a.parent_id] || "").localeCompare(pn[b.parent_id] || "")))
  console.log(`${(pn[r.parent_id] || "?").padEnd(30)} | ${r.name.padEnd(28)} | ${r.lat != null ? r.lat.toFixed(3) + "," + r.lng.toFixed(3) : "no coord"} | ${r.elevation_ft || "?"} ft | ${r.id}`);
