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
const DOUBLE = /\btwo\b[^.]{0,25}\bropes?\b|\bdouble[- ]ropes?\b|\btwin ropes?\b|\b(?:60|70)s\b|\bropes\b/i;
// The count note admitting, in words, that it substituted the rope's size for a distance.
// Matching "rope length" here was wrong and flagged three CORRECT routes: "a range depending on
// rope length/number of ropes carried" and "double-rope rappels of roughly full rope length" are
// both accurate descriptions of a real descent. The admission is specifically the rope's CAPACITY
// standing in for a measurement, so that is what this matches.
const ADMITS = /rope[' ]?s? capacity|approximated at the stated|estimated from the stated/i;

const prose = r => `${r.rappels || ""} ${r.rappel_count_note || ""} ${r.descent_text || ""}`;

function findings(rows) {
  const out = [];
  for (const r of rows) {
    if (!Array.isArray(r.rappel_detail) || !r.rappel_detail.length) continue;
    const lens = r.rappel_detail.map(x => x && x.lengthM).filter(x => typeof x === "number");
    if (!lens.length) continue;
    const p = prose(r);
    const twoRopes = DOUBLE.test(p);
    const max = Math.max(...lens);

    // 1. Over 60m is impossible on anything less than two ropes, whatever the prose says about
    //    rope sizes — so this one does not depend on a rope being NAMED.
    if (max > 60 && !twoRopes)
      out.push({ id: r.id, area: r.area_id, why: `a ${max}m station, and nothing in the route text describes two ropes (one rope doubled reaches half its length)` });

    // 2. A station exactly equal to a named rope size, with no two-rope configuration. Restricted
    //    to >=50m because 30m is BOTH a rope size and the correct half of a 60m rope: including it
    //    flagged 22 correct routes.
    else if (max >= 50 && !twoRopes) {
      const named = [...p.matchAll(/\b(\d{2})\s?m\b/gi)].map(m => +m[1]).filter(v => ROPES.includes(v));
      if (named.includes(max))
        out.push({ id: r.id, area: r.area_id, why: `every station tops out at ${max}m and the text names a ${max}m rope with no second rope — that is the rope's capacity, not a rappel distance` });
    }

    // 3. The note admitting the substitution in words. Independent of the numbers, because a table
    //    can be corrected while the note still states the method that produced the wrong value —
    //    and the next enrichment pass then re-derives it.
    if (ADMITS.test(r.rappel_count_note || ""))
      out.push({ id: r.id, area: r.area_id, why: `rappel_count_note still describes lengths as taken from the rope's capacity: "${String(r.rappel_count_note).replace(/\s+/g, " ").slice(0, 110)}"` });
  }
  return out;
}

const rows = await selectAll("routes", "id,name,area_id,rappels,rappel_detail,rappel_count_note,descent_text", "", { pageSize: 1000 });
if (!rows.length) { console.error("FAIL — read 0 routes. Refusing to report a clean result about a table this check never saw."); process.exit(1); }
const tables = rows.filter(r => Array.isArray(r.rappel_detail) && r.rappel_detail.length);
if (!tables.length) { console.error("FAIL — 0 routes carry a rappel table. Every rule below would pass vacuously."); process.exit(1); }

// The fault lives in the DB and this checker is read-only, so injections are applied to the rows in
// memory rather than written.
if (INJECT === "capacity") { const t = tables[0]; t.rappel_detail = t.rappel_detail.map(d => ({ ...d, lengthM: 70 })); t.rappels = "rappel the route on a single 70m rope"; t.rappel_count_note = ""; t.descent_text = ""; console.log(`[inject] ${t.id}: all stations set to 70m with a single 70m rope named`); }
if (INJECT === "note") { const t = tables[0]; t.rappel_count_note = "Individual rappel lengths aren't given; approximated at the stated single 70m rope capacity."; console.log(`[inject] ${t.id}: count note admits the substitution`); }
if (INJECT === "clean") { for (const t of tables) { t.rappel_detail = t.rappel_detail.map(d => ({ ...d, lengthM: null })); t.rappel_count_note = ""; } console.log("[inject] every stored length nulled — a null is CORRECT and must not be reported"); }

const hits = findings(tables);
console.log(`checked ${tables.length} routes carrying a rappel table (of ${rows.length} routes read)\n`);
for (const h of hits) console.log(`  ${h.id}  [${h.area}]\n     ${h.why}\n`);
if (hits.length) {
  console.error(`FAIL — ${hits.length} rappel table${hits.length === 1 ? "" : "s"} state${hits.length === 1 ? "s" : ""} a distance the described rope cannot reach.`);
  console.error("The correct repair is null, not a halved number: a rappel with no published distance may be 35m or 15m, and halving invents a second figure.");
  process.exit(1);
}
console.log("ok — every stated rappel distance is consistent with the rope configuration its route describes");

// Injection-tested, four cases:
//   --inject=capacity  a full-rope-capacity table with a single rope named        -> must FAIL
//   --inject=note      table fine, but the note still admits the substitution     -> must FAIL
//   --inject=clean     every length nulled                                        -> must PASS (null is correct)
//   (no flag)          the live catalog                                           -> must PASS
