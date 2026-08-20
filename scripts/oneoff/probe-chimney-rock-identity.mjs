// Which Chimney Rock is wa_chimney_rock_west_face on, and is there anywhere correct to move it?
//
// audit:aspect-name flagged this row twice by two methods: its name leads "West Face" while its
// aspect is E, and separately the row reads as a Selkirk Crest (IDAHO) route filed on a peak in
// the Washington tree. Before anything is deleted, ask the question a deletion cannot be undone
// from: is the Washington `Chimney Rock` area itself the error, or the route's placement in it?
//
// There are at least two Chimney Rocks — one in Idaho's Selkirk Crest and one in Washington —
// which is the name-collision root cause CLAUDE.md records for route identity, one level up at
// the AREA level. A name is not an identity.
//
//   node scripts/oneoff/probe-chimney-rock-identity.mjs
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

async function get(url) {
  const r = await fetch(url, { headers: headers(key) });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
  return JSON.parse(await r.text());
}

// 1. Every area called Chimney Rock, anywhere in the catalog.
const areas = await get(`${SUPABASE_URL}/rest/v1/areas?select=id,name,area_type,lat,lng,route_count,parent_id,path&name=ilike.*chimney rock*`);
console.log(`areas named like "Chimney Rock": ${areas.length}\n`);
for (const a of areas) {
  console.log(`  ${a.id}`);
  console.log(`    name=${a.name}  type=${a.area_type}  routes=${a.route_count}  lat=${a.lat}  lng=${a.lng}`);
  console.log(`    path=${a.path}`);
}
if (!areas.length) throw new Error("zero areas read — a clean answer here would be a false pass");

// 2. The route, and what its own row says about where it is.
const routes = await get(`${SUPABASE_URL}/rest/v1/routes?select=*&id=eq.wa_chimney_rock_west_face`);
if (!routes.length) throw new Error("the route is gone — nothing to decide");
const r = routes[0];
console.log(`\nroute ${r.id} — ${r.name}`);
console.log(`  area_id=${r.area_id}  discipline=${r.discipline}  grade=${r.grade}  aspect=${r.aspect}  face=${r.face}`);

// 3. Prose that names a state, a range or a trailhead is the strongest evidence available
// without a source, because it was written about a specific mountain.
const PLACE = /idaho|selkirk|priest lake|sandpoint|bonner|panhandle|washington|cascade|okanogan|colville|snoqualmie|kittitas/gi;
for (const col of ["approach", "description", "overview", "beta", "descent_text", "road", "access", "permit", "climbing_route", "approach_variants"]) {
  const v = r[col];
  if (!v) continue;
  const text = typeof v === "string" ? v : JSON.stringify(v);
  const hits = [...new Set((text.match(PLACE) || []).map(x => x.toLowerCase()))];
  if (hits.length) console.log(`  ${col}: mentions ${hits.join(", ")}`);
}

// 4. Any sibling routes on the same area — a deletion that empties an area is a different
// operation from removing one route, and check:sql refuses the second without proof.
const sibs = await get(`${SUPABASE_URL}/rest/v1/routes?select=id,name&area_id=eq.${encodeURIComponent(r.area_id)}`);
console.log(`\nroutes on ${r.area_id}: ${sibs.length}`);
for (const s of sibs) console.log(`  ${s.id} — ${s.name}`);

// 5. Is there an Idaho tree to move it INTO? If not, a move cannot be expressed and the only
// options are leave-it-flagged or delete — which is exactly the decision to surface rather
// than take.
const idaho = [];
