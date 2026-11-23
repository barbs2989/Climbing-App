// wa_mount_fernow_southeast_face stored dist_km 8, shorter than the straight line from its Phelps Creek
// trailhead pin to the summit (9.1 km), so impossible; its own pins put the summit 7.8 mi out. dist_km is the
// walk in, one way: a Peakbagger log of this line (Phelps Creek TH, Leroy Creek / Gloomy Basin; verified
// 2026-11-23) gives 7.6 mi / 12.2 km on the way in, and the route's own stored track measures 11.9 km to the
// summit pin. enrich:apply cannot write dist_km, so this writes it, old value asserted;
// research-data/route-ledger-2026-11-23/distance-batch.json then locks it (ledger-only entry).
//
//   node scripts/oneoff/fix-fernow-dist-km.mjs            # dry run
//   node scripts/oneoff/fix-fernow-dist-km.mjs --write
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const ID = "wa_mount_fernow_southeast_face", AREA = "wa_mount_fernow", FROM = 8, TO = 12.2;
const k = requireServiceKey();
const read = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,dist_km&id=eq.${ID}`, { headers: headers(k) })).json())[0];
const r = await read();
if (!r || r.area_id !== AREA) { console.log(`${ID}: not found under ${AREA} (got ${r && r.area_id}), nothing written`); process.exit(1); }
if (r.dist_km !== FROM) { console.log(`${ID}: dist_km is ${r.dist_km} now, not ${FROM}, nothing written`); process.exit(r.dist_km === TO ? 0 : 1); }
console.log(`${ID}: dist_km ${FROM} -> ${TO}`);
if (!process.argv.includes("--write")) { console.log("dry run. --write to apply."); process.exit(0); }
await patchRow("routes", ID, { dist_km: TO });
const b = await read();
console.log(b.dist_km === TO ? `written and re-read: ${TO}` : `NOT AS WRITTEN: ${b.dist_km}`);
process.exit(b.dist_km === TO ? 0 : 1);
