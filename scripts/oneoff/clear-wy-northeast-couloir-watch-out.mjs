// Kagevah Peak's Northeast Couloir (Wind River Range, WY) carried Colchuck Peak's Northeast Couloir hazard list
// (Washington): the Colchuck Glacier, its bergschrund and crevasses, and the three deaths of February 2023.
// A same-name collision; none of it describes the Wyoming line. Found 2026-11-23 by the glacier-travel review.
// A scan of every non-Washington route's watch_out, hazards and what_to_bring for Enchantments names found no
// other (co_old_route's "Dragontail Couloir" is Flattop Mountain's own, in Rocky Mountain National Park).
//
//   node scripts/oneoff/clear-wy-northeast-couloir-watch-out.mjs [--apply]
// Writes a rollback file first; refuses unless the row still holds the Colchuck list.
import "../lib/load-env.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ID = "wy_northeast_couloir";
const h = headers(requireServiceKey());
const read = async () => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,watch_out&id=eq.${ID}`, { headers: h })).json())[0];
const row = await read();
if (!row) throw new Error(ID + " not found");
if (row.area_id !== "wy_kagevah_peak") throw new Error("area is " + row.area_id + ", expected wy_kagevah_peak");
if (row.watch_out === null) { console.log("already clear"); process.exit(0); }
if (!/Colchuck Glacier/.test(JSON.stringify(row.watch_out))) throw new Error("watch_out no longer holds the Colchuck list; read it before writing");
if (!process.argv.includes("--apply")) { console.log("dry run: would clear " + row.watch_out.length + " watch_out items"); process.exit(0); }
const rb = path.join(ROOT, "scripts", "oneoff", `rollback-wy-northeast-couloir-watch-out-${Date.now()}.json`);
fs.writeFileSync(rb, JSON.stringify(row, null, 1));
await patchRow("routes", ID, { watch_out: null });
const after = await read();
if (after.watch_out !== null) throw new Error("re-read: watch_out still set");
console.log("cleared; rollback " + path.relative(ROOT, rb) + "; re-read: watch_out null");
