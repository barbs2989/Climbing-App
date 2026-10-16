#!/usr/bin/env node
// Does any rappel table state a distance the rope described cannot reach?
//
// A rope doubled through an anchor reaches HALF its length: one 60m rope gives 30m rappels, one
// 70m rope gives 35m. Where a source published no per-station distance, an earlier enrichment pass
// wrote the ROPE'S CAPACITY into `lengthM` instead of null. `wa_ellation` stored 8 x 70m — 560m of
// rappel down an 8-pitch route — while its own prose said the raps "approach the rope's full 35m
// reach". A climber reading that table rigs for a rappel twice as long as the rope allows, which is
// the rope-off-the-end shape. `wa_overcoat_peak_southeast_route` had the identical 2x error.
//
// This is NOT a "does every rappel have a length" check. A null length is the CORRECT value when no
// source gives a distance, and the whole point of the repair was to write nulls rather than invent
// numbers. The question here is only whether a stated number is physically consistent with the rope
// configuration the route's own text describes.
//
// THE HOLE IN RULES 1 AND 2, printed rather than hidden. Both stand down when the route's text
// names two ropes — and a two-rope mention only proves a long rappel is POSSIBLE SOMEWHERE on the
// route, never that every station is that long. `wa_tooth_and_claw` was cleared by this reasoning
// and was defective anyway: six stations all stored at exactly 70m, where the two-70m-rope fact
// applies to the FIRST rappel only and six 70m rappels is far more than the height of the route.
// Rule 3 is what caught it in the end, because the researcher wrote down what the numbers were.
//
// A "every station identical and >=50m" rule would catch that shape, and it is NOT added here: a
// route whose source really does report seven double-rope rappels of full rope length
// (`wa_south_face_5`) is indistinguishable from it by any test this script can run. The difference
// is whether a source states the distances, which is not in the data. So the residual risk is a
// UNIFORM full-rope table on a route that names two ropes; check that shape by hand.
//
// Read-only, anon key. NOT a build gate: this is a property of the database, not the checkout, so no
// code change can cause or fix it and failing `npm run build` would block PRs whose author cannot
// affect it — the same reasoning `check:counts` records.
//
// Fails closed on an empty read. The realistic failure mode of a guard like this is a FALSE PASS:
// zero rows makes every rappel table consistent.
import { selectAll } from "./lib/supabase-env.mjs";

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf("--" + n); if (i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")) return args[i + 1]; const eq = args.find(a => a.startsWith("--" + n + "=")); return eq ? eq.slice(n.length + 3) : null; };
// Both spellings. A parser that took only `--inject value` made the first injection test print a
// full set of findings that looked exactly like a real run — the "injection logged, counter did not
// move" trap this repo keeps re-learning.
const INJECT = flag("inject");

// Rope sizes a party actually carries. A station length equal to one of these, with nothing in the
// route's prose describing two ropes, is the fingerprint of capacity-written-as-distance.
const ROPES = [50, 60, 70, 80];
// Deliberately loose, and note the plural: the first draft used /double[- ]rope\b/, which does not
// match "double ropes", and it therefore flagged wa_action_potential — a route whose descent text
// lists all five lengths individually AND says "with double ropes". A guard that flags correct work
// teaches people to ignore it.
// `2x30m` puts the pair marker BEFORE the number and `60m x2` puts it after; both are written in
// this data and both mean two ropes.
const DOUBLE = /\btwo\b[^.]{0,25}\bropes?\b|\bdouble[- ]ropes?\b|\btwin ropes?\b|\b(?:60|70)s\b|\bropes\b|\b\d\s?x\s?\d{2}\s?m\b|\b\d{2}\s?m\s?x\s?\d\b/i;
// The count note admitting, in words, that it substituted the rope's size for a distance.
// Matching "rope length" here was wrong and flagged three CORRECT routes: "a range depending on
// rope length/number of ropes carried" and "double-rope rappels of roughly full rope length" are
// both accurate descriptions of a real descent. The admission is specifically the rope's CAPACITY
// standing in for a measurement, so that is what this matches.
//
// `near-max` was added after a triage of the rule-3 candidates found wa_mount_torment_south_ridge,
// whose note says "individual station lengths aren't given explicitly, estimated near-max for a 60m
// rope used double" — the same admission this rule exists to catch, in words it did not match. Six
// identical 55 m stations, 330 m of rappel, and the note SAYS where the number came from. It fell
// through to the report-only rule instead of failing, which is the quiet direction to be wrong in.
// It is scoped to a rope mention rather than matched bare: "near-max" about anything else (an angle,
// a grade, a pack weight) is not a claim about a distance.
const ADMITS = /rope[' ]?s? capacity|approximated at the stated|estimated from the stated|near[- ]?max[^.]{0,40}\brope/i;

// `gear` is where a route most often states its rope OUTRIGHT — "60m single rope", "Two 30m ropes
// (or one 60m)", "50m rope (60m or double 50m ropes preferable for 3-person parties)" — and until
// #951 this script never read it. 1,065 WA routes carry a gear array; a route whose only named rope
// lives there had NO rope size at all as far as rules 2 and 3 were concerned, so it passed for want
// of evidence rather than on the merits. It is one column short of the question being asked.
//
// It feeds the two-rope test AND the named-size scan, and those two cannot be separated. Reading
// gear only for sizes would take the "60m" out of `Two 30m ropes (or one 60m)` while ignoring the
// word that says there are two of them, and manufacture a finding against a correct route. The text
// that names the rope is the text that says how many there are.
const gearText = r => (Array.isArray(r.gear) ? r.gear.filter(g => typeof g === "string").join(" ; ") : "");
// The two-rope test is STRICTER on gear than on prose, and that asymmetry is measured rather than
// tidy. `DOUBLE` accepts a bare plural `ropes`, which is right for a descent narrative — prose that
// says "ropes" is nearly always counting them. A gear list pluralises casually: of the 34 rappel-
// table routes whose gear says "ropes", 4 name no two-rope configuration at all, and two of those
// are `Single 60m rope (skinny 7-8mm ropes are common)` and `60m dynamic ropes (single rope
// technique)` — SINGLE-rope routes that a bare plural would have stood rules 1 and 2 down on.
// Standing down wrongly is a false PASS on a rope-off-the-end check, which is the direction that
// gets somebody hurt, so gear has to name a count, a pairing, or a second strand.
//
// Bounded with `[^;]` because gearText joins entries with " ; ": without it, "two sets #1 to #3"
// in one entry and "60m rope" in another would read as two ropes across the boundary. That is not
// hypothetical — `wa_a_servant_to_liberty` lists "two sets #0 C3 to #.75" and "two sets #1 to #3".
const GEAR_DOUBLE = /\btwo\b[^;]{0,25}\bropes?\b|\bdouble[- ][^;]{0,14}\bropes?\b|\btwin\b[^;]{0,14}\bropes?\b|\b\d\s?x\s?\d{2}\s?m\b|\b\d{2}\s?m\s?x\s?\d\b|\bsecond rope\b|\bpair of ropes\b|\btag line\b/i;
// U+00D7 MULTIPLICATION SIGN, not ASCII x — `2×30m ropes` is written with it, and a two-rope
// configuration spelled that way read as a single rope.
const prose = r => `${r.rappels || ""} ${r.rappel_count_note || ""} ${r.descent_text || ""} ${gearText(r)}`.replace(/×/g, "x");

// Rope sizes the text NAMES. A range (`50-60m rope`, `30–60m single rope`) names both ends, and
// rule 3 takes the largest — reading only the low end understates the rope a party carries and
// invents a finding against a correct route.
//
// An OPEN-ENDED size (`50m+ rope`) names no upper bound at all, so it returns `open` and rule 3
// stands down rather than guessing one. Substituting a number there — 60, say — would be exactly
// the fabrication this whole script exists to catch, committed by the checker instead of the data.
function namedRopes(p) {
  const out = [];
  for (const m of p.matchAll(/\b(\d{2})\s*(?:-|–|to)\s*(\d{2})\s?m\b/gi)) { out.push(+m[1]); out.push(+m[2]); }
  for (const m of p.matchAll(/\b(\d{2})\s?m\b/gi)) out.push(+m[1]);
  return { sizes: out.filter(v => ROPES.includes(v)), open: /\b\d{2}\s?m\s*\+/.test(p) };
}

function findings(rows) {
  const out = [], look = [];
  for (const r of rows) {
    if (!Array.isArray(r.rappel_detail) || !r.rappel_detail.length) continue;
    const lens = r.rappel_detail.map(x => x && x.lengthM).filter(x => typeof x === "number");
    if (!lens.length) continue;
    const p = prose(r);
    // Loose on the route's own narrative, strict on the gear list — see GEAR_DOUBLE.
    const twoRopes = DOUBLE.test(`${r.rappels || ""} ${r.rappel_count_note || ""} ${r.descent_text || ""}`.replace(/×/g, "x"))
      || GEAR_DOUBLE.test(gearText(r).replace(/×/g, "x"));
    const max = Math.max(...lens);

    // 1. Over 60m is impossible on anything less than two ropes, whatever the prose says about
    //    rope sizes — so this one does not depend on a rope being NAMED.
    if (max > 60 && !twoRopes)
      out.push({ id: r.id, area: r.area_id, why: `a ${max}m station, and nothing in the route text describes two ropes (one rope doubled reaches half its length)` });

    // 2. A station exactly equal to a named rope size, with no two-rope configuration. Restricted
    //    to >=50m because 30m is BOTH a rope size and the correct half of a 60m rope: including it
    //    flagged 22 correct routes.
    else if (max >= 50 && !twoRopes) {
      const named = namedRopes(p).sizes;
      if (named.includes(max))
        out.push({ id: r.id, area: r.area_id, why: `every station tops out at ${max}m and the text names a ${max}m rope with no second rope — that is the rope's capacity, not a rappel distance` });
    }

    // 3. The route says SINGLE-ROPE in so many words and names a rope size. Then every station is
    //    bounded by half that rope, full stop — and this rule deliberately does NOT consult the
    //    double-rope test above, because that test is what let wa_kangaroo_temple_north_face
    //    through: its prose says "three single-rope rappels using a 60 m rope" AND, in a separate
    //    sentence, "can also be done as 2 x 50m double-rope rappels". The stand-down fired on an
    //    ALTERNATIVE configuration while the stored table was the single-rope one, holding 60 m and
    //    55 m stations a doubled 60 cannot reach. An explicit "single-rope" is the strongest signal
    //    in this data and nothing should be able to suppress it.
    const single = /\bsingle[- ]rope\b|\bsingle\b[^.]{0,20}\brope\b/i.test(p);
    if (single) {
      const { sizes: named, open } = namedRopes(p);
      const biggest = named.length && !open ? Math.max(...named) : 0;
      // REPORT-ONLY, and the reason is measured rather than cautious. Run as a failure it flagged
      // 22 routes, and several are CORRECT: wa_south_face_5's prose describes both a double-rope
      // party and a single-70 party, and its stored table is the double-rope one. The discriminator
      // is which configuration the STORED TABLE corresponds to, and no regex can see that — the
      // count note sometimes says in prose, and sometimes does not. So this surfaces candidates for
      // a human instead of crying wolf. Rules 1, 2 and 4 still fail.
      if (biggest && max > biggest / 2 + 2)   // +2 for rounding in published figures
        look.push({ id: r.id, area: r.area_id, why: `describes SINGLE-ROPE rappels on a ${biggest}m rope (reaching ${biggest / 2}m doubled) but stores a ${max}m station — check whether the stored table is the single-rope sequence or a two-rope one` });
    }

    // 4. The note admitting the substitution in words. Independent of the numbers, because a table
    //    can be corrected while the note still states the method that produced the wrong value —
    //    and the next enrichment pass then re-derives it.
    if (ADMITS.test(r.rappel_count_note || ""))
      out.push({ id: r.id, area: r.area_id, why: `rappel_count_note still describes lengths as taken from the rope's capacity: "${String(r.rappel_count_note).replace(/\s+/g, " ").slice(0, 110)}"` });
  }
  return { out, look };
}

const rows = await selectAll("routes", "id,name,area_id,rappels,rappel_detail,rappel_count_note,descent_text,gear", "", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about a table this check never saw."); process.exit(1); }
const tables = rows.filter(r => Array.isArray(r.rappel_detail) && r.rappel_detail.length);
if (!tables.length) { console.error("FAIL — 0 routes carry a rappel table. Every rule below would pass vacuously."); process.exit(1); }

// The fault lives in the DB and this checker is read-only, so injections are applied to the rows in
// memory rather than written.
// `gear` is cleared here, and it has to be. Once this script started reading that column, leaving
// the row's real gear in place made the injected scenario self-contradictory: tables[0] is
// wa_a_servant_to_liberty, whose gear says "two ropes for rappel", so a case claiming to describe
// a route that names ONE rope was handing the guard a route that names two. It stood rules 1 and 2
// down exactly as documented and the case printed `ok` — reading as "the guard broke" when the
// guard was right and the INJECTION was wrong. Injections have to be re-checked when a script's
// inputs widen, not only when its logic changes.
if (INJECT === "capacity") { const t = tables[0]; t.rappel_detail = t.rappel_detail.map(d => ({ ...d, lengthM: 70 })); t.rappels = "rappel the route on a single 70m rope"; t.rappel_count_note = ""; t.descent_text = ""; t.gear = []; console.log(`[inject] ${t.id}: all stations set to 70m with a single 70m rope named`); }
if (INJECT === "note") { const t = tables[0]; t.rappel_count_note = "Individual rappel lengths aren't given; approximated at the stated single 70m rope capacity."; console.log(`[inject] ${t.id}: count note admits the substitution`); }
if (INJECT === "clean") { for (const t of tables) { t.rappel_detail = t.rappel_detail.map(d => ({ ...d, lengthM: null })); t.rappel_count_note = ""; } console.log("[inject] every stored length nulled — a null is CORRECT and must not be reported"); }
// The rope named ONLY in gear. Every prose column is emptied, so the run can only see the 70m rope
// if it reads that array — which is the whole point of the change that added it. A version of this
// script that ignores gear prints `ok` here.
if (INJECT === "gearrope") { const t = tables[0]; t.rappel_detail = t.rappel_detail.map(d => ({ ...d, lengthM: 70 })); t.rappels = ""; t.rappel_count_note = ""; t.descent_text = ""; t.gear = ["helmet", "70m single rope", "rack to 3in"]; console.log(`[inject] ${t.id}: 70m stations, and the 70m single rope named ONLY in gear`); }
// The mirror of it, and the one that guards against over-reach: the same 70m stations on a route
// whose gear names TWO ropes. Two 70m ropes really do reach 70m, so this must NOT be reported.
if (INJECT === "geartwo") { const t = tables[0]; t.rappel_detail = t.rappel_detail.map(d => ({ ...d, lengthM: 70 })); t.rappels = ""; t.rappel_count_note = ""; t.descent_text = ""; t.gear = ["helmet", "Two 70m ropes", "rack to 3in"]; console.log(`[inject] ${t.id}: 70m stations, gear names TWO 70m ropes — correct, must NOT be reported`); }

const { out: hits, look } = findings(tables);
console.log(`checked ${tables.length} routes carrying a rappel table (of ${rows.length} routes read)\n`);
for (const h of hits) console.log(`  ${h.id}  [${h.area}]\n     ${h.why}\n`);
if (look.length) {
  console.log(`${look.length} route(s) to LOOK AT — reported, not failed (see rule 3):\n`);
  for (const h of look) console.log(`  ${h.id}  [${h.area}]\n     ${h.why}\n`);
}
if (hits.length) {
  console.error(`FAIL — ${hits.length} rappel table${hits.length === 1 ? "" : "s"} state${hits.length === 1 ? "s" : ""} a distance the described rope cannot reach.`);
  console.error("The correct repair is null, not a halved number: a rappel with no published distance may be 35m or 15m, and halving invents a second figure.");
  process.exit(1);
}
console.log("ok — every stated rappel distance is consistent with the rope configuration its route describes");

// Injection-tested, six cases:
//   --inject=gearrope  70m stations, the 70m rope named ONLY in gear              -> must FAIL
//   --inject=geartwo   the same table where gear names TWO 70m ropes              -> must PASS
//   --inject=capacity  a full-rope-capacity table with a single rope named        -> must FAIL
//   --inject=note      table fine, but the note still admits the substitution     -> must FAIL
//   --inject=clean     every length nulled                                        -> must PASS (null is correct)
//   (no flag)          the live catalog                                           -> must PASS
