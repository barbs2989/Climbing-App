#!/usr/bin/env node
// The #740 glued-name shape OUTSIDE a control, where check:a11y-badges cannot see it.
//
// That guard asks Chrome for a control's computed NAME and reports when two nodes are welded
// into one token. Its selector is controls only -- an element with a role or a computed control
// name -- so the identical markup on a plain <div> is invisible to it by construction, and a
// screen reader reads the glued text just the same.
//
// The instance that prompted this, in RouteDetail's conditions list:
//
//   {pat.label}{pat.when ? <span style={{marginLeft:7, ...}}>{pat.when}</span> : null}
//
// renders as "Best windowmid-Jul to early Sep", "Afternoon thunderstormsJun to Sep",
// "Early-season snowMay to Jul" -- confirmed in a check:signed-in dump, where innerText carries
// no separator at all. The gap a sighted reader sees is CSS margin, and the text has no margins.
//
// THIS PROBE CANNOT CONCLUDE, AND THAT IS ITS RESULT. Read this before treating its output as a
// worklist. Two independent reasons markup is the wrong instrument here, both of which
// check:a11y-badges already records from the other side:
//
//   1  Chrome BLOCKIFIES flex and block children and inserts a space between them, so only an
//      INLINE sibling actually glues. Whether a parent is a flex row is often decided somewhere
//      this scan is not looking.
//   2  An `aria-label` fix changes NO STRUCTURE AT ALL and correctly reads as fixed -- that guard
//      says so explicitly. So a site that has already been repaired is indistinguishable here
//      from one that has not, and several of the candidates below are the "Nathan BarberAttempt"
//      row this repo has already fixed.
//
// Its worth is the SIZE and SHAPE of the class, and the two exclusions below, which were measured
// rather than reasoned (52 -> 31). Closing the class properly means widening check:a11y-badges
// from controls to all elements -- a browser change, since only measurement separates these.
//
// The one instance acted on was confirmed from a RENDERED dump, not from this scan: a
// check:signed-in capture whose innerText read "Best windowmid-Jul to early Sep" with no
// separator at all. That is measurement; this file is a map.
//
//   node scripts/oneoff/probe-glued-text-outside-controls.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

const one = (s) => s.replace(/\s+/g, " ").trim();

// Does this element's own inline style make it a block or flex box? Chrome inserts a space
// between such children, so it does not glue -- reporting it would flag correct markup.
function isBlockish(el, src) {
  const st = el.openingElement.attributes.find(
    (a) => a.type === "JSXAttribute" && a.name.name === "style");
  if (!st) return false;
  const text = src.slice(st.start, st.end);
  return /display:\s*"(block|flex|inline-flex|grid|inline-grid)"/.test(text);
}
function hasMargin(el, src) {
  const st = el.openingElement.attributes.find(
    (a) => a.type === "JSXAttribute" && a.name.name === "style");
  if (!st) return false;
  return /margin(Left|Right)?:/.test(src.slice(st.start, st.end));
}

let scanned = 0;
const hits = [];

for (const rel of FILES) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    JSXElement(p) {
      const kids = p.node.children;
      for (let i = 0; i < kids.length - 1; i++) {
        const a = kids[i], b = kids[i + 1];
        scanned++;
        // Whitespace-only JSXText between them is a real separator in the rendered text.
        if (a.type === "JSXText" && /\s/.test(a.value)) continue;
        // The left side has to END in a word character, or there is already a separator.
        const aTxt = a.type === "JSXText" ? a.value : src.slice(a.start, a.end);
        if (a.type === "JSXText" && !/\w$/.test(aTxt)) continue;
        // The right side: a <span> (or an expression yielding one) carrying a margin and not
        // blockified. Reach through a conditional -- {cond ? <span .../> : null} is the shape
        // that actually shipped, and a scan for a bare element child misses every one of them.
        let el = null;
        if (b.type === "JSXElement") el = b;
        else if (b.type === "JSXExpressionContainer") {
          const e = b.expression;
          if (e.type === "ConditionalExpression") {
            for (const side of [e.consequent, e.alternate]) if (side.type === "JSXElement") { el = side; break; }
          } else if (e.type === "LogicalExpression" && e.right.type === "JSXElement") el = e.right;
        }
        if (!el) continue;
        const tag = el.openingElement.name.name;
        if (tag !== "span" && tag !== "b" && tag !== "i") continue;
        if (!hasMargin(el, src) || isBlockish(el, src)) continue;
        // TWO EXCLUSIONS, both learned by running this and reading the output rather than by
        // reasoning about it. Without them it reports 52, nearly all correct work -- the exact
        // failure check:a11y-badges' own header records for its binned string-matching draft.
        //
        // marginLeft:"auto" is a FLEX SPACER pushing a value to the far edge of a row. Its parent
        // is a flex box, so Chrome blockifies both children and inserts a space: it cannot glue.
        if (/margin(Left|Right)?:\s*"auto"/.test(src.slice(el.start, el.end))) continue;
        // The needle is a word character on BOTH sides. A leading arrow, tick, star or chevron is
        // a real separator, so a span whose text begins with one announces fine -- the rule
        // check:a11y-badges states, applied to the right-hand fragment. Only a LITERAL first
        // character is knowable here; a dynamic one stays in as a candidate.
        const inner = el.children.find((c) => c.type === "JSXText" || c.type === "JSXExpressionContainer");
        if (inner) {
          const lit = inner.type === "JSXText" ? inner.value.trim()
            : (inner.expression.type === "StringLiteral" ? inner.expression.value
              : (inner.expression.type === "TemplateLiteral" && inner.expression.quasis.length === 1
                ? inner.expression.quasis[0].value.cooked : null));
          if (lit != null && lit !== "" && !/^\w/.test(lit)) continue;
        }
        hits.push({
          rel, line: b.loc.start.line,
          left: one(a.type === "JSXExpressionContainer" ? src.slice(a.start, a.end) : aTxt).slice(-40),
          right: one(src.slice(b.start, b.end)).slice(0, 110),
        });
      }
    },
  });
}

if (!scanned) {
  console.error("probe FAILED — no adjacent JSX children examined at all; the traversal is broken.");
  process.exit(1);
}

console.log(`adjacent-child pairs examined: ${scanned}`);
console.log(`candidates (no whitespace, right side is an inline span carrying a margin): ${hits.length}\n`);
for (const h of hits) {
  console.log(`  ${h.rel}:${h.line}`);
  console.log(`      left  …${h.left}`);
  console.log(`      right ${h.right}`);
}
console.log("\nRead each before changing it: only an INLINE sibling actually glues, and a flex or");
console.log("block parent can separate them without either child saying so.");
