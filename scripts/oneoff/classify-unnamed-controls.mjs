// Split the "would announce as an unnamed button" controls into two piles, because they
// need OPPOSITE fixes and only one of them is a naming problem.
//
//   DUPLICATE  another control in the same parent runs the SAME handler and already has a
//              name. The avatar in ClimbMatchCore was this: converting it added an unnamed
//              tab stop AND a redundant one, when the climber's name beside it already did
//              the job. These must be LEFT mouse-only — a second tab stop to the same place
//              is noise, not access.
//
//   STANDALONE the only way to reach that action. These genuinely need an aria-label, built
//              from the same expressions the row renders so the announced name cannot drift
//              from the visible text.
//
//   node scripts/oneoff/classify-unnamed-controls.mjs <file.jsx>
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
const norm = (s) => s.replace(/\s+/g, "");

// Every clickable element, with its handler text, whether it can be named, and its parent.
const all = [];
traverse(ast, {
  JSXOpeningElement(p) {
    const nn = p.node.name;
    if (!nn || nn.type !== "JSXIdentifier") return;
    const tag = nn.name;
    if (tag[0] === tag[0].toUpperCase()) return;
    const oc = p.node.attributes.find((a) => a.type === "JSXAttribute" && a.name && a.name.name === "onClick");
    const spread = p.node.attributes.find((a) => a.type === "JSXSpreadAttribute");
    const attrs = p.node.attributes.filter((a) => a.type === "JSXAttribute");
    const names = new Set(attrs.map((a) => a.name.name));
    let handler = null;
    if (oc && oc.value && oc.value.type === "JSXExpressionContainer") handler = norm(src.slice(oc.value.expression.start, oc.value.expression.end));
    else if (spread) {
      const t = norm(src.slice(spread.start, spread.end));
      const m = t.match(/^\{\.\.\.clickable\((.*)\)\}$/);
      if (m) handler = m[1];
    }
    if (!handler) return;
    if (/^\(?e?\)?=>e\.stopPropagation\(\)$/.test(handler)) return;
    // RECURSE, because the accessible name is computed from ALL descendant text, not just
    // direct children. A direct-children-only test called this UNNAMED:
    //
    //   <div onClick={...}><div>{pubName(c)}</div></div>
    //
    // which is the climber's NAME — so the avatar beside it could never be recognised as a
    // duplicate of a named control, and both looked like they needed labels.
    //
    // Component elements stay OPAQUE: <Av/> renders an image with no text, and that is the
    // whole reason the avatar announced as an unnamed button. Only lowercase host elements
    // are descended into.
    const textIn = (nodes, depth) => {
      if (depth > 4) return false;
      return (nodes || []).some((c) => {
        if (c.type === "JSXText") return !!c.value.trim();
        if (c.type === "JSXExpressionContainer") return true;
        if (c.type === "JSXElement") {
          const n = c.openingElement && c.openingElement.name;
          if (!n || n.type !== "JSXIdentifier") return false;
          if (n.name[0] === n.name[0].toUpperCase()) return false; // a component: opaque
          return textIn(c.children, depth + 1);
        }
        return false;
      });
    };
    const hasText = textIn((p.parent && p.parent.children) || [], 0);
    const labelled = names.has("aria-label") || names.has("aria-labelledby") || names.has("title");
    all.push({
      line: p.node.loc.start.line, tag, handler,
      named: hasText || labelled,
      native: NATIVE.has(tag),
      converted: names.has("role") || !!spread,
      // identity of the enclosing JSX element, used to find siblings
      parent: p.parentPath && p.parentPath.parentPath ? p.parentPath.parentPath.node.start : -1,
    });
  },
});

const unnamed = all.filter((r) => !r.named && !r.native && !r.converted);
const dup = [], solo = [];
for (const r of unnamed) {
  // Is there ANOTHER control nearby with the same handler that already has a name?
  // SAME PARENT, not nearby lines. This file packs dozens of controls onto one physical
  // line, so line proximity is nearly meaningless here — the avatar and the climber's name
  // that shared a handler were SIBLINGS, and that is the relationship worth detecting.
  const twin = all.find((o) => o !== r && o.handler === r.handler && o.named && o.parent === r.parent && r.parent !== -1);
  (twin ? dup : solo).push({ ...r, twin: twin ? twin.line : null });
}

console.log(`${REL}: ${unnamed.length} unnamed control(s)\n`);
console.log(`DUPLICATE of a named control — leave mouse-only (${dup.length}):`);
for (const r of dup) console.log(`  ${String(r.line).padStart(5)}  <${r.tag}>  ${r.handler.slice(0, 54)}`);
console.log(`\nSTANDALONE — needs an aria-label (${solo.length}):`);
for (const r of solo) console.log(`  ${String(r.line).padStart(5)}  <${r.tag}>  ${r.handler.slice(0, 54)}`);

if (!unnamed.length) { console.error("\nSCAN FOUND NOTHING — do not read this as a clean file."); process.exit(1); }
