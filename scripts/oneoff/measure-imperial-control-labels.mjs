#!/usr/bin/env node
// WHICH IMPERIAL CONTROL LABELS CAN A REAL CLIMBER ACTUALLY REACH?
//
// The units work left "the FILTER labels" open: `Within 50/100/250 mi`, the RouteFinder length
// buckets, and three aria-labels naming miles. Before polishing any of them, ask the question this
// repo keeps paying for: is the component they live in REACHABLE in production? `deploy.yml` sets
// VITE_USE_DB=true, so every seed-only component renders for nobody — and `check:seed-only-surfaces`
// already names ten of them.
//
// Report-only. No browser, no DB.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { parse } from "@babel/parser";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ASKED OF check:seed-only-surfaces RATHER THAN RETYPED. A list of ten names copied in here went
// stale the same day the guard learned to see a second spelling of the seed branch and started
// reporting fourteen — the hand-copy this repo keeps paying for. Running the guard costs a few
// seconds and cannot drift.
const SEED_ONLY = (() => {
  let out = "";
  try { out = execFileSync("node", [path.join(ROOT, "scripts", "check-seed-only-surfaces.mjs")], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  const names = [...out.matchAll(/^\s*ok\s+([A-Z][A-Za-z0-9_]*)\s/gm)].map((m) => m[1]);
  if (names.length < 5) {
    console.error("BROKEN: could not read the seed-only list from check:seed-only-surfaces — every\n" +
      "component below would be classified as reachable, which is the false-pass direction.");
    process.exit(1);
  }
  return new Set(names);
})();

// An imperial unit written as a STRING LITERAL cannot convert. That is the whole rule, and its
// precision is perfect by construction.
const IMPERIAL = /\b(\d+\s*(mi|ft|lb|in)\b|miles?|feet|foot|pounds?|inches)\b/i;

const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx",
  ...fs.readdirSync(path.join(ROOT, "lib")).filter((f) => f.endsWith(".jsx")).map((f) => "lib/" + f)];

let total = 0, live = 0, dead = 0;
const rows = [];

for (const rel of FILES) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { console.log(`SKIP ${rel}: ${e.message}`); continue; }

  // Top-level component ranges, so an offset resolves to the component that OWNS it rather than
  // to whatever declaration happens to precede it on a 400kB line.
  const comps = [];
  for (const n of ast.program.body) {
    const d = n.type === "ExportNamedDeclaration" || n.type === "ExportDefaultDeclaration" ? n.declaration : n;
    if (!d) continue;
    if (d.type === "FunctionDeclaration" && d.id && /^[A-Z]/.test(d.id.name)) comps.push({ name: d.id.name, start: d.start, end: d.end });
    if (d.type === "VariableDeclaration") for (const v of d.declarations)
      if (v.id.type === "Identifier" && /^[A-Z]/.test(v.id.name) && v.init) comps.push({ name: v.id.name, start: v.start, end: v.end });
  }
  const owner = (off) => { let best = null; for (const c of comps) if (off >= c.start && off < c.end && (!best || c.start > best.start)) best = c; return best && best.name; };

  // Every string literal in the file, JSX text included.
  const seen = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === "StringLiteral" || node.type === "JSXText") {
      const v = (node.value || "").trim();
      if (v && IMPERIAL.test(v) && !seen.has(node.start)) {
        seen.add(node.start);
        const o = owner(node.start) || "TOP LEVEL";
        const isDead = SEED_ONLY.has(o);
        total++; isDead ? dead++ : live++;
        rows.push({ rel, line: src.slice(0, node.start).split("\n").length, o, isDead, v: v.length > 58 ? v.slice(0, 55) + "..." : v });
      }
    }
    for (const k of Object.keys(node)) if (k !== "loc" && k !== "start" && k !== "end") walk(node[k]);
  };
  walk(ast.program.body);
}

if (!total) { console.error("BROKEN SCAN: no imperial literal found at all"); process.exit(1); }
rows.sort((a, b) => (a.isDead === b.isDead ? a.rel.localeCompare(b.rel) : a.isDead ? 1 : -1));
console.log("REACHABLE (a real climber can see these)\n");
for (const r of rows) if (!r.isDead) console.log(`  ${r.rel}:${r.line}  [${r.o}]  ${JSON.stringify(r.v)}`);
console.log("\nDEAD IN PRODUCTION (seed-only component)\n");
for (const r of rows) if (r.isDead) console.log(`  ${r.rel}:${r.line}  [${r.o}]  ${JSON.stringify(r.v)}`);
console.log(`\n${total} imperial literal(s): ${live} reachable, ${dead} in seed-only components`);
