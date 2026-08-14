// Measure the byArea subtree expansion: does a matched CONTAINER now yield real routes?
// Replays the app's leg sequence (areaHit -> subtree expansion -> routes.in(area_id)).
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
const U = SUPABASE_URL, K = anonKey(), h = { apikey: K, Authorization: "Bearer " + K };
const j = async q => {
  const r = await fetch(`${U}/rest/v1/${q}`, { headers: h, signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(r.status + " " + (await r.text()).slice(0, 140));
  return r.json();
};
const E = encodeURIComponent;
await j("areas?select=id&limit=1");

for (const q of ["washington pass", "leavenworth", "index", "smith rock", "stuart", "rainier", "liberty bell"]) {
  const matched = await j(`areas?select=id,name,path&name=ilike.${E("%" + q + "%")}&order=route_count.desc&limit=5`);
  // BEFORE: direct area ids only.
  const beforeIds = matched.map(a => a.id);
  const before = beforeIds.length
    ? await j(`routes?select=id,name&area_id=in.(${beforeIds.join(",")})&limit=16`) : [];
  // AFTER: plus subtree descendants of the top 3 matched areas.
  const ids = [...beforeIds];
  for (const a of matched.slice(0, 3).filter(a => a.path)) {
    for (const k of await j(`areas?select=id&path=cd.${E(a.path)}&route_count=gt.0&order=route_count.desc&limit=25`))
      if (!ids.includes(k.id)) ids.push(k.id);
  }
  const after = ids.length ? await j(`routes?select=id,name&area_id=in.(${ids.join(",")})&limit=16`) : [];
  const nameLeg = await j(`routes?select=id&name=ilike.${E("%" + q + "%")}&limit=16`);
  console.log(`"${q}"  areas=${matched.length} -> ids ${beforeIds.length} to ${ids.length}`);
  console.log(`    byArea routes: BEFORE ${before.length}  AFTER ${after.length}   (name leg: ${nameLeg.length})`);
  console.log(`    after sample: ${after.slice(0, 4).map(r => r.name).join(" | ") || "(none)"}`);
}
