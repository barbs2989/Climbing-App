// A rope stated as sufficient for a rappel twice its reach, over an open bergschrund.
//
// wa_klawatti_peak_southeast_face's descent_text reads:
//
//   "Expect one rappel of roughly 30m to get past the bergschrund and back onto the glacier —
//    A SINGLE 30M ROPE, or a doubled 60m, is sufficient; no second rappel is typically needed."
//
// A rope doubled through an anchor reaches HALF its length, so a single 30 m rope reaches 15 m. It
// cannot make the 30 m rappel the same sentence describes. The sentence carries the correct answer
// immediately after the wrong one and leads with the wrong one, and two more fields repeat it:
// detailed_rack ("a 30m rope (enough for the single rappel)") and what_to_bring ("30m rope is enough
// for the single rappel over the bergschrund").
//
// This is the worst thing in this dataset to get wrong — a party rigs for a rappel their rope cannot
// make, on a descent whose whole purpose is clearing a bergschrund that has opened up.
//
// THE ROW ANSWERS IT TWICE, so nothing is researched and no rope size is invented:
//   beta          "Crampons, ice axe, pickets, 60M ROPE, and single rack to 2 inch are essential."
//   descent_text  "...or A DOUBLED 60M, is sufficient"
// Every word of the replacement sentence appears in the sentence it replaces; the other two edits are
// a single token, 30 -> 60, and the 60 is read off the row at apply time rather than typed.
//
// check:rappel-lengths IS STRUCTURALLY BLIND TO THIS, which is why it survived. That guard compares a
// rope against the stations in `rappel_detail`, and this row has none — the distance lives only in
// prose. Its rule 2 is also scoped to stations of 50 m or more, deliberately, because 30 is both a rope
// size and the correct half of a 60. Neither decision is wrong; this simply sits outside both.
//
// THE CLASS IS ONE, MEASURED. Scanning every WA descent_text, detailed_rack, rope_note and
// what_to_bring for a sentence that states a rappel length AND offers a single rope reaching less than
// it finds exactly this row. A first version matched a rope length by PROXIMITY to the word "rappel"
// and reported 65 — every one a false positive of the form "a single 60m rope handles both rappels
// DOUBLED", which is correct advice, with the rope's own length read as the rappel's. Requiring the
// rappel length to be stated as such ("rappel of ~30m", "30m rappel") takes it to 1.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_klawatti_peak_southeast_face";
const BAD_SENT = "a single 30m rope, or a doubled 60m, is sufficient";
const GOOD_SENT = "a doubled 60m rope is sufficient";
const BAD_RACK = "a 30m rope (enough for the single rappel)";
const BAD_WTB = "30m rope is enough for the single rappel over the bergschrund";
const THIRTY = /\b30\s*m\s*rope|\ba single 30\s*m/i;

const r = (await selectAll("routes", "id,descent_text,detailed_rack,what_to_bring,beta", `id=eq.${TARGET}`, { pageSize: 5 }))[0];
if (!r) { console.error(`${TARGET} not found — refusing`); process.exit(1); }

// the donor: the row's own beta must still name the larger rope, or this script has no basis
const bm = String(r.beta || "").match(/\b(\d{2,3})\s*m\s*rope\b/i);
if (!bm) { console.error("the row's beta no longer names a rope size — refusing"); process.exit(1); }
const SIZE = Number(bm[1]);
if (SIZE < 60) { console.error(`the row's beta names a ${SIZE}m rope — that does not corroborate the repair, refusing`); process.exit(1); }
if (!String(r.descent_text || "").includes("doubled 60m")) { console.error("descent_text no longer offers the doubled 60m alternative — refusing"); process.exit(1); }

const dt = String(r.descent_text || ""), dr = String(r.detailed_rack || "");
const wtb = Array.isArray(r.what_to_bring) ? r.what_to_bring : null;
if (!wtb) { console.error("what_to_bring is not an array — refusing"); process.exit(1); }

const body = {};
if (dt.includes(BAD_SENT)) {
  if (dt.split(BAD_SENT).length - 1 !== 1) { console.error("the descent sentence appears more than once — refusing"); process.exit(1); }
  body.descent_text = dt.replace(BAD_SENT, GOOD_SENT);
}
if (dr.includes(BAD_RACK)) body.detailed_rack = dr.replace(BAD_RACK, `a ${SIZE}m rope (enough for the single rappel)`);
const nextW = wtb.map(x => typeof x === "string" && x.includes(BAD_WTB) ? x.replace(BAD_WTB, `${SIZE}m rope is enough for the single rappel over the bergschrund`) : x);
if (JSON.stringify(nextW) !== JSON.stringify(wtb)) body.what_to_bring = nextW;

if (!Object.keys(body).length) { console.log("nothing to do — no 30m claim remains."); process.exit(0); }
console.log(`donor rope size, read off the row's own beta: ${SIZE} m`);
console.log(`   beta: ${JSON.stringify(String(r.beta).match(/[^.]*rope[^.]*\./i)?.[0]?.trim().slice(0, 130))}`);
for (const [k, v] of Object.entries(body)) {
  const before = k === "what_to_bring" ? JSON.stringify(wtb.filter(x => THIRTY.test(String(x)))) : JSON.stringify((k === "descent_text" ? BAD_SENT : BAD_RACK));
  console.log(`\n  ${k}\n     was ${before.slice(0, 200)}`);
  console.log(`     now ${JSON.stringify(k === "what_to_bring" ? v.filter(x => /60\s*m rope is enough/.test(String(x))) : (k === "descent_text" ? GOOD_SENT : `a ${SIZE}m rope (enough for the single rappel)`)).slice(0, 200)}`);
}
if (!APPLY) { console.log("\nDRY RUN — pass --apply to write."); process.exit(0); }

await patchRow("routes", TARGET, body);
const a = (await selectAll("routes", "id,descent_text,detailed_rack,what_to_bring", `id=eq.${TARGET}`, { pageSize: 5 }))[0];
const all = [a.descent_text, a.detailed_rack, ...(a.what_to_bring || [])].map(x => String(x || "")).join(" | ");
console.log(THIRTY.test(all)
  ? `NOT FULLY APPLIED — a 30m rope claim survives: ${JSON.stringify(all.match(THIRTY)[0])}`
  : "verified: no field now offers a 30m rope for a 30m rappel; the doubled 60m stands in all three");
