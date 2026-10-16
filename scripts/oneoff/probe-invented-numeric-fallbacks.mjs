// #1327's defect was `(a.hikingSpeedFtHr||950)` — a number nobody recorded, substituted into a
// comparison whose RESULT was shown as a measurement ("450ft/hr difference — discuss pace"). Its
// sibling `compat()` had already been fixed for the same thing, and the app's own comment there
// records the rule: score it only when both sides are known.
//
// This asks how many other `field || <number>` fallbacks exist and which of them feed something a
// climber reads as data. Report-only — most numeric defaults are perfectly ordinary (a zero
// accumulator, a page size, an index). The finding is a fallback that is neither 0 nor 1 standing
// in for a value a PERSON was supposed to supply.
//
// RESULT, 2026-08-27: 248 numeric `||` fallbacks, 11 substituting a non-identity number for a data
// field, and NONE of them is the #1327 defect. Nine are DOM or sort defaults — `window.innerHeight
// ||800` and `bar.offsetHeight||36` are measurements taken before layout, `pos.coords.accuracy||50`
// is a circle radius, and `driveMinSLC||999` is a SORT KEY that pushes unknowns last and is never
// displayed. The remaining two are `avgPitchLength||35`, a modelling assumption inside a panel that
// says in its own words "Times and pack weights are estimates for an average party" — the same
// footing as Scarf's Rule taking a fitness tier.
//
// So the speed panel was an INSTANCE, not a class, and the reason is worth keeping: it DISPLAYED
// its inputs ("0 · You") beside a difference computed from a different fallback (950). A modelling
// default that never appears on screen, inside something labelled an estimate, is not the same
// thing. Do not "sweep" the eleven.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "lib/db.js"];

let scanned = 0;
const hits = [];

for (const rel of FILES) {
  const code = readFileSync(path.join(ROOT, rel), "utf8");
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    LogicalExpression(p) {
      if (p.node.operator !== "||") return;
      const right = p.node.right;
      if (!right || right.type !== "NumericLiteral") return;
      scanned++;
      // 0 and 1 are the ordinary identities — an empty accumulator, a count that must not be
      // zero, a multiplier. A fallback of 950, 1000, 50 is a GUESS at somebody's data.
      if (right.value === 0 || right.value === 1) return;
      const leftSrc = code.slice(p.node.left.start, p.node.left.end);
      // Only member reads of a DATA object. A local variable defaulting to a number is a
      // parameter default, not a substituted measurement.
      if (!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)+$/.test(leftSrc)) return;
      // Config-ish names are limits and sizes, not somebody's recorded value.
      if (/\b(cap|max|min|limit|size|zoom|width|height|radius|page|ms|timeout|delay|opacity|z)\b/i.test(leftSrc)) return;
      hits.push({ rel, line: p.node.loc.start.line, left: leftSrc, val: right.value,
        ctx: code.slice(Math.max(0, p.node.start - 90), p.node.end + 90).replace(/\s+/g, " ") });
    },
  });
}

console.log(`${scanned} numeric || fallbacks across ${FILES.length} files\n`);
console.log(`substituting a non-identity number for a data field: ${hits.length}\n`);
for (const h of hits) {
  console.log(`  ${h.rel}:${h.line}  ${h.left} || ${h.val}`);
  console.log(`      …${h.ctx.slice(0, 170)}…`);
}
