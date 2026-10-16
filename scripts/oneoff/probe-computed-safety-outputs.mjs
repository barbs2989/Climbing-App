// WHICH SAFETY NUMBERS DOES THE APP COMPUTE, AND CAN ANY OF THEM BE PRODUCED FROM ABSENT INPUTS?
//
// The packet frames Q1 as a publishing question — is Terms §5 enough for route data a party acts
// on. That is the guidebook analogy, and it may not reach this app: a guidebook is a static text,
// while ClimbMatch DERIVES a summit time, a return time, an "after dark" verdict, a rappel total
// and a distance to a fire. Those are assertions the software makes, not facts it transcribes.
//
// The distinction only bites where a computed output can be produced from data that ISN'T THERE.
// That is #641: `scarfHrs` opened with `+distKm||0`, so "no approach recorded" and "a zero-length
// approach" were the same value to every caller — and the return tile went GREEN, an affirmative
// "you are down before dark", on 204,469 of 205,492 routes. The rappel total had the same shape
// (`||0` turned an unknown station length into 0 m).
//
// Both are fixed. This asks whether any others are live, and lists the computed outputs either way
// so a reviewer can see the shape of what the app asserts.
// [[fail-open-coercion-hides-missing-data]]
//
// Static. No DB, no browser.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILES = ["ClimbMatchCore.jsx", "RouteDetail.jsx", "ClimbMatch.jsx", "lib/fire.js", "lib/track.js", "lib/rappels.js"];
const src = {};
for (const f of FILES) { try { src[f] = fs.readFileSync(path.join(ROOT, f), "utf8"); } catch (e) {} }
if (Object.keys(src).length < 3) { console.error("fewer than 3 source files read — refusing to report"); process.exit(1); }

/* Balance a function body from its declaration. IT MUST SKIP COMMENTS AS WELL AS STRINGS, and the
   first version did not — which cost a false "NOT FOUND". `lib/track.js` contains
   `// The discriminator is whether ANY of the route's own pins lie on the line`, and the apostrophe
   in "route's" opened a string literal that never closed, so the scanner swallowed every brace to
   the end of the file and reported a function sitting right there as missing.

   That is the exact trap CLAUDE.md records for check:overlay-discovery ("that blanker treats every
   quote as a string delimiter and JSX body text is full of apostrophes"), walked into again here.
   A NOT-FOUND produced by a broken scanner reads identically to a renamed function, so the floor
   check below refuses to report rather than printing a clean-looking list. */
const bodyOf = (text, decl) => {
  const i = text.indexOf(decl);
  if (i < 0) return null;
  let d = 0, inStr = null, line = false, block = false;
  const start = text.indexOf("{", i);
  if (start < 0) return null;
  for (let k = start; k < text.length; k++) {
    const c = text[k], n = text[k + 1];
    if (line) { if (c === "\n") line = false; continue; }
    if (block) { if (c === "*" && n === "/") { block = false; k++; } continue; }
    if (inStr) { if (c === "\\") k++; else if (c === inStr) inStr = null; continue; }
    if (c === "/" && n === "/") { line = true; k++; continue; }
    if (c === "/" && n === "*") { block = true; k++; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "{") d++; else if (c === "}" && --d === 0) return text.slice(i, k + 1);
  }
  return null;
};

/* The user-facing SAFETY outputs the app derives. Each is something a party acts on, and none is
   transcribed from a source — the app works it out. Named individually rather than pattern-matched:
   a heuristic here would sweep in every arithmetic helper in a 400kB file and say nothing. */
const OUTPUTS = [
  { fn: "function scarfHrs(", says: "approach time, and through it the estimated summit and return times",
    known: "#641 — `+distKm||0` made a missing approach identical to a zero one; the return tile went GREEN on 99.5% of the catalog" },
  { fn: "function techHrs(", says: "climbing time from grade and pitch count" },
  { fn: "function loggedTimeStats(", says: "median car-to-car time from other parties' logged climbs" },
  { fn: "function trackCoverage(", says: "how much of the route a drawn GPS line actually covers" },
  { fn: "function sunReadout(", says: "whether a face is in sun or shade at a given hour" },
  { fn: "function buildConsensus(", says: "the conditions consensus, weighted by reporter trust" },
];

// Fail-open coercion of a NUMERIC input: `+x||0`, `x||0`, `Number(x)||0`. The danger is only where
// absent and zero mean different things to a climber, which is why this is scoped to the functions
// above rather than run over the whole file.
const COERCE = /(?:\+\s*\w+|\bNumber\([^)]*\)|\b\w+)\s*\|\|\s*0\b/g;

let live = 0, listed = 0;
console.log("COMPUTED SAFETY OUTPUTS — what the app asserts rather than transcribes\n");
for (const o of OUTPUTS) {
  let where = null, body = null;
  for (const [f, t] of Object.entries(src)) { const b = bodyOf(t, o.fn); if (b) { where = f; body = b; break; } }
  if (!body) { console.log(`   ??    ${o.fn.replace("function ", "").replace("(", "")} — NOT FOUND (renamed or removed)`); continue; }
  listed++;
  const hits = [...body.matchAll(COERCE)].map(m => m[0].trim());
  const bad = hits.length > 0;
  if (bad) live++;
  console.log(`${bad ? ">>    " : "ok    "}  ${o.fn.replace("function ", "").replace("(", "").padEnd(17)} ${where}`);
  console.log(`          asserts: ${o.says}`);
  if (o.known) console.log(`          history: ${o.known}`);
  if (bad) console.log(`          fail-open coercion still present: ${[...new Set(hits)].join(", ")}`);
  console.log("");
}

if (listed < 4) { console.error(`only ${listed} of ${OUTPUTS.length} functions found — the anchors have moved, refusing to report`); process.exit(1); }
console.log(`${listed} computed safety output(s) located · ${live} still coerce a missing input to zero\n`);
console.log(live
  ? `Read each one: \`||0\` is correct where zero is a real answer and wrong where absent means\nUNKNOWN. #641 is the case where it was wrong, and it produced an affirmative safety verdict.`
  : `None of the located outputs turns a missing input into zero. That does not make the numbers\nright — it means the app no longer asserts one where it has nothing to assert from.\n\nThe reviewer's question stands regardless: these are outputs the SOFTWARE produces, not facts\nit copied from a source, and the guidebook-disclaimer convention may not reach them.`);
process.exit(0);
