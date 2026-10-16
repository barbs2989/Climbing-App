// DOES check:token-boxes have a coverage gap worth closing?
//
// That guard renders RouteDetail and nothing else, so every token-shaped box on the other
// screens is unmeasured. "Unmeasured" is not the same as "broken", and this repo's rule is to
// measure a detector's precision — and its need — before building it.
//
// So: find every token-shaped box in the app OUTSIDE RouteDetail, print what renders inside it,
// and let a human decide which could ever hold a long `routes` column. Deliberately a MAP TO
// READ. It makes no claim about correctness.
//
// The shape test is lifted from the shipped guard's rules rather than re-invented: pill or
// nowrap, minus the two measured exclusions (ellipsis-clipping, and explicit word-break).
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import fs from "fs";

const traverse = _traverse.default || _traverse;
const FILES = ["ClimbMatchCore.jsx", "ClimbMatch.jsx", "EnrichmentPanels.jsx", "lib/DbAreaBrowser.jsx", "lib/FireNearRoute.jsx", "lib/AuthModal.jsx"];

function props(obj) {
  const out = {};
  for (const p of obj.properties) {
    if (p.type !== "ObjectProperty") continue;
    const k = p.key.name || p.key.value;
    const v = p.value;
    out[k] = v.type === "StringLiteral" ? v.value : v.type === "NumericLiteral" ? v.value : "(dynamic)";
  }
  return out;
}
function tokenShape(s) {
  const clips = s.overflow === "hidden" && s.textOverflow === "ellipsis";
  const wraps = s.wordBreak === "break-word" || s.overflowWrap === "anywhere" || s.overflowWrap === "break-word";
  if (clips || wraps) return null;
  const radius = typeof s.borderRadius === "number" ? s.borderRadius : null;
  const tightPad = typeof s.padding === "string" && /^\s*[0-4]px/.test(s.padding);
  if (radius != null && radius >= 6 && tightPad) return "pill";
  if (s.whiteSpace === "nowrap") return "nowrap";
  return null;
}

const rows = [];
let elements = 0;
for (const f of FILES) {
  if (!fs.existsSync(f)) { console.log(`FAIL: ${f} missing — the scan would silently read less of the app`); process.exit(1); }
  const src = fs.readFileSync(f, "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  traverse(ast, {
    JSXElement(p) {
      elements++;
      const a = (p.node.openingElement.attributes || []).find((x) => x.type === "JSXAttribute" && x.name.name === "style");
      if (!a || !a.value || a.value.type !== "JSXExpressionContainer") return;
      const o = a.value.expression;
      if (!o || o.type !== "ObjectExpression") return;
      const shape = tokenShape(props(o));
      if (!shape) return;
      // Only elements with NO element children — the same leaf rule the guard uses.
      if ((p.node.children || []).some((c) => c.type === "JSXElement")) return;
      const inner = (p.node.children || [])
        .filter((c) => c.type === "JSXExpressionContainer")
        .map((c) => src.slice(c.start + 1, c.end - 1).replace(/\s+/g, " ").trim())
        .filter(Boolean);
      if (!inner.length) return;                       // a literal label can never be long
      rows.push({ f, line: p.node.loc.start.line, shape, inner: inner.join(" | ").slice(0, 110) });
    },
  });
}
if (!elements) { console.log("FAIL: parsed no JSX — the scan is broken"); process.exit(1); }
if (!rows.length) { console.log(`FAIL: ${elements} elements and ZERO token-shaped leaves — the shape test matches nothing`); process.exit(1); }

// Group by what renders, not by site: the same expression in ten rows is one question.
const byExpr = new Map();
for (const r of rows) {
  if (!byExpr.has(r.inner)) byExpr.set(r.inner, { shape: r.shape, n: 0, where: `${r.f}:${r.line}` });
  byExpr.get(r.inner).n++;
}
console.log(`${elements} JSX elements walked across ${FILES.length} files OUTSIDE RouteDetail`);
console.log(`${rows.length} token-shaped leaf box(es), ${byExpr.size} distinct expression(s)\n`);
[...byExpr.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([expr, v]) => {
  console.log(`  ${String(v.n).padStart(3)}x [${v.shape.padEnd(6)}] ${expr}`);
  console.log(`        ${v.where}`);
});
console.log("\nA box is only a RISK if what it renders can be a long `routes` column. Route NAMES");
console.log("(max 85 chars catalog-wide) and counts cannot; enrichment prose can.");
