// Print each unnamed control with its own markup AND its next sibling, so the
// duplicate-vs-standalone call can be made by reading rather than by a heuristic.
//
// The classifier's twin test has been wrong twice in opposite directions — line proximity
// is meaningless when one line holds dozens of controls, and parent identity is too strict
// because siblings here sit in separate {cond && ...} wrappers. With a handful of controls
// left, reading the actual markup is more reliable than tuning that further.
//
//   node scripts/oneoff/show-unnamed-control-context.mjs <file.jsx>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REL = process.argv[2] || "ClimbMatch.jsx";
const src = fs.readFileSync(path.join(ROOT, REL), "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
const NATIVE = new Set(["button", "a", "input", "select", "textarea", "summary", "option", "label"]);
const isStop = (n) => n && n.type === "CallExpression" && n.callee && n.callee.type === "MemberExpression" &&
  n.callee.property && n.callee.property.name === "stopPropagation";

const textIn = (nodes, depth) => {
  if (depth > 4) return false;
  return (nodes || []).some((c) => {
    if (c.type === "JSXText") return !!c.value.trim();
    if (c.type === "JSXExpressionContainer") return true;
    if (c.type === "JSXFragment") return textIn(c.children, depth + 1);
    if (c.type === "JSXElement") {
      const n = c.openingElement && c.openingElement.name;
      if (!n || n.type !== "JSXIdentifier") return false;
      if (n.name[0] === n.name[0].toUpperCase()) return false;
      return textIn(c.children, depth + 1);
    }
    return false;
  });
};

let n = 0;
traverse(ast, {
  JSXOpeningElement(p) {
    const nn = p.node.name;
    if (!nn || nn.type !== "JSXIdentifier") return;
    const tag = nn.name;
    if (NATIVE.has(tag) || tag[0] === tag[0].toUpperCase()) return;
    const oc = p.node.attributes.find((a) => a.type === "JSXAttribute" && a.name && a.name.name === "onClick");
    if (!oc) return;
    const ex = oc.value && oc.value.type === "JSXExpressionContainer" && oc.value.expression;
    if (!ex) return;
    let shield = false;
    if (ex.type === "ArrowFunctionExpression" || ex.type === "FunctionExpression") {
      if (isStop(ex.body)) shield = true;
      else if (ex.body && ex.body.type === "BlockStatement") {
        const b = ex.body.body;
        shield = b.length === 1 && b[0].type === "ExpressionStatement" && isStop(b[0].expression);
      }
    }
    if (shield) return;
    const attrs = p.node.attributes.filter((a) => a.type === "JSXAttribute");
    const names = new Set(attrs.map((a) => a.name.name));
    if (names.has("role") && names.has("tabIndex")) return;
    if (names.has("aria-label") || names.has("aria-labelledby") || names.has("title")) return;
    if (textIn((p.parent && p.parent.children) || [], 0)) return;

    // Backdrops are excluded elsewhere; keep them out of the reading list too.
    const styleAttr = attrs.find((a) => a.name.name === "style");
    const style = styleAttr ? src.slice(styleAttr.start, styleAttr.end).replace(/\s+/g, "").replace(/'/g, '"') : "";
    if (/position:"fixed"/.test(style) && (/inset:0/.test(style) || /top:0/.test(style))) return;

    n++;
    const el = p.parent;                    // the JSXElement
    const own = src.slice(el.start, Math.min(el.end, el.start + 200)).replace(/\s+/g, " ");
    // The NEXT sibling decides duplicate-vs-standalone: an avatar beside a named row that
    // runs the same handler is a redundant tab stop, not missing access.
    const gp = p.parentPath && p.parentPath.parentPath ? p.parentPath.parentPath.node : null;
    const sibs = (gp && gp.children) || [];
    const idx = sibs.indexOf(el);
    const next = idx >= 0 ? sibs.slice(idx + 1).find((c) => c.type === "JSXElement") : null;
    const nextTxt = next ? src.slice(next.start, Math.min(next.end, next.start + 190)).replace(/\s+/g, " ") : "(none)";

    console.log(`=== #${n}  line ${p.node.loc.start.line}  <${tag}> ===`);
    console.log(`  self: ${own}`);
    console.log(`  next: ${nextTxt}`);
    console.log("");
  },
});
if (!n) { console.error("SCAN FOUND NOTHING — do not read this as a clean file."); process.exit(1); }
console.log(`${n} unnamed control(s) in ${REL}`);
