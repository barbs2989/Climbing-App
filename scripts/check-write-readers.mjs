#!/usr/bin/env node
// check:write-readers — a write to a table REFRESHES every cached query that reads it.
//
// The query client keeps an answer for 60 s (main.jsx: staleTime). A write that updates its own
// screen through a setter or a refetch() leaves every OTHER reader of that table holding the
// pre-write rows until the minute passes and something remounts. That is the incident behind
// `objectiveReaders` (the saved-at list and the per-route "N climbers want this" count kept the
// old number) and `logReaders` (a logged climb reached the Logbook and not the route's REPORTS
// tab, Today, or a friend's feed) — both fixed by one list of the table's readers, invalidated by
// every writer of the table. Measured on 2026-10-08 before this guard: 111 write functions, 5 of
// them invalidating anything; 93 writer×table pairs over 38 tables with a cached reader and no
// refresh.
//
// Rule: every exported function in a lib/ file that calls supabase.from("T").insert/update/
// delete/upsert, where some useQuery's queryFn reads "T", must call invalidateKeys(...) or
// qc.invalidateQueries(...) — directly, through a top-level `const xReaders = (…) => [[…]]`
// helper, or through ONE other top-level function it calls — naming every reader of "T".
//
// What it cannot see, stated: a reader whose queryFn goes through an RPC reads tables this file
// cannot name (12 on 2026-10-08: route-logged-with, area-contributors, leaderboard, my-trust-counts,
// mutual-connections, partners-near, …). Those are listed by hand in the reader lists where the
// relation is known (vouches → my-trust-counts, connections → mutual-connections) and the guard
// accepts EXTRA names without demanding them. A write made from outside lib/ (an inline
// supabase call in a screen) is outside the discovered set — check:read-failures records the same
// boundary. Fails closed on a short discovery.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRITE_VERBS = new Set(["insert", "update", "delete", "upsert"]);

// A writer that may leave a table's readers stale, with the reason it is allowed to. Empty on
// purpose: every writer found on 2026-10-08 now refreshes its readers. Add here only with a
// reason a reviewer can check.
const DECLARED = {};

