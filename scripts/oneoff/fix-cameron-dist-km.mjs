// wa_mount_cameron_standard stored dist_km 5.3, shorter than the straight line from its Obstruction Point
// trailhead pin to the summit (10.9 km), so impossible. dist_km is the walk in, one way: Peakbagger publishes
// 12 mi / 19.3 km from Obstruction Point TH to the summit (verified 2026-11-23), and the route's own stored
// track measures 19.2 km to the summit pin. enrich:apply cannot write dist_km, so this writes it, old value
// asserted; research-data/route-ledger-2026-11-23/cameron-batch.json then locks it (ledger-only entry).
//
//   node scripts/oneoff/fix-cameron-dist-km.mjs            # dry run
//   node scripts/oneoff/fix-cameron-dist-km.mjs --write
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const ID = "wa_mount_cameron_standard", AREA = "wa_mount_cameron", FROM = 5.3, TO = 19.3;
const k = requireServiceKey();
const read = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,dist_km&id=eq.${ID}`, { headers: headers(k) })).json())[0];
const r = await read();
if (!r || r.area_id !== AREA) { console.log(`${ID}: not found under ${AREA}, nothing written`); process.exit(1); }
if (r.dist_km !== FROM) { console.log(`${ID}: dist_km is ${r.dist_km} now, not ${FROM}, nothing written`); process.exit(r.dist_km === TO ? 0 : 1); }
console.log(`${ID}: dist_km ${FROM} -> ${TO}`);
if (!process.argv.includes("--write")) { console.log("dry run. --write to apply."); process.exit(0); }
await patchRow("routes", ID, { dist_km: TO });
const b = await read();
console.log(b.dist_km === TO ? "written and re-read: 19.3" : `NOT AS WRITTEN: ${b.dist_km}`);
process.exit(b.dist_km === TO ? 0 : 1);
