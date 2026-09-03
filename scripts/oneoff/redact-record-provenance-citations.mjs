// The "says the word SOURCE to a climber" family - buckets C and D of
// `scripts/oneoff/classify-remaining-citation-findings.mjs`, which is 30 of the 61 route-prose
// findings `audit:prose-citations` reports for WA.
//
// These are the app-facing half of the no-sources rule. Bucket A (31) is publisher names, and
// reading all of those out shows they are already-decided KEEPS - clubs named as the OPERATOR of a
// trip, named grading scales, and guidebooks a climber is told to CARRY. See
// memory/citation-audit-count-is-mostly-decided-keeps.md. Nothing here touches bucket A.
//
// THE REPAIR RULE, from the sweep's own history: keep the fact AND keep the uncertainty, drop only
// the sourcing. A hedge is CONTENT - "the lengths are estimated" warns a party not to rig to them -
// so "Sources describe two 60m ropes" becomes "Two separate 60m ropes are commonly used", never
// "two 60m ropes". Deleting the hedge makes the record read MORE certain than it is, which is worse
// than the leak.
//
// THREE ARE DECLARED KEEPS rather than edits, each for a reason already on record:
//   * wa_forbidden_peak_north_ridge  seasonal_hazards - the NWAC note explaining that no daily
//     forecast covers this route's summer window. NWAC is a LIVE reference (the thing a climber
//     should go and check), and the sentence exists to stop a reader treating a qualitative rating
//     as a forecast. Open product decision #5 answered this class as KEEP.
//   * wa_inner_constance_standard  seasonal_hazards - the same sentence about the Olympics zone.
//   * wa_mount_lincoln_standard  approach - "verified via NPS trail conditions, updated 6/5/26"
//     dates a live trail closure to the land manager that issued it. `audit:expiring-closures`
//     asks for exactly that: date it or drop the claim.
//
// Safety contract, unchanged from the earlier batches in this sweep:
//   * every edit declares the EXACT text it expects to find; nothing is invented
//   * a `find` that does not match EXACTLY ONCE across the column's string leaves is refused
//   * all-or-nothing: one refusal aborts the whole run before any write
//   * writes go through patchRow (throws unless exactly one row came back)
//   * every written value is re-read and re-checked afterwards
//
// AND ONE THING THE EARLIER BATCHES DID NOT DO: the staged value is run back through the audit's
// OWN needle, lifted by anchor. "The find text is gone" is a weaker post-condition than "this value
// no longer fires" - a rewrite that swapped one sourcing phrase for another would satisfy the first
// and not the second. Lifted rather than copied, so it cannot fossilise the way the classifier
// beside it did.
//
// Dry run by default. Pass --apply to write.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ---- the audit's own verdict, lifted (never retyped) ----
const src = fs.readFileSync(path.join(ROOT, "scripts/audit-prose-citations.mjs"), "utf8");
const lift = (n) => {
  const m = src.match(new RegExp("^const " + n + " ?= ?(/.*/[a-z]*);$", "m"));
  if (!m) { console.error("ANCHOR LOST: " + n + " - the audit moved; re-anchor before trusting this run."); process.exit(1); }
  return eval(m[1]);
};
const NAMED = lift("NAMED"), ACT = lift("ACT"), CREDIT_FIELD = lift("CREDIT_FIELD"), CN = lift("COMMON_NOUN");
const de = (t) => t.replace(CN, (m) => "x".repeat(m.length));
const firesFor = (col, t) => {
  const x = de(t);
  return CREDIT_FIELD.test(col) ? ACT.test(x) : (NAMED.test(x) || ACT.test(x));
};

const DASH = "—";  // em dash, as the catalog writes it
const NDASH = "–"; // en dash

