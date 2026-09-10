#!/usr/bin/env node
// check:sample-content-removable — the sample content must actually come out with the flag.
//
// #1566 turned DEMO_FILLERS on so every empty surface shows one example. That was asked for
// explicitly and asked for TEMPORARILY: "I will eventually remove the examples before the app goes
// live." The flag's own comment states the removal contract in one sentence —
//
//     "TO REMOVE: set this back to `false`. That is the whole switch — every sample group, group
//      event, group join-request, sample comment, filler climber, sample belay catch and sample
//      condition report disappears with it."
//
// — and NOTHING CHECKED IT. #1566 shipped a probe that proves the flag POPULATES; the direction
// that matters for launch is that it EMPTIES, and that was unverified in both directions: nobody
// asserted the seven are gated, and nobody would notice an eighth arriving ungated.
//
// THE FAILURE IS QUIET AND LATE. A sample surface that is not behind the flag stays populated
// after the flip, every guard stays green, and the person who finds out is a real climber looking
// at somebody else's demo crew. Showing demo data to a real account as though it were theirs is
// the direction this repo refuses everywhere else.
//
// WHAT IT ASSERTS, and why this shape rather than a browser walk:
//   1. every declaration named below is initialised through a DEMO_FILLERS conditional whose
//      OFF branch is empty — the gate is at the SOURCE, so every downstream consumer inherits it
//      without having to re-check the flag, which is why "that is the whole switch" can be true
//      at all;
//   2. the registry is not stale: a name that stops existing fails rather than silently dropping
//      its question;
//   3. nothing was added ungated — any OTHER top-level constant initialised from a DEMO_FILLERS
//      conditional must be declared here too.
//
// A WALK WAS TRIED FIRST AND IS THE WEAKER INSTRUMENT, recorded so it is not re-attempted as an
// improvement: two runs of the app, flag on and flag off, comparing screens. It can only prove the
// surfaces it visits, it needs a browser (this box was at load average 420 and both runs blew a
// 180s navigation timeout), and its first version silently measured the DEFAULT TAB seven times
// because `?zt=` is injected by the overlay scaffold and a plain vite config does not apply it —
// both walks came back byte-identical and every marker read as absent, which looks exactly like
// "the flag removes everything" and was really "the walk never left Home".
//
// Static: Babel over the two app files. No browser, no database, no dev server.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["ClimbMatchCore.jsx", "ClimbMatch.jsx"];
const FLAG = "DEMO_FILLERS";

// The seven things the flag's own comment promises disappear. Each entry names what the reader is
// told, and how it is spelled in the source, so a rename shows up as a stale entry rather than as
// a question that quietly stopped being asked.
const PROMISED = [
  { promise: "filler climber", decl: "FILLER_CLIMBERS" },
  { promise: "sample group", decl: "GROUPS" },
  { promise: "sample comment", decl: "COMMENTS" },
];
// The rest are useState seeds rather than named constants — they have no declaration to key on, so
// they are matched by a literal that exists only inside their own DEMO_FILLERS branch.
const PROMISED_INLINE = [
  { promise: "sample group event", needle: 'group_wasatch_trad:[{id:"ev1"' },
  { promise: "sample group join-request", needle: 'groupId:"group_alpine_start"' },
  { promise: "sample belay catch", needle: 'id:"cat_ex1"' },
  { promise: "sample condition report", needle: "scoutOnly:true" },
];

const fail = (m) => { console.error(`\ncheck:sample-content-removable FAILED — ${m}`); process.exit(1); };

const src = {};
for (const f of FILES) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) fail(`${f} is missing, so nothing was checked. Reporting nothing is not a pass.`);
  src[f] = fs.readFileSync(p, "utf8");
}

// ---- the flag itself has to be a flag ----
const decl = src["ClimbMatchCore.jsx"].match(/const\s+DEMO_FILLERS\s*=\s*(true|false)\s*;/);
if (!decl) fail(`could not find \`const ${FLAG} = true|false;\` in ClimbMatchCore.jsx. If it became a computed value this guard is reading the wrong thing, and every assertion below would be about a flag it cannot see.`);
const flagValue = decl[1];

