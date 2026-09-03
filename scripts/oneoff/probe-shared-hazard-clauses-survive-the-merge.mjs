#!/usr/bin/env node
// DOES A SHARED CLAUSE IN watch_out + hazards ACTUALLY REACH THE SCREEN TWICE?
//
// `measure-prose-shared-clauses.mjs` reports 13 routes where those two columns share a >=60-char
// run — the single biggest bucket, and the one most likely to be a non-finding, because the KNOWN
// HAZARDS box does not print the columns: it prints `mergeHazards(hazards, objHaz, watchOut)`.
// CLAUDE.md already records `audit:hazard-redundancy` as an audit whose count reads like a backlog
// and is a WORKING FEATURE. Quoting 13 without asking the merge would repeat that exactly.
//
// But the merge is SUBSUMPTION, not overlap: a line is dropped only when EVERY significant word in
// it appears in a surviving line. Two lines sharing a 60-char clause and differing on either side
// are not subsets of each other, so nothing here is answerable by reading the rule — it has to be
// executed against the real values.
//
// The merge is IMPORTED, never re-implemented. A copy would agree with itself whatever the app
// does, which is the whole question.
import { mergeHazards } from "../../lib/hazards.js";
import { selectAll } from "../lib/supabase-env.mjs";

const MIN = Number(process.env.MIN || 60);
const rows = await selectAll("routes", "id,watch_out,hazards,obj_haz", "overview=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("BROKEN PROBE: no rows read — a failed read is not an empty catalog"); process.exit(1); }

const text = (v) => {
  if (typeof v === "string") return v.replace(/\s+/g, " ").trim();
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join(" ").replace(/\s+/g, " ").trim();
  return "";
};
function sharedRun(a, b) {
  if (a.length < MIN || b.length < MIN) return null;
  const seen = new Map();
  for (let i = 0; i + MIN <= a.length; i++) { const w = a.slice(i, i + MIN); if (!seen.has(w)) seen.set(w, i); }
  for (let j = 0; j + MIN <= b.length; j++) {
    const w = b.slice(j, j + MIN);
    if (!seen.has(w)) continue;
    const i = seen.get(w);
    let s = 0; while (i - s - 1 >= 0 && j - s - 1 >= 0 && a[i - s - 1] === b[j - s - 1]) s++;
    let e = MIN; while (i + e < a.length && j + e < b.length && a[i + e] === b[j + e]) e++;
    return a.slice(i - s, i + e);
  }
  return null;
}

let considered = 0, dedupedByMerge = 0, printedTwice = 0;
const survivors = [];
for (const r of rows) {
  const wo = text(r.watch_out), hz = text(r.hazards);
  if (!wo || !hz || wo === hz || wo.includes(hz) || hz.includes(wo)) continue;
  const shared = sharedRun(hz, wo);
  if (!shared) continue;
  considered++;
  /* Exactly what RouteDetail computes: the box is `_allHaz`, and `_watchOut` is whatever survives
     the three-way merge and is not already in it. A clause reaches the screen twice only if it is
     present in BOTH lists after that. */
  const objHaz = Array.isArray(r.obj_haz) ? r.obj_haz : (r.obj_haz ? [r.obj_haz] : []);
  const allHaz = mergeHazards(r.hazards, objHaz).items;
  const watchOut = mergeHazards(r.hazards, objHaz, r.watch_out).items.filter((t) => allHaz.indexOf(t) < 0);
  const norm = (s) => String(s).replace(/\s+/g, " ");
  const inHaz = allHaz.some((t) => norm(t).includes(shared));
  const inWatch = watchOut.some((t) => norm(t).includes(shared));
  if (inHaz && inWatch) { printedTwice++; survivors.push([r.id, shared]); }
  else dedupedByMerge++;
}

console.log(`routes with a shared >=${MIN}-char clause across watch_out + hazards: ${considered}`);
console.log(`   the merge already drops one copy (NOT a finding): ${dedupedByMerge}`);
console.log(`   the clause survives into BOTH lists on screen:    ${printedTwice}`);
if (!considered) { console.log("\nBROKEN PROBE: the measurement reports this bucket as non-empty, so zero here means the run-finder disagrees with it"); process.exit(1); }
for (const [id, s] of survivors.slice(0, 8)) console.log(`\n### ${id}\n    ${JSON.stringify(s.slice(0, 160))}`);
console.log("\nA SURVIVING CLAUSE IS STILL NOT AUTOMATICALLY A DEFECT — KNOWN HAZARDS and the watch-out");
console.log("line are two sections, and a hazard restated with different emphasis can belong in both.");
console.log("This says which rows a reader has to look at, and which the merge has already handled.");