// { id, col, find, repl, note? }   note = why this is a rewrite rather than a deletion.
const EDITS = [
  // ---- separable: the sentence reads unchanged with the sourcing clause removed ----
  {
    id: "wa_baring_mountain_south_route", col: "detailed_rack",
    find: ", and several sources note that when the summit-block heather is wet",
    repl: ", and when the summit-block heather is wet",
  },
  {
    id: "wa_cardinal_peak_se_slopes", col: "emergency",
    find: "Contact numbers sourced from Chelan County and USFS sites; always call 911 first",
    repl: "Always call 911 first",
    note: "the numbers themselves are the live reference and survive; where we checked them is provenance of our record.",
  },
  {
    id: "wa_crater_mountain_standard_route", col: "approach_variants",
    find: " with about 6,300 ft of gain, corroborated by three accounts.",
    repl: " with about 6,300 ft of gain.",
    note: "\"commonly given as\" already carries the hedge, so the corroboration clause adds nothing a climber can use.",
  },
  {
    id: "wa_dragontail_peak_backbone_ridge", col: "rappel_count_note",
    find: " via the east ledges and summit gully, confirmed by independent trip reports.",
    repl: " via the east ledges and summit gully.",
  },
  {
    id: "wa_mix_up_peak_east_face", col: "pitch_detail",
    find: "the technical crux of the route, confirmed by multiple trip reports as beginning about 100 ft below the top",
    repl: "the technical crux of the route, beginning about 100 ft below the top",
  },
  {
    id: "wa_mount_lincoln_standard", col: "emergency",
    find: " (verified via macecom.org)",
    repl: "",
    note: "the dispatch number is the operational fact and stays; the site we checked it against is not.",
  },
  {
    id: "wa_mount_mathias_scramble", col: "detailed_rack",
    find: "a helmet (required per multiple sources)",
    repl: "a helmet (required)",
  },
  {
    id: "wa_mount_pugh_pika_slab", col: "approach",
    find: " (sources differ slightly)",
    repl: "",
    note: "the RANGE is the uncertainty here - \"roughly 12.5-14 miles\" says the same thing without the sourcing.",
  },
  {
    id: "wa_north_gardner_mountain_southwest", col: "emergency",
    find: " (verified via Okanogan County government site)",
    repl: "",
  },
  {
    id: "wa_south_early_winter_spire_direct_east_buttress", col: "approach",
    find: "This on-file entry already notes the Blue Lake basin gully approach; the fuller picture from route sources: park at the ",
    repl: "Park at the ",
    note: "an editor-to-editor preamble as well as a citation - the sentence is about our record, not the mountain.",
  },

  // ---- the sourcing IS the verb: the clause is re-made around the fact ----
  {
    id: "wa_amphitheater_mountain_middle_finger_buttress_right_side", col: "rope_note",
    find: "No source gives explicit rope beta for this route.",
    repl: "No rope beta is on file for this route itself.",
    note: "a documented NEGATIVE, which is evidence and must survive; only the word source goes. The trailing \"by inference, not direct confirmation\" is the hedge and is untouched.",
  },
  {
    id: "wa_baring_mountain_r1", col: "detailed_rack",
    find: "No published trip report gives an exact cam-by-cam list for this specific route, so this is a reasoned inference from route character rather than a direct source:",
    repl: "No exact cam-by-cam list is on file for this specific route, so the rack below is a reasoned inference from route character rather than a documented one:",
    note: "the rack is INFERRED and the value says so - that hedge is the most useful thing in it. Only the sourcing frame changes.",
  },
  {
    id: "wa_bears_breast_mountain_southwest_face", col: "detailed_rack",
    find: "were adequate for the whole route in the source trip report.",
    repl: "were adequate for the whole route on one recorded ascent.",
    note: "\"one recorded ascent\" keeps what mattered - this is one party's rack, not an established one.",
  },
  {
    id: "wa_burnt_boot_peak_north_ridge", col: "best_season",
    find: ", though no source gives a specific season for this line.",
    repl: ", though no specific season is recorded for this line.",
  },
  {
    id: "wa_cathedral_peak_last_rites", col: "watch_out",
    find: "Crossing it here is illegal and, per multiple climbing sources, heavily fined",
    repl: "Crossing it here is illegal and reportedly heavily fined",
    note: "\"reportedly\" keeps the hedge on the fine, which is the part we are least sure of.",
  },
  {
    id: "wa_concerto_in_c_for_drill_and_hammer", col: "rappel_count_note",
    find: "As a bound rather than a source:",
    repl: "As a bound rather than a claim:",
    note: "the rest of this value is a documented negative plus an arithmetic bound, both of which are content.",
  },
  {
    id: "wa_courtney_peak_scramble", col: "rope_note",
    find: "; described as a simple, non-technical scramble in multiple sources.",
    repl: "; a simple, non-technical scramble.",
  },
  {
    id: "wa_dirty_sanchez", col: "rope_note",
    find: "Sources describe using two separate 60m ropes on this route",
    repl: "Two separate 60m ropes are commonly used on this route",
    note: "the publisher was the sentence's SUBJECT, so the clause is re-made around the ropes.",
  },
  {
    id: "wa_mount_adams_south_climb", col: "rope_note",
    find: " Multiple sources confirm 'climbing gear is optional.'",
    repl: " Technical climbing gear is optional.",
    note: "a quotation cannot survive its speaker - left in place the marks would cite nobody and read as scare quotes.",
  },
  {
    id: "wa_mount_price_north_route", col: "rope_note",
    find: "No route-specific beta found; regional Olympic High Route sources describe similar terrain in this area as 'mostly Class 2-3,' consistent",
    repl: "No route-specific beta is on file; similar terrain along the Olympic High Route in this area is generally mostly Class 2-3, consistent",
    note: "the hedge is that this describes NEIGHBOURING terrain rather than the route, and that survives verbatim.",
  },
  {
    id: "wa_raven_ridge_standard_route", col: "approach",
    find: " miles depending on the source's starting point)",
    repl: " miles depending on where you start measuring)",
    note: "the parenthetical EXPLAINS a 1.4-9.4 mile spread. Deleting it would leave a wild range with no reason for it.",
  },
  {
    id: "wa_saber", col: "approach_variants",
    find: "rated 5.4 to 5.6 depending on the source",
    repl: "rated anywhere from 5.4 to 5.6",
    note: "the DISAGREEMENT about the grade is the point - the next sentence warns the polish makes it climb harder than either number.",
  },
  {
    id: "wa_south_face_12", col: "detailed_rack",
    find: "; no source describes needing anything larger.",
    repl: "; nothing larger is recorded as needed.",
  },
  {
    id: "wa_south_ridge", col: "rappel_count_note",
    find: " and is corroborated by beta for the similarly-named South Peak formation at Big Kangaroo, which describes reversing its climb in three raps on a single 60m rope.",
    repl: "; the similarly-named South Peak formation at Big Kangaroo reverses its climb in three raps on a single 60m rope.",
    note: "the corroborating record is ANOTHER ROUTE IN THIS CATALOG, not a publisher - so it is kept as a statement about that route.",
  },
  {
    id: "wa_three_queens_west_peak", col: "detailed_rack",
    find: "; the source report does not describe roped pitches or fixed protection.",
    repl: "; no roped pitches or fixed protection are recorded.",
  },

  // ---- a quotation whose speaker this batch removes ----
  {
    id: "wa_flora_mountain_southwest_slope", col: "hazards",
    find: "is described in multiple sources as a 'desolate pile of loose gneiss,' producing",
    repl: "is a desolate pile of loose gneiss, producing",
    note: "a quotation cannot survive its speaker. The description is uncontested and becomes the route's own statement.",
  },
  {
    id: "wa_earl_peak_southwest_ridge", col: "pitch_detail",
    find: " (source: 'we still had .73 miles with about 900\\' to go... not technical at all, only the last bit up the summit block has any difficulty')",
    repl: " " + DASH + " from the saddle it is roughly 0.73 miles and about 900 ft of gain to the top",
    note: "the quote's only FACT is the distance and gain from the saddle, which is kept; the rest restates the sentence it hangs off.",
  },
];

