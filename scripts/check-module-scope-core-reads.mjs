#!/usr/bin/env node
// A module that is imported BACK by a module it imports must not read that module at its own
// top level. In the production bundle the read runs before the export exists, and the whole app
// dies before React mounts.
//
// THE OUTAGE THIS IS WRITTEN AGAINST (2026-10-23, #2678 → hotfix #2679). PR36 of the component
// extraction moved VouchCard to src/components/VouchCard.tsx and hoisted one line above the
// component:
//
//   import { SKILLS } from "../../ClimbMatchCore.jsx";
//   const SKILL_LABELS: Record<string, { label?: string }> = SKILLS;   // module scope
//
// ClimbMatchCore.jsx imports VouchCard back (FullProfile renders it). ESM evaluates a module's
// imports before its own body, depth-first, in import order, and SKIPS a module that is already
// being evaluated. So main.jsx → ClimbMatch.jsx → ClimbMatchCore.jsx → VouchCard.tsx: core's body
// has not started when VouchCard's body runs, `const SKILLS` is in its temporal dead zone, and the
// bundle threw `ReferenceError: Cannot access 'Nb' before initialization` at load. The live site
// drew the navigation shell and nothing else, for the ten minutes until the post-deploy Chrome
// console check caught it. Types, lint, every static guard, the build and the reach measurement
// all passed — nothing reads the bundled graph's ORDER. This does.
//
// The read moved inside the component (render time, long after every module has evaluated) and
// the site came back. That is the rule `docs/refactor-progress.md` already stated in words; this
// is the rule enforced.
//
// WHAT IT ASKS. It replays ESM evaluation order from main.jsx over the app's STATIC import graph
// (an `import … from` or `export … from`; a dynamic `import()` is a boundary, because what it
// loads evaluates later, with the static graph already done — those targets are replayed as
// their own roots afterwards). While replaying it keeps the stack of modules whose bodies are in
// progress. When a module's body runs, every reference at its module scope to a binding imported
// from a module STILL ON THE STACK is a read of a value that does not exist yet — unless the
// export is a hoisted `function` declaration, which exists from instantiation (so `import Av` of
// `export default function Av` is always safe, and so is a core `export function`).
//
// "Module scope" means: not inside any function (a component body, a hook, a handler, a default
// parameter all run later), not a non-static class field initialiser (runs at construction), not a
// TypeScript type position (erased), and not an `export { X }` re-export (a live binding, no read).
//
// WHY A REPLAY AND NOT "no component reads core at the top". Direction matters. Core reading
// VouchCard at module scope would be fine — VouchCard has finished by then. And the rule is not
// about src/components: lib/*.jsx modules that core imports and that import core back sit in the
// same cycle and fail the same way. The replay says which side of each cycle is unsafe, and the
// measured answer on the tree this was written against is in the notes.
//
// WHAT IT CANNOT SEE. A read hidden behind a function that is CALLED at module scope
// (`const X = build()` where build reads a core const) — the reference is inside a function, so it
// is deferred by this rule, but the call is not. Such a call is a module-scope read one hop
// removed. It is not followed, because following calls means evaluating the program; the
// injection case for it is recorded as a known miss, not a catch.
//
//   npm run check:no-module-scope-core-reads
//
// Gated by `npm run build`.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = "check:no-module-scope-core-reads";
const ENTRY = "main.jsx";
const EXTS = [".js", ".jsx", ".ts", ".tsx", ".mjs"];
const SKIP_EXT = new Set([".css", ".json", ".svg", ".png", ".jpg", ".webp", ".gif", ".txt"]);

const die = (msg) => {
  console.error(`\n${GUARD} FAILED — ${msg}`);
  console.error("Nothing below was checked. This guard reports an ABSENCE, so a broken walk must not print ok.");
  process.exit(1);
};

const rel = (abs) => path.relative(ROOT, abs).split(path.sep).join("/");

function resolveSpec(fromAbs, spec) {
  if (!spec.startsWith(".") && !spec.startsWith("/")) return null;          // a package: not ours
  if (SKIP_EXT.has(path.extname(spec))) return null;                          // an asset
  const base = path.resolve(path.dirname(fromAbs), spec);
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const e of EXTS) if (fs.existsSync(base + e)) return base + e;
  for (const e of EXTS) if (fs.existsSync(path.join(base, "index" + e))) return path.join(base, "index" + e);
  return undefined;                                                            // relative and MISSING
}

// ── parse every reachable module once ─────────────────────────────────────────────────────────
const mods = new Map(); // abs -> { ast, src, edges:[{abs, node}], dyn:[abs] }
let edges = 0, dyn = 0, unresolved = [];

