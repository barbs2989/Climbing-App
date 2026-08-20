#!/usr/bin/env node
// check:no-rendered-sources — no screen may print a field named `source`.
//
// The app carries no sources: nothing asks a climber where their information came from, and
// nothing tells them where ours did. That rule was swept by hand twice and MISSED THREE SURFACES
// BOTH TIMES, which is the whole argument for a script over a note:
//
//   verif.source          rendered as "Unverified · Mountain Project + AAJ" on every route page,
//                         and on 13 DB rows as an internal review note that named sources and
//                         leaked working language ("recommend spot-checking this route_id").
//   tick list `source`    rendered under each list label ("Steck & Roper, North America").
//   itinerary.sourceNote  rendered as "Where these times come from — …".
//
// The first sweep searched for the WORD "Source" and for the identifiers it had already found, so
// it walked straight past a field named `source` doing the same job elsewhere. Grep cannot tell a
// rendered field from a mention; only structure can.
//
// WHAT IT DOES NOT FLAG, and this precision is the point — a guard that flags correct work is one
// people learn to ignore:
//   - "Water sources", "Last water source." — a different meaning of the word entirely, and it
//     appears a dozen times in real climbing copy.
//   - `re.source` and other regex/Error property reads.
//   - `wp._source === "logged" ? "✓ From a logged climb" : …` — the value RENDERED there is a
//     literal; the field only picks between two authored strings. Internal edit provenance is
//     fine as long as it does not reach the screen verbatim.
//   - The provenance chip's `title="How this section was sourced: " + prov.label`, which is a
//     deliberate, kept feature: it says how current a section is and names no source.
//
// So the rule is narrow and structural: NO JSX EXPRESSION MAY EVALUATE TO A PROPERTY NAMED
// `source`, `sources` or `sourceNote`. Static (Babel, no browser, no DB), so it sits in the build.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BANNED = new Set(["source", "sources", "sourceNote"]);

const dead = (m) => {
  console.error(`\ncheck:no-rendered-sources FAILED — ${m}.`);
  console.error("Nothing was checked. This guard reports an absence, so a broken scan");
  console.error("would otherwise read as a clean app.\n");
  process.exit(1);
};

const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"]
  .concat(fs.readdirSync(path.join(ROOT, "lib")).filter(f => /\.jsx$/.test(f)).map(f => "lib/" + f));

let scanned = 0, containers = 0;
const findings = [];

for (const rel of FILES) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) dead(`${rel} does not exist — the file list is stale`);
  const src = fs.readFileSync(abs, "utf8");
  let ast;
  try {
    ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: false });
  } catch (e) {
    dead(`${rel} did not parse: ${e.message}`);
  }
  scanned++;

  // Does this expression, if rendered, put a banned field on screen? A conditional whose BRANCHES
  // are literals is fine — that is the `_source === "logged" ? "…" : "…"` shape.
  const rendersBanned = (node, depth = 0) => {
    if (!node || depth > 6) return null;
    switch (node.type) {
      case "MemberExpression":
        return (!node.computed && BANNED.has(node.property.name)) ? node.property.name : null;
      case "OptionalMemberExpression":
        return (!node.computed && node.property && BANNED.has(node.property.name)) ? node.property.name : null;
      case "LogicalExpression":
        return rendersBanned(node.left, depth + 1) || rendersBanned(node.right, depth + 1);
      case "ConditionalExpression":
        // the TEST is not rendered — only the branches are
        return rendersBanned(node.consequent, depth + 1) || rendersBanned(node.alternate, depth + 1);
      case "BinaryExpression":
        return node.operator === "+"
          ? (rendersBanned(node.left, depth + 1) || rendersBanned(node.right, depth + 1)) : null;
      case "TemplateLiteral":
        for (const e of node.expressions) { const h = rendersBanned(e, depth + 1); if (h) return h; }
        return null;
      case "CallExpression":
        // String(v.source), fmt(x.sourceNote) — the argument reaches the screen
        for (const a of node.arguments) { const h = rendersBanned(a, depth + 1); if (h) return h; }
        return null;
      default:
        return null;
    }
  };

  traverse(ast, {
    JSXExpressionContainer(p) {
      // An attribute value is not screen text. `title=` would be, but the provenance chip's
      // title is a deliberate kept feature and names no source field.
      if (p.parent && p.parent.type === "JSXAttribute") return;
      containers++;
      const hit = rendersBanned(p.node.expression);
      if (hit) {
        const line = p.node.loc ? p.node.loc.start.line : 0;
        findings.push({ rel, line, hit, snippet: src.slice(p.node.start, p.node.start + 90).replace(/\s+/g, " ") });
      }
    },
  });
}

if (scanned < 5) dead(`only ${scanned} file(s) parsed — the walk broke`);
if (containers < 500) dead(`only ${containers} JSX expressions seen across ${scanned} files — the traversal is not reaching the render trees`);

console.log(`check:no-rendered-sources — ${scanned} files, ${containers} rendered expressions`);
for (const f of findings) {
  console.log(`  FAIL  ${f.rel}:${f.line} renders \`${f.hit}\` on screen`);
  console.log(`        ${f.snippet}`);
}
if (findings.length) {
  console.error(`\ncheck:no-rendered-sources FAILED — ${findings.length} screen(s) print a source field.`);
  console.error("The app carries no sources. Keep the honest signal if there is one — a status, a");
  console.error("caveat — and drop the attribution; see VerifNote for how that was done.");
  process.exit(1);
}
console.log("\nok — no screen prints a field named source, sources or sourceNote");

// Injection-tested, 4 cases:
//   1. `{route.verif.source}` in a render        -> FAIL naming source          (the real #1069 defect)
//   2. `{it.sourceNote}`                         -> FAIL naming sourceNote      (the real #999 defect)
//   3. `{wp._source==="logged"?"a":"b"}`         -> PASS (branches are literals, field is a test)
//   4. an attribute `title={"…"+prov.label}`     -> PASS (not screen text, and names no source)
