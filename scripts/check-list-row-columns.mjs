#!/usr/bin/env node
// check:list-row-columns — the Climbs list's THIN ROW carries every column the list reads, and no
// column it does not.
//
// Why. lib/db.js useAreaRoutes selects a literal column list instead of ROUTE_AREA_EMBED (2026-10-08:
// a full row averaged 2,384 bytes, the list read 332; Liberty Bell's 20 routes were 635 KB for a
// list that renders 17 KB). PostgREST does not error on a column a select left out — the field is
// simply undefined — so a reader that gains a column the select lacks renders "—", "not recorded"
// or nothing for EVERY database route, silently, on the first screen a climber opens. That is the
// failure check:schema catches for a column the DATABASE lacks; this is the same hole one layer up.
//
// What it does. Parses the readers of that row — RouteRow and SummitBriefing (lib/DbAreaBrowser.jsx),
// the route page's sibling cells, "More on this peak" rows, approach picker and reverse link
// (RouteDetail.jsx) — and every function they hand a row to (lib/grade.js, lib/outing.js,
// ClimbMatchCore.jsx catOf/gradeLabel, lib/db.js dbRouteToCamel's own map), collects each
// `row.<field>` read, maps camelCase fields back to their columns through dbRouteToCamel, and
// fails on a column read but not selected, or selected but read by nobody. Static, no DB.
//
// What it cannot see. A reader that reaches a row through a name this file does not list (a NEW
// consumer of useAreaRoutes) — add it to ENTRIES. A read spelled `row[expr]` with a computed name
// other than the string arrays it resolves (GRADE_SOURCES). `_dbArea.<x>` reads on a thin row: the
// embed is pinned by hand to `areas(name,area_type)` — name for check:area-name-embed, area_type for
// climbsAPeak() — because dbRouteToCamel reads the FULL embed and the thin row is allowed less.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require_ = createRequire(import.meta.url);
const { parse } = require_("@babel/parser");
const traverse = require_("@babel/traverse").default;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = "check:list-row-columns";
const FILES = ["lib/db.js", "lib/DbAreaBrowser.jsx", "lib/grade.js", "lib/outing.js", "RouteDetail.jsx", "ClimbMatchCore.jsx"];
// The functions and memos that are handed a thin list row. A `sibsOf` entry names the IIFE that holds
// the route page's "More on this peak" rows, found by the variable it declares.
// `rows` names the destructured props that carry list rows — ApproachPicker's `route` is the page's FULL
// route and `sibs` the thin list, so only `sibs` counts there.
const ENTRIES = [
  { file: "lib/DbAreaBrowser.jsx", fn: "RouteRow", rows: ["r"] },
  { file: "lib/DbAreaBrowser.jsx", fn: "SummitBriefing", rows: ["routes"] },
  { file: "RouteDetail.jsx", fn: "approachFinishes" },
  { file: "RouteDetail.jsx", fn: "approachSibOpts" },
  { file: "RouteDetail.jsx", fn: "ApproachPicker", rows: ["sibs"] },
  { file: "RouteDetail.jsx", fn: "cell" },
  { file: "RouteDetail.jsx", enclosing: "sibs" },
];
const EMBED_MUST = ["name", "area_type"];
const problems = [];

const asts = {}, fns = {}, consts = {};
for (const rel of FILES) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  asts[rel] = ast;
  traverse(ast, {
    FunctionDeclaration(p) { if (p.node.id) reg(rel, p.node.id.name, p); },
    VariableDeclarator(p) {
      const { id, init } = p.node;
      if (id.type !== "Identifier" || !init) return;
      if (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") reg(rel, id.name, p.get("init"));
      // `const x = useMemo(function(){...}, deps)` — the memo body is the reader.
      else if (init.type === "CallExpression" && init.callee.type === "Identifier" && init.callee.name === "useMemo" && init.arguments[0] &&
        (init.arguments[0].type === "ArrowFunctionExpression" || init.arguments[0].type === "FunctionExpression")) reg(rel, id.name, p.get("init.arguments.0"));
      else if (init.type === "ArrayExpression" && p.parentPath.parentPath.isProgram()) consts[id.name] = init.elements.filter((e) => e && e.type === "StringLiteral").map((e) => e.value);
    },
  });
}
function reg(rel, name, p) { if (!fns[name]) fns[name] = { rel, path: p }; }