const COLS = [...new Set(EDITS.map((e) => e.col))];
const IDS = [...new Set(EDITS.map((e) => e.id))];

function countIn(v, find) {
  if (typeof v === "string") return v.split(find).length - 1;
  if (Array.isArray(v)) return v.reduce((n, x) => n + countIn(x, find), 0);
  if (v && typeof v === "object") return Object.values(v).reduce((n, x) => n + countIn(x, find), 0);
  return 0;
}
function replaceIn(v, find, repl) {
  if (typeof v === "string") return v.split(find).join(repl);
  if (Array.isArray(v)) return v.map((x) => replaceIn(x, find, repl));
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = replaceIn(x, find, repl);
    return o;
  }
  return v;
}
function leaves(v, out = []) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => leaves(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => leaves(x, out));
  return out;
}

const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=id,${COLS.join(",")}`;
const r = await fetch(url, { headers: headers(KEY) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (rows.length !== IDS.length) {
  console.error(`read returned ${rows.length} row(s) for ${IDS.length} id(s) - refusing`);
  process.exit(1);
}
const byId = new Map(rows.map((x) => [x.id, x]));

// Accumulate per (id, col): two edits on one column must BOTH land, so each builds on the previous
// edit's result rather than on a fresh copy of the original. An earlier batch in this sweep lost 2
// of 11 edits to exactly that bug, and only the verify re-read caught it.
const staged = new Map();
const refusals = [];
for (const e of EDITS) {
  const key = `${e.id} ${e.col}`;
  if (!staged.has(key)) staged.set(key, { id: e.id, col: e.col, value: byId.get(e.id)[e.col], edits: [] });
  const s = staged.get(key);
  const n = countIn(s.value, e.find);
  if (n !== 1) {
    refusals.push(`${e.id} ${e.col}: found ${n} occurrence(s) of ${JSON.stringify(e.find)}, expected exactly 1`);
    continue;
  }
  s.value = replaceIn(s.value, e.find, e.repl);
  s.edits.push(e);
}
if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} edit(s) did not match exactly once:\n  ` + refusals.join("\n  "));
  console.error("\nNothing was written. Re-read the live value before changing the declaration.");
  process.exit(1);
}

