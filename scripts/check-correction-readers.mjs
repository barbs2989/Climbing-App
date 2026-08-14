// check:correction-readers — an accepted community correction must out-vote the enrichment,
// for EVERY contributable column, not just rappels.
//
// THE INVARIANT, stated once so it does not live only in a comment again:
//
//     Where a contribute-form field competes with an enrichment column, the reader must
//     prefer the CLIMBERS' value once `_contribFields` records that they agreed it.
//
// This started life as check:rappel-readers, guarding `rappelDetail` alone. It was widened
// after the same rule broke a THIRD time, in a third shape that shared no code and no
// symptom with the first two:
//
//   column          PR          how the correction lost
//   rappelDetail    #787/#791   every reader preferred the station list -> correction
//                               reached consensus and then displayed NOTHING
//   descentText     #897/#915   the reader picked by STRING LENGTH, so a shorter, more
//                               accurate correction lost to stale prose. #897's own fix then
//                               returned the wrong side of a rename and made it STRICTLY
//                               WORSE — before it a correction at least won when longer,
//                               after it a correction could never win at all
//   rack            #907        the form writes `rack`; the RACK box read
//                               `gearTiers.required` — a different column entirely, so the
//                               corrected rack rendered in one panel while the box the
//                               climber edited kept the value they had replaced
//
// Fixing one never found the next. DO NOT assume a fourth looks like any of these.
//
// WHY A SCRIPT AND NOT A COMMENT. #787 fixed three readers and wrote the rule above them.
// #784 then added two more, neither guarded — five readers, three guarded, for four days.
// The merge was CLEAN (different lines), every gate stayed GREEN (the invariant is semantic:
// an unguarded reader is valid JavaScript that renders a number), and both new functions
// read as CORRECT IN ISOLATION. Only a comment three functions above said otherwise, and
// nobody adding a sixth reader has to scroll that far. A comment cannot fail a build.
//
// AND WHY IT IS A BUILD GATE RATHER THAN A PROBE. `descentText` and `rack` were each covered
// only by their own `scripts/oneoff/` probe, and NOTHING RUNS THOSE. The general rule was
// enforced nowhere, so a fourth instance would ship in silence. That gap is what this file
// closes.
//
// Static — no browser, no dev server, no DB — so it sits in `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = "check:correction-readers";

// Prove we read the app rather than a stale or moved layout — a guard that scans nothing
// reports green about nothing ([[guards-must-prove-they-read-the-app]]).
appSources(ROOT, GUARD);

/* The readers live in more than one file. Scanning only RouteDetail.jsx once left
   rappelDocumented/rappelHeaderLabel — which read .rappelDetail to build the RAPPELS header
   — outside a guard whose whole subject is rappelDetail readers, and the fail-closed branch
   could not catch it because the other file still had five. A guard that names its inputs
   must name all of them ([[#547]]). */
const FILES = ["RouteDetail.jsx", "lib/rappels.js"];
const FILE = FILES.join(" + ");
const SRC = FILES.map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
const APP = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

