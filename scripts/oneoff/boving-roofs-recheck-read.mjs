// Read-only: print the live Boving Roofs + Southwest Rib rows (owner's note recheck, 2026-11-26).
import fs from "node:fs";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";
const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=in.(wa_boving_roofs,wa_sews_sw_rib)`, { headers: headers(requireServiceKey()) });
const rows = await r.json();
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(rows, null, 1));
for (const x of rows) {
  console.log("=====", x.id, x.area_id, "pitches", x.pitches, "len", x.length_ft);
  for (const k of ["beta", "description", "descent", "descent_text", "rappels", "rappel_detail"]) console.log(k + ":", JSON.stringify(x[k]));
  console.log("av:", JSON.stringify((x.approach_variants || []).map((v) => ({ name: v.name, via: v.viaRouteId, vp: v.viaPitches }))));
  console.log("itin:", JSON.stringify(x.itinerary).slice(0, 700));
}
