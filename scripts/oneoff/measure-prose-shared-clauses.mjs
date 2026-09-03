#!/usr/bin/env node
// TWO PROSE COLUMNS THAT SHARE A CLAUSE — anywhere in either value, not just at the start.
//
// THIS EXISTS BECAUSE ITS PREDECESSOR COULD NOT SEE ITS OWN FOUNDING EXAMPLE, which is the
// "ask an audit's denominator" shape committed by the measurement itself.
// `measure-prose-shared-openings.mjs` was written for wa_a_servant_to_liberty:
//
//   overview: "Also published as 'A Slave to Liberty' (450m, Grade V, 5.13-). Climbs the first
//              three pitches of Freedom or Death (5.10, 5.11, 5.11), then breaks right to join…"
//   beta:     "Climbs the first three pitches of Freedom or Death (5.10, 5.11, 5.11), then a
//              right-leaning overlap (P4, 5.12-) into a traverse with layback flakes…"
//
// The shared clause starts at character 0 of `beta` and MID-VALUE in `overview`, so a longest
// common PREFIX test scores it at 0 and walks past. Its "3 routes in 1,086" was therefore a count
// of a narrower, prefix-aligned subset — a true number about a different question, reported as
// though it sized the class. It does not even contain the route it was written for.
//
// So the unit here is a shared RUN of >= MIN characters at any offset in either value. Same
// contract as before: IT ONLY MEASURES. A beta that restates the line before elaborating is not
// the same as an enrichment pass that pasted one clause into two columns, and only reading the
// pair separates them.
//
// IT PRINTS THE OFFSETS, and that is the load-bearing half rather than decoration: a run at
// offset 0 in BOTH values is prose that opens the same way (often legitimate); a run sitting
// mid-value in either is a clause that was placed there, which is the shape worth reading.
//
// ── ALL 51 PAIRS WERE READ, 2026-09-03, AND THE CLASS IS A NON-FINDING. Do not sweep it.
// It replaces measure-prose-shared-openings.mjs, whose count it reports as its own sub-total, so
// nothing is lost by that file being gone.
//
//   THE FOUNDING EXAMPLE IS LEGITIMATE, which is the result. wa_a_servant_to_liberty's
//       `descent_text` opens by recapping the ascent — and then says "…steps right to join Thin
//       Red Line for its upper pitches. DESCENT THEREFORE FOLLOWS Thin Red Line's exit". The
//       recap is the PREMISE of the descent claim; cutting it strands "therefore" with no
//       antecedent, which is the exact failure audit:approach-scope records from batch-trimming
//       wa_bryant_peak_southeast_slopes ("Ascend THE GULLY favoring…" -> "Ascend favoring…").
//
//   watch_out+hazards (13) — 10 ALREADY DEDUPED ON SCREEN. The box prints
//       mergeHazards(hazards, objHaz, watchOut), not the columns, so a shared clause usually
//       never reaches a climber twice. Measured by probe-shared-hazard-clauses-survive-the-merge
//       (which IMPORTS the merge rather than re-implementing it): 3 survive into both lists.
//       Quoting 13 would have repeated the audit:hazard-redundancy mistake CLAUDE.md records —
//       a count that reads like a backlog and is a working feature.
//
//   beta+approach (9) — the documented audit:approach-scope class reached by a different method:
//       approach prose that runs past the base of the climb. CLAUDE.md is explicit that it must
//       NOT be bulk-trimmed (per-sentence judgement; on some rows the OTHER copy is the wrong one).
//
//   overview+beta (8) and the 21 pairs across 13 smaller buckets — ONE FACT ANSWERING TWO
//       QUESTIONS, the same verdict the census reached for `waypoints`. When the Mary Green
//       Glacier opens is both a best_season fact and a watch_out fact; a ranger-district number
//       belongs in watch_out and in approach; wa_forbidden_peak_east_ledges shares 140 chars
//       between `beta` and `descent_text` because that route IS Forbidden's standard descent.
//
// So the value of this file is the corrected DENOMINATOR, not a worklist: re-run it after an
// enrichment batch and read anything NEW, because a genuine paste would look like none of the above.
import { selectAll } from "../lib/supabase-env.mjs";

/* `desc` and `style` are NOT columns (42703) — both are seed-only shapes. The query fails closed
   on a bad name rather than silently returning fewer columns, which is the useful direction. */
