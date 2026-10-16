// Give ClimbMatchCore's real controls the keyboard triad.
//
// Replaces by AST character offset, descending, never by matching handler text: this file
// packs many declarations onto one physical line and handler text repeats verbatim
// (`onClick={onClose}` appears 49 times). An offset cannot hit the wrong element.
//
// EXCLUDES, each decided by measurement rather than by what the handler is called:
//   - backdrops        position:fixed + full bleed, resolved through {...styles.x} spreads
//   - natives          already focusable
//   - already fixed    carries role and tabIndex
//   - shields          a handler whose whole body is one stopPropagation() call
//
// AND REPORTS, rather than silently converting, any element with NO source of an accessible
// name. role="button" tells a screen reader "this is a button"; with no name it announces as
// an unnamed button, which is its own defect -- the class check:clickable now holds at zero
// is the same family. Those are listed for a decision instead of being swept in.
//
//   node scripts/oneoff/apply-core-keyboard-triad.mjs [--write]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILE = path.join(ROOT, "ClimbMatchCore.jsx");
const WRITE = process.argv.includes("--write");
const src = fs.readFileSync(FILE, "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
const NATIVE = new Set(["button", "a", "input", "select", "textarea", "summary", "option", "label"]);
const isStop = (n) => n && n.type === "CallExpression" && n.callee && n.callee.type === "MemberExpression" &&
  n.callee.property && n.callee.property.name === "stopPropagation";

const targets = [], unnamed = [];

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

    // Backdrop test, with {...styles.overlay} resolved and quotes normalised.
    const styleAttr = attrs.find((a) => a.name.name === "style");
    let style = styleAttr ? src.slice(styleAttr.start, styleAttr.end).replace(/\s+/g, "") : "";
    for (const m of style.matchAll(/\.\.\.([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)/g)) {
      const re = new RegExp("(^|[^\\w$])" + m[2] + "\\s*:\\s*\\{", "m");
      const hit = re.exec(src);
      if (!hit) continue;
      const i = src.indexOf("{", hit.index + hit[0].length - 1);
      let depth = 0, end = i;
      for (let k = i; k < src.length; k++) {
        if (src[k] === "{") depth++;
        else if (src[k] === "}") { depth--; if (!depth) { end = k; break; } }
      }
      style += src.slice(i, end + 1).replace(/\s+/g, "");
    }
    style = style.replace(/'/g, '"');
    if (/position:"fixed"/.test(style) &&
        (/inset:0/.test(style) || (/top:0/.test(style) && /left:0/.test(style) && /right:0/.test(style)))) return;

    // Can a screen reader name it? Any text child, or an authored label.
    const el = p.parent;
    const kids = (el && el.children) || [];
    // A CHILD ELEMENT IS NOT A NAME. The first version counted any JSXElement child as a
    // name source, so `<span onClick=...><Av src={c.avatar}/></span>` passed — and <Av>
    // renders an image with no text, so the converted control announced as an unnamed
    // button. Static JSX cannot answer "does this render text at runtime"; only the browser
    // caught it, on the discover tab. Requiring text or an expression is the conservative
    // reading: it over-reports rather than converting something a screen reader cannot name.
    const hasText = kids.some((c) =>
      (c.type === "JSXText" && c.value.trim()) ||
      (c.type === "JSXExpressionContainer"));
    const labelled = names.has("aria-label") || names.has("aria-labelledby") || names.has("title");
    const row = {
      line: p.node.loc.start.line, tag, start: oc.start, end: oc.end,
      expr: src.slice(ex.start, ex.end),
      handler: src.slice(ex.start, ex.end).replace(/\s+/g, " ").slice(0, 46),
    };
    if (!hasText && !labelled) unnamed.push(row); else targets.push(row);
  },
});

console.log(`convertible: ${targets.length}`);
console.log(`NO NAME SOURCE (reported, not converted): ${unnamed.length}`);
for (const r of unnamed) console.log(`  ${String(r.line).padStart(5)}  <${r.tag}>  ${r.handler}`);

// "nothing left to convert" and "the scan broke" are opposite conclusions and must not
// share a message. On a re-run every control is already fixed, so zero targets is the
// SUCCESS case — but zero of everything means the traversal found no clickable elements at
// all, which is a broken scan reporting a clean file.
if (!targets.length && !unnamed.length) {
  console.error("\nSCAN BROKE — found no clickable elements at all; refusing to write.");
  process.exit(1);
}
if (!targets.length) {
  console.log("\nnothing left to convert — every remaining control is a backdrop, a native,");
  console.log("already fixed, or listed above as having no name source.");
  process.exit(0);
}
if (!WRITE) { console.log("\ndry run — pass --write to apply"); process.exit(0); }

let out = src;
for (const t of [...targets].sort((a, b) => b.start - a.start)) {
  out = out.slice(0, t.start) + `{...clickable(${t.expr})}` + out.slice(t.end);
}
if (out === src) { console.error("nothing changed"); process.exit(1); }
fs.writeFileSync(FILE, out);
console.log(`\nwrote ClimbMatchCore.jsx (${src.length} -> ${out.length} chars), ${targets.length} control(s)`);
