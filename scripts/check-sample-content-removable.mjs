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

console.log(`check:sample-content-removable — ${FLAG} is ${flagValue}; ${gated.size} constant(s) gated on it, ${PROMISED.length + PROMISED_INLINE.length} promise(s) checked.`);
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
