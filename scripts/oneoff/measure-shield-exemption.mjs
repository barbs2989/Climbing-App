// Measure: how many "mouse-only controls" are actually pure stopPropagation shields
// written in a form the guard's exemption does not recognise?
//
// The guard exempts ONLY `e => e.stopPropagation()` (arrow, expression body). This asks
// how many handlers are semantically the same thing in a different syntax, and — the part
// that matters — prints every handler it would newly exempt so each can be read. A shield
// test that is too broad would hide a real control, which is the worse direction.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx",
  "lib/AuthModal.jsx", "lib/DbAreaBrowser.jsx", "lib/FireMap.jsx", "lib/GpsSubmissionModal.jsx"];

// A call expression that is exactly `<something>.stopPropagation()` and nothing else.
const isStopCall = (n) =>
  n && n.type === "CallExpression" && n.callee && n.callee.type === "MemberExpression" &&
  n.callee.property && n.callee.property.name === "stopPropagation";

// The CURRENT rule, copied verbatim from the guard.
const currentShield = (ex) =>
  ex && ex.type === "ArrowFunctionExpression" && ex.body &&
  ex.body.type === "CallExpression" && ex.body.callee &&
  ex.body.callee.type === "MemberExpression" &&
  ex.body.callee.property && ex.body.callee.property.name === "stopPropagation";

// The PROPOSED rule: any function whose entire body is one stopPropagation call.
// Deliberately requires the body to be that call and NOTHING else — a handler that stops
// propagation and then does real work is a control, and exempting it would hide it.
const proposedShield = (ex) => {
  if (!ex) return false;
  const isFn = ex.type === "ArrowFunctionExpression" || ex.type === "FunctionExpression";
  if (!isFn) return false;
  if (isStopCall(ex.body)) return true;                       // expression body
  if (ex.body && ex.body.type === "BlockStatement") {         // block body: exactly one stmt
    const b = ex.body.body;
    return b.length === 1 && b[0].type === "ExpressionStatement" && isStopCall(b[0].expression);
  }
  return false;
};

const NATIVE = new Set(["button", "a", "input", "select", "textarea", "summary", "option", "label"]);
let nowCounted = 0, wouldExempt = 0;
const samples = [];

for (const rel of FILES) {
  const abs = path.join(ROOT, rel);
  const src = fs.readFileSync(abs, "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    JSXOpeningElement(p) {
      const nameNode = p.node.name;
      if (!nameNode || nameNode.type !== "JSXIdentifier") return;
      const tag = nameNode.name;
      if (NATIVE.has(tag)) return;
      if (tag[0] === tag[0].toUpperCase()) return; // a component, not a raw element
      const onClick = p.node.attributes.find(
        (a) => a.type === "JSXAttribute" && a.name && a.name.name === "onClick");
      if (!onClick) return;
      const ex = onClick.value && onClick.value.type === "JSXExpressionContainer" && onClick.value.expression;
      const cur = currentShield(ex);
      const prop = proposedShield(ex);
      if (!cur) nowCounted++;
      if (!cur && prop) {
        wouldExempt++;
        samples.push(`${rel}:${p.node.loc.start.line}\t<${tag}>\t${src.slice(onClick.start, onClick.end).replace(/\s+/g, " ").slice(0, 90)}`);
      }
    },
  });
}

console.log(`counted as candidates under the CURRENT rule : ${nowCounted}`);
console.log(`would become exempt under the PROPOSED rule  : ${wouldExempt}`);
console.log(`\nEvery handler the proposed rule newly exempts (read each — it must do NOTHING but shield):`);
for (const s of samples) console.log("  " + s);
