#!/usr/bin/env node
// Deletes the DEAD half of every duplicate JSX attribute / object key check:dup-attrs reports.
//
// BY AST BYTE RANGE, never by text. Two of the three duplicates are `aria-current={sel?...}`
// and `aria-current={on?...}`, strings that occur four and six times across these files -- a
// textual replace would cut a different, correct control. The parser knows which two nodes
// share an element, so it knows which bytes to remove.
//
// It removes the EARLIER declaration in every case, which is the one that never ran. So the
// rewrite is behaviour-neutral by construction rather than by inspection: whatever the file
// does today, it is doing it with the later declaration, and that is the one left standing.
// For the two identical aria-current pairs either could go; for the border pair only this
// direction is safe, since the chip renders at 1.5px today and matches the button beside it.
//
// Re-parses afterwards and refuses to write a file it cannot parse.
//
//   node scripts/oneoff/fix-duplicate-declarations.mjs --dry
//   node scripts/oneoff/fix-duplicate-declarations.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DRY = process.argv.includes("--dry");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

// Collect the byte range of every dead declaration, plus whatever separates it from the next
// token, so removing it leaves no doubled comma or stray space.
function deadRanges(src) {
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  const out = [];
  const note = (prev, cur, kind, name) => {
    let end = prev.end;
    // Swallow the separator that followed it: a comma for an object key, whitespace for a JSX
    // attribute. Bounded, so a malformed gap cannot eat the next declaration.
    while (end < src.length && end - prev.end < 4 && /[\s,]/.test(src[end])) end++;
    out.push({ start: prev.start, end, kind, name, text: src.slice(prev.start, prev.end) });
  };
  traverse(ast, {
    JSXOpeningElement(p) {
      const seen = new Map();
      for (const a of p.node.attributes) {
        if (a.type !== "JSXAttribute" || !a.name || a.name.type !== "JSXIdentifier") continue;
        const prev = seen.get(a.name.name);
        if (prev) note(prev, a, "attribute", a.name.name);
        seen.set(a.name.name, a);
      }
    },
    ObjectExpression(p) {
      const seen = new Map();
      for (const pr of p.node.properties) {
        if (pr.type !== "ObjectProperty" || pr.computed) continue;
        const k = pr.key.type === "Identifier" ? pr.key.name
          : pr.key.type === "StringLiteral" ? pr.key.value : null;
        if (k === null) continue;
        const prev = seen.get(k);
        if (prev) note(prev, pr, "object key", k);
        seen.set(k, pr);
      }
    },
  });
  return out.sort((a, b) => a.start - b.start);
}

let total = 0;
for (const rel of FILES) {
  const abs = path.join(ROOT, rel);
  const src = fs.readFileSync(abs, "utf8");
  const dead = deadRanges(src);
  if (!dead.length) { console.log(`${rel}: nothing to remove`); continue; }

  // Last to first, so an earlier removal cannot shift a later offset.
  let out = src;
  for (const d of [...dead].reverse()) out = out.slice(0, d.start) + out.slice(d.end);

  for (const d of dead) {
    console.log(`${rel}: remove dead ${d.kind} ${JSON.stringify(d.name)} — ${d.text.replace(/\s+/g, " ").slice(0, 70)}`);
  }
  total += dead.length;

  // A file that no longer parses is a file that must not be written, whatever the diff says.
  try { parse(out, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) {
    console.error(`REFUSING to write ${rel}: the result does not parse — ${String(e.message).split("\n")[0]}`);
    process.exit(1);
  }
  // And the removals must not have re-introduced a duplicate somewhere else.
  if (deadRanges(out).length) {
    console.error(`REFUSING to write ${rel}: duplicates remain after the rewrite.`);
    process.exit(1);
  }
  if (!DRY) fs.writeFileSync(abs, out);
}

console.log(`\n${DRY ? "would remove" : "removed"} ${total} dead declaration(s).`);
