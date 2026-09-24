// Repairs approach_logistics.trailheadDirection on the rows listed in
// research-data/trailhead-direction-repair-2026-09-24.json.
//
// The field renders in the TRAILHEAD card under the trailhead's name, and the contribute form
// labels it "Driving directions". 230 rows carried the WALK instead — "backpack ~13 miles via the
// Whistler Cutoff", "Skyline Trail to Camp Muir", a bare "North". Each row's `new` is the drive
// part cut out of `old` (never new prose), or null, which removes the key: the card then shows the
// trailhead name, its coordinates and "Drive here", and the walk is still on the route's approach.
//
//   node scripts/oneoff/apply-trailhead-direction-repair.mjs --dry   # report only
//   node scripts/oneoff/apply-trailhead-direction-repair.mjs         # write
//   node scripts/oneoff/apply-trailhead-direction-repair.mjs --rollback
//
// Fails closed, row by row:
//   - the live value must still equal `old` (or `new`, if already applied) — a row somebody edited
//     since the review is skipped and REPORTED, never overwritten;
//   - a row is only cleared when its own `approach` is substantial, so the walk is not deleted
//     from the page, only moved out of the wrong box;
//   - every `new` must pass trailheadDirectionProblem(), the same test check:trailhead-direction-shape runs.
// Afterwards every row is re-read and reconciled; a 200 is not evidence the data changed.
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { trailheadDirectionProblem } from "../../lib/trailheadDirectionShape.js";

const DRY = process.argv.includes("--dry");
const ROLLBACK = process.argv.includes("--rollback");
const doc = JSON.parse(fs.readFileSync(new URL("../../research-data/trailhead-direction-repair-2026-09-24.json", import.meta.url)));
const key = requireServiceKey();

async function readRows(ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 50) {
    const q = ids.slice(i, i + 50).map(encodeURIComponent).join(",");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,approach,approach_logistics&id=in.(${q})`, { headers: headers(key) });
    if (!res.ok) throw new Error(`read -> ${res.status} ${(await res.text()).slice(0, 200)}`);
    for (const r of await res.json()) out.set(r.id, r);
  }
  return out;
}

const rows = doc.rows.map(r => ROLLBACK ? { id: r.id, from: r.new, to: r.old } : { id: r.id, from: r.old, to: r.new });
for (const r of rows) {
  if (!ROLLBACK && r.to != null && trailheadDirectionProblem(r.to)) throw new Error(`${r.id}: replacement fails the shape test (${trailheadDirectionProblem(r.to)}): ${r.to}`);
}
const live = await readRows(rows.map(r => r.id));
if (live.size !== rows.length) throw new Error(`read ${live.size} of ${rows.length} rows — refusing to write against a partial read`);

let wrote = 0, already = 0;
const skipped = [];
for (const r of rows) {
  const row = live.get(r.id);
  const al = row.approach_logistics || {};
  const cur = Object.prototype.hasOwnProperty.call(al, "trailheadDirection") ? al.trailheadDirection : null;
  if (cur === r.to) { already++; continue; }
  if (cur !== r.from) { skipped.push(`${r.id}: live value changed since review — ${JSON.stringify(cur).slice(0, 90)}`); continue; }
  if (!ROLLBACK && r.to == null && (row.approach || "").trim().length < 50) { skipped.push(`${r.id}: would clear, but its approach is ${(row.approach || "").trim().length} chars — the walk would leave the page`); continue; }
  const next = { ...al };
  if (r.to == null) delete next.trailheadDirection; else next.trailheadDirection = r.to;
  if (DRY) { wrote++; continue; }
  await patchRow("routes", r.id, { approach_logistics: next });
  wrote++;
}
console.log(`${DRY ? "[dry] would write" : "wrote"} ${wrote}, already done ${already}, skipped ${skipped.length}`);
for (const s of skipped) console.log("  SKIP " + s);
if (DRY) process.exit(skipped.length ? 1 : 0);

const after = await readRows(rows.map(r => r.id));
let ok = 0;
const wrong = [];
for (const r of rows) {
  const al = after.get(r.id).approach_logistics || {};
  const cur = Object.prototype.hasOwnProperty.call(al, "trailheadDirection") ? al.trailheadDirection : null;
  if (cur === r.to) ok++; else if (!skipped.some(s => s.startsWith(r.id + ":"))) wrong.push(r.id);
}
console.log(`re-read: ${ok} of ${rows.length} rows hold the target value${wrong.length ? `; WRONG: ${wrong.join(" ")}` : ""}`);
process.exit(wrong.length || skipped.length ? 1 : 0);