// ---- 1 + 3. every constant initialised from the flag, found rather than listed ----
const gated = new Map(); // name -> { file, emptiesOff }
for (const f of FILES) {
  let ast;
  try { ast = parse(src[f], { sourceType: "module", plugins: ["jsx"], errorRecovery: true }); }
  catch (e) { fail(`could not parse ${f} (${e.message}). A guard that cannot read a file has not checked it.`); }
  traverse(ast, {
    VariableDeclarator(p) {
      const id = p.node.id, init = p.node.init;
      if (!id || id.type !== "Identifier" || !init) return;
      if (init.type !== "ConditionalExpression") return;
      if (!(init.test.type === "Identifier" && init.test.name === FLAG)) return;
      // The OFF branch is what makes the gate real: `FLAG ? [...] : []` empties at the source, so
      // every consumer downstream inherits it. `FLAG ? a : b` with a non-empty b would NOT.
      const alt = init.alternate;
      const emptiesOff =
        (alt.type === "ArrayExpression" && alt.elements.length === 0) ||
        (alt.type === "ObjectExpression" && alt.properties.length === 0) ||
        (alt.type === "NullLiteral") ||
        (alt.type === "Identifier" && alt.name === "undefined");
      gated.set(id.name, { file: f, emptiesOff });
    },
  });
}

if (gated.size === 0) {
  fail(`no constant is initialised from ${FLAG} at all. Either the flag was removed — in which case delete this guard — or the traversal broke, in which case every promise below would read as kept while nothing was checked.`);
}

const problems = [];

for (const { promise, decl: name } of PROMISED) {
  const g = gated.get(name);
  if (!g) {
    problems.push(`the ${promise} (\`${name}\`) is NOT initialised from ${FLAG}. The flag's own comment promises it disappears when the flag is off; as written it would not. Gate it at the declaration — \`${FLAG} ? [...] : []\` — so every consumer inherits the gate, or correct the comment.`);
    continue;
  }
  if (!g.emptiesOff) {
    problems.push(`the ${promise} (\`${name}\`) is conditioned on ${FLAG} but its OFF branch is not empty, so turning the flag off swaps one set of sample content for another rather than removing it.`);
  }
}

for (const { promise, needle } of PROMISED_INLINE) {
  const inFile = FILES.find((f) => src[f].includes(needle));
  if (!inFile) {
    problems.push(`the ${promise} could not be found by its marker \`${needle}\`. Either it was removed — drop this entry — or it was reworded, in which case this entry stopped asking its question and the sample content it covers is unchecked.`);
    continue;
  }
  // It must sit inside a DEMO_FILLERS conditional. Nearest-preceding is enough here because these
  // are useState seeds written as `FLAG?<literal>:[]` on one expression.
  const at = src[inFile].indexOf(needle);
  const before = src[inFile].lastIndexOf(FLAG, at);
  const gap = before < 0 ? Infinity : at - before;
  if (gap > 400) {
    problems.push(`the ${promise} (\`${needle}\`) is not inside a ${FLAG} branch — the nearest mention of the flag is ${gap === Infinity ? "nowhere before it" : gap + " characters earlier"}. It would survive the flag being turned off.`);
  }
}

// 3. nothing gated that nobody declared — an eighth sample surface must be registered, or the
// comment's list silently stops describing what the flag does.
const known = new Set(PROMISED.map((p) => p.decl));
const undeclared = [...gated.keys()].filter((n) => !known.has(n));
if (undeclared.length) {
  problems.push(`${undeclared.length} constant(s) are gated on ${FLAG} but not listed in this guard: ${undeclared.join(", ")}. Add them to PROMISED with the words the flag's comment uses, so the removal contract and the code stay the same list.`);
}

