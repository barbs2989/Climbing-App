// Castle Peak (Pasayten, 8,343 ft) is on the updated "Washington Top 100" list, NOT the Bulgers
// (the published Bulger list, research-data/list-pages-2026-11-26/bulgers-reconciled.json, omits it
// in all five copies). Its route carried a Bulger tag in `lists`, so it drew a Bulgers chip after the
// roster stopped counting it. Re-tag it with the Top 100 wording the wa_top100_elev chip reads.
//   node scripts/oneoff/retag-castle-peak-top100.mjs
import fs from "node:fs";
import { patchRow, SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";
const ID = "wa_castle_peak_pasayten_scramble";
const key = requireServiceKey();
const [before] = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,lists&id=eq.${ID}`, { headers: headers(key) })).json();
if (!before || before.area_id !== "wa_castle_peak_pasayten") throw new Error("row not where expected: " + JSON.stringify(before));
fs.writeFileSync("research-data/list-pages-2026-11-26/rollback-castle-peak-lists.json", JSON.stringify(before, null, 1));
const after = await patchRow("routes", ID, { lists: ["Top 100 Washington Peaks by Elevation"] });
console.log("before", JSON.stringify(before.lists), "after", JSON.stringify(after.lists));
