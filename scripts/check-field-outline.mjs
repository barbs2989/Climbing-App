#!/usr/bin/env node
// check:field-outline — EVERY TEXT FIELD IS OUTLINED IN C.field, NEVER C.border.
//
// A text box, text area or dropdown is found by its outline alone, so WCAG 1.4.11 asks that
// outline for 3:1 against what is around it. C.border (#514a41) is 1.88:1 on a card — right for a
// divider, too faint for a field — so C.field (#776e62, 3.09–3.77:1 on every background a field
// sits on) was added on 2026-11-24 and 155 field styles moved to it. The review of that change
// found seven more that the move had missed: their style constants carried a type annotation
// (`const fld: CSSProperties = {…}`) the codemod's text pattern did not allow for. Nothing else
// reads a field's outline colour, so a new field written the old way ships silently.
//
// WHAT COUNTS. A JSX <input>, <textarea> or <select> whose `type` is not checkbox, radio, range,
// file, hidden, color, submit or button. Its `style` expression is searched for a member
// expression `<palette>.border`; so is every variable the expression names (as a whole, spread or
// called), resolved through Babel's scope to its declaration in the same file. An imported style
// (INPUT from lib/buttonStyles.js) is not followed — that one is checked where it is defined,
// below. Colours chosen at runtime from something other than the palette are not seen.
//
// Static — Babel parses the app files, lib/ and src/, no browser — so it sits in `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIELDS = new Set(["input", "textarea", "select"]);
const NOT_TEXT = new Set(["checkbox", "radio", "range", "file", "hidden", "color", "submit", "button"]);
const PALETTES = new Set(["C", "c"]);

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const dead = (m) => { console.log("  DEAD  " + m + " — refusing to report a clean result"); process.exit(1); };

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "EnrichmentPanels.jsx"]
  .map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f))
  .concat(walk(path.join(ROOT, "lib")), walk(path.join(ROOT, "src")), fs.existsSync(path.join(ROOT, "review")) ? walk(path.join(ROOT, "review")) : []);
if (files.length < 50) dead(`only ${files.length} app source files found — the walk is broken`);

// Every `<palette>.border` member expression inside a node (not .borderLight / .borderHi).
function borderUses(node) {
  const hits = [];
  (function visit(n) {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "MemberExpression" && !n.computed && n.object.type === "Identifier" && PALETTES.has(n.object.name) && n.property.type === "Identifier" && n.property.name === "border") hits.push(n.loc.start.line);
    for (const k of Object.keys(n)) {
      if (k === "loc" || k === "start" || k === "end" || k === "leadingComments" || k === "trailingComments") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v.type === "string") visit(v);
    }
  })(node);
  return hits;
}
// Identifiers a style expression uses as its value, a spread, or a callee: style={fld}, {...inp}, INPUT(C).
function namedStyles(expr) {
  const names = [];
  if (expr.type === "Identifier") names.push(expr.name);
  if (expr.type === "CallExpression" && expr.callee.type === "Identifier") names.push(expr.callee.name);
  if (expr.type === "ObjectExpression") for (const p of expr.properties) {
    if (p.type !== "SpreadElement") continue;
    if (p.argument.type === "Identifier") names.push(p.argument.name);
    if (p.argument.type === "CallExpression" && p.argument.callee.type === "Identifier") names.push(p.argument.callee.name);
  }
  if (expr.type === "ConditionalExpression") names.push(...namedStyles(expr.consequent), ...namedStyles(expr.alternate));
  return names;
}

let fields = 0, followed = 0;
for (const f of files) {
  const rel = path.relative(ROOT, f).replace(/\\/g, "/");
  const code = fs.readFileSync(f, "utf8");
  let ast;
  try { ast = parse(code, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true }); }
  catch (e) { dead(`${rel} does not parse: ${e.message}`); }
  traverse(ast, {
    JSXOpeningElement(p) {
      const n = p.node.name;
      if (n.type !== "JSXIdentifier" || !FIELDS.has(n.name)) return;
      const typeAttr = p.node.attributes.find((a) => a.type === "JSXAttribute" && a.name.name === "type");
      if (typeAttr && typeAttr.value && typeAttr.value.type === "StringLiteral" && NOT_TEXT.has(typeAttr.value.value)) return;
      fields++;
      const style = p.node.attributes.find((a) => a.type === "JSXAttribute" && a.name.name === "style");
      if (!style || !style.value || style.value.type !== "JSXExpressionContainer") return;
      const expr = style.value.expression;
      const where = `${rel}:${p.node.loc.start.line} <${n.name}>`;
      for (const line of borderUses(expr)) fail(`${where} is outlined in C.border (line ${line}) — a field takes C.field (3:1); C.border is for dividers`);
      for (const name of new Set(namedStyles(expr))) {
        const b = p.scope.getBinding(name);
        if (!b || b.kind === "module" || !b.path.isVariableDeclarator()) continue;
        followed++;
        for (const line of borderUses(b.path.node.init)) fail(`${where} takes its style from \`${name}\`, outlined in C.border (line ${line}) — a field takes C.field (3:1)`);
      }
    },
  });
}
// The shared INPUT style is imported, not followed above: check it where it is defined.
const bs = fs.readFileSync(path.join(ROOT, "lib", "buttonStyles.js"), "utf8");
const input = bs.match(/export const INPUT = [^\n]*/);
if (!input) dead("lib/buttonStyles.js no longer defines INPUT on one line — re-point this check");
if (/\bC\.border\b(?![A-Za-z])/.test(input[0])) fail("lib/buttonStyles.js INPUT is outlined in C.border — a field takes C.field (3:1)");
if (!/\bC\.field\b/.test(input[0])) fail("lib/buttonStyles.js INPUT no longer outlines in C.field");

// Fails closed: the app has hundreds of text fields; a parse that found few is reading the wrong thing.
if (fields < 200) dead(`only ${fields} text fields found across ${files.length} files`);
if (followed < 20) dead(`only ${followed} named field styles were resolved — the binding lookup is broken`);
if (!failures) ok(`all ${fields} text fields across ${files.length} files (${followed} named styles followed, plus INPUT) are outlined in C.field, not C.border`);

if (failures) { console.log(`\ncheck:field-outline: ${failures} failure(s)`); process.exit(1); }
console.log("ok — check:field-outline");
