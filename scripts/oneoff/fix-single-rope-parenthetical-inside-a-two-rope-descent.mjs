// A single-rope setup offered in brackets, inside a descent every other field says needs two ropes.
//
// wa_lincoln_peak_standard's descent_text reads:
//
//   "Bring a rope long enough to rappel on doubled strands (A SINGLE 60M ROPE DOUBLED, GIVING ~30M PER
//    RAPPEL, IS THE COMMONLY CITED SETUP) plus spare cord/webbing for building or backing up anchors..."
//
// Six other fields on the same row say the opposite, and say it consistently:
//   rope_type      "two ropes (glacier travel + rappel)"
//   gear           "two 60m glacier ropes"
//   rack           "Two 60m glacier ropes"
//   detailed_rack  "Two 60-meter dynamic ropes are standard."
//   rope_note      "Descent requires roughly 10 double-rope rappels."
//   rappels        "~10 double-rope (60m) rappels on descent, from pickets, a ro..."
//   descent_text   (same field, earlier) "...describes 10 double-rope rappels..."
//
// A DOUBLE-ROPE RAPPEL ON TWO 60 M ROPES IS 60 M. A single 60 m rope doubled reaches 30 m. A party that
// believes the parenthetical arrives at the end of its rope 30 m above a station rigged for twice that,
// on a real rappelling descent the row itself calls "not a walk-off". This is the rope-off-the-end class
// in its most direct form: the wrong option and the right one in a single sentence, with the wrong one
// given as what people actually do.
//
// THE REPAIR DELETES THE BRACKET AND NOTHING ELSE. The sentence still reads "Bring a rope long enough to
// rappel on doubled strands plus spare cord/webbing...", and the six fields naming two 60 m ropes are
// untouched. No rope, length or count is typed by this script.
//
// SCOPED TO ONE ROW BY EVIDENCE, NOT BY NAME: the script requires at least three other fields on the row
// to state a two-rope or double-rope descent before it will delete a single-rope claim, and re-asserts
// that at apply time. A row whose fields genuinely describe a single-rope descent cannot be touched.
//
// A SIBLING FINDING IS REPORTED AND NOT ACTED ON. wa_live_free_or_die's descent_text says "rappel with
// two ropes off a fixed pin/wire" while its what_to_bring and detailed_rack name one 70 m rope and
// nothing else — the second rope needed to get off the wall is in no gear field. That is an INCOMPLETE
// packing list rather than a false statement, and completing it means composing a gear item rather than
// deleting a wrong one, which is the line every repair in this session has stayed behind.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_lincoln_peak_standard";
// the bracketed single-rope claim, matched as a whole
const BRACKET = /\s*\(a single 60m rope doubled, giving ~?30m per rappel, is the commonly cited setup\)/i;
// what the rest of the row must say for the deletion to be justified
const TWO = /two ropes|two 60|double[- ]rope|2\s*x\s*60/i;
const txt = v => Array.isArray(v) ? v.join(" | ") : (typeof v === "string" ? v : "");

const r = (await selectAll("routes", "id,rope_type,rappels,rope_note,gear,rack,detailed_rack,what_to_bring,descent_text", `id=eq.${TARGET}`, { pageSize: 5 }))[0];
if (!r) { console.error(`${TARGET} not found — refusing`); process.exit(1); }
const dt = String(r.descent_text || "");
if (!BRACKET.test(dt)) { console.log("nothing to do — the single-rope parenthetical is already gone."); process.exit(0); }
if (dt.split(BRACKET).length - 1 !== 1) { console.error("the parenthetical appears more than once — refusing"); process.exit(1); }

const agree = [["rope_type", r.rope_type], ["rappels", r.rappels], ["rope_note", r.rope_note],
  ["gear", txt(r.gear)], ["rack", txt(r.rack)], ["detailed_rack", r.detailed_rack], ["what_to_bring", txt(r.what_to_bring)]]
  .filter(([, v]) => typeof v === "string" && TWO.test(v));
console.log(`fields on this row stating a TWO-rope / double-rope descent: ${agree.length}`);
for (const [k, v] of agree) console.log(`   ${k}: ${JSON.stringify(String(v).slice(0, 110))}`);
if (agree.length < 3) { console.error("\nfewer than three fields corroborate a two-rope descent — refusing"); process.exit(1); }

const after = dt.replace(BRACKET, "");
if (after.length >= dt.length) { console.error("the edit did not shorten the value — refusing"); process.exit(1); }
if (/single 60m rope doubled/i.test(after)) { console.error("the single-rope claim survives the edit — refusing"); process.exit(1); }
const i = dt.search(BRACKET);
console.log(`\n  ${TARGET}.descent_text`);
console.log(`     from ...${JSON.stringify(dt.slice(Math.max(0, i - 60), i + 130))}`);
console.log(`     to   ...${JSON.stringify(after.slice(Math.max(0, i - 60), i + 70))}`);
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

await patchRow("routes", TARGET, { descent_text: after });
const a = (await selectAll("routes", "id,descent_text", `id=eq.${TARGET}`, { pageSize: 5 }))[0];
console.log(!/single 60m rope doubled/i.test(String(a.descent_text || ""))
  ? "verified: the descent no longer offers a single 60 m rope for stations its own row rigs at 60 m"
  : "NOT APPLIED");
