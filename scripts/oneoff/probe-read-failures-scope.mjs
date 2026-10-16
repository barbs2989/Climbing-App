#!/usr/bin/env node
// check:read-failures scans ONE file. Five do reads. What does its rule say about the other four?
//
// The guard's own header explains why the class matters: a caller catches, state stays [], every
// render tests !x.length, and loaded-and-empty is indistinguishable from never-loaded. Nothing
// lies; the truth never arrives. That reasoning is about READS, not about lib/db.js — the file
// list is an artifact of where the defect was found, and #547 records what happens when a guard's
// file list stops matching the app (check:refs read 24% of the codebase for a week).
//
// This applies the guard's OWN predicate — lifted from scripts/check-read-failures.mjs rather than
// re-typed, because a copy would agree with itself whatever the guard did — to every file that
// talks to PostgREST, Supabase or IndexedDB.
import { readFileSync } from "node:fs";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = new URL("../..", import.meta.url).pathname;

/* Lifted from the guard with ANCHOR LOST, so the two cannot drift on what "empty" means. */
const guardSrc = readFileSync(ROOT + "scripts/check-read-failures.mjs", "utf8");
const lift = (head) => {
  const i = guardSrc.indexOf(head);
  if (i < 0) { console.error(`ANCHOR LOST — \`${head}\` is gone from check-read-failures.mjs; nothing below was checked.`); process.exit(1); }
  let d = 0, j = guardSrc.indexOf("{", i);
  for (; j < guardSrc.length; j++) { if (guardSrc[j] === "{") d++; else if (guardSrc[j] === "}") { d--; if (!d) break; } }
  return guardSrc.slice(i, j + 1);
};
const { isEmptyish, testsAnError } = new Function(
  `${lift("function isEmptyish(node)")}\n${lift("function testsAnError(test)")}\nreturn {isEmptyish,testsAnError};`)();

const FILES = ["lib/db.js", "lib/auth.js", "lib/offline.js", "lib/fire.js", "lib/mapKit.jsx"];
let totalFns = 0;
const found = [];

for (const f of FILES) {
  let src, ast;
  try { src = readFileSync(ROOT + f, "utf8"); } catch { console.log(`(missing) ${f}`); continue; }
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { console.error(`FAIL — could not parse ${f}: ${String(e.message).slice(0, 90)}`); process.exit(1); }

  let fns = 0;
  traverse(ast, {
    Function(p) {
      let exported = false, name = (p.node.id && p.node.id.name) || null;
      let q = p;
      while (q) {
        if (q.isExportNamedDeclaration() || q.isExportDefaultDeclaration()) { exported = true; break; }
        if (q.isVariableDeclarator() && q.node.id && q.node.id.name && !name) name = q.node.id.name;
        q = q.parentPath;
      }
      if (!exported || !name) return;
      fns++;
      p.traverse({
        Function(inner) { inner.skip(); },
        ReturnStatement(r) {
          const gate = r.findParent((x) => x.isIfStatement());
          if (!gate || !testsAnError(gate.node.test)) return;
          const empty = isEmptyish(r.node.argument);
          if (!empty) return;
          found.push({ f, name, line: r.node.loc.start.line, empty,
            cond: src.slice(gate.node.test.start, gate.node.test.end).replace(/\s+/g, " ").slice(0, 70) });
        },
      });
    },
  });
  totalFns += fns;
  console.log(`${f.padEnd(18)} ${String(fns).padStart(3)} exported function(s)  ${f === "lib/db.js" ? "<- the only file the guard scans" : ""}`);
}

if (!totalFns) { console.error("FAIL — zero exported functions across all files; the scan broke."); process.exit(1); }
console.log(`\n${found.length} site(s) answer an error with an empty value:\n`);
for (const s of found) {
  console.log(`  ${s.f}:${s.line}  ${s.name}() returns ${s.empty} when (${s.cond})${s.f === "lib/db.js" ? "   [already in the guard's scope]" : "   ** OUTSIDE THE GUARD **"}`);
}
