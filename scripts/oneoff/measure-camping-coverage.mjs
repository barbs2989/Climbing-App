// Scope by the Washington AREA SUBTREE, not by `id like 'wa_%'`. The id-prefix filter is the
// reflex and it silently misses legacy ids — this batch alone caught four (adams_northwest_ridge,
// adams_avalanche_glacier, rainier_north_mowich_headwall, rainier_central_mowich_face) because
// it selected by area instead.
//
// Uses selectAll for BOTH reads: a plain PostgREST request caps at 1000 rows, and a first
// attempt at this returned exactly 1001 areas and a confidently wrong route count.
import { selectAll } from "../lib/supabase-env.mjs";

const wa = await selectAll("areas", "id,name,path", "name=eq.Washington&area_type=eq.state", { pageSize: 10 });
if (!wa.length) { console.log("no Washington state area found"); process.exit(1); }
const root = wa[0];
const kids = await selectAll("areas", "id", `path=cd.${root.path}`, { pageSize: 1000 });
const areaIds = [root.id, ...kids.map(a => a.id)];
console.log(`Washington subtree: ${areaIds.length} areas`);

const set = new Set(areaIds);
const all = await selectAll("routes", "id,area_id,discipline,bivy", "", { pageSize: 1000 });
const rows = all.filter(r => set.has(r.area_id));
const target = rows.filter(r => ["alpine", "mountaineering", "scrambling"].includes(r.discipline));
const withB = target.filter(r => r.bivy != null);
const areas = new Set(target.map(r => r.area_id));
const done = new Set(withB.map(r => r.area_id));
console.log(`WA routes in subtree: ${rows.length}`);
console.log(`WA alpine+mountaineering+scrambling: ${target.length} routes on ${areas.size} areas`);
console.log(`  WITH camping: ${withB.length} routes (${Math.round(withB.length / target.length * 100)}%) on ${done.size} areas`);
console.log(`  remaining:    ${target.length - withB.length} routes on ${areas.size - done.size} areas`);
console.log(`  with camping but NOT wa_-prefixed: ${withB.filter(r => !r.id.startsWith("wa_")).length}`);
