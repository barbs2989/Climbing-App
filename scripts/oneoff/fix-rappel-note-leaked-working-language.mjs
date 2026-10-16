// I wrote a maintainer's changelog into a column that RENDERS TO CLIMBERS.
//
// #1043 nulled four unsupported rappel lengths on wa_west_face_2 and recorded WHY in
// `rappel_count_note`. That column is not a comment field -- CLAUDE.md describes it as "a note
// above the rappel table saying how the count was derived", and SSR confirms it renders inside
// the RAPPELS section on the Planner tab.
//
// So the note put on screen: a dated changelog entry, a repo file path
// (research-data/RAPPEL-ROPE-CONFIG-TRIAGE-...), an implementation detail ("RappelTable prints
// an em dash for a null length"), an instruction addressed to a maintainer ("Restore a figure
// only from a source that publishes..."), and -- worst -- a restatement of the exact
// "50/50/50/20 m" figure the change existed to remove. I took the unreachable number out of the
// table and put it back in prose one line above it.
//
// That is the `verif.source` defect this repo already records: an internal review note that
// leaked working language at climbers. The reasoning belongs in the triage writeup, where it
// already is.
//
// The replacement says the same true thing to a climber, in a climber's terms, without the
// number, the path, or the date.
import { loadEnv, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const env = loadEnv();
const U = env.VITE_SUPABASE_URL;
const K = requireServiceKey();
const H = { apikey: K, Authorization: `Bearer ${K}` };
const ID = "wa_west_face_2";

const NEW_NOTE =
  "Individual rappel lengths are unconfirmed: this route's descent description and its rappel "
  + "table disagree about them, so no per-station distance is given here. Plan the descent from "
  + "the written description and the rope listed under gear.";

const res = await fetch(`${U}/rest/v1/routes?id=eq.${ID}&select=id,rappel_count_note`, { headers: H });
const [row] = await res.json();
if (!row) { console.error("no row"); process.exit(1); }

const cur = row.rappel_count_note || "";
if (!/Per-station lengths were removed/.test(cur)) {
  console.error("REFUSING: rappel_count_note is not the note this script was written to replace.");
  console.error("  current: " + cur.slice(0, 160));
  process.exit(1);
}

console.log("BEFORE (renders on screen):\n  " + cur.replace(/\n/g, " ").slice(0, 320) + "\n");
console.log("AFTER:\n  " + NEW_NOTE + "\n");
console.log("removes: the 50/50/50/20 figure, the research-data path, the date, the em-dash");
console.log("         implementation detail, and the instruction addressed to a maintainer.\n");

if (!APPLY) { console.log("DRY RUN -- pass --apply to write."); process.exit(0); }

await patchRow("routes", ID, { rappel_count_note: NEW_NOTE });
const after = await (await fetch(`${U}/rest/v1/routes?id=eq.${ID}&select=rappel_count_note`, { headers: H })).json();
const got = after[0].rappel_count_note;
console.log(got === NEW_NOTE ? "verified on re-read" : "MISMATCH: " + String(got).slice(0, 160));
process.exit(got === NEW_NOTE ? 0 : 1);
