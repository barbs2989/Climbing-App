// Patch for a route whose documented descent is "rappel the line of ascent, one rappel per belay".
//   node scripts/oneoff/rappel-perpitch.mjs <route_id> <count> <anchor> <rope> <rappels text> [note]
// Station n starts at the top of pitch (count-n+1) and goes down that pitch; the last reaches the
// ground. No lengths: none are invented. Writes $PATCH_DIR/<id>.json for rappel-route.mjs apply.
import fs from "fs";
import path from "path";
import { SUPABASE_URL, headers, requireServiceKey } from "../lib/supabase-env.mjs";

const [id, countArg, anchor, rope, rappels, note] = process.argv.slice(2);
const count = +countArg;
if (!(count > 0)) throw new Error("count must be a positive number");
const dir = process.env.PATCH_DIR || "/Users/nathanbarber/.claude/jobs/5f66ec87/tmp/patches";
const key = requireServiceKey();
const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=id,area_id`, { headers: headers(key) })).json();
if (!Array.isArray(rows) || rows.length !== 1) throw new Error(`no single row for ${id}`);
const d = [];
for (let n = 1; n <= count; n++) {
  const p = count - n + 1;
  d.push({ n, lengthM: null, anchor,
    station: `The anchor at the top of pitch ${p}.`,
    notes: `Rappel ${n} of ${count} on ${rope}, down pitch ${p}${n === count ? " to the ground" : ` to the anchor at the top of pitch ${p - 1}`}.` });
}
const set = { rappel_detail: d, rappels };
if (note) set.rappel_count_note = note;
fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ id, area_id: rows[0].area_id, stations: count, set }, null, 1));
console.log(`${id}: ${count} per-pitch stations`);
