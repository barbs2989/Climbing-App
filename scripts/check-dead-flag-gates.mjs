#!/usr/bin/env node
// Finds UI that can never render because the only thing feeding it is a constant seeded
// from a flag that is permanently false.
//
// Why this exists. DEMO_FILLERS is `false`, and eight constants are defined as
// `DEMO_FILLERS ? [...] : []`. Three surfaces were gated on one of those constants with
// nothing else able to populate them, so they were dead UI nobody could reach:
//
//   the Year in Climbing modal   its only opener was gated on MY_CLIMBS.length
//   climb-anniversary notifs     _anniv mapped over MY_CLIMBS, so it always yielded []
//   the "Local Legend" badge     LOCAL_LEGENDS[climber.id] against a permanently {} map
//
// The first two were revived by re-pointing them at the user's real `logs`; the third was
// deleted. None of them showed up as a bug: each sat beside live code that worked, so the
// screen looked fine and the feature simply never happened.
//
// The distinction this encodes is the one that matters. Five OTHER constants gated on the
// same flag are perfectly healthy, because every consumer is ADDITIVE:
//
//   createdGroups.concat(GROUPS)      a user's own groups still show
//   useState(COMMENTS)                seeds mutable state the user adds to
//   CLIMBERS.concat(FILLER_CLIMBERS)  the real climbers are still there
//
// So the question is never "is this constant empty?" -- it is "is there another writer?"
//
//   npm run check:dead-flag-gates
//
// Deliberately conservative: it reports only where a permanently-empty constant is read
// with NO additive use anywhere in the file. A constant that is concatenated, spread or
// used to seed state is treated as live, because it is.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx"];

// Comments must go before anything is counted as a read. The first draft of this check
// reported MY_CLIMBS as live UI on the strength of the comments EXPLAINING that it is not,
// which is a guard grading its own paperwork. Blank them rather than deleting them, so
// every remaining byte keeps its original offset and reported line numbers stay true.
// Blank out comments AND string contents in ONE pass, tracking state as we go.
//
// Two regexes cannot do this, and getting it wrong is not a near miss. Stripping comments
// first ate real code: seed prose contains "//" (a URL whose colon is a few characters
// back, a "he said // she said"), so a `//`-to-end-of-line rule blanked the rest of a dense
// line — and MY_CLIMBS and GROUPS, both declared late on such lines, vanished from the
// analysis entirely. The check then reported "every one read additively" having never seen
// the two constants the whole exercise was about. Stripping strings first has the mirror
// problem: an apostrophe inside a comment opens a phantom string literal.
//
// Offsets are preserved (characters are replaced with spaces, newlines kept) so reported
// line numbers still point at the real source.
function scrub(src) {
  const out = src.split("");
  let i = 0;
  const n = src.length;
  const wipe = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== "\n") out[k] = " "; };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); const end = e < 0 ? n : e + 2; wipe(i, end); i = end; continue; }
    if (c === "/" && d === "/") { let e = src.indexOf("\n", i); if (e < 0) e = n; wipe(i, e); i = e; continue; }
    if (c === '"' || c === "'" || c === "`") {
      let k = i + 1;
      while (k < n) {
        if (src[k] === "\\") { k += 2; continue; }
        if (src[k] === c) break;
        // An unterminated single/double quote would otherwise swallow the file.
        if (c !== "`" && src[k] === "\n") break;
        k++;
      }
      wipe(i + 1, Math.min(k, n));
      i = Math.min(k + 1, n);
      continue;
    }
    i++;
  }
  return out.join("");
}

const sources = new Map();
const unreadable = [];
for (const f of FILES) {
  try { sources.set(f, scrub(fs.readFileSync(path.join(ROOT, f), "utf8"))); }
  catch (e) { unreadable.push(f + " (" + e.code + ")"); }
}
// Fail closed. Swallowing the read error made an earlier run of this script print
// "ok — no constant is seeded only by a permanently-false flag" while it had loaded no
// source at all. A check that passes because it read nothing is worse than no check.
if (unreadable.length) {
  console.error("check:dead-flag-gates: could not read " + unreadable.join(", ") + " — nothing was analysed.");
  process.exit(1);
}
const ALL = [...sources.values()].join("\n");

// 1. Flags that are literally false. `const DEMO_FILLERS=false;`
const deadFlags = new Set();
for (const src of sources.values()) {
  for (const m of src.matchAll(/\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*false\s*[;,]/g)) deadFlags.add(m[1]);
}