const COLS = ["overview", "beta", "watch_out", "best_season", "approach", "descent_text", "hazards"];
const rows = await selectAll("routes", "id," + COLS.join(","), "overview=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("BROKEN PROBE: no rows read — a failed read is not an empty catalog"); process.exit(1); }

const text = (v) => {
  if (typeof v === "string") return v.replace(/\s+/g, " ").trim();
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join(" ").replace(/\s+/g, " ").trim();
  return "";
};
/* 60 characters is roughly a clause. Two independently-written paragraphs do not share a 60-char
   run by chance; two that share 20 do so constantly ("from the trailhead, follow the trail"). */
const MIN = Number(process.env.MIN || 60);

/* Longest common substring, via a Set of MIN-length windows rather than the O(n*m) table. The
   table is ~9M cells for two 3,000-char values and there are 21 pairs on each of ~1,000 routes;
   the windows answer "is there ANY run of >= MIN" in one pass, and only then is the single hit
   extended to its full length. Reporting a shorter run than the true longest would be fine — the
   verdict is "they share a clause", not "how long is the longest one". */
function sharedRun(a, b) {
  if (a.length < MIN || b.length < MIN) return null;
  const seen = new Map();                       // window -> first offset in a
  for (let i = 0; i + MIN <= a.length; i++) { const w = a.slice(i, i + MIN); if (!seen.has(w)) seen.set(w, i); }
  for (let j = 0; j + MIN <= b.length; j++) {
    const w = b.slice(j, j + MIN);
    if (!seen.has(w)) continue;
    const i = seen.get(w);
    // extend left and right so the reported clause is the whole shared run, not a 60-char slice
    let s = 0; while (i - s - 1 >= 0 && j - s - 1 >= 0 && a[i - s - 1] === b[j - s - 1]) s++;
    let e = MIN; while (i + e < a.length && j + e < b.length && a[i + e] === b[j + e]) e++;
    return { ai: i - s, bi: j - s, len: e + s, shared: a.slice(i - s, i + e) };
  }
  return null;
}

let pairs = 0, routesHit = 0, prefixAligned = 0, midValue = 0;
const byPair = new Map();
const examples = [];
const midExamples = [];

for (const r of rows) {
  let hit = false;
  for (let i = 0; i < COLS.length; i++) {
    for (let j = i + 1; j < COLS.length; j++) {
      const a = text(r[COLS[i]]), b = text(r[COLS[j]]);
      if (!a || !b) continue;
      if (a === b) continue;                          // whole-value duplication — a different class
      if (a.includes(b) || b.includes(a)) continue;   // containment — also different
      const run = sharedRun(a, b);
      if (!run) continue;
      pairs++; hit = true;
      const key = COLS[i] + "+" + COLS[j];
      byPair.set(key, (byPair.get(key) || 0) + 1);
      const isPrefix = run.ai === 0 && run.bi === 0;
      if (isPrefix) prefixAligned++; else midValue++;
      const row = [r.id, key, run, isPrefix];
      if (examples.length < 3) examples.push(row);
      if (!isPrefix && midExamples.length < 5) midExamples.push(row);
    }
  }
  if (hit) routesHit++;
}

console.log(`routes read: ${rows.length}`);
console.log(`routes where two prose columns share a run of >= ${MIN} chars: ${routesHit}`);
console.log(`column pairs involved: ${pairs}`);
console.log(`   both at offset 0 (the PREFIX case the old script measured): ${prefixAligned}`);
console.log(`   the run sits MID-VALUE in at least one column:             ${midValue}`);
for (const [k, n] of [...byPair].sort((a, b) => b[1] - a[1])) console.log(`   ${k}: ${n}`);

const show = (label, list) => {
  for (const [id, key, run, isPrefix] of list) {
    console.log(`\n### ${label}${id}  [${key}]  ${run.len} chars  offsets a=${run.ai} b=${run.bi}${isPrefix ? "  (prefix-aligned)" : ""}`);
    console.log(`    ${JSON.stringify(run.shared.slice(0, 160))}`);
  }
};
show("", examples);
show("MID-VALUE ", midExamples);

console.log("\nA SHARED CLAUSE IS NOT AUTOMATICALLY A DEFECT: a beta that restates the line before");
console.log("elaborating reads fine, and that is most of the offset-0 bucket. The MID-VALUE rows are");
console.log("where a clause was placed into a second column. Read the pair before changing either.");
