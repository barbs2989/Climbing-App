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
// file, hidden, color, submit or button (a string, `{"…"}`, or a conditional whose branches are all
// such strings). Its `style` expression is searched for a member expression `<palette>.border`, and
// so is EVERYTHING it refers to, followed through Babel's scope with a visited set: a variable
// (`style={fld}`), a spread (`{...inp}`), an argument (`Object.assign({},fld,{…})`), a call
// (`_pill(on)`, a function declaration's body), the names those declarations refer to in turn
// (`const fld={...base}`), and an import from a relative module (INPUT in lib/buttonStyles.js),
// resolved to that file's own declaration. A name bound to a function PARAMETER or a prop is a value
// handed in from elsewhere and cannot be resolved here: those are counted and printed, never silent.
// A colour that is not a palette member (a hex literal, a variable holding the colour) passes.
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

// Parse a file once; keep its Program path so an import can be resolved to a declaration in it.
const parsed = new Map();
function load(file) {
  if (parsed.has(file)) return parsed.get(file);
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  let ast;
  try { ast = parse(fs.readFileSync(file, "utf8"), { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true }); }
  catch (e) { dead(`${rel} does not parse: ${e.message}`); }
  // errorRecovery returns a PARTIAL tree for a recoverable syntax error: the fields after it would
  // never be visited, and the whole-app totals below would not notice one file cut short.
  if (ast.errors && ast.errors.length) dead(`${rel} has ${ast.errors.length} syntax error(s) (first: ${ast.errors[0].message}) — it was only partly read`);
  let program = null;
  traverse(ast, { Program(p) { program = p; p.stop(); } });
  const entry = { rel, ast, program };
  parsed.set(file, entry);
  return entry;
}
function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const c of [base, base + ".js", base + ".jsx", base + ".ts", base + ".tsx", path.join(base, "index.js")]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  return null;
}

// Every `<palette>.border` under a path (not .borderLight / .borderHi), as line numbers.
function borderUses(p) {
  const hits = [];
  const visit = (mp) => { const n = mp.node; if (!n.computed && n.object.type === "Identifier" && PALETTES.has(n.object.name) && n.property.type === "Identifier" && n.property.name === "border") hits.push(n.loc.start.line); };
  if (p.isMemberExpression()) visit(p);
  p.traverse({ MemberExpression: visit });
  return hits;
}
// The names a path refers to (not object keys, member properties or the palette itself).
function referencedNames(p) {
  const out = [];
  const take = (ip) => { if (ip.isReferencedIdentifier() && !PALETTES.has(ip.node.name)) out.push(ip); };
  if (p.isIdentifier()) take(p);
  p.traverse({ Identifier: take });
  return out;
}

let fields = 0, followed = 0;
const unresolved = new Map(); // "file: name (param)" -> count

