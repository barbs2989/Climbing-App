// check:overlay-width-cap anchors on `style={{` -- a LITERAL style object. A style written as a
// ternary (`style={fullscreen?{...}:{...}}`) is invisible to it. This measures how many fixed
// style objects each scan can reach, and names every opaque full-screen view the literal one
// cannot. A coverage hole in a guard reads exactly like a clean tree.
import fs from "node:fs";

const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"]
  .concat(fs.readdirSync("lib").filter((f) => f.endsWith(".jsx")).map((f) => "lib/" + f));

// Balance forward from a `{`, skipping string and template contents so `${C.border}` cannot
// desynchronise the depth counter.
function balance(src, at) {
  let d = 0, q = null;
  for (let i = at; i < src.length; i++) {
    const c = src[i], p = src[i - 1];
    if (q) { if (c === q && p !== "\\") q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "{") d++;
    else if (c === "}") { d--; if (!d) return i; }
  }
  return -1;
}

// Top-level object literals inside a style={...} EXPRESSION. `style={{a}}` yields one; a ternary
// yields two, and judging the UNION of a ternary's branches is wrong -- one branch can carry the
// cap while the other is the full-bleed one.
function objectsIn(expr) {
  const out = [];
  let q = null;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i], p = expr[i - 1];
    if (q) { if (c === q && p !== "\\") q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "{") { const e = balance(expr, i); if (e < 0) return out; out.push(expr.slice(i + 1, e)); i = e; }
  }
  return out;
}

let wide = 0, literalOnly = 0;
const unreachable = [];
for (const f of FILES) {
  const src = fs.readFileSync(f, "utf8");
  for (const m of src.matchAll(/style=\{/g)) {
    const open = m.index + m[0].length - 1;
    const end = balance(src, open);
    if (end < 0) continue;
    const expr = src.slice(open + 1, end);
    const objs = objectsIn(expr);
    const isLiteral = objs.length === 1 && /^\s*\{/.test(expr);
    for (const style of objs) {
      if (!/position:\s*["']fixed["']/.test(style)) continue;
      wide++;
      if (isLiteral) literalOnly++;
      if (!/inset:\s*0/.test(style)) continue;
      if (!/background:\s*C\.bg\b/.test(style)) continue;
      if (isLiteral) continue;
      unreachable.push({ f, line: src.slice(0, m.index).split("\n").length, style: style.replace(/\s+/g, " ").slice(0, 160) });
    }
  }
}

console.log("fixed style objects reachable: wide scan " + wide + ", literal-only scan " + literalOnly);
console.log("\nopaque full-screen views the LITERAL scan cannot reach: " + unreachable.length);
for (const n of unreachable) console.log("  " + n.f + ":" + n.line + "\n     " + n.style);
