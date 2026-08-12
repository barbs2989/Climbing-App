// check:rappel-readers — a reader that prefers an enrichment column over a climber's
// accepted correction must honour the contribution flag.
//
// THE INVARIANT, stated once so it does not live only in a comment again:
//
//     Any function that reads `route.rappelDetail` must gate that read on
//     `_rapEdited(route)`, so an accepted community correction to the rappel count
//     out-votes the station-by-station enrichment rather than the other way round.
//
// WHY THIS EXISTS. #787 found that every reader of `rappelDetail` preferred it over
// `rappels`, so on the 155 routes carrying a station list a correction could pass the
// 3-agree consensus gate and then display nothing at all. It fixed the three readers
// that existed and wrote the rule into a comment above them.
//
// #784 then added two more readers — `rappelsAreNone` and `rappelHeadingCount` — and
// neither carried the guard. Five readers, three guarded, for four days. #791 repaired
// them and said so plainly in its own commit message: "Nothing catches a reader that
// forgets it."
//
// Nothing did, and nothing could. Read why, because it is the whole argument for a
// static check rather than a better comment:
//
//   * The merge was CLEAN. #787 and #784 touched different lines of the same file, so
//     git had no reason to complain ([[git-silently-mismerges-dense-lines]] is the
//     louder cousin of this; here git was simply correct and still wrong).
//   * Every gate stayed GREEN. The invariant is semantic, not syntactic — an unguarded
//     reader is valid JavaScript that renders a number. check:refs, check:hooks and
//     check:dead-props have nothing to say about it.
//   * Both new functions read as CORRECT IN ISOLATION. Only a comment three functions
//     above them says otherwise, and nobody adding a sixth reader is required to scroll
//     that far.
//
// That is the [[dormant-code-is-not-pre-verified]] shape one level up: the rule was
// verified once, then silently stopped being true. A comment cannot fail a build.
//
// Static — no browser, no dev server, no DB — so it sits in `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = "check:rappel-readers";

// Prove we read the app rather than a stale or moved layout — a guard that scans nothing
// reports green about nothing ([[guards-must-prove-they-read-the-app]]).
appSources(ROOT, GUARD);

/* The readers live in TWO files now: RouteDetail.jsx renders them, lib/rappels.js derives
   them. Scanning only the first left rappelDocumented/rappelHeaderLabel — which read
   .rappelDetail to build the RAPPELS header — outside a guard whose whole subject is
   rappelDetail readers, and the fail-closed branch could not catch it because the other file
   still had five. A guard that names its inputs must name all of them ([[#547]]). */
const FILES = ["RouteDetail.jsx", "lib/rappels.js"];
const FILE = FILES.join(" + ");
const SRC = FILES.map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");

const ENRICHMENT = ".rappelDetail";
const CONTRIB_GUARD = "_rapEdited";

// Function bodies are found by BALANCING BRACES over RAW source, deliberately not over a
// comment/string-blanked copy. That blanker treats every quote as a string delimiter and
// this file is full of JSX prose with apostrophes ("don't", "climber's"), so it
// desynchronises and swallows braces — the trap check:overlay-discovery records, where
// blanking returned 0 overlays against 22 on raw.
//
// Blanking is not needed here anyway, and that is the point of scanning per-FUNCTION: the
// long explanatory comment about this very rule sits at TOP LEVEL, between functions, so
// it is outside every body and cannot be mistaken for a read. A guard that counted it
// would report a phantom sixth reader.
function topLevelFunctions(src) {
  const out = [];
  // lib/rappels.js exports its readers, so `export function` has to match as well — without
  // this the new file parses to zero functions and contributes nothing to the scan.
  const re = /\n(?:export\s+)?function ([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(src))) {
    const open = src.indexOf("{", m.index + m[0].length - 1);
    if (open < 0) continue;
    let depth = 0, end = -1;
    for (let k = open; k < src.length; k++) {
      const c = src[k];
      if (c === "{") depth++;
      else if (c === "}" && --depth === 0) { end = k + 1; break; }
    }
    if (end > 0) out.push({ name: m[1], line: src.slice(0, m.index).split("\n").length, body: src.slice(open, end) });
  }
  return out;
}

// Comments are stripped before either test, and this is load-bearing rather than tidy.
// Two of the five readers explain the rule in a comment that NAMES `_rapEdited`:
//
//     // `!_rapEdited` for the reason #787 records: a climber who has agreed a correction…
//
// so a body whose real guard had been deleted still contained the token and measured as
// guarded. Injection case 2 caught exactly that — it unguarded all five and this script
// reported four. PRESENCE IS NOT USE, the same false pass check:fire records for its
// `zoneInEffect` rule. The best-documented reader was the one that would have slipped.
//
// Stripping runs ONLY over candidate bodies, never the whole file: candidates are picked
// on raw source first, and every one of them is pure logic with no JSX. That matters
// because a quote-tracking scanner desynchronises on JSX prose full of apostrophes, which
// is why the whole-file blankers elsewhere are documented as unsafe here.
function stripComments(src) {
  let out = "", i = 0, quote = null;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") { out += n === undefined ? "" : n; i += 2; continue; }
      if (c === quote) quote = null;
      i++; continue;
    }
    if (c === "/" && n === "/") { const nl = src.indexOf("\n", i); i = nl < 0 ? src.length : nl; continue; }
    if (c === "/" && n === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === '"' || c === "'" || c === "`") { quote = c; out += c; i++; continue; }
    out += c; i++;
  }
  return out;
}

