// A count welded to a hardcoded plural noun reads "1 members", "1 trip reports", "1 partners
// confirmed". Two instances have been fixed by hand (the group detail and group card, #1269's
// sibling); this asks how big the class actually is before anyone sweeps it.
//
// STATIC, over the source, because a capture only shows the counts that happened to be 1 on the
// day it was taken — the trust-factor strings sit behind a modal on a screen whose numbers are
// almost always 0. A scan of captures found ONE of them.
//
// Report-only. Reads no database.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

// A string literal that BEGINS with a space and whose first few words end in a plural noun:
// " members", " trip reports shared with the community", " distinct partners climbed with".
// Up to three words, because the noun is not always the first one — a one-word rule is the
// too-narrow needle this repo keeps re-learning.
const PLURAL_TAIL = /^ ([a-z]+ ){0,2}([a-z]{3,}s)\b/;
// Words that end in s and are not plurals, plus units where "1 miles" cannot arise because the
// value is fractional.
const NOT_PLURAL = new Set(["was", "is", "has", "its", "this", "plus", "less", "across", "status",
  "bonus", "series", "gps", "yours", "hours", "vs", "miles", "ft", "days"]);

let findings = 0, scanned = 0;
for (const rel of FILES) {
  const code = readFileSync(path.join(ROOT, rel), "utf8");
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    BinaryExpression(p) {
      if (p.node.operator !== "+") return;
      const right = p.node.right;
      if (!right || right.type !== "StringLiteral") return;
      scanned++;
      const m = PLURAL_TAIL.exec(right.value);
      if (!m || NOT_PLURAL.has(m[2])) return;
      // The left side has to plausibly be a COUNT. A name or a label welded to a plural noun is
      // ordinary prose ("Alex" + " climbs a lot"), not this defect.
      const leftSrc = code.slice(p.node.left.start, p.node.left.end);
      if (!/\b(length|count|Count|N\b|num|Num|total|Total|\.n\b)/.test(leftSrc)) return;
      // Already handled: the same expression picks the singular somewhere in the line.
      const line = code.split("\n")[right.loc.start.line - 1] || "";
      const guarded = /\?" [a-z ]*"\s*:\s*" [a-z ]*s"/.test(line) || /===\s*1\s*\?/.test(line);
      findings++;
      console.log(`${rel}:${right.loc.start.line}  ${guarded ? "guarded " : "PLURAL  "} ${JSON.stringify(right.value.slice(0, 60))}`);
      console.log(`${" ".repeat(rel.length + 8)}  left: ${leftSrc.slice(-70)}`);
    },
  });
}
console.log(`\n${findings} count+plural concatenation(s) across ${scanned} string concatenations in ${FILES.length} files.`);