function load(abs) {
  if (mods.has(abs)) return mods.get(abs);
  const src = fs.readFileSync(abs, "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx", "typescript"] }); }
  catch (e) { die(`could not parse ${rel(abs)}: ${String(e.message).split("\n")[0]}`); }
  const m = { abs, src, ast, edges: [], dyn: [] };
  mods.set(abs, m);
  for (const n of ast.program.body) {
    let spec = null, typeOnly = false;
    if (n.type === "ImportDeclaration") { spec = n.source.value; typeOnly = n.importKind === "type"; }
    else if ((n.type === "ExportNamedDeclaration" || n.type === "ExportAllDeclaration") && n.source) { spec = n.source.value; typeOnly = n.exportKind === "type"; }
    if (spec === null || typeOnly) continue;
    const r = resolveSpec(abs, spec);
    if (r === undefined) { unresolved.push(`${rel(abs)} → ${spec}`); continue; }
    if (r === null) continue;
    m.edges.push({ abs: r, node: n });
    edges++;
  }
  traverse(ast, {
    Import(p) {
      const arg = p.parentPath.node.arguments && p.parentPath.node.arguments[0];
      if (!arg || arg.type !== "StringLiteral") return;
      const r = resolveSpec(abs, arg.value);
      if (r === undefined) { unresolved.push(`${rel(abs)} → import(${JSON.stringify(arg.value)})`); return; }
      if (r) { m.dyn.push(r); dyn++; }
    },
  });
  for (const e of m.edges) load(e.abs);
  for (const d of m.dyn) load(d);
  return m;
}

const entryAbs = path.join(ROOT, ENTRY);
if (!fs.existsSync(entryAbs)) die(`${ENTRY} is missing — the entry the replay starts from`);
load(entryAbs);
if (unresolved.length) die(`${unresolved.length} relative import(s) resolve to no file, so the graph is incomplete:\n  ${unresolved.join("\n  ")}`);

// ── what each module exports, and whether that export is HOISTED (a function declaration) ─────
// Returns "hoisted" | "value" | "unknown" for the name `exported` of module `abs`.
function exportKind(abs, exported, seen = new Set()) {
  const key = abs + "#" + exported;
  if (seen.has(key)) return "unknown";
  seen.add(key);
  const m = mods.get(abs);
  if (!m) return "unknown";
  const prog = m.ast.program;
  const bindingKind = (local) => {
    // The program scope is what traverse builds; look for a top-level function declaration by name.
    for (const n of prog.body) {
      const d = n.type === "ExportNamedDeclaration" || n.type === "ExportDefaultDeclaration" ? n.declaration : n;
      if (d && d.type === "FunctionDeclaration" && d.id && d.id.name === local) return "hoisted";
    }
    return "value";
  };
  for (const n of prog.body) {
    if (exported === "default" && n.type === "ExportDefaultDeclaration") {
      if (n.declaration.type === "FunctionDeclaration") return "hoisted";
      if (n.declaration.type === "Identifier") return bindingKind(n.declaration.name);
      return "value";
    }
    if (n.type === "ExportNamedDeclaration") {
      if (n.declaration) {
        const d = n.declaration;
        if (d.type === "FunctionDeclaration" && d.id && d.id.name === exported) return "hoisted";
        if (d.type === "VariableDeclaration" && d.declarations.some((v) => v.id.type === "Identifier" && v.id.name === exported)) return "value";
        if (d.type === "ClassDeclaration" && d.id && d.id.name === exported) return "value";
        continue;
      }
      for (const s of n.specifiers) {
        const name = s.exported.type === "Identifier" ? s.exported.name : s.exported.value;
        if (name !== exported) continue;
        if (n.source) {
          const r = resolveSpec(abs, n.source.value);
          return r ? exportKind(r, s.local ? s.local.name : name, seen) : "unknown";
        }
        return bindingKind(s.local.name);
      }
    }
    if (n.type === "ExportAllDeclaration") {
      const r = resolveSpec(abs, n.source.value);
      if (r) { const k = exportKind(r, exported, seen); if (k !== "unknown") return k; }
    }
  }
  return "unknown";
}