// POST-CONDITION: every leaf this batch TOUCHED must stop firing the audit's own needle. A rewrite
// that traded one sourcing phrase for another passes the find/repl check and fails this one.
const stillFires = [];
for (const s of staged.values()) {
  const before = new Set(leaves(byId.get(s.id)[s.col]));
  for (const l of leaves(s.value)) {
    if (before.has(l)) continue;                 // untouched leaf; not this batch's subject
    if (firesFor(s.col, l)) stillFires.push(`${s.id} ${s.col}: rewritten leaf STILL fires: ${l.slice(0, 160)}`);
  }
}
if (stillFires.length) {
  console.error(`REFUSED - ${stillFires.length} rewritten value(s) still trip the audit:\n  ` + stillFires.join("\n  "));
  process.exit(1);
}

// Print the RESULTING sentence, not just the edit. A deletion can leave a dangling connective or a
// doubled space, and neither is visible from the find/repl pair alone - an earlier sweep in this
// series stranded an "and that" clause exactly that way.
for (const s of staged.values()) {
  console.log(`\n### ${s.id}  ${s.col}`);
  for (const e of s.edits) {
    console.log(`   - ${JSON.stringify(e.find)}`);
    console.log(`   + ${JSON.stringify(e.repl)}`);
    if (e.note) console.log(`     why: ${e.note}`);
  }
  const before = new Set(leaves(byId.get(s.id)[s.col]));
  for (const l of leaves(s.value)) if (!before.has(l)) console.log(`   => ${l}`);
}
console.log(`\n${EDITS.length} edit(s) across ${staged.size} column(s) on ${IDS.length} route(s).`);
console.log("post-condition: every rewritten leaf re-checked against the audit's own needle - clean.");

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const s of staged.values()) { await patchRow("routes", s.id, { [s.col]: s.value }); wrote++; }
console.log(`\nwrote ${wrote} column(s).`);

// Verify by re-reading: a 200 is not evidence the data changed.
const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const e of EDITS) {
  const n = countIn(after.get(e.id)[e.col], e.find);
  if (n !== 0) { console.error(`NOT APPLIED: ${e.id} ${e.col} still contains ${JSON.stringify(e.find)}`); bad++; }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} edit(s) did not land.` : `\nverified: all ${EDITS.length} edit(s) re-read clean.`);
process.exit(bad ? 1 : 0);
