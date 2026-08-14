// MEASUREMENT, not a guard. Does the 2026-08-05 swept state still hold, and is there a class
// of "button that does nothing" that the existing guards do not already cover?
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

/* Derived, never hardcoded. The predecessor one-off (measure-which-tab-renders-each-field.mjs)
   pinned ROOT to a worktree path and so silently measured a DIFFERENT branch's code than the
   one you ran it in — CLAUDE.md records that as the reason it was replaced. Same trap here:
   this file's first draft had my own worktree baked in. */
const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
const SKIP = new Set(["node_modules", ".git", "dist", "scripts", "catalog", ".claude", "supabase", "enrichment-wip", "public"]);
const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    if (SKIP.has(e)) continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if ([".jsx", ".js"].includes(extname(e))) files.push(p);
  }
})(ROOT);

const HANDLERS = new Set(["onClick", "onKeyDown", "onSubmit", "onChange", "onInput", "onBlur", "onFocus", "onPointerDown", "onTouchStart"]);
const emptyHandlers = [];
const noHandlerButtons = [];
let totalButtons = 0, totalHandlers = 0;

function bodyIsEmpty(node) {
  if (!node) return false;
  if (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") {
    const b = node.body;
    if (b.type === "BlockStatement") return b.body.length === 0;
    return false; // expression body does something
  }
  return false;
}

for (const f of files) {
  let ast;
  try {
    ast = parse(readFileSync(f, "utf8"), { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  } catch (e) { console.log("PARSE FAIL", f.replace(ROOT + "/", ""), e.message.slice(0, 60)); continue; }
  const rel = f.replace(ROOT + "/", "");
  traverse(ast, {
    JSXOpeningElement(path) {
      const nameNode = path.node.name;
      const tag = nameNode.type === "JSXIdentifier" ? nameNode.name : "";
      const attrs = path.node.attributes.filter(a => a.type === "JSXAttribute");
      const attrNames = attrs.map(a => a.name && a.name.name);
      const hasSpread = path.node.attributes.some(a => a.type === "JSXSpreadAttribute");
      const handlerAttrs = attrs.filter(a => a.name && HANDLERS.has(a.name.name));
      totalHandlers += handlerAttrs.length;

      if (tag === "button") {
        totalButtons++;
        // A <button> with no onClick, no type=submit, and no spread that could carry one.
        const isSubmit = attrs.some(a => a.name && a.name.name === "type" && a.value && a.value.value === "submit");
        if (!handlerAttrs.length && !hasSpread && !isSubmit && !attrNames.includes("disabled")) {
          noHandlerButtons.push(`${rel}:${path.node.loc.start.line}`);
        }
      }
      for (const a of handlerAttrs) {
        const v = a.value;
        if (!v || v.type !== "JSXExpressionContainer") continue;
        if (bodyIsEmpty(v.expression)) {
          emptyHandlers.push(`${rel}:${a.loc.start.line}  ${a.name.name}={()=>{}}`);
        }
      }
    },
  });
}

console.log(`files scanned            : ${files.length}`);
console.log(`<button> elements        : ${totalButtons}`);
console.log(`event handlers           : ${totalHandlers}`);
console.log(`\n<button> with NO handler : ${noHandlerButtons.length}`);
noHandlerButtons.slice(0, 20).forEach(x => console.log("   " + x));
console.log(`\nEMPTY handler bodies     : ${emptyHandlers.length}`);
emptyHandlers.slice(0, 30).forEach(x => console.log("   " + x));
