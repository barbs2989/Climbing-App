// check:overlay-absence scans ClimbMatch.jsx and ClimbMatchCore.jsx only, and says so in its own
// closing note: "an overlay that renders a component from lib/ has its gating INVISIBLE here …
// Nothing has yet asked this question of lib/." #1418 asked it of the full-screen views in the
// three APP files; lib/ is still unasked.
//
// This asks it. Report-only, and it decides nothing on its own -- a flag anywhere in a component
// says the component knows about an outage, not that THIS sentence is gated on one. Read the
// ungated rows first, then confirm each gated row's flag actually guards the claim beside it.
//
// The claim vocabulary is LIFTED from the guard, never retyped: two spellings of "asserts absence"
// would drift, and the guard's is the one that has been tuned against real false positives
// (`nothing here` had to be forced to END a clause, because Terms says "Nothing here creates a
// partnership").
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GUARD = fs.readFileSync(path.join(ROOT, "scripts/check-overlay-absence.mjs"), "utf8");

const m = /^const CLAIMS = (\/.*\/[gimsuy]*);$/m.exec(GUARD);
if (!m) {
  console.error("ANCHOR LOST — check:overlay-absence's CLAIMS regex moved.");
  console.error("Re-anchor before reading this run: a hand-written vocabulary would drift from the guard's.");
  process.exit(1);
}
// eslint-disable-next-line no-eval
const CLAIMS = eval(m[1]);

const files = fs.readdirSync(path.join(ROOT, "lib"))
  .filter((f) => /\.jsx$/.test(f)).map((f) => "lib/" + f).sort();
if (files.length < 5) { console.error(`only ${files.length} lib component(s) found — broken walk`); process.exit(1); }

// What counts as "this component can tell an outage happened": a react-query error binding, an
// xUnavailable flag, or an explicit `.error` read.
const ERRISH = /\b\w*[Ee]rror\b|\b\w+Unavailable\b|\bisError\b/;

let withClaims = 0, ungated = 0;
for (const rel of files) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const claims = [...new Set((src.match(CLAIMS) || []).map((s) => s.trim()))];
  if (!claims.length) continue;
  withClaims++;

  /* PER OCCURRENCE, not per distinct string — and this was wrong in the first version, in the
     direction that sends a reader to the wrong line. It took `indexOf(claim)`, the FIRST match,
     so "No areas" resolved to DbAreaBrowser's line 253 ("No areas match.", filter copy) while the
     row was really about line 1072 — which is correctly gated, with `if (error)` returning ahead
     of the empty branch. It reported a clean component as UNGATED and named a line that was fine.
     The same attribution defect check:overlay-absence had this morning: a weak locator is not
     merely imprecise, it accuses the wrong code. */
  const rows = [];
  for (const c of claims) {
    let at = -1;
    while ((at = src.indexOf(c, at + 1)) >= 0) {
      const from = Math.max(0, src.lastIndexOf("return", at) - 200);
      const region = src.slice(from, at + 200);
      rows.push({ c, line: src.slice(0, at).split("\n").length, gated: ERRISH.test(region) });
    }
  }
  const bare = rows.filter((r) => !r.gated);
  const fileErr = ERRISH.test(src);
  if (bare.length) ungated++;
  console.log(`\n${rel}${fileErr ? "" : "   (no error binding anywhere in the file)"}`);
  for (const r of rows) console.log(`   ${r.gated ? "gated  " : "UNGATED"}  ${rel}:${r.line}  ${JSON.stringify(r.c)}`);
}
console.log(`\n${files.length} lib component(s); ${withClaims} assert absence; ${ungated} have at least one claim with no error binding nearby.`);
console.log("Weak test by design — confirm each row by reading before treating it as a finding.");