// ---- 4. THE SECOND MECHANISM, WHICH RULE 3 CANNOT SEE ----
//
// Rules 1 and 3 both key on a DEMO_FILLERS marker: is every promised constant gated, and is every
// GATED constant declared. Neither can ask the opposite question — is there sample content carrying
// NO marker at all — because ungated seed data has nothing for the traversal to find. That is not a
// hypothetical gap: `notifs`, `crews`, `logs`, `msgs`, `friendReqIn`, `contribs` and fifteen more
// start populated and are gated by nothing.
//
// They are not a defect, and the app says so at the reset itself: "STARTING VALUE of this app's
// state, gated by nothing (DEMO_FILLERS does not cover them) ... Keyed on the SESSION rather than on
// a build flag." The flag covers a logged-out demo; the sign-in reset covers a real account. TWO
// complementary mechanisms — and only one of them was checked.
//
// WHAT WOULD BE LIVE: a new seeded useState that is ungated AND missing from the reset. A real
// signed-in climber would keep seeing it beside their own rows, every hydration path here being
// additive ("concat", "new Set([...seed, ...db])"), so no amount of real data displaces it. That is
// the #735 shape — seed history attributed to a real account — arriving through a different door.
//
// Measured before shipping: 21 ungated seeded declarations, and the reset clears all 21. So this
// ships GREEN and its whole job is the next one.
const appSrc = src["ClimbMatch.jsx"];
const resetAnchor = appSrc.indexOf("setNotifs([])");
if (resetAnchor < 0) fail("ANCHOR LOST: could not find `setNotifs([])`, so the sign-in reset could not be located. Every ungated seed array would read as covered while nothing was checked.");
const ifUid = appSrc.lastIndexOf("if(uid){", resetAnchor);
if (ifUid < 0) fail("ANCHOR LOST: found the reset's body but not its `if(uid){` head.");
let rDepth = 0, rEnd = -1, rStart = appSrc.indexOf("{", ifUid);
for (let k = rStart; k < appSrc.length; k++) {
  if (appSrc[k] === "{") rDepth++;
  else if (appSrc[k] === "}") { rDepth--; if (!rDepth) { rEnd = k; break; } }
}
if (rEnd < 0) fail("ANCHOR LOST: the sign-in reset block does not close — the brace walk ran off the end.");
const resetBody = appSrc.slice(rStart, rEnd + 1);
const clearedByReset = new Set([...resetBody.matchAll(/set([A-Z]\w*)\s*\(/g)].map((m) => m[1][0].toLowerCase() + m[1].slice(1)));
if (clearedByReset.size < 10) fail(`the sign-in reset parsed as only ${clearedByReset.size} setter(s). It clears far more than that, so the walk is broken and every name below would read as covered.`);

// A useState whose initialiser opens with a populated array or object literal is seed CONTENT.
// NOT_SEED_CONTENT records the exceptions with a reason, and a stale entry fails in both directions
// — the standard KNOWN and PARTIAL_ON_PURPOSE are held to elsewhere in this repo.
const NOT_SEED_CONTENT = {
  filters: "route-search defaults (gradeMin:\"any\", maxMi:500) — a UI starting position, not sample content, and it must survive sign-in like any other preference.",
};
const seededDecls = [];
for (const m of appSrc.matchAll(/\[(\w+),\s*set(\w+)\]\s*=\s*useState\(/g)) {
  const from = m.index + m[0].length;
  let d = 1, j = from;
  for (; j < appSrc.length && d > 0; j++) { const c = appSrc[j]; if (c === "(") d++; else if (c === ")") d--; }
  const init = appSrc.slice(from, j - 1);
  if (/DEMO_FILLERS/.test(init)) continue;                       // rules 1 and 3 already own these
  if (!/^\s*(\[\s*\{|\[\s*"|\[\s*\d|\{\s*\w+\s*:)/.test(init)) continue;
  seededDecls.push(m[1]);
}
if (seededDecls.length < 10) fail(`only ${seededDecls.length} ungated seeded declaration(s) parsed. The app has around twenty, so the traversal is broken rather than the app being clean.`);

const resetCovered = seededDecls.filter((n) => clearedByReset.has(n));
const uncovered = seededDecls.filter((n) => !clearedByReset.has(n) && !NOT_SEED_CONTENT[n]);
if (uncovered.length) {
  problems.push(`${uncovered.length} seeded declaration(s) are gated by neither ${FLAG} nor the sign-in reset: ${uncovered.join(", ")}. A real signed-in climber keeps them beside their own rows, because every hydration path is additive. Clear it in the \`if(uid){...}\` reset, or declare it in NOT_SEED_CONTENT with the reason it is a preference rather than sample data.`);
}
const staleNotSeed = Object.keys(NOT_SEED_CONTENT).filter((n) => !seededDecls.includes(n));
if (staleNotSeed.length) {
  problems.push(`NOT_SEED_CONTENT names ${staleNotSeed.join(", ")}, which no longer parses as a seeded declaration. Stale bookkeeping: delete the entry, or find out what it became.`);
}

console.log(`check:sample-content-removable — ${FLAG} is ${flagValue}; ${gated.size} constant(s) gated on it, ${PROMISED.length + PROMISED_INLINE.length} promise(s) checked.`);
console.log(`  second mechanism: ${seededDecls.length} ungated seeded declaration(s), ${resetCovered.length} cleared by the sign-in reset, ${Object.keys(NOT_SEED_CONTENT).length} declared not-sample-content.`);
if (flagValue === "true") {
  console.log("  NOTE: the flag is ON, which is the temporary state #1566 was asked for. This guard");
  console.log("        is unaffected either way — it asks whether the OFF branch removes the sample");
  console.log("        content, which is a property of the source rather than of the flag's value.");
}

if (problems.length) {
  for (const p of problems) console.error(`  FAIL  ${p}`);
  fail(`${problems.length} problem(s) — the sample content would not fully come out with the flag.`);
}
console.log("ok — every sample surface the flag's comment promises is gated at its declaration, and nothing is gated that this guard does not know about.");
