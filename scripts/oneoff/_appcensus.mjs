// node scripts/oneoff/_appcensus.mjs [--in App] [--min 4000] — the big lift-able pieces of a parent's render:
// conditionals whose consequent is JSX (branch mode) and `const f=(...)=>jsx` closures (closure mode), by size.
import fs from "node:fs";
import { parse } from "@babel/parser";
import traverseM from "@babel/traverse";
const traverse = traverseM.default || traverseM;
const argv = process.argv.slice(2);
const opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const file = opt("--file") || "ClimbMatch.jsx", inFn = opt("--in") || "App", min = +(opt("--min") || 4000);
const src = fs.readFileSync(file, "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx", "typescript"] });
const isJsx = n => n && (n.type === "JSXElement" || n.type === "JSXFragment" || (n.type === "ParenthesizedExpression" && isJsx(n.expression)));
const out = [];
const inside = p => { let f = p.getFunctionParent(); while (f && !(f.node.id && f.node.id.name === inFn)) f = f.getFunctionParent(); return !!f; };
const depth = p => { let d = 0, q = p.parentPath; while (q) { if (q.isConditionalExpression() && isJsx(q.node.consequent)) d++; q = q.parentPath; } return d; };
traverse(ast, {
  ConditionalExpression(p) { const c = p.node.consequent; if (!isJsx(c) || !inside(p)) return; const sz = c.end - c.start; if (sz < min) return;
    out.push({ kind: "branch", sz, line: c.loc.start.line, d: depth(p), anchor: src.slice(p.node.start, Math.min(p.node.test.end + 1, p.node.start + 80)).replace(/\s+/g, " ") }); },
  VariableDeclarator(p) { const i = p.node.init; if (!i || i.type !== "ArrowFunctionExpression" || !inside(p)) return; const sz = i.end - i.start; if (sz < min) return;
    out.push({ kind: i.body.type === "BlockStatement" ? "closure-block" : "closure", sz, line: i.loc.start.line, d: depth(p), anchor: p.node.id.name }); },
});
traverse(ast, { LogicalExpression(p) { const c = p.node.right; if (p.node.operator !== "&&" || !isJsx(c) || !inside(p)) return; const sz = c.end - c.start; if (sz < min) return;
  out.push({ kind: "and", sz, line: c.loc.start.line, d: depth(p), anchor: src.slice(p.node.start, Math.min(p.node.left.end, p.node.start + 80)).replace(/\s+/g, " ") }); } });
out.sort((a, b) => b.sz - a.sz);
for (const o of out) console.log(`${String(o.sz).padStart(7)} L${o.line} d${o.d} ${o.kind} ${o.anchor}`);
