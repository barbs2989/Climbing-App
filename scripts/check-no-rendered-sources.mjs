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
//   (The per-section provenance chip once listed here as a kept exception was REMOVED 2026-10-04.)
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

const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "EnrichmentPanels.jsx"]
  .concat(fs.readdirSync(path.join(ROOT, "lib")).filter(f => /\.jsx?$/.test(f)).map(f => "lib/" + f));

let scanned = 0, containers = 0, literals = 0;
const findings = [], words = [];
const WORDS = /auto-?generated|\bsourced?s?\b|\battribution\b|\bprovenance\b/i;

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

  // RULE 2 — WORDING. The field rule above could not see the per-section "Auto-generated" chip,
  // "checked against a published source", "Tap a row for its sources" or a form labelled
  // "Why / source": each was an authored LITERAL, not a field. All were removed 2026-10-04 on the
  // owner's "remove the auto generated or anything else related to sources". So no literal the app
  // can render may use that vocabulary. "Water source(s)" is a different meaning and is allowed.
  const wording = (v, node) => {
    if (!v || !WORDS.test(v.replace(/water sources?/gi, ""))) return;
    words.push({ rel, line: node.loc ? node.loc.start.line : 0, text: v.trim().replace(/\s+/g, " ").slice(0, 110) });
  };
  traverse(ast, {
    JSXText(p) { literals++; wording(p.node.value, p.node); },
    StringLiteral(p) {
      if (/^(Import|Export)/.test(p.parent.type)) return; // a module path, never screen text
      // A response header's NAME — `r.headers.get("x-amz-meta-x-imagery-sources")` in the shade
      // map — is a protocol key, never screen text.
      const cal = p.parent, cv = cal.type === "CallExpression" && cal.callee.type === "MemberExpression" ? cal.callee : null;
      if (cv && cv.property.name === "get" && cv.object.type === "MemberExpression" && cv.object.property.name === "headers") return;
      literals++; wording(p.node.value, p.node);
    },
    TemplateElement(p) { literals++; wording(p.node.value.cooked, p.node); },
  });

  traverse(ast, {
    JSXExpressionContainer(p) {
      // An attribute value is not screen text for this rule; RULE 2 reads attribute literals.
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

if (literals < 2000) dead(`only ${literals} string literals seen — the wording scan is not reaching the app`);

console.log(`check:no-rendered-sources — ${scanned} files, ${containers} rendered expressions, ${literals} literals`);
for (const w of words) console.log(`  FAIL  ${w.rel}:${w.line} says "${w.text}"`);
for (const f of findings) {
  console.log(`  FAIL  ${f.rel}:${f.line} renders \`${f.hit}\` on screen`);
  console.log(`        ${f.snippet}`);
}
if (words.length) {
  console.error(`\ncheck:no-rendered-sources FAILED — ${words.length} literal(s) talk about sources or auto-generation.`);
  console.error("The app carries no sources and labels nothing \"auto-generated\". Reword: keep the fact or the");
  console.error("caveat, drop where it came from.");
  process.exit(1);
}
if (findings.length) {
  console.error(`\ncheck:no-rendered-sources FAILED — ${findings.length} screen(s) print a source field.`);
  console.error("The app carries no sources. Keep the honest signal if there is one — a status, a");
  console.error("caveat — and drop the attribution; see VerifNote for how that was done.");
  process.exit(1);
}
console.log("\nok — no screen prints a field named source, sources or sourceNote, and no literal talks about sources");

// Injection-tested, 4 cases:
//   1. `{route.verif.source}` in a render        -> FAIL naming source          (the real #1069 defect)
//   2. `{it.sourceNote}`                         -> FAIL naming sourceNote      (the real #999 defect)
//   3. `{wp._source==="logged"?"a":"b"}`         -> PASS (branches are literals, field is a test)
//   4. "Auto-generated" / "Why / source" / "published source" literals -> FAIL (RULE 2, 2026-10-04)
//   5. "Water sources"                           -> PASS (a different meaning)
