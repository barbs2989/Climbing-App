// probe-dynamic-only-names — controls whose ONLY possible name is a dynamic expression.
//
// check:control-names treats any non-element expression as a possible name. That is deliberate and
// keeps it a FLOOR: what it reports is unnamed under every reading. The cost is that a control
// named only by {someExpression} passes statically and can still announce NOTHING at runtime when
// that expression is empty.
//
// check:selected-state sees the other half — it reads the name actually RENDERED — and reports
// "14 control(s) skipped as unnameable" on the Crew tab. Neither guard calls those a defect: one
// cannot see them, the other only counts them. This lists the bucket so the disagreement can be
// read rather than guessed at.
//
// Report-only. Fails closed on a parse or an empty walk.
import { readFileSync } from "node:fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { appSources } from "../lib/guard-sources.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = new URL("../..", import.meta.url).pathname;

const attr = (open, name) => open.attributes.find(
  (a) => a.type === "JSXAttribute" && a.name && a.name.name === name);
const namedItself = (open) =>
  !!(attr(open, "aria-label") || attr(open, "aria-labelledby") || attr(open, "title"));

const INTERACTIVE = ["button", "tab", "checkbox", "switch", "radio", "option", "menuitem"];
const isButtonLike = (open) => {
  if (open.name.type !== "JSXIdentifier") return false;
  if (open.name.name === "button") return true;
  const role = attr(open, "role");
  return !!(role && role.value && role.value.type === "StringLiteral"
    && INTERACTIVE.includes(role.value.value));
};

// Does any descendant contribute a name that is CERTAIN — literal text, or the app's own <Lbl>?
const isLbl = (n) => !!n && n.type === "JSXElement"
  && n.openingElement.name.type === "JSXIdentifier" && n.openingElement.name.name === "Lbl";

const certainName = (children) => {
  for (const c of children) {
    if (c.type === "JSXText" && c.value.trim()) return true;
    if (c.type === "JSXExpressionContainer") {
      const e = c.expression;
      if (e.type === "StringLiteral" && e.value.trim()) return true;
      if (isLbl(e)) return true;
      if ((e.type === "JSXElement" || e.type === "JSXFragment") && certainName(e.children || [])) return true;
      continue;
    }
    if (c.type === "JSXFragment" && certainName(c.children)) return true;
    if (c.type === "JSXElement") {
      if (isLbl(c)) return true;
      if (certainName(c.children)) return true;
    }
  }
  return false;
};

// Is there at least SOME dynamic expression that might produce text?
const dynamicMaybe = (children) => {
  for (const c of children) {
    if (c.type === "JSXExpressionContainer") {
      const e = c.expression;
      if (e.type === "JSXEmptyExpression") continue;
      if (e.type !== "JSXElement" && e.type !== "JSXFragment") return true;
      if (dynamicMaybe(e.children || [])) return true;
      continue;
    }
    if (c.type === "JSXFragment" && dynamicMaybe(c.children)) return true;
    if (c.type === "JSXElement" && dynamicMaybe(c.children)) return true;
  }
  return false;
};

const files = appSources(ROOT, "probe-dynamic-only-names").map((f) => ROOT + f);
let scanned = 0;
const rows = [];

for (const f of files) {
  const src = readFileSync(f, "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { console.error("FAIL: parse " + f + " — " + e.message); process.exit(1); }
  const short = f.replace(/.*\/(?=[^/]*$)/, "");
  traverse(ast, {
    JSXElement(path) {
      const open = path.node.openingElement;
      if (!isButtonLike(open)) return;
      scanned++;
      if (namedItself(open)) return;                    // named outright
      if (certainName(path.node.children)) return;      // a literal or <Lbl> names it
      if (!dynamicMaybe(path.node.children)) return;    // no name at all: check:control-names' job
      const text = src.slice(path.node.start, path.node.end);
      rows.push({
        where: short + ":" + open.loc.start.line,
        head: text.slice(0, text.indexOf("style=") > 0 ? text.indexOf("style=") : 110).replace(/\s+/g, " "),
      });
    },
  });
}

if (!scanned) { console.error("FAIL: no button-like elements found — the scan broke"); process.exit(1); }
console.log("button-like controls scanned: " + scanned);
console.log("named ONLY by a dynamic expression (could render empty): " + rows.length + "\n");
const byFile = new Map();
for (const r of rows) byFile.set(r.where.split(":")[0], (byFile.get(r.where.split(":")[0]) || 0) + 1);
for (const [f, n] of [...byFile].sort((a, b) => b[1] - a[1])) console.log("  " + f.padEnd(24) + n);
console.log("");
for (const r of rows.slice(0, 25)) console.log("  " + r.where + "\n      " + r.head.slice(0, 130) + "\n");
if (rows.length > 25) console.log("  ... and " + (rows.length - 25) + " more");
