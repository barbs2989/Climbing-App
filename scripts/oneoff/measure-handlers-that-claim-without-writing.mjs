// WHICH HANDLERS CHANGE THE SCREEN, CLAIM SUCCESS, AND WRITE NOTHING?
//
// This is the general form of the "Remove friend" defect (#1563): the handler filtered local state
// and toasted `"<Name> removed from friends"` while `removeConnection` sat imported and called from
// nowhere, so the change never survived a refresh.
//
// FOUR CENSUSES NOW, AND EACH IS BLIND TO THE ONE BEFORE IT:
//   1. unwired READS  -> useCrewListings, a screen that could not find real crews (#1554)
//   2. discovery SURFACES with no hook at all -> Leaderboards
//   3. unwired WRITES -> removeConnection (#1563)
//   4. THIS: a handler that CLAIMS, with no write anywhere in it.
//
// CLAUDE.md already records two write audits and both start from a write that EXISTS -- one walks
// every `.catch` on a db call site, the other every `.then`. A handler containing NO db call has
// neither, so it is outside both by construction. Same for the guards: check:writes needs a
// failure to be unobservable and check:claims needs a session-gated write; a toast in front of no
// write at all satisfies both.
//
// REPORT-ONLY AND NOISY BY DESIGN. Plenty of state is legitimately local -- a filter, a sort, an
// expanded row, a modal -- and plenty of toasts are about something other than persistence. The
// output is a reading list; what makes a row real is that the toast claims a CHANGE TO SHARED DATA
// that a refresh would have to preserve.
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = process.cwd();
const lib = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
// Every db write, plus the alias each is imported under -- `addCrewMember as dbAddCrewMember`.
// Scanning for the raw name alone calls every aliased write absent, which is one of the two bugs
// audit-write-feedback-gaps records from its own first draft.
const writes = new Set([...lib.matchAll(/export async function ([A-Za-z0-9_]+)/g)].map((m) => m[1]));
if (writes.size < 20) { console.error(`FAIL-CLOSED: ${writes.size} writes parsed.`); process.exit(1); }

const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];
for (const e of fs.readdirSync(path.join(ROOT, "lib"))) if (/\.jsx$/.test(e)) FILES.push("lib/" + e);

const rows = [];
let handlers = 0;
for (const rel of FILES) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });

  // alias -> real name, resolved per file from its own import statement
  const alias = {};
  traverse(ast, { ImportDeclaration(p) {
    for (const s of p.node.specifiers)
      if (s.type === "ImportSpecifier" && s.imported && writes.has(s.imported.name)) alias[s.local.name] = s.imported.name;
  }});
  // A LOCAL WRAPPER AROUND A WRITE IS A WRITE, and not resolving one is how this scan reported
  // several correct log/report handlers. `syncLogToDb` is declared in App and calls createClimbLog
  // / updateClimbLog inside itself; a handler calling it persists, and a scan that only knows
  // lib/db.js exports sees no write at all. Closed to a fixpoint, so a wrapper of a wrapper counts.
  const localWriters = new Set();
  const fnBodies = new Map();                 // local function name -> its source text
  traverse(ast, {
    VariableDeclarator(p) {
      if (p.node.id.type !== "Identifier" || !p.node.init) return;
      const t = p.node.init.type;
      if (t !== "ArrowFunctionExpression" && t !== "FunctionExpression") return;
      fnBodies.set(p.node.id.name, src.slice(p.node.init.start, p.node.init.end));
    },
    FunctionDeclaration(p) {
      if (p.node.id) fnBodies.set(p.node.id.name, src.slice(p.node.start, p.node.end));
    },
  });
  const namesWrite = (text) => [...writes, ...Object.keys(alias)].some((w) => new RegExp(`\\b${w}\\s*\\(`).test(text));
  for (let pass = 0; pass < 5; pass++) {
    let grew = false;
    for (const [name, text] of fnBodies) {
      if (localWriters.has(name)) continue;
      if (namesWrite(text) || [...localWriters].some((w) => new RegExp(`\\b${w}\\s*\\(`).test(text))) {
        localWriters.add(name); grew = true;
      }
    }
    if (!grew) break;
  }
  const isWrite = (n) => writes.has(n) || !!alias[n] || localWriters.has(n);

  traverse(ast, {
    "ArrowFunctionExpression|FunctionExpression"(p) {
      // A HANDLER, not any function: it must be the value of an on* JSX attribute or an on* prop.
      const par = p.parentPath;
      const attr = par && par.node.type === "JSXExpressionContainer" && par.parentPath
        && par.parentPath.node.type === "JSXAttribute" ? par.parentPath.node.name.name : null;
      const prop = par && par.node.type === "ObjectProperty" && par.node.key && par.node.key.name;
      const name = attr || prop;
      if (!name || !/^on[A-Z]/.test(name)) return;
      handlers++;

      const body = src.slice(p.node.start, p.node.end);
      if (!/showToast\(/.test(body)) return;               // no claim, nothing to be wrong about
      if (!/\bset[A-Z][A-Za-z0-9_]*\(/.test(body)) return; // no state change, nothing claimed about data

      let wrote = false;
      p.traverse({ CallExpression(q) {
        const c = q.node.callee;
        if (c.type === "Identifier" && isWrite(c.name)) wrote = true;
        if (c.type === "MemberExpression" && c.property && isWrite(c.property.name)) wrote = true;
      }});
      if (wrote) return;

      const toasts = [...body.matchAll(/showToast\(([^;]{0,90})/g)].map((m) => m[1].replace(/\s+/g, " "));
      rows.push({ rel, name, line: src.slice(0, p.node.start).split("\n").length,
        chars: body.length, toasts });
    },
  });
}

console.log(`db writes known (incl. aliases resolved per file): ${writes.size}`);
console.log(`on* handlers examined:                             ${handlers}`);
if (handlers < 50) { console.error("FAIL-CLOSED: too few handlers — the traversal is broken."); process.exit(1); }
console.log(`\nHANDLERS THAT CHANGE STATE AND TOAST, WITH NO DB WRITE: ${rows.length}\n`);
for (const r of rows) console.log(`  ${r.rel}:${r.line}  ${r.name}  (${r.chars} chars)\n      ${r.toasts.join("\n      ")}`);
if (!rows.length) console.log("  (none)");
console.log("\nREAD, DO NOT SWEEP. A row is only a defect when the toast claims a change to SHARED");
console.log("data that a refresh must preserve. Local-only state and non-persistence toasts are fine.");
