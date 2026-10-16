// Four rope_note values narrate OUR OWN RECORD to the climber reading them. Re-voice, don't delete.
//
//   "rated 5.0 per source — matches DB's 'Easy 5th' grade well"
//   "(sourced as 5.5/Grade II, DB lists 5.4)"
//   "Class 3-4 (as rated in DB) is typically scrambled unroped"
//   "'The Roof' at DB-listed 5.6 corresponds to one of the two 5.6 lines"
//
// These render in the rope box on the route page. They are not citations -- audit:prose-citations
// catches some of them for the "per source" half and would leave the rest -- they are the
// enrichment pass explaining its own bookkeeping to somebody checking the import.
// audit:note-voice asks this of `waypoints[].note` and of nothing else.
//
// Measured first: 4 values across 12 rendered columns, 11 of the 12 clean
// (measure-pipeline-voice-in-rendered-prose.mjs). A class of four is worth repairing and not
// worth a guard.
//
// EVERY EDIT IS A DECLARED find -> replace PAIR and the run refuses unless `find` occurs EXACTLY
// ONCE in the live value. Nothing is invented: every replacement re-states what the value already
// said, in the app's voice instead of the pipeline's.
//
// NOT A DELETION IN ANY OF THE FOUR, because each welds a real fact to the bookkeeping:
//   - a grade DISAGREEMENT (5.4 vs 5.5) is something a climber wants to know; dropping the
//     parenthetical would make one grade look settled.
//   - the identification uncertainty on `wa_the_roof` matters MOST of all -- it says we are not
//     certain which line this row is, and a climber could otherwise set off up the wrong one.
//     Stating that plainly is more honest than either deleting it or leaving it as a note about
//     our database.
// `wa_the_incisor_scramble`'s "No route-specific trip report found" is deliberately KEPT: a
// documented negative is evidence, and telling a climber the route is undocumented is useful.
import { requireServiceKey, patchRow, selectAll } from "../lib/supabase-env.mjs";

const DRY = process.argv.includes("--dry");
requireServiceKey();

const EDITS = [
  { id: "wa_open_book_2",
    find: "rated 5.0 per source — matches DB's 'Easy 5th' grade well.",
    replace: "rated 5.0." },
  { id: "wa_the_chopping_block_south_route",
    find: "(sourced as 5.5/Grade II, DB lists 5.4)",
    replace: "(graded 5.4-5.5, Grade II)" },
  { id: "wa_the_incisor_scramble",
    find: " (as rated in DB)",
    replace: "" },
  { id: "wa_the_roof",
    find: "Not individually named in the sources found, but matched by elimination: of the ~4 lines on the south face, 'The Roof' at DB-listed 5.6 corresponds to one of the two 5.6 lines.",
    replace: "The south face holds about four lines, two of them 5.6, and which one is 'The Roof' is not settled — check the line before committing to it." },
];

const dead = (w) => { console.error(`\nREFUSED — ${w}. Nothing was written.\n`); process.exit(1); };

const ids = EDITS.map((e) => e.id).join(",");
const rows = await selectAll("routes", "id,rope_note", `id=in.(${ids})`, { pageSize: 50 })
  .catch((e) => dead("the read failed: " + (e && e.message)));
if (!rows || rows.length !== EDITS.length) dead(`read ${rows ? rows.length : 0} row(s), expected ${EDITS.length}`);
const byId = new Map(rows.map((r) => [r.id, r]));

const planned = [];
for (const e of EDITS) {
  const row = byId.get(e.id);
  if (!row) dead(`${e.id} is not in the catalog`);
  const cur = row.rope_note;
  if (typeof cur !== "string") dead(`${e.id}: rope_note is ${typeof cur}, not a string`);
  const n = cur.split(e.find).length - 1;
  if (n !== 1) dead(`${e.id}: rope_note contains the declared text ${n} time(s), expected exactly 1 — the value has changed under this table`);
  const next = cur.replace(e.find, e.replace).replace(/\s{2,}/g, " ").trim();
  if (next === cur) dead(`${e.id}: the replacement is a no-op`);
  if (!next) dead(`${e.id}: the replacement would empty the value`);
  // The whole point is to stop talking about the record, so refuse a replacement that still does.
  if (/\bDB\b|\bdatabase\b|per source\b|\bsourced as\b/i.test(next)) dead(`${e.id}: the replacement still names the record or a source: ${JSON.stringify(next)}`);
  planned.push({ e, before: cur, after: next });
}

console.log(`all ${planned.length} edit(s) validated against the live rows.\n`);
for (const p of planned) {
  console.log(`${p.e.id}`);
  console.log(`  -  ${p.before}`);
  console.log(`  +  ${p.after}\n`);
}
if (DRY) { console.log("--dry: nothing written."); process.exit(0); }

for (const p of planned) {
  await patchRow("routes", p.e.id, { rope_note: p.after })
    .catch((err) => dead(`${p.e.id}: the write failed — ${err && err.message}`));
}
console.log(`wrote ${planned.length} row(s). re-reading…`);

const after = await selectAll("routes", "id,rope_note", `id=in.(${ids})`, { pageSize: 50 })
  .catch((e) => dead("the verification read failed: " + (e && e.message)));
const afterById = new Map(after.map((r) => [r.id, r]));
let bad = 0;
for (const p of planned) {
  const got = afterById.get(p.e.id) && afterById.get(p.e.id).rope_note;
  if (got !== p.after) { console.error(`  MISMATCH ${p.e.id}: ${JSON.stringify(got)}`); bad++; }
}
console.log(bad ? `\n${bad} row(s) did not reconcile.` : `\nall ${planned.length} row(s) reconciled — no rope note talks about the record any more.`);
process.exit(bad ? 1 : 0);