const libDir = path.join(ROOT, "lib");
const libFiles = fs.readdirSync(libDir).filter((f) => /\.(js|jsx)$/.test(f)).map((f) => "lib/" + f);
const FILES = libFiles.filter((rel) => { const t = fs.readFileSync(path.join(ROOT, rel), "utf8"); return /\bsupabase\b/.test(t) && (/\buseQuery\s*\(/.test(t) || /\.(insert|update|delete|upsert)\s*\(/.test(t)); });
if (!FILES.includes("lib/db.js")) { console.error("check:write-readers — lib/db.js not discovered; blind, not clean"); process.exit(1); }

function tableOf(callNode) {
  let n = callNode;
  for (let i = 0; i < 14 && n; i++) {
    if (n.type === "CallExpression" && n.callee.type === "MemberExpression" && n.callee.property.name === "from") {
      const a = n.arguments[0];
      return a && a.type === "StringLiteral" ? a.value : null;
    }
    if (n.type === "CallExpression") n = n.callee;
    else if (n.type === "MemberExpression") n = n.object;
    else return null;
  }
  return null;
}
function firstName(arr) { return arr && arr.type === "ArrayExpression" && arr.elements[0] && arr.elements[0].type === "StringLiteral" ? arr.elements[0].value : null; }
// names of the keys in `[[…],[…]]`
function namesOfList(arr) { const out = []; if (arr && arr.type === "ArrayExpression") for (const el of arr.elements) { const n = firstName(el); if (n) out.push(n); } return out; }
function bodyOf(fnNode) { return fnNode.type === "ArrowFunctionExpression" && fnNode.body.type !== "BlockStatement" ? fnNode.body : null; }

const fns = new Map(); // name -> {rel, line, writes:Set(table), direct:Set(name), listsUsed:Set(name), calls:Set(name)}
const lists = new Map(); // helper name -> Set(reader names)
const readers = new Map(); // reader name -> {rel,line, tables:Set, helpers:Set}
const tableReads = new Map(); // fn name -> Set(table) for helper resolution

for (const rel of FILES) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { console.error(`check:write-readers — could not parse ${rel}: ${e.message}`); process.exit(1); }
  traverse(ast, {
    "FunctionDeclaration|VariableDeclarator"(p) {
      const n = p.node, name = n.id && n.id.name; if (!name) return;
      const pp = p.parentPath;
      const top = pp.isProgram() || pp.isExportNamedDeclaration() || (pp.isVariableDeclaration() && (pp.parentPath.isProgram() || pp.parentPath.isExportNamedDeclaration()));
      if (!top) return;
      // a reader-list helper: const xReaders = (…) => [[…],…]  or  const xReaders = [[…]]
      if (n.type === "VariableDeclarator" && n.init) {
        const lit = n.init.type === "ArrayExpression" ? n.init : bodyOf(n.init);
        if (lit && lit.type === "ArrayExpression" && lit.elements.length && lit.elements.every((e) => e && e.type === "ArrayExpression")) { lists.set(name, new Set(namesOfList(lit))); return; }
      }
      const rec = { rel, line: n.loc.start.line, writes: new Set(), direct: new Set(), listsUsed: new Set(), calls: new Set() };
      const reads = new Set();
      p.traverse({
        CallExpression(q) {
          const c = q.node.callee, args = q.node.arguments;
          if (c.type === "MemberExpression" && c.property.type === "Identifier") {
            if (WRITE_VERBS.has(c.property.name)) { const t = tableOf(q.node); if (t) rec.writes.add(t); }
            if (c.property.name === "from" && args[0] && args[0].type === "StringLiteral") reads.add(args[0].value);
            if (c.property.name === "invalidateQueries" && args[0] && args[0].type === "ObjectExpression") for (const pr of args[0].properties) if (pr.key && pr.key.name === "queryKey") { const nm = firstName(pr.value); if (nm) rec.direct.add(nm); }
          }
          if (c.type === "Identifier") {
            if (c.name === "invalidateKeys" && args[0]) {
              if (args[0].type === "ArrayExpression") for (const nm of namesOfList(args[0])) rec.direct.add(nm);
              else if (args[0].type === "CallExpression" && args[0].callee.type === "Identifier") rec.listsUsed.add(args[0].callee.name);
              else if (args[0].type === "Identifier") rec.listsUsed.add(args[0].name);
            } else if (c.name === "useQuery" && args[0] && args[0].type === "ObjectExpression") {
              let key = null, fnNode = null;
              for (const pr of args[0].properties) { if (!pr.key) continue; if (pr.key.name === "queryKey") key = pr.value; if (pr.key.name === "queryFn") fnNode = pr.value; }
              const nm = firstName(key);
              if (nm && fnNode) {
                const r = readers.get(nm) || { rel, line: q.node.loc.start.line, tables: new Set(), helpers: new Set() };
                q.get("arguments.0").traverse({ CallExpression(s) { const cc = s.node.callee; if (cc.type === "MemberExpression" && cc.property.name === "from" && s.node.arguments[0] && s.node.arguments[0].type === "StringLiteral") r.tables.add(s.node.arguments[0].value); if (cc.type === "Identifier") r.helpers.add(cc.name); } });
                readers.set(nm, r);
              }
            } else rec.calls.add(c.name);
          }
        },
      });
      fns.set(name, rec);
      if (!tableReads.has(name)) tableReads.set(name, reads);
    },
  });
}
// a queryFn that calls fetchFoo() reads what fetchFoo reads (one level)
for (const r of readers.values()) for (const h of r.helpers) { const s = tableReads.get(h); if (s) for (const t of s) r.tables.add(t); }

const readersOfTable = new Map();
for (const [nm, r] of readers) for (const t of r.tables) { if (!readersOfTable.has(t)) readersOfTable.set(t, new Set()); readersOfTable.get(t).add(nm); }

function refreshed(rec, depth) {
  const out = new Set(rec.direct);
  for (const l of rec.listsUsed) for (const nm of lists.get(l) || []) out.add(nm);
  if (depth > 0) for (const c of rec.calls) { const f = fns.get(c); if (f) for (const nm of refreshed(f, depth - 1)) out.add(nm); }
  return out;
}

const writers = [...fns.entries()].filter(([, f]) => f.writes.size);
const pairs = []; for (const [, f] of writers) for (const t of f.writes) if (readersOfTable.has(t)) pairs.push(t);
if (writers.length < 60 || readers.size < 60 || new Set(pairs).size < 20) {
  console.error(`check:write-readers — discovered ${writers.length} writer(s), ${readers.size} reader(s), ${new Set(pairs).size} table(s) with both; blind, not clean`);
  process.exit(1);
}

const stale = [];
let checked = 0;
for (const [name, f] of writers) {
  for (const t of f.writes) {
    const need = readersOfTable.get(t); if (!need) continue;
    checked++;
    if (DECLARED[name]) continue;
    const have = refreshed(f, 1);
    const missing = [...need].filter((nm) => !have.has(nm));
    if (missing.length) stale.push({ rel: f.rel, line: f.line, name, table: t, missing });
  }
}
for (const name of Object.keys(DECLARED)) if (!fns.has(name)) { console.error(`check:write-readers — DECLARED names ${name}, which no lib/ file declares; drop the entry`); process.exit(1); }

if (stale.length) {
  console.error("\nThese writes leave a cached reader of their table holding the pre-write rows for up to");
  console.error("a minute (staleTime) — the screen that made the change may refetch, every other one");
  console.error("does not. Invalidate the table's readers from the writer (see objectiveReaders):");
  for (const s of stale) console.error(`  ${s.rel}:${s.line} ${s.name}() writes ${s.table} and does not refresh: ${s.missing.join(", ")}`);
  console.error(`\n${stale.length} writer×table pair(s) over ${new Set(stale.map((s) => s.table)).size} table(s).`);
  process.exit(1);
}
console.log(`ok — check:write-readers: ${checked} writer×table pair(s) across ${writers.length} writers refresh every one of their ${readers.size} cached readers (${FILES.length} lib files, ${lists.size} reader lists, ${Object.keys(DECLARED).length} declared exception(s))`);
