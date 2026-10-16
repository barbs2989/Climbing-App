// Two rappel notes now describe a table that no longer exists — and I am the one who changed it.
//
// #1245 nulled 57 invented station lengths. On two of the four routes that lost EVERY number, the
// count note still says the lengths "are estimated here" / "are estimated as roughly one pitch
// each" — a claim about what the table shows, made false by the change that emptied it. Found by
// reading the live app after the merge, not by a needle.
//
// This is the exact defect class #1245 exists for, committed by #1245: prose describing data,
// where the data moved and the prose did not. It is also the mirror of the trap that PR records —
// there, rewriting the prose blinded a detector; here, changing the data stranded the prose. The
// general lesson is the same: a sentence about the numbers has to be re-read whenever the numbers
// are touched.
//
// THE PLANNING GUIDANCE IS KEPT. "Expect single-rope-length rappels" and "roughly one pitch each"
// are useful and true — they tell a climber what rope to bring. Only the claim that a figure is
// displayed goes. Each edit is a literal find/replace asserted to match exactly once, so a row
// that has moved since this was written is refused rather than overwritten.
import { loadEnv, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const env = loadEnv();
const U = env.VITE_SUPABASE_URL;
const K = APPLY ? requireServiceKey() : env.VITE_SUPABASE_ANON_KEY;
const H = { apikey: K, Authorization: `Bearer ${K}` };

const EDITS = [
  {
    id: "wa_northeast_ridge_1963_route",
    from: "Per-rappel lengths are not individually documented and are estimated here as typical single-rope-length rappels;",
    to: "Per-rappel lengths are not individually documented, so none are given here — plan on typical single-rope-length rappels;",
  },
  {
    id: "wa_south_ridge",
    from: "Per-rappel lengths are not documented and are estimated as roughly one pitch each.",
    to: "Per-rappel lengths are not documented, so none are given here — plan on roughly one pitch each.",
  },
];

const cur = new Map(); const fails = []; const skipped = [];
for (const e of EDITS) {
  const [row] = await (await fetch(`${U}/rest/v1/routes?id=eq.${e.id}&select=id,rappel_count_note,rappel_detail`, { headers: H })).json();
  if (!row) { fails.push(`${e.id}: no row`); continue; }
  const note = row.rappel_count_note || "";
  if (note.includes(e.to)) { skipped.push(e.id); continue; }          // idempotent
  const n = note.split(e.from).length - 1;
  if (n !== 1) { fails.push(`${e.id}: expected its note to contain the phrase exactly once, found ${n}`); continue; }
  // The premise of the edit: this table really does show no numbers.
  const numbered = (row.rappel_detail || []).filter((s) => typeof s.lengthM === "number").length;
  if (numbered) { fails.push(`${e.id}: still has ${numbered} numbered station(s) — the note is NOT stale, do not rewrite it`); continue; }
  cur.set(e.id, note);
}
if (fails.length) {
  console.error("REFUSING TO WRITE — rows are not what this was written against:");
  for (const f of fails) console.error("  - " + f);
  process.exit(1);
}
for (const s of skipped) console.log(`  (already repaired, skipped) ${s}`);
for (const e of EDITS) {
  if (!cur.has(e.id)) continue;
  console.log(`### ${e.id}`);
  console.log(`  - …${e.from}…`);
  console.log(`  + …${e.to}…\n`);
}
if (!cur.size) { console.log("nothing to change."); process.exit(0); }
if (!APPLY) { console.log("DRY RUN — pass --apply to write."); process.exit(0); }

let bad = 0;
for (const e of EDITS) {
  if (!cur.has(e.id)) continue;
  await patchRow("routes", e.id, { rappel_count_note: cur.get(e.id).split(e.from).join(e.to) });
  const [after] = await (await fetch(`${U}/rest/v1/routes?id=eq.${e.id}&select=rappel_count_note`, { headers: H })).json();
  const got = after.rappel_count_note || "";
  if (!got.includes(e.to) || got.includes(e.from)) { console.log(`  MISMATCH ${e.id}`); bad++; }
  else console.log(`  ok ${e.id}`);
}
console.log(bad ? `\n${bad} did not take` : "\nall verified on re-read");
process.exit(bad ? 1 : 0);