// ---------------------------------------------------------------------------------------
// The rename map is READ FROM THE APP, never restated here.
//
// Both merge paths file a contribution through `M`:
//     local:  o[M[k]||k] = CONV[k] ? CONV[k](e[k].value) : e[k].value
//     DB:     var pk = M[f]||f ; ... o[pk] = ...
// so a correction submitted under form key `descentText` lands in route.DESCENT, while
// route.descentText keeps the untouched enrichment prose. #897 hand-modelled that mapping
// and got it backwards, then "fixed" the reader in the same wrong direction, so its test and
// its fix agreed with each other and both disagreed with the code. A guard that restates the
// map can make the identical mistake — so derive it, and fail ANCHOR LOST if it moves.
// ---------------------------------------------------------------------------------------
const mLit = APP.match(/var M=\{[^}]*\}/);
if (!mLit) {
  console.error(`\n${GUARD} FAILED — ANCHOR LOST: \`var M={\` not found in ClimbMatch.jsx.`);
  console.error("The contribution rename map is where every destination below comes from,");
  console.error("so nothing under it was actually checked.\n");
  process.exit(1);
}
const M = {};
for (const m of mLit[0].matchAll(/(\w+):"([^"]+)"/g)) M[m[1]] = m[2];
if (Object.keys(M).length < 10) {
  console.error(`\n${GUARD} FAILED — parsed only ${Object.keys(M).length} entries out of \`var M\`.`);
  console.error("That is a broken parse, not a small map.\n");
  process.exit(1);
}
// Both merge paths must still route through M. If either stops, every destination this
// guard derives is a statement about code that no longer runs.
for (const [label, re] of [["local", /o\[M\[k\]\|\|k\]/], ["DB", /M\[f\]\|\|f/]]) {
  if (!re.test(APP)) {
    console.error(`\n${GUARD} FAILED — the ${label} merge path no longer files contributions through M.`);
    console.error("The destinations below are derived from M, so they can no longer be trusted.\n");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------------------
// THE REGISTRY. One entry per place a contribute-form field competes with an enrichment
// column. `dest` is DERIVED from M — never written here.
//
// Adding a rivalry is a decision on record. Section 3 fails if the app grows a
// `_<something>Edited` helper that is not registered, so a fourth instance cannot arrive
// unnoticed the way the third did.
// ---------------------------------------------------------------------------------------
// `everyReaderGates` is the STRONG form and is true for exactly one column, deliberately.
// For rappelDetail it holds because that column has no honest use except deciding what the
// RAPPELS section says, so any ungated read is a bug. It is FALSE for the other two, and
// asserting it there was this guard's own first-draft mistake: it flagged `hasPlanContent`
// (an existence OR), `routeHasGlacierTravel` and `simulMentioned` (keyword blobs) and
// `proseSources` — four functions that read .descentText correctly and make no precedence
// decision at all. #915 had already swept and said so. A guard that flags correct work
// teaches people to ignore it, which is worse than the hole it closes.
//
// `precedence` names the ONE function that chooses between the climbers' column and the
// enrichment. That is where all three bugs actually lived.
const RIVALRIES = [
  {
    key: "rap",
    rival: "rappelDetail",
    guard: "_rapEdited",
    everyReaderGates: true,
    precedence: null, // the five readers each gate inline; Rule 1 covers them
    checkRename: false,
    why: "#787/#791 — readers preferred the station list, so an agreed correction rendered nothing.",
  },
  {
    key: "descentText",
    rival: "descentText",
    guard: "_descEdited",
    everyReaderGates: false,
    precedence: "descentBeta",
    // The rival here IS the form key's own name, which is exactly the trap: the CONTRIBUTION
    // lands in `descent` (via M) while `descentText` holds the enrichment. Naming them the
    // other way round is what #897 did, in both its fix AND its test.
    checkRename: true,
    why: "#897/#915 — picked by string length, then by the wrong side of the rename.",
  },
  {
    key: "rack",
    rival: "gearTiers",
    guard: "_rackEdited",
    everyReaderGates: false,
    precedence: "contribRack",
    // NOT rename-checked, and that is measured rather than assumed: a rack contribution is
    // written to BOTH `o.rack` (via CONV.rack) and `o.gearTiers.required` (the gReq path),
    // so returning gearTiers.required under the guard really does hand back the climbers'
    // value. Only `descentText` writes one side and reads the other.
    checkRename: false,
    why: "#907 — the RACK box read gearTiers.required while the form writes rack.",
  },
];
for (const r of RIVALRIES) r.dest = M[r.key] || r.key;

// Function bodies are found by BALANCING BRACES over RAW source, deliberately not over a
// comment/string-blanked copy. That blanker treats every quote as a string delimiter and
// this file is full of JSX prose with apostrophes ("don't", "climber's"), so it
// desynchronises and swallows braces — the trap check:overlay-discovery records, where
// blanking returned 0 overlays against 22 on raw.
//
// Blanking is not needed here anyway, and that is the point of scanning per-FUNCTION: the
// long explanatory comment about this very rule sits at TOP LEVEL, between functions, so
// it is outside every body and cannot be mistaken for a read. A guard that counted it
// would report a phantom reader.
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
// Several readers explain the rule in a comment that NAMES the guard helper:
//
//     // `!_rapEdited` for the reason #787 records: a climber who has agreed a correction…
//
// so a body whose real guard had been deleted still contained the token and measured as
// guarded. Injection case 2 caught exactly that — it unguarded all five rappel readers and
// the first draft reported four. PRESENCE IS NOT USE, the same false pass check:fire records
// for its `zoneInEffect` rule. The best-documented reader was the one that would have
// slipped.
//
// Stripping runs ONLY over candidate bodies, never the whole file: candidates are picked on
// raw source first, and every one of them is pure logic with no JSX. That matters because a
// quote-tracking scanner desynchronises on JSX prose full of apostrophes, which is why the
// whole-file blankers elsewhere are documented as unsafe here.
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
// renamed column would still look like a live reader and the fail-closed branch below could
// never fire. Injection case 3 caught this.
const prop = (name) => new RegExp("\\.\\s*" + name + "\\b");
const tok = (name) => new RegExp("\\b" + name + "\\b");

const fns = topLevelFunctions(SRC).map((f) => ({ ...f, code: stripComments(f.body) }));
if (!fns.length) {
  console.error(`\n${GUARD} FAILED — parsed 0 top-level functions out of ${FILE}.`);
  console.error("The brace walk is broken, so nothing below was actually checked.\n");
  process.exit(1);
}

const problems = [];
console.log(`  scanned              : ${fns.length} top-level functions in ${FILE}`);
console.log(`  rename map           : ${Object.keys(M).length} entries read from ClimbMatch.jsx's \`var M\``);

// ---------------------------------------------------------------------------------------
// RULE 1 — every reader of a rival enrichment column must carry the correction guard.
// Catches the #787/#791 shape (reader prefers enrichment) and the #907 shape (reader reaches
// for a different column than the one the form writes).
// ---------------------------------------------------------------------------------------
for (const r of RIVALRIES) {
  const readers = fns.filter((f) => prop(r.rival).test(f.body)).filter((f) => prop(r.rival).test(f.code));

  // Fails CLOSED. Zero readers means the column was renamed, the file moved, or the walk
  // broke — never that the app is clean. Same reasoning as check:clickable and check:counts
  // refusing an empty read: this guard's realistic failure mode is a false green.
  if (!readers.length) {
    problems.push(`no function in ${FILE} reads .${r.rival} at all — was the column renamed, or the reader moved out of file? (rivalry "${r.key}")`);
    continue;
  }
  if (!r.everyReaderGates) {
    console.log(`  .${r.rival.padEnd(14)}     : ${readers.length} reader(s) (precedence checked at ${r.precedence}, not every read)`);
    continue;
  }
  const unguarded = readers.filter((f) => !tok(r.guard).test(f.code));
  console.log(`  .${r.rival.padEnd(14)}     : ${readers.length} reader(s), ${readers.length - unguarded.length} carry ${r.guard}`);
  for (const f of unguarded) {
    problems.push(`${f.name} (${FILE}:${f.line}) reads .${r.rival} without ${r.guard} — ${r.why}`);
  }
}

// ---------------------------------------------------------------------------------------
// RULE 2 — a guarded precedence decision must return the RENAME DESTINATION.
//
// This is #915's finding made permanent, and it is a different failure from Rule 1: the
// guard was PRESENT and the expression still discarded the correction, because it returned
// the form-key column instead of the column the merge actually writes. Rule 1 cannot see
// that — the reader carries its guard and looks correct.
//
// Only functions that (a) carry a correction guard and (b) read both sides of the rename are
// examined, so this cannot fire on ordinary code. Local `const x = ... r.prop ...` bindings
// are resolved so the returned identifier can be traced back to a property.
// ---------------------------------------------------------------------------------------
for (const r of RIVALRIES) {
  if (!r.precedence) continue;
  const f = fns.find((x) => x.name === r.precedence);
  // Stale registry entries fail: a precedence function that no longer exists means this
  // rule is silently checking nothing.
  if (!f) {
    problems.push(`RIVALRIES names "${r.precedence}" as the precedence reader for "${r.key}", but no such top-level function exists in ${FILE}. Stale bookkeeping, or the decision moved somewhere this guard cannot see it.`);
    continue;
  }
  if (!tok(r.guard).test(f.code)) {
    problems.push(`${f.name} (${FILE}:${f.line}) chooses between the climbers' column and the enrichment but does not consult ${r.guard} — ${r.why}`);
    continue;
  }
  if (!r.checkRename) {
    console.log(`  ${f.name}: consults ${r.guard} (no rename to get the wrong way round)`);
    continue;
  }

  // map local bindings -> the property they were read from
  const bind = {};
  for (const m of f.code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=([^;]*);/g)) {
    // one declaration may bind several names: `const a=…r.descent…, b=…r.descentText…;`
    for (const part of m[2].split(/,(?![^(]*\))/)) {
      const nm = part.includes("=") ? (part.match(/([A-Za-z_$][\w$]*)\s*=/) || [])[1] : m[1];
      const target = part.includes("=") || m[2].indexOf(part) === 0 ? (nm || m[1]) : m[1];
      const d = prop(r.dest).test(part), v = prop(r.rival).test(part);
      if (d && !v) bind[target] = r.dest;
      else if (v && !d) bind[target] = r.rival;
    }
  }
  // The return taken when the correction guard is TRUE.
  //
  // `[^)]*` CANNOT be used for the condition: the guard call itself contains a `)`, so
  // `if(a&&_descEdited(r))return a;` never matched and every reader reported as an
  // unrecognised shape. That false FAILURE was this rule's first draft — noisy rather than
  // silent, so it was caught immediately, but it is the reason the pattern below allows one
  // level of nesting explicitly.
  const g = f.code.match(new RegExp("if\\s*\\((?:[^()]|\\([^()]*\\))*\\b" + r.guard + "\\b(?:[^()]|\\([^()]*\\))*\\)\\s*return\\s+([A-Za-z_$][\\w$]*)\\s*;"));
  if (!g) {
    problems.push(`${f.name} (${FILE}:${f.line}) carries ${r.guard} and reads both .${r.dest} and .${r.rival}, but its guarded branch is not the recognised \`if (… ${r.guard} …) return X;\` shape — this guard cannot tell which column wins, so it refuses to pass it. Rewrite to that shape, or register an exemption WITH the reason.`);
    continue;
  }
  const got = bind[g[1]];
  if (got !== r.dest) {
    problems.push(`${f.name} (${FILE}:${f.line}) returns \`${g[1]}\` when ${r.guard} is true, and that reads .${got || "an untraced property"} — but the merge files a "${r.key}" contribution into route.${r.dest} (via M). The climbers' text is in .${r.dest}; returning .${r.rival} hands the enrichment back and discards the correction outright. ${r.why}`);
  } else {
    console.log(`  ${f.name}: guarded branch returns .${r.dest} (the M destination) — correct`);
  }
}

// ---------------------------------------------------------------------------------------
// RULE 3 — fail closed on an UNREGISTERED rivalry.
//
// The whole reason this rule broke three times is that each new instance arrived without
// anybody noticing it was the same rule. A new `_<x>Edited` helper is the fingerprint of a
// fourth, so an unregistered one fails rather than passing quietly. A registered guard that
// no longer exists fails too, so the registry cannot rot into a description of code that is
// gone — the standard NEEDS_EXTRA_STATE and the KNOWN map are held to.
// ---------------------------------------------------------------------------------------
const helpers = new Set();
for (const f of [SRC, APP]) for (const m of f.matchAll(/\bfunction\s+(_[A-Za-z]\w*Edited)\s*\(/g)) helpers.add(m[1]);
const registered = new Set(RIVALRIES.map((r) => r.guard));
for (const h of helpers) {
  if (!registered.has(h)) {
    problems.push(`${h}() exists in the app but is not registered in RIVALRIES. That helper is the fingerprint of a contribute-vs-enrichment rivalry, and an unregistered one is exactly how this rule broke a third time. Add it WITH the enrichment column it defends and the reason.`);
  }
}
for (const h of registered) {
  if (!helpers.has(h)) {
    problems.push(`RIVALRIES registers ${h}() but no such function exists — stale bookkeeping. Remove the entry or fix the name.`);
  }
}
console.log(`  correction helpers   : ${helpers.size} found, ${registered.size} registered`);

if (problems.length) {
  console.error(`\n${GUARD} FAILED — ${problems.length} problem(s):\n`);
  problems.forEach((p) => console.error(`  - ${p}\n`));
  console.error(`An accepted correction has passed the 3-agree gate: climbers looked at this route
and agreed the value was wrong. Whatever the shape, the fix is the same sentence —
the climbers' column wins once _contribFields records it, and the enrichment is the
fallback, never the override.\n`);
  process.exit(1);
}

console.log(`\n${GUARD}: ok — ${RIVALRIES.length} rivalries, every reader honours an accepted correction.`);

// ---- injection cases; re-run ALL of them after ANY change to the parsing above -----------
//
//   1. Strip `!_rapEdited(route)&&` from `rappelHeadingCount`  -> FAILS naming it + line.
//      The real #784 regression, replayed.
//   2. Strip it from all five rappel readers                   -> FAILS naming all FIVE, not
//      four: the two best-documented readers explain the rule in a comment that names the
//      helper, and only comment-stripping stops that reading as a guard.
//   3. Rename `rappelDetail` -> `rappelStations` everywhere    -> FAILS "no function reads
//      it at all" (fails closed), never passes on an empty set.
//   4. Remove every top-level `function` declaration           -> FAILS "parsed 0 top-level
//      functions", not a green run over nothing.
//   5. Add a sixth reader WITHOUT the guard                    -> FAILS naming it.
//   6. Replace a real guard with a COMMENT mentioning it       -> still FAILS.
//   7. Revert descentBeta to `return b` under _descEdited      -> FAILS Rule 2 naming the
//      column. THIS IS NOT SYNTHETIC: it is the pre-#915 code, and the guard was written
//      against main while that bug was still live, so case 7 is a real caught defect rather
//      than a manufactured one.
//   8. Rename `var M` in ClimbMatch.jsx                        -> FAILS ANCHOR LOST, because
//      every destination is derived from it.
//   9. Delete `o[M[k]||k]` from the local merge path           -> FAILS "no longer files
//      contributions through M".
//  10. Add `function _fooEdited(r){…}` and do not register it  -> FAILS Rule 3. The case
//      this widening exists for.
//  11. Register a helper that does not exist                   -> FAILS as stale bookkeeping.
//
// TWO OF THE ORIGINAL SEVEN FAILED ON THE FIRST DRAFT, and both were false PASSES — the
// direction that matters, since a guard that cries wolf gets noticed and one that stays
// quiet does not. Case 2 named four of five (comments counted as guards); case 3 exited 0
// (`includes(".rappelDetail")` also matches `.rappelDetailX`, so the fail-closed branch
// could never fire). Neither was visible by reading the script — only by trying to break it.
// [[injections-that-pass-because-the-fault-is-out-of-frame]].
//
// EXEMPT is deliberately absent rather than empty: there is no legitimate reason today to
// read an enrichment column while ignoring an agreed correction, and an empty exemption list
// is an invitation. Add the constant when a real case appears, with the reason inline.