// Word-bounded: a plain `includes(".rappelDetail")` also matches `.rappelDetailX`, so a
// renamed column would still look like a live reader and the fail-closed branch below
// could never fire. Injection case 3 caught this.
const READS = new RegExp("\\.rappelDetail\\b");
const GUARDED = new RegExp("\\b" + CONTRIB_GUARD + "\\b");

const fns = topLevelFunctions(SRC);
if (!fns.length) {
  console.error(`\n${GUARD} FAILED — parsed 0 top-level functions out of ${FILE}.`);
  console.error("The brace walk is broken, so nothing below was actually checked.\n");
  process.exit(1);
}

const readers = fns
  .filter((f) => READS.test(f.body))            // cheap raw pre-filter
  .map((f) => ({ ...f, code: stripComments(f.body) }))
  .filter((f) => READS.test(f.code));           // a mention in a comment is not a read

// Fails CLOSED. Zero readers means the column was renamed, the file moved, or the walk
// broke — never that the app is clean. Same reasoning as check:clickable and check:counts
// refusing an empty read: this guard's realistic failure mode is a false green.
if (!readers.length) {
  console.error(`\n${GUARD} FAILED — no function in ${FILE} reads ${ENRICHMENT} at all.`);
  console.error("That is not a clean result: it means this scan no longer finds the readers");
  console.error("it exists to check. Was the column renamed, or the reader moved out of file?\n");
  process.exit(1);
}

const unguarded = readers.filter((f) => !GUARDED.test(f.code));

console.log(`  scanned             : ${fns.length} top-level functions in ${FILE}`);
console.log(`  read ${ENRICHMENT}  : ${readers.length} (${readers.map((r) => r.name).join(", ")})`);
console.log(`  carry ${CONTRIB_GUARD} : ${readers.length - unguarded.length}`);

if (unguarded.length) {
  console.error(`\n${GUARD} FAILED — ${unguarded.length} reader(s) of ${ENRICHMENT} do not honour a climber's accepted correction:\n`);
  unguarded.forEach((f) => console.error(`  - ${f.name}  (${FILE}:${f.line})`));
  console.error(`
Each of these prefers the station-by-station enrichment over \`rappels\`, so on a route
carrying a station list an agreed correction reaches consensus and then renders nothing.
That defect has shipped twice.

The fix is one prefix on the rappelDetail branch:

    if (!${CONTRIB_GUARD}(route) && route && route.rappelDetail && route.rappelDetail.length) …

The station list is not deleted by this — it just stops out-voting the humans who climbed
the route. If a new reader genuinely must ignore the correction, add it to EXEMPT below
WITH the reason, so the exemption is a decision on record rather than a silent omission.\n`);
  process.exit(1);
}

console.log(`\n${GUARD}: ok — all ${readers.length} rappelDetail reader(s) honour an accepted correction.`);

// ---- injection cases, all 7 run against the real file; re-run after ANY change here ---
//
//   1. Strip `!_rapEdited(route)&&` from `rappelHeadingCount` -> FAILS naming it + line.
//      The real #784 regression, replayed.
//   2. Strip it from all five                                 -> FAILS naming all FIVE.
//   3. Rename `rappelDetail` -> `rappelStations` everywhere   -> FAILS "no function reads
//      it at all" (fails closed), never passes on an empty set.
//   4. Remove every top-level `function` declaration          -> FAILS "parsed 0
//      top-level functions", not a green run over nothing.
//   5. Add a sixth reader WITHOUT the guard                   -> FAILS naming it. The case
//      this guard exists for.
//   6. Replace a real guard with a COMMENT mentioning `_rapEdited` -> still FAILS.
//   7. Clean source reports exactly 5 readers — 6 would mean the per-function scoping
//      regressed to a whole-file grep and started counting the top-level comment.
//
// TWO OF THESE FAILED ON THE FIRST DRAFT, and both were false PASSES — the direction that
// matters, since a guard that cries wolf gets noticed and one that stays quiet does not:
//
//   * Case 2 named FOUR of five. `rappelsAreNone` and `rappelHeadingCount` each explain
//     the rule in a comment that names `_rapEdited`, so deleting their real guard left the
//     token in the body and they measured as guarded. The two BEST-DOCUMENTED readers were
//     the two that would have slipped through. Fixed by stripping comments first.
//   * Case 3 exited 0. `includes(".rappelDetail")` also matches `.rappelDetailX`, so the
//     fail-closed branch could never fire on a rename. Fixed with a word boundary.
//
// Neither was visible by reading the script — only by trying to break it. Same lesson the
// rest of this suite records: [[injections-that-pass-because-the-fault-is-out-of-frame]].
//
// EXEMPT is deliberately absent rather than empty: there is no legitimate reason today to
// read the station list while ignoring an agreed correction, and an empty exemption list
// is an invitation. Add the constant when a real case appears, with the reason inline.