// ── the select literal, from useAreaRoutes ──
const dbSrc = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
const selM = dbSrc.match(/export function useAreaRoutes[\s\S]*?\.from\("routes"\)\.select\("([^"]+)"\)[\s\S]*?\n\}/);
const selLit = selM && selM[1].includes("areas(") ? selM[1] : null;
if (!selLit) { console.error(`${GUARD}: useAreaRoutes' thin select literal was not found in lib/db.js — the guard is blind, not clean`); process.exit(1); }
const SELECTED = new Set(), EMBED = new Set();
for (const part of selLit.split(/,(?![^(]*\))/)) {
  const e = part.trim().match(/^areas\(([^)]*)\)$/);
  if (e) e[1].split(",").forEach((c) => EMBED.add(c.trim())); else SELECTED.add(part.trim());
}
for (const c of EMBED_MUST) if (!EMBED.has(c)) problems.push(`lib/db.js useAreaRoutes: the areas() embed lacks "${c}" — check:area-name-embed needs name, climbsAPeak() reads area_type on a sibling row`);

// ── which names ARE columns: the schema snapshot check:schema reads (refresh-schema-snapshot.mjs),
//    so `r.stars` is a column read and `r.cover` (seed-only) is not — a column the select dropped is
//    still a column ──
const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/schema-snapshot.json"), "utf8"));
const ROUTE_COLS = (snapshot.tables && snapshot.tables.routes) || [];
if (ROUTE_COLS.length < 50) { console.error(`${GUARD}: scripts/schema-snapshot.json lists ${ROUTE_COLS.length} routes columns — not a schema, not clean`); process.exit(1); }
for (const c of SELECTED) if (!ROUTE_COLS.includes(c)) problems.push(`lib/db.js useAreaRoutes selects "${c}", which scripts/schema-snapshot.json does not list on routes`);

// ── dbRouteToCamel's map: camel field → the columns it is built from ──
const camel = {}, KNOWN = new Set([...SELECTED, ...ROUTE_COLS]);
const d2c = fns.dbRouteToCamel;
if (!d2c) { console.error(`${GUARD}: dbRouteToCamel not found in lib/db.js`); process.exit(1); }
const colReadsOf = (p, param, depth) => {
  const out = new Set();
  p.traverse({
    MemberExpression(m) {
      if (m.node.object.type === "Identifier" && m.node.object.name === param && !m.node.computed) out.add(m.node.property.name);
    },
    CallExpression(c) {
      if (depth > 0 && c.node.callee.type === "Identifier" && fns[c.node.callee.name] && fns[c.node.callee.name].rel === "lib/db.js" &&
        c.node.arguments.some((a) => a.type === "Identifier" && a.name === param)) {
        const f = fns[c.node.callee.name];
        const fp = f.path.node.params[0];
        if (fp && fp.type === "Identifier") for (const x of colReadsOf(f.path, fp.name, depth - 1)) out.add(x);
      }
    },
  });
  return out;
};
const rowParam = d2c.path.node.params[0].name;
d2c.path.traverse({
  ObjectProperty(p) {
    // Only the returned object's OWN properties: `_dbArea: { id: r.area_id, … }` is a nested object
    // whose keys are not route fields.
    if (p.node.key.type !== "Identifier" || !p.parentPath.parentPath.isReturnStatement()) return;
    const key = p.node.key.name;
    // traverse() visits descendants, not the root, so walk the property (key + value), not the value alone.
    const cols = colReadsOf(p, rowParam, 1);
    cols.delete("areas");
    if (cols.size) { camel[key] = [...cols]; cols.forEach((c) => KNOWN.add(c)); }
  },
});
for (const x of colReadsOf(d2c.path, rowParam, 0)) if (x !== "areas") KNOWN.add(x);
if (Object.keys(camel).length < 30) { console.error(`${GUARD}: only ${Object.keys(camel).length} camel fields mapped from dbRouteToCamel — parse broke, not clean`); process.exit(1); }
const isColumnName = (n) => KNOWN.has(n) || /^[a-z]+(_[a-z0-9]+)+$/.test(n);