// Check one path (a style expression, or a declaration it reaches) and everything it refers to.
// `seen` is per field, keyed file:start, so a shared style is followed for every field that uses it.
function check(p, file, where, via, seen) {
  for (const line of borderUses(p)) fail(`${where} is outlined in C.border (${via ? "via `" + via + "`, " : ""}${path.relative(ROOT, file).replace(/\\/g, "/")}:${line}) — a field takes C.field (3:1); C.border is for dividers`);
  for (const ip of referencedNames(p)) {
    const name = ip.node.name;
    const b = ip.scope.getBinding(name);
    if (!b) continue; // a global (Object, Math, window): nothing to follow
    const key = file + ":" + b.path.node.start;
    if (seen.has(key)) continue;
    seen.add(key);
    const chain = via ? via + " → " + name : name;
    if (b.kind === "param") { const k = `${path.relative(ROOT, file).replace(/\\/g, "/")}: ${name}`; unresolved.set(k, (unresolved.get(k) || 0) + 1); continue; }
    // `S.field`: only the `field` property of S is this field's style — S also holds the sheet's
    // buttons and dividers, which are allowed C.border. Narrow to that one property.
    const par = ip.parentPath;
    const prop = par && par.isMemberExpression() && par.node.object === ip.node && !par.node.computed && par.node.property.type === "Identifier" ? par.node.property.name : null;
    let bpath = b.path, bfile = file;
    if (b.kind === "module") {
      const decl = b.path.parentPath && b.path.parentPath.node;
      const spec = decl && decl.source && decl.source.value;
      const target = spec && resolveImport(file, spec);
      if (!target || !b.path.isImportSpecifier()) continue; // a package, or a default/namespace import: not a style
      const imported = b.path.node.imported.name || b.path.node.imported.value;
      const tb = load(target).program.scope.getBinding(imported);
      if (!tb) continue;
      const tkey = target + ":" + tb.path.node.start;
      if (seen.has(tkey)) continue;
      seen.add(tkey);
      bpath = tb.path; bfile = target;
    }
    let target = bpath.isVariableDeclarator() ? bpath.get("init") : bpath.isFunctionDeclaration() ? bpath : null;
    if (!target || !target.node) continue;
    if (prop) {
      target = narrow(target, prop);
      if (!target) { const k = `${path.relative(ROOT, bfile).replace(/\\/g, "/")}: ${name}.${prop} (not a literal map)`; unresolved.set(k, (unresolved.get(k) || 0) + 1); continue; }
    }
    followed++;
    check(target, bfile, where, prop ? chain + "." + prop : chain, seen);
  }
}
// The value of property `prop` in the object a path evaluates to: an object literal, or the object a
// called function returns (S = sheetStyles(), INPUT = C => ({…})). Null when it cannot be narrowed.
function narrow(p, prop, depth = 0) {
  if (!p || !p.node || depth > 4) return null;
  if (p.isTSAsExpression() || p.isTSSatisfiesExpression?.() || p.isParenthesizedExpression()) return narrow(p.get("expression"), prop, depth + 1);
  if (p.isObjectExpression()) {
    for (const pp of p.get("properties")) {
      const k = pp.node.key;
      if (pp.isObjectProperty() && !pp.node.computed && ((k.type === "Identifier" && k.name === prop) || (k.type === "StringLiteral" && k.value === prop))) return pp.get("value");
    }
    return null;
  }
  if (p.isCallExpression() && p.get("callee").isIdentifier()) {
    const fb = p.scope.getBinding(p.node.callee.name);
    if (!fb) return null;
    const fn = fb.path.isVariableDeclarator() ? fb.path.get("init") : fb.path;
    return narrow(fn, prop, depth + 1);
  }
  if (p.isArrowFunctionExpression() || p.isFunctionExpression() || p.isFunctionDeclaration()) {
    const body = p.get("body");
    if (!body.isBlockStatement()) return narrow(body, prop, depth + 1);
    let ret = null;
    body.traverse({ Function(fp) { fp.skip(); }, ReturnStatement(rp) { if (!ret && rp.node.argument) ret = rp.get("argument"); } });
    return ret ? narrow(ret, prop, depth + 1) : null;
  }
  return null;
}

function typeIsNotText(attr) {
  if (!attr || !attr.value) return false;
  const v = attr.value.type === "JSXExpressionContainer" ? attr.value.expression : attr.value;
  const strs = (e) => e.type === "StringLiteral" ? [e.value] : e.type === "TemplateLiteral" && !e.expressions.length ? [e.quasis[0].value.cooked] : e.type === "ConditionalExpression" ? [...strs(e.consequent), ...strs(e.alternate)].concat(isStr(e.consequent) && isStr(e.alternate) ? [] : [null]) : [null];
  const isStr = (e) => e.type === "StringLiteral" || (e.type === "TemplateLiteral" && !e.expressions.length) || e.type === "ConditionalExpression";
  const all = strs(v);
  return all.length > 0 && all.every((s) => s !== null && NOT_TEXT.has(s));
}

for (const f of files) {
  const { rel, ast } = load(f);
  traverse(ast, {
    JSXOpeningElement(p) {
      const n = p.node.name;
      if (n.type !== "JSXIdentifier" || !FIELDS.has(n.name)) return;
      if (typeIsNotText(p.node.attributes.find((a) => a.type === "JSXAttribute" && a.name.name === "type"))) return;
      fields++;
      const idx = p.node.attributes.findIndex((a) => a.type === "JSXAttribute" && a.name.name === "style");
      if (idx < 0) return;
      const sp = p.get("attributes." + idx + ".value");
      if (!sp.node || !sp.isJSXExpressionContainer()) return;
      check(sp.get("expression"), f, `${rel}:${p.node.loc.start.line} <${n.name}>`, "", new Set());
    },
  });
}

// Fails closed: the app has hundreds of text fields; a parse that found few is reading the wrong thing.
if (fields < 200) dead(`only ${fields} text fields found across ${files.length} files`);
if (followed < 100) dead(`only ${followed} style references were followed — the binding lookup is broken`);
if (unresolved.size) console.log(`  note  ${[...unresolved.values()].reduce((a, b) => a + b, 0)} style reference(s) are function parameters or props, handed in from elsewhere and not resolvable here: ${[...unresolved.keys()].slice(0, 12).join("; ")}${unresolved.size > 12 ? "; …" : ""}`);
if (!failures) ok(`all ${fields} text fields across ${files.length} files are outlined in C.field, not C.border (${followed} style references followed, imports included)`);

if (failures) { console.log(`\ncheck:field-outline: ${failures} failure(s)`); process.exit(1); }
console.log("ok — check:field-outline");
