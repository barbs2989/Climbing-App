// Give a file's real controls the keyboard triad — the hardened version.
//
//   node scripts/oneoff/apply-keyboard-triad.mjs ClimbMatch.jsx [--write]
//
// Generalised from apply-core-keyboard-triad.mjs, and every guard below exists because the
// first sweep of ClimbMatchCore shipped the defect it prevents. All three were invisible to
// check:refs, check:a11y-names, check:dead-props, check:hooks and a Tab walk; two were found
// only by a browser guard and one only by reading the code.
//
//   SHADOWED CALLEE  Two scopes declare a LOCAL `clickable` that is a boolean gate. Wrapping
//                    their handlers produced `clickable(<boolean>)` -> "clickable2 is not a
//                    function", and the app's error boundary replaced the whole Challenges
//                    panel. check:refs passed throughout: the identifier WAS bound, to a
//                    boolean. A binding check cannot tell "bound" from "bound to something
//                    callable", so the callee is now resolved through Babel's scope.
//
//   UNDEFINED ARG    `onClick={cond?undefined:fn}` is inert as a plain handler and becomes a
//                    CRASH once converted: clickable()'s key handler calls onClick(e)
//                    unconditionally, so Enter throws. Reported, not converted — the caller
//                    should make the spread conditional instead.
//
//   NO NAME          A child ELEMENT is not a name. `<span><Av src={...}/></span>` has a
//                    child, renders an image, and announces as an unnamed button. Static JSX
//                    cannot answer "does this render text at runtime", so only text or an
//                    expression counts, and anything else is reported for a decision.
//
// Replaces by AST character offset, descending, never by matching handler text: these files
// pack many declarations onto one physical line and handler text repeats verbatim.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REL = process.argv[2];
if (!REL || REL.startsWith("--")) { console.error("usage: apply-keyboard-triad.mjs <file.jsx> [--write]"); process.exit(1); }
const FILE = path.join(ROOT, REL);
const WRITE = process.argv.includes("--write");
const src = fs.readFileSync(FILE, "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
const NATIVE = new Set(["button", "a", "input", "select", "textarea", "summary", "option", "label"]);
const isStop = (n) => n && n.type === "CallExpression" && n.callee && n.callee.type === "MemberExpression" &&
  n.callee.property && n.callee.property.name === "stopPropagation";
const mentionsUndefined = (n) =>
  n && n.type === "ConditionalExpression" &&
  ((n.consequent.type === "Identifier" && n.consequent.name === "undefined") ||
   (n.alternate.type === "Identifier" && n.alternate.name === "undefined"));

const targets = [], unnamed = [], shadowed = [], undef = [];

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

    const row = {
      line: p.node.loc.start.line, tag, start: oc.start, end: oc.end,
      expr: src.slice(ex.start, ex.end),
      handler: src.slice(ex.start, ex.end).replace(/\s+/g, " ").slice(0, 50),
    };

    // GUARD 1 — is `clickable` here the imported helper, or a local shadow?
    const binding = p.scope.getBinding("clickable");
    if (!binding || binding.kind !== "module") { shadowed.push(row); return; }

    // GUARD 2 — would the helper be handed `undefined`?
    if (mentionsUndefined(ex)) { undef.push(row); return; }

    // GUARD 3 — could a screen reader name it?
    // RECURSIVE, because the accessible name is computed from ALL descendant text. The
    // direct-children-only version OVER-REPORTED badly: it called
    //
    //   <div onClick={...}><div>{pubName(c)}</div></div>
    //
    // unnamed, when that is the climber's name one level down. On ClimbMatch.jsx it reported
    // 27 unnamed where the truth is 6, so 22 safely convertible controls were skipped and
    // #1054 understated what it could have done.
    //
    // Components stay OPAQUE: <Av/> renders an image with no text, which is exactly why the
    // avatar announced as an unnamed button. Only lowercase host elements are descended into,
    // so this still errs toward reporting rather than converting something unnameable.
    const textIn = (nodes, depth) => {
      if (depth > 4) return false;
      return (nodes || []).some((c) => {
        if (c.type === "JSXText") return !!c.value.trim();
        if (c.type === "JSXExpressionContainer") return true;
        // A FRAGMENT IS TRANSPARENT. <>...</> has no element name, so an element-only test
        // returned false and called a labelled chip unnamed — the third variant of this same
        // "the name check is too narrow" bug, after direct-children-only and components.
        if (c.type === "JSXFragment") return textIn(c.children, depth + 1);
        if (c.type === "JSXElement") {
          const n = c.openingElement && c.openingElement.name;
          if (!n || n.type !== "JSXIdentifier") return false;
          if (n.name[0] === n.name[0].toUpperCase()) return false; // component: opaque
          return textIn(c.children, depth + 1);
        }
        return false;
      });
    };
    const hasText = textIn((p.parent && p.parent.children) || [], 0);
    const labelled = names.has("aria-label") || names.has("aria-labelledby") || names.has("title");
    if (!hasText && !labelled) { unnamed.push(row); return; }

    targets.push(row);
  },
});

const report = (title, rows) => {
  console.log(`${title}: ${rows.length}`);
  for (const r of rows) console.log(`  ${String(r.line).padStart(5)}  <${r.tag}>  ${r.handler}`);
};
console.log(`convertible: ${targets.length}`);
report("SHADOWED callee (would call a local, not the helper)", shadowed);
report("UNDEFINED handler (would crash on Enter)", undef);
report("NO NAME SOURCE (would announce as an unnamed button)", unnamed);

if (!targets.length && !unnamed.length && !shadowed.length && !undef.length) {
  console.error("\nSCAN BROKE — found no clickable elements at all; refusing to write.");
  process.exit(1);
}
if (!targets.length) { console.log("\nnothing left to convert."); process.exit(0); }
if (!WRITE) { console.log("\ndry run — pass --write to apply"); process.exit(0); }

let out = src;
for (const t of [...targets].sort((a, b) => b.start - a.start)) {
  out = out.slice(0, t.start) + `{...clickable(${t.expr})}` + out.slice(t.end);
}
if (out === src) { console.error("nothing changed"); process.exit(1); }
fs.writeFileSync(FILE, out);
console.log(`\nwrote ${REL} (${src.length} -> ${out.length} chars), ${targets.length} control(s)`);