// ── walk the readers ──
const reads = []; // {file, fn, field, cols}
const visited = new Set();
function walk(name, p, rel, rowNames, chain) {
  const key = rel + ":" + name;
  if (visited.has(key)) return;
  visited.add(key);
  const rows = new Set(rowNames);
  const fnNode = p.node;
  const params = fnNode.params || [];
  for (const prm of params) {
    if (prm.type === "Identifier") rows.add(prm.name);
    // A component takes its rows as destructured props: `function RouteRow({ r, onOpen, C })`. Only the
    // props the entry names count — `area` in SummitBriefing is an AREA row, whose
    // `area.elevation_ft` is not a route column.
    else if (prm.type === "ObjectPattern") for (const pp of prm.properties) if (pp.type === "ObjectProperty" && pp.value.type === "Identifier" && rowNames.includes(pp.value.name)) rows.add(pp.value.name);
  }
  const label = chain.concat(name).join(" → ");
  const rowish = (n) => !!n && ((n.type === "Identifier" && rows.has(n.name)) || (n.type === "LogicalExpression" && (rowish(n.left) || rowish(n.right))) || (n.type === "ConditionalExpression" && (rowish(n.consequent) || rowish(n.alternate))));
  p.traverse({
    // `const rs = routes || []` — a local alias of the rows is the rows
    VariableDeclarator(v) { if (v.node.id.type === "Identifier" && rowish(v.node.init)) rows.add(v.node.id.name); },
    // the first parameter of a callback given to an array method or a helper is a row too
    "ArrowFunctionExpression|FunctionExpression"(f) {
      if (f === p) return;
      const prm = f.node.params[0];
      if (prm && prm.type === "Identifier" && f.parentPath.isCallExpression()) rows.add(prm.name);
    },
    MemberExpression(m) {
      const o = m.node.object;
      if (o.type !== "Identifier" || !rows.has(o.name)) return;
      if (m.node.computed) {
        if (m.node.property.type === "Identifier") {
          const arr = findConst(m, m.node.property.name);
          for (const s of arr) note(rel, label, s);
        } else if (m.node.property.type === "StringLiteral") note(rel, label, m.node.property.value);
        return;
      }
      note(rel, label, m.node.property.name);
    },
    CallExpression(c) {
      const args = c.node.arguments;
      if (!args.some((a) => a.type === "Identifier" && rows.has(a.name))) return;
      // `rowGrade(r)` is handed the row; so is a function passed BY REFERENCE beside one —
      // `numericSpan(rs, effDistKm)` applies effDistKm to each row.
      const callee = c.node.callee;
      const named = [];
      if (callee.type === "Identifier" && fns[callee.name]) named.push(callee.name);
      for (const a of args) if (a.type === "Identifier" && fns[a.name] && !rows.has(a.name)) named.push(a.name);
      for (const n of named) walk(n, fns[n].path, fns[n].rel, [], chain.concat(name));
    },
  });
}
function findConst(m, ident) {
  // `.map((k) => route[k])` over a top-level array of strings: GRADE_SOURCES. Resolve the array the
  // enclosing call iterates, or any top-level string array the identifier is bound from.
  const call = m.findParent((q) => q.isCallExpression() && q.node.callee.type === "MemberExpression" && q.node.callee.object.type === "Identifier" && consts[q.node.callee.object.name]);
  if (call) return consts[call.node.callee.object.name];
  return consts[ident] || [];
}
function note(rel, label, field) {
  const cols = camel[field] ? camel[field] : isColumnName(field) ? [field] : null;
  if (!cols) return; // a seed-only field (`cover`, `activity`, `style`) or a derived one (`_approach`): undefined today, unchanged
  reads.push({ rel, label, field, cols });
}
for (const e of ENTRIES) {
  if (e.fn) {
    const f = fns[e.fn];
    if (!f || f.rel !== e.file) { console.error(`${GUARD}: entry ${e.file} ${e.fn} not found — a reader was renamed or moved; the guard is blind, not clean`); process.exit(1); }
    walk(e.fn, f.path, f.rel, e.rows || [], []);
  } else {
    let found = null;
    traverse(asts[e.file], { VariableDeclarator(p) { if (!found && p.node.id.type === "Identifier" && p.node.id.name === e.enclosing && p.node.init && p.node.init.type === "CallExpression" && p.node.init.callee.type === "MemberExpression" && p.node.init.callee.object.type === "Identifier" && p.node.init.callee.object.name === "cragSibs") found = p.getFunctionParent(); } });
    if (!found) { console.error(`${GUARD}: entry ${e.file} (the function declaring \`${e.enclosing}\` from cragSibs) not found — the guard is blind, not clean`); process.exit(1); }
    walk("sibs-rows", found, e.file, [], []);
  }
}
if (reads.length < 12) { console.error(`${GUARD}: only ${reads.length} row reads parsed — the walk broke, not clean`); process.exit(1); }

// ── judge ──
const needed = new Map();
for (const r of reads) for (const c of r.cols) { if (!needed.has(c)) needed.set(c, new Set()); needed.get(c).add(`${r.rel} ${r.label} reads .${r.field}`); }
for (const [c, who] of needed) if (!SELECTED.has(c)) problems.push(`column "${c}" is read but useAreaRoutes' thin select does not include it:\n      ${[...who].slice(0, 3).join("\n      ")}`);
for (const c of SELECTED) if (!needed.has(c)) problems.push(`column "${c}" is selected but no list reader reads it — the list is downloading what it does not render`);

if (problems.length) {
  console.error(`${GUARD} — ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error("\nThe thin row the Climbs list fetches (lib/db.js useAreaRoutes) must carry exactly what its readers read; a missing column renders as undefined on every database route, silently.");
  process.exit(1);
}
console.log(`ok — ${GUARD}: ${reads.length} row reads over ${visited.size} reader(s) resolve to ${needed.size} column(s), all ${SELECTED.size} the list selects; embed carries ${[...EMBED].join(",")}.`);
