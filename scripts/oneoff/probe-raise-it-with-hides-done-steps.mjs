#!/usr/bin/env node
// "Raise it with:" must not offer a step the climber has already completed.
//
// The Profile trust card renders a fixed row of three — Log a route / Verify email / Add a cert —
// under the heading "Raise it with:". It was UNCONDITIONAL, so a climber whose email is already
// verified was told verifying it would raise their score. The handler's own first line is
// `if(verified){showToast("You're already verified.");return;}`, so the app knew; and the résumé
// two inches away on the same account reads "✓ Email verified". CI's signed-in walk captured both
// at once on the fixture.
//
// HOME ALREADY DID THIS CORRECTLY. Its "Finish setting up" checklist pushes the verify row only
// `if(!ME.verified)`, and every other row there is conditional too. So the Profile list was the
// outlier — the minority surface is the defect.
//
// PARSED WITH BABEL, NOT MATCHED WITH A REGEX. Three separate checkers in this session were fooled
// by the comment written to explain the fix — twice a false failure, once a false PASS on a fully
// restored defect. An AST does not see comments at all, which removes the trap rather than
// working around it. See [[a-checker-is-fooled-by-its-own-explanation]].
//
//   node scripts/oneoff/probe-raise-it-with-hides-done-steps.mjs

import { parse } from "@babel/parser";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = path.join(ROOT, "ClimbMatch.jsx");
const src = fs.readFileSync(FILE, "utf8");

let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };

const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: false });

// Walk for the array whose first element starts with the literal "Log a route".
let arr = null, filterCb = null;
const seen = { arrays: 0 };
(function walk(n, parent) {
  if (!n || typeof n.type !== "string") return;
  if (n.type === "ArrayExpression") {
    seen.arrays++;
    const first = n.elements[0];
    if (first && first.type === "ArrayExpression" && first.elements[0] &&
        first.elements[0].type === "StringLiteral" && first.elements[0].value === "Log a route") {
      arr = n;
      // the .filter(...) applied to it, if any
      if (parent && parent.type === "MemberExpression" && parent.object === n &&
          parent.property.type === "Identifier" && parent.property.name === "filter") {
        filterCb = true;
      }
    }
  }
  for (const k of Object.keys(n)) {
    const v = n[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === "string" && walk(c, n));
    else if (v && typeof v.type === "string") walk(v, n);
  }
})(ast.program, null);

// Fail closed: a parse that found nothing must never read as a clean tree.
if (seen.arrays < 200) fail(`only ${seen.arrays} array literals parsed — the walk is broken`);
if (!arr) { fail('ANCHOR LOST: no "Raise it with" array (first entry "Log a route") — nothing below is meaningful'); }
else {
  ok(`found the list (${arr.elements.length} entries, ${seen.arrays} arrays walked)`);

  const entries = arr.elements.map((e) => ({
    label: e && e.elements && e.elements[0] && e.elements[0].value,
    cond: e && e.elements && e.elements[2] ? src.slice(e.elements[2].start, e.elements[2].end) : null,
  }));
  for (const e of entries) console.log(`        ${JSON.stringify(e.label)} -> ${e.cond === null ? "(always)" : e.cond}`);

  const ve = entries.find((e) => e.label === "Verify email");
  if (!ve) fail('the "Verify email" entry is gone — re-check what this list now offers');
  else if (ve.cond === null) fail('"Verify email" is UNCONDITIONAL — a verified climber is told to verify');
  else if (/verified/.test(ve.cond)) ok(`"Verify email" is gated on ${ve.cond}`);
  else fail(`"Verify email" carries a condition that does not mention verified: ${ve.cond}`);

  // The other two are always worth doing; gating them would hide real advice.
  for (const label of ["Log a route", "Add a cert"]) {
    const e = entries.find((x) => x.label === label);
    if (!e) fail(`the "${label}" entry is gone`);
    else if (e.cond === null) ok(`"${label}" stays unconditional`);
    else fail(`"${label}" gained a condition (${e.cond}) — it is always worth doing`);
  }

  // A condition that nothing applies is decoration.
  if (filterCb) ok("the list is filtered on that condition before rendering");
  else fail("the array carries conditions but nothing filters on them — the gate is dead");
}

// The precedent this is being made consistent with. If Home stops gating its own verify row, the
// argument moves and somebody should know.
const home = src.match(/if\(!ME\.verified\)gaps\.push\(/);
if (home) ok("CONTROL — Home's setup checklist still gates its verify row on !ME.verified");
else fail("CONTROL — Home no longer gates its verify row; re-check which surface is right");

console.log(bad ? `\n${bad} problem(s).` : "\nall assertions passed");
process.exit(bad ? 1 : 0);
