#!/usr/bin/env node
// EVERY SPELLING OF "THIS HALF ONLY RUNS ON THE SEED PATH".
//
// `check:seed-only-surfaces` prunes ONE `!USE_DB && …` region. Before widening it, ask how many
// ways the app actually writes that condition — a widening that closes one more spelling and
// leaves a third is the shape this repo keeps recording (an instance fixed by hand is not a class
// closed).
//
// For every reference to USE_DB, classify the branch it gates and report whether the DEAD half
// renders any component.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"]
  .concat(fs.readdirSync(path.join(ROOT, "lib")).filter((f) => /\.jsx$/.test(f)).map((f) => "lib/" + f));

const compsIn = (node) => {
  const out = new Set();
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === "JSXOpeningElement" && n.name && n.name.type === "JSXIdentifier" && /^[A-Z]/.test(n.name.name)) out.add(n.name.name);
    for (const k of Object.keys(n)) if (k !== "loc") walk(n[k]);
  };
  walk(node);
  return [...out];
};

const shapes = new Map();   // shape label -> {n, comps:Set}
const note = (label, deadNode) => {
  if (!shapes.has(label)) shapes.set(label, { n: 0, comps: new Set() });
  const s = shapes.get(label);
  s.n++;
  if (deadNode) for (const c of compsIn(deadNode)) s.comps.add(c);
};

for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); } catch { continue; }
  traverse(ast, {
    Identifier(p) {
      if (p.node.name !== "USE_DB") return;
      const par = p.parent, gp = p.parentPath && p.parentPath.parent;

      // USE_DB ? live : SEED     — alternate is dead
      if (par.type === "ConditionalExpression" && par.test === p.node) { note(`${f}: USE_DB ? live : SEED`, par.alternate); return; }
      // !USE_DB
      if (par.type === "UnaryExpression" && par.operator === "!") {
        if (gp && gp.type === "ConditionalExpression" && gp.test === par) { note(`${f}: !USE_DB ? SEED : live`, gp.consequent); return; }
        if (gp && gp.type === "LogicalExpression" && gp.operator === "&&" && gp.left === par) { note(`${f}: !USE_DB && SEED`, gp.right); return; }
        if (gp && gp.type === "LogicalExpression" && gp.operator === "||" && gp.left === par) { note(`${f}: !USE_DB || …`, null); return; }
        if (gp && gp.type === "IfStatement" && gp.test === par) { note(`${f}: if (!USE_DB) { SEED }`, gp.consequent); return; }
        note(`${f}: !USE_DB (other)`, null); return;
      }
      if (par.type === "LogicalExpression" && par.operator === "&&" && par.left === p.node) { note(`${f}: USE_DB && live`, null); return; }
      if (par.type === "IfStatement" && par.test === p.node) { note(`${f}: if (USE_DB) { live } else { SEED }`, par.alternate); return; }
      note(`${f}: USE_DB (other)`, null);
    },
  });
}

if (!shapes.size) { console.error("BROKEN SCAN: no USE_DB reference found"); process.exit(1); }
const rows = [...shapes].sort((a, b) => b[1].comps.size - a[1].comps.size || b[1].n - a[1].n);
for (const [label, s] of rows) {
  console.log(`${String(s.n).padStart(3)}x  ${label}`);
  if (s.comps.size) console.log(`       dead half renders: ${[...s.comps].sort().join(", ")}`);
}
const total = rows.reduce((a, [, s]) => a + s.n, 0);
console.log(`\n${total} USE_DB reference(s) across ${shapes.size} distinct shape(s)`);
