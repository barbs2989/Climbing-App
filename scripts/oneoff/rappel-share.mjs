// Write patches that give routes sharing one descent the same verified rap-by-rap table.
//   node scripts/oneoff/rappel-share.mjs <from_route_id> <rappels text> <to_id> [<to_id> …]
// The rappels text is the summary line every target gets; each target keeps its own descent prose.
// Patches land in $PATCH_DIR (default the job scratch dir) for rappel-route.mjs apply.
import fs from "fs";
import path from "path";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const [from, rappels, ...to] = process.argv.slice(2);
const dir = process.env.PATCH_DIR || "/Users/nathanbarber/.claude/jobs/5f66ec87/tmp/patches";
const key = requireServiceKey();
const get = async (id) => {
  const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,area_id,rappel_detail,rappel_count_note`, { headers: headers(key) })).json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error(`no single row for ${id}`);
  return rows[0];
};
const src = await get(from);
if (!Array.isArray(src.rappel_detail) || !src.rappel_detail.length) throw new Error(`${from} has no table to share`);
for (const id of to) {
  const t = await get(id);
  const p = { id, area_id: t.area_id, stations: src.rappel_detail.length,
    set: { rappel_detail: src.rappel_detail, rappels, rappel_count_note: src.rappel_count_note } };
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(p, null, 1));
  console.log(`${id} <- ${from} (${p.stations} stations, area ${t.area_id})`);
}
