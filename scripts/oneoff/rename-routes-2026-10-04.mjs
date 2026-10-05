// Rename two WA routes whose name contradicts the (repaired) row. The old name is backed up beside the
// route-row-repair backups and every write is re-read.  node scripts/oneoff/rename-routes-2026-10-04.mjs [--apply]
//   wa_mount_queets_south: "South Slopes" -> "North Ridge" — every column of the row (approach variant
//     "Elwha Basin and Dodwell-Rixon Pass to the north ridge", the pins, the prose) is the north ridge.
//   wa_mount_hopper_standard: "Standard Scramble (First Divide / Marmot Lake approach)" -> "Standard Scramble"
//     — the name named two approaches; the row follows one, and the approach picker carries the rest.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll, patchRow } from "../lib/supabase-env.mjs";
const RENAME = { wa_mount_queets_south: "North Ridge", wa_mount_hopper_standard: "Standard Scramble" };
const APPLY = process.argv.includes("--apply");
const BK = path.join(path.dirname(fileURLToPath(import.meta.url)), "route-row-repairs-2026-10-01", "name-backups");
fs.mkdirSync(BK, { recursive: true });
for (const [id, name] of Object.entries(RENAME)) {
  const [r] = await selectAll("routes", "id,name,area_id", `id=eq.${id}`, { pageSize: 2 });
  if (!r) { console.log(`SKIP ${id}: no such route`); continue; }
  const sib = await selectAll("routes", "id,name", `area_id=eq.${r.area_id}`, { pageSize: 50 });
  if (sib.some((s) => s.id !== id && s.name === name)) { console.log(`REFUSED ${id}: another route on ${r.area_id} is already named "${name}"`); continue; }
  console.log(`${id}: "${r.name}" -> "${name}"`);
  if (!APPLY) continue;
  const bf = path.join(BK, id + ".json");
  if (!fs.existsSync(bf)) fs.writeFileSync(bf, JSON.stringify({ id, name: r.name }, null, 1));
  await patchRow("routes", id, { name });
  const [back] = await selectAll("routes", "id,name", `id=eq.${id}`, { pageSize: 2 });
  console.log(back.name === name ? "  landed" : `  MISMATCH: reads "${back.name}"`);
}
if (!APPLY) console.log("dry run — nothing written");