// 2. Constants seeded only by such a flag: `const X = FLAG ? ... : []` (or {} / null).
const emptyConsts = new Map(); // name -> flag
for (const src of sources.values()) {
  // SCREAMING_CASE only. These seed constants are all module-level and named that way, and
  // a lowercase local slips straight past a word-boundary search: `const cover = SHOW_COVERS
  // ? … : ""` made the first draft flag every `objectFit:"cover"` in the file.
  for (const m of src.matchAll(/\bconst\s+([A-Z][A-Z0-9_]{2,})\s*=\s*([A-Z][A-Z0-9_]*)\s*\?/g)) {
    const [, name, flag] = m;
    if (!deadFlags.has(flag)) continue;
    // Find the else-branch: scan forward for the matching ":" at depth 0 and read what follows.
    const rest = src.slice(m.index + m[0].length);
    let depth = 0, i = 0;
    for (; i < rest.length; i++) {
      const c = rest[i];
      if ("([{".includes(c)) depth++;
      else if (")]}".includes(c)) depth--;
      else if (c === ":" && depth === 0) break;
    }
    const tail = rest.slice(i + 1, i + 12).trim();
    if (/^(\[\s*\]|\{\s*\}|null|undefined|""|''|0\b)/.test(tail)) emptyConsts.set(name, flag);
  }
}

if (!emptyConsts.size) {
  console.log("check:dead-flag-gates: ok — no constant is seeded only by a permanently-false flag.");
  process.exit(0);
}

// 3. For each, decide whether any use is ADDITIVE (so real data can still flow through it).
const ADDITIVE = (n) => [
  new RegExp("\\.concat\\(\\s*" + n + "\\b"),          // A.concat(X)
  new RegExp("\\bconcat\\([^)]*\\b" + n + "\\b"),      // concat(..., X)
  new RegExp("\\.\\.\\.\\s*" + n + "\\b"),             // [...X]
  new RegExp("useState\\(\\s*" + n + "\\b"),           // seeds mutable state
  new RegExp("\\b" + n + "\\.concat\\("),              // X.concat(A)
];

const findings = [];
const additiveNames = [];
const unusedNames = [];
for (const [name, flag] of emptyConsts) {
  const additive = ADDITIVE(name).some((re) => re.test(ALL));
  if (additive) { additiveNames.push(name); continue; }
  const reads = [];
  for (const [f, src] of sources) {
    const re = new RegExp("\\b" + name + "\\b", "g");
    for (const m of src.matchAll(re)) {
      const line = src.slice(0, m.index).split("\n").length;
      const around = src.slice(Math.max(0, m.index - 40), m.index + 60).replace(/\s+/g, " ");
      // Skip the declaration itself and the module's export list.
      if (/const\s+$/.test(src.slice(Math.max(0, m.index - 8), m.index))) continue;
      if (/^export\b/.test(src.slice(Math.max(0, src.lastIndexOf("\n", m.index) + 1), m.index))) continue;
      reads.push(`${f}:${line}  …${around}…`);
    }
  }
  if (reads.length) findings.push({ name, flag, reads });
  else unusedNames.push(name);
}

if (!findings.length) {
  console.log(`check:dead-flag-gates: ok — ${emptyConsts.size} constant(s) seeded by a permanently-false flag, none of them gating UI.`);
  if (additiveNames.length) console.log(`  read additively (real data still flows through): ${additiveNames.join(", ")}`);
  // Not a failure: harmless, but it is how a constant ends up looking load-bearing later.
  if (unusedNames.length) console.log(`  no longer read at all — candidates for deletion: ${unusedNames.join(", ")}`);
  process.exit(0);
}

console.error("\ncheck:dead-flag-gates: UI gated on a permanently-empty constant\n");
for (const f of findings) {
  console.error(`  ${f.name}  (seeded by ${f.flag}, which is false — so always empty, and read with no additive path)`);
  for (const r of f.reads.slice(0, 6)) console.error("      " + r);
  console.error("");
}
console.error("Each read above can never see data. Either re-point it at real state (as _anniv");
console.error("and the Year in Climbing banner were), or delete it (as the Local Legend badge was).");
console.error("If a read really is meant to stay dormant, make it additive or drop the constant.\n");
process.exit(1);
