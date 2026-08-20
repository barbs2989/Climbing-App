// wa_true_grit is filed at Postal Wall, Frenchman Coulee (a Vantage basalt sport crag) and its
// own overview describes a trad line on VESPER PEAK's north face, 150 km away in the Cascades.
// Grade and discipline disagree too. Report, do not repair: which record is wrong is not
// decidable from the row. Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();
const r = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,discipline,grade,pitches,overview,beta&id=eq.wa_true_grit`, { headers: headers(k) })).json())[0];
const a = (await (await fetch(`${SUPABASE_URL}/rest/v1/areas?select=id,name,path,lat,lng&id=eq.${r.area_id}`, { headers: headers(k) })).json())[0];
console.log(`${r.id} — ${r.name}`);
console.log(`  filed at: ${a.name}   [${a.path}]   ${a.lat},${a.lng}`);
console.log(`  stored:   discipline=${r.discipline}  grade=${r.grade}  pitches=${r.pitches}`);
console.log(`  overview: ${r.overview}`);
console.log(`  beta:     ${r.beta}`);
const others = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,discipline,grade&name=eq.True%20Grit`, { headers: headers(k) })).json();
console.log(`\n  rows named "True Grit" in the catalog: ${others.length}`);
for (const o of others) console.log(`    ${o.id.padEnd(30)} area=${o.area_id}  ${o.discipline} ${o.grade}`);
