// Dump the app's legal surfaces VERBATIM, and say whether they have changed since a given
// commit. This exists because the lawyer packet's exhibits must be the shipped text, and the
// scripts that originally extracted them lived in a session's tmp directory and are gone — so
// "regenerate with the extractors" was an instruction nobody could follow.
//
//   node scripts/oneoff/extract-legal-surfaces.mjs                 # dump current text
//   node scripts/oneoff/extract-legal-surfaces.mjs --since <sha>   # and diff against a commit
//
// WHY BRACKET-BALANCING, not a regex: these are array literals inside a 1MB single-line-ish
// file. The balance skips string CONTENTS, because the copy is full of apostrophes and bracket
// characters; the original `surface4.py` matched `'` as a delimiter and silently returned
// half-sentences, dropping the deletion wording entirely.
//
// Fails closed: ANCHOR LOST, an unbalanced literal, or an empty result is an error, never an
// empty dump. A packet built from a silent half-extraction is worse than no packet.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const argv = process.argv.slice(2);
const since = (argv.includes("--since") ? argv[argv.indexOf("--since") + 1] : null);

const SURFACES = [
  ["Terms of Service", "ClimbMatchCore.jsx", "const TERMS="],
  ["Privacy Policy", "ClimbMatchCore.jsx", "const PRIVACY="],
];

// Extract the array literal following `anchor`, skipping string contents so apostrophes and
// brackets inside the copy cannot end it early.
function literalAfter(src, anchor) {
  const i = src.indexOf(anchor);
  if (i < 0) return { err: `ANCHOR LOST: ${anchor}` };
  const j = src.indexOf("[", i);
  if (j < 0) return { err: `no array literal after ${anchor}` };
  let depth = 0, quote = null, esc = false;
  for (let k = j; k < src.length; k++) {
    const c = src[k];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'" || c === "`") { quote = c; continue; }
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) return { text: src.slice(j, k + 1) }; }
  }
  return { err: `unbalanced literal after ${anchor}` };
}

const read = (sha, file) => sha
  ? execFileSync("git", ["show", `${sha}:${file}`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  : fs.readFileSync(file, "utf8");

// The passages, for a readable diff. Only long double-quoted literals are body copy; short ones
// are keys and section headings.
const passages = (t) => (t.match(/"[^"]{25,}"/g) || []);

let failed = false;
for (const [label, file, anchor] of SURFACES) {
  const cur = literalAfter(read(null, file), anchor);
  if (cur.err) { console.error(`FAIL ${label}: ${cur.err}`); failed = true; continue; }
  const body = passages(cur.text);
  if (!body.length) { console.error(`FAIL ${label}: extracted ${cur.text.length} chars but no body copy — the shape changed`); failed = true; continue; }

  console.log(`\n${"=".repeat(78)}\n${label}  —  ${file}  ${anchor}  (${cur.text.length} chars, ${body.length} passages)\n${"=".repeat(78)}`);
  if (!since) for (const p of body) console.log("  " + JSON.parse(p));

  if (since) {
    const old = literalAfter(read(since, file), anchor);
    if (old.err) { console.error(`  cannot compare with ${since}: ${old.err}`); failed = true; continue; }
    if (old.text === cur.text) { console.log(`  UNCHANGED since ${since}`); continue; }
    const A = new Set(passages(old.text)), B = new Set(body);
    const added = body.filter((x) => !A.has(x));
    const gone = [...A].filter((x) => !B.has(x));
    console.log(`  *** CHANGED since ${since} *** ${old.text.length} -> ${cur.text.length} chars, +${added.length} passage(s) -${gone.length}`);
    for (const x of added) console.log(`\n  NEW:  ${JSON.parse(x)}`);
    for (const x of gone) console.log(`\n  GONE: ${JSON.parse(x)}`);
  }
}

// Two surfaces are NOT covered here, and saying so is the point — a partial extraction that
// looks complete is how the packet goes stale silently.
console.log(`\n${"-".repeat(78)}`);
console.log("NOT extracted by this script, and still needed for a full packet:");
console.log("  3. the inline sign-up/consent sheet literal");
console.log("  4. the scattered in-app copy, by region (the old surface4.py)");
console.log("Both are described in memory/legal-review-packet-artifact.md. Match only");
console.log("double-quoted literals and JSX body text for (4): treating ' as a delimiter");
console.log("truncates every sentence at its own apostrophe.");

if (failed) process.exit(1);