// ── module-scope references to imported bindings, per module ──────────────────────────────────
const TS_VALUE_WRAPPERS = new Set(["TSAsExpression", "TSNonNullExpression", "TSSatisfiesExpression", "TSTypeAssertion", "TSInstantiationExpression"]);
function moduleScopeImportReads(m) {
  const reads = []; // { name, from(abs), imported, line, text }
  traverse(m.ast, {
    "Identifier|JSXIdentifier"(p) {
      if (!p.isReferencedIdentifier()) return;
      if (p.parentPath.isExportSpecifier()) return;                       // a live re-export, not a read
      if (p.getFunctionParent()) return;                                     // runs later
      if (p.findParent((a) => a.isClassProperty() && !a.node.static)) return; // runs at construction
      if (p.findParent((a) => a.type.startsWith("TS") && !TS_VALUE_WRAPPERS.has(a.type))) return; // erased
      const b = p.scope.getBinding(p.node.name);
      if (!b || b.kind !== "module") return;
      const spec = b.path.node, decl = b.path.parentPath.node;
      if (decl.type !== "ImportDeclaration" || decl.importKind === "type" || spec.importKind === "type") return;
      const from = resolveSpec(m.abs, decl.source.value);
      if (!from) return;
      const imported = spec.type === "ImportDefaultSpecifier" ? "default"
        : spec.type === "ImportNamespaceSpecifier" ? "*"
        : (spec.imported.type === "Identifier" ? spec.imported.name : spec.imported.value);
      const stmt = p.findParent((a) => a.parentPath && a.parentPath.isProgram()) || p;
      reads.push({ name: p.node.name, from, imported, line: p.node.loc.start.line,
        text: m.src.slice(stmt.node.start, stmt.node.end).replace(/\s+/g, " ").slice(0, 110) });
    },
  });
  return reads;
}

// ── replay ESM evaluation order ───────────────────────────────────────────────────────────────
const done = new Set(), stack = [], findings = [], safeHoisted = [];
let bodiesRun = 0, backEdges = 0, readsExamined = 0;

function evaluate(abs) {
  if (done.has(abs) || stack.includes(abs)) { if (stack.includes(abs)) backEdges++; return; }
  stack.push(abs);
  const m = mods.get(abs);
  for (const e of m.edges) evaluate(e.abs);
  // The body runs now: every static import has either finished or is on the stack above us.
  bodiesRun++;
  for (const r of moduleScopeImportReads(m)) {
    readsExamined++;
    if (!stack.includes(r.from) || r.from === abs) continue;        // finished: the value exists
    const kind = r.imported === "*" ? "namespace" : exportKind(r.from, r.imported);
    if (kind === "hoisted") { safeHoisted.push({ ...r, in: abs }); continue; }
    findings.push({ ...r, in: abs, kind });
  }
  stack.pop();
  done.add(abs);
}

evaluate(entryAbs);
// Dynamic-import targets evaluate later, with the static graph finished, each as its own root.
for (const m of [...mods.values()]) for (const d of m.dyn) evaluate(d);
for (const abs of mods.keys()) if (!done.has(abs)) evaluate(abs);

// ── fail closed ───────────────────────────────────────────────────────────────────────────────
// This app's static graph is ~190 modules and ~700 edges with dozens of back-edges (core imports
// ~25 components that import core); the floors sit far below that and far above a broken walk.
if (mods.size < 60 || edges < 200 || backEdges < 10 || readsExamined < 1) {
  die(`the replay is broken, not the app: ${mods.size} module(s), ${edges} static edge(s), ${backEdges} back-edge(s), ${readsExamined} module-scope import read(s) examined — all should be well above these floors`);
}

if (findings.length) {
  console.error(`\n${GUARD} FAILED — ${findings.length} module-scope read(s) of an export that does not exist yet when the module evaluates:\n`);
  for (const f of findings) {
    console.error(`  ${rel(f.in)}:${f.line}  reads \`${f.name}\` from ${rel(f.from)} (${f.kind === "namespace" ? "a namespace import" : `exported as a ${f.kind}`}) at module scope`);
    console.error(`      ${f.text}`);
    console.error(`      ${rel(f.from)} is still evaluating here — it imports ${rel(f.in)} (directly or through the chain), so this line runs BEFORE its exports are initialised.`);
  }
  console.error("\nIn the production bundle this is `ReferenceError: Cannot access '…' before initialization` at load, and the app");
  console.error("never mounts (the 2026-10-23 outage). Move the read inside the component, hook or handler that uses it — it runs at");
  console.error("render time, after every module has evaluated. An annotated view (`const X: T = COREX`) goes in the body, not at the top.");
  process.exit(1);
}

console.log(`${GUARD}: ok — replayed ${bodiesRun} module bodies over ${edges} static edges (${backEdges} back-edges, ${dyn} dynamic boundaries); ` +
  `${readsExamined} module-scope import reads examined, ${safeHoisted.length} of an in-progress module were hoisted functions, none a value.`);

// INJECTION CASES — scripts/oneoff/inject-module-scope-core-read-cases.mjs runs them; each must
// fail naming its own defect. In words:
//   1  hoist `const HOIST = SKILLS;` above VouchCard's function     -> FAILS naming VouchCard.tsx + SKILLS (the outage)
//   2  hoist `const HOIST = vouchRated;` (a hoisted function)       -> MUST PASS: exists from instantiation
//   3  `export default function VouchCard(p, _d = SKILLS)`          -> MUST PASS: a default parameter runs at call time
//   4  the same read in a component core does NOT import back      -> MUST PASS: core has finished by then
//   5  `const X = (() => SKILLS)();` at module scope                -> KNOWN MISS: the read is one call away
