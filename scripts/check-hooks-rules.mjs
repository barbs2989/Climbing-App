#!/usr/bin/env node
// Catches React rules-of-hooks violations: a hook called conditionally, called
// from something that isn't a component or custom hook, or called after an
// early return.
//
// Companion to check-undefined-refs.mjs. Same motivation: no linter or type
// checker here, and the bundler builds these happily. A hook called from an
// event handler throws at click time — and because it is a handler rather than
// render, React does not unmount, so the control just silently does nothing.
// That is exactly how crew chat's "load older messages" button was dead
// (PR #377): it called the useCrewMessages hook inside onClick.
//
//   node scripts/check-hooks-rules.mjs            # check
//   node scripts/check-hooks-rules.mjs --update   # rewrite the baseline

import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = path.join(ROOT, "scripts", "hooks-rules-baseline.json");

const FILES = ["ClimbMatch.jsx", "main.jsx"]
  .concat(fs.existsSync(path.join(ROOT, "lib")) ? fs.readdirSync(path.join(ROOT, "lib")).filter(f => /\.jsx?$/.test(f)).map(f => "lib/" + f) : [])
  .filter(f => fs.existsSync(path.join(ROOT, f)));

const HOOK = /^use[A-Z]/;
// A hook may only be called from a component (Capitalised) or another hook (useX).
const isComponentOrHook = n => !!n && (/^[A-Z]/.test(n) || HOOK.test(n));
// Constructs that make a call conditional / non-top-level within its function.
const BRANCHING = new Set([
  "IfStatement", "ConditionalExpression", "LogicalExpression", "ForStatement",
  "ForOfStatement", "ForInStatement", "WhileStatement", "DoWhileStatement",
  "SwitchCase", "TryStatement", "CatchClause",
]);

const nameOf = p => p.node.id?.name || p.parentPath?.node?.id?.name || p.parentPath?.node?.key?.name || null;

function scan() {
  const found = new Map();
  for (const rel of FILES) {
    const abs = path.join(ROOT, rel);
    let ast;
    try {
      ast = parse(fs.readFileSync(abs, "utf8"), { sourceType: "module", plugins: ["jsx"] });
    } catch (e) {
      console.error(`\n  Could not parse ${rel}: ${e.message}\n`);
      process.exit(1);
    }
    traverse(ast, {
      CallExpression(p) {
        const c = p.node.callee;
        const hook = c.type === "Identifier" ? c.name
          : (c.type === "MemberExpression" && c.object.type === "Identifier" && c.object.name === "React" ? c.property.name : null);
        if (!hook || !HOOK.test(hook)) return;

        const fn = p.getFunctionParent();
        const owner = fn ? nameOf(fn) : null;
        const line = p.node.loc.start.line;
        const add = why => {
          const key = `${rel} :: ${hook} :: ${owner || "(anonymous)"} :: ${why}`;
          if (!found.has(key)) found.set(key, { file: rel, line, hook, owner: owner || "(anonymous)", why });
        };

        // 1. called inside a branch / loop / try
        let a = p.parentPath;
        while (a && a !== fn) {
          if (BRANCHING.has(a.node.type)) { add(`called inside ${a.node.type}`); break; }
          a = a.parentPath;
        }
        // 2. called from something that is not a component or custom hook
        if (!isComponentOrHook(owner)) add("called outside a component or custom hook");
        // 3. called after an early return in the same function body
        if (fn && fn.node.body?.type === "BlockStatement") {
          const body = fn.node.body.body;
          const ret = body.find(s => s.type === "ReturnStatement");
          if (ret && line > ret.loc.end.line) add("called after an early return");
        }
      },
    });
  }
  return found;
}

const found = scan();

if (process.argv.includes("--update")) {
  const out = [...found.keys()].sort();
  fs.writeFileSync(BASELINE, JSON.stringify({ note: "Known rules-of-hooks violations awaiting a fix. Shrink this list; never grow it.", allowed: out }, null, 2) + "\n");
  console.log(`Baseline updated: ${out.length} known violation(s).`);
  process.exit(0);
}

const baseline = new Set(fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")).allowed : []);
const added = [...found.entries()].filter(([k]) => !baseline.has(k));
const cleared = [...baseline].filter(k => !found.has(k));

if (cleared.length) {
  console.log(`\n${cleared.length} baseline entr${cleared.length === 1 ? "y is" : "ies are"} now fixed — prune with 'npm run check:hooks -- --update':`);
  for (const k of cleared) console.log(`  - ${k}`);
}

if (!added.length) {
  console.log(`\nNo new rules-of-hooks violations. (${baseline.size - cleared.length} known, awaiting fixes.)\n`);
  process.exit(0);
}

console.error(`\n${added.length} NEW rules-of-hooks violation(s):\n`);
for (const [, v] of added) console.error(`  ${v.file}:${v.line}  ${v.hook}()  ${v.why}  (in ${v.owner})`);
console.error(`\nHooks may only run during render, from a component or another hook.`);
console.error(`To load data from an event handler, call a plain async function instead —`);
console.error(`see fetchCrewMessages in lib/db.js for the pattern.\n`);
process.exit(1);
