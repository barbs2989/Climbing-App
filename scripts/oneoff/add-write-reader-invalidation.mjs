#!/usr/bin/env node
// ONE-OFF CODEMOD (2026-10-08) — run once, then delete-or-keep as the record of how the
// reader lists landed. It reads check:write-readers' own failure output, so the writers it
// edits are exactly the ones the guard names, and inserts for each table ONE reader list
// (`const <table>Readers = [[…], …];`) before the table's first writer, plus
// `invalidateKeys(<table>Readers);` before the final `return` of every writer of that table.
// A writer with a return between its write and its last statement is NOT edited; it is
// printed for a hand edit.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = "lib/db.js";

// Readers that fetch through an RPC and so cannot be discovered from `.from("T")`; stated by hand
// where the relation is known. The guard accepts extras without demanding them.
const HAND_EXTRA = {
  vouches: ["my-trust-counts"], belay_catches: ["my-trust-counts"], verification_records: ["my-trust-counts"],
  connections: ["mutual-connections"],
};
// Tables whose writers already use a reader list: patch the list instead of adding a second call.
const EXISTING_LIST = { objectives: "objectiveReaders" };

let out = "";
try { execFileSync("node", [path.join(ROOT, "scripts", "check-write-readers.mjs")], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
const flagged = []; // {line, fn, table, missing[]}
for (const m of out.matchAll(/lib\/db\.js:(\d+) (\w+)\(\) writes (\w+) and does not refresh: (.*)/g)) flagged.push({ line: +m[1], fn: m[2], table: m[3], missing: m[4].split(",").map((s) => s.trim()) });
if (!flagged.length) { console.error("nothing flagged in lib/db.js — nothing to do"); process.exit(1); }

const byTable = new Map();
for (const f of flagged) { if (!byTable.has(f.table)) byTable.set(f.table, { readers: new Set(), writers: [] }); const t = byTable.get(f.table); f.missing.forEach((r) => t.readers.add(r)); t.writers.push(f); }
for (const [t, extra] of Object.entries(HAND_EXTRA)) if (byTable.has(t)) extra.forEach((r) => byTable.get(t).readers.add(r));

const camel = (t) => t.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const src = fs.readFileSync(path.join(ROOT, FILE), "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });

// top-level statements by the line their function starts on
const topByLine = new Map(), listDecl = new Map();
for (const st of ast.program.body) {
  const inner = st.type === "ExportNamedDeclaration" ? st.declaration : st;
  if (!inner) continue;
  if (inner.type === "FunctionDeclaration") topByLine.set(inner.loc.start.line, { st, fn: inner });
  if (inner.type === "VariableDeclaration") for (const d of inner.declarations) { if (d.id && d.init) { topByLine.set(d.loc.start.line, { st, fn: d.init }); listDecl.set(d.id.name, d); } }
}

const edits = []; // {pos, text}
const skipped = [];
for (const [table, info] of byTable) {
  const readers = [...info.readers];
  const listName = EXISTING_LIST[table] || camel(table) + "Readers";
  if (EXISTING_LIST[table]) {
    // append the missing names inside the helper's returned array literal
    const d = listDecl.get(listName); if (!d) { console.error(`no helper ${listName}`); process.exit(1); }
    const arr = d.init.type === "ArrowFunctionExpression" ? d.init.body : d.init;
    const have = new Set(arr.elements.map((e) => e.elements[0].value));
    const add = readers.filter((r) => !have.has(r));
    if (add.length) edits.push({ pos: arr.end - 1, text: ", " + add.map((r) => `["${r}"]`).join(", ") });
    continue;
  }
  // one list before the table's first writer (above its leading comment block)
  const first = info.writers.slice().sort((a, b) => a.line - b.line)[0];
  const top = topByLine.get(first.line); if (!top) { console.error(`no top-level statement at ${FILE}:${first.line} (${first.fn})`); process.exit(1); }
  const anchor = top.st.leadingComments && top.st.leadingComments.length ? top.st.leadingComments[0].start : top.st.start;
  const lineStart = src.lastIndexOf("\n", anchor - 1) + 1;
  edits.push({ pos: lineStart, text: `// Every cached reader of ${table}, refreshed after each write to it (check:write-readers).\nconst ${listName} = [${readers.map((r) => `["${r}"]`).join(", ")}];\n` });
  for (const w of info.writers) {
    const top2 = topByLine.get(w.line); if (!top2) { console.error(`no top-level statement at ${FILE}:${w.line}`); process.exit(1); }
    const fn = top2.fn; const body = fn.body;
    if (!body || body.type !== "BlockStatement") { skipped.push(`${w.fn}:${w.line} (expression body)`); continue; }
    const stmts = body.body; const last = stmts[stmts.length - 1];
    // a return that is not the final statement, after the first write, means a path the single insert would miss
    let firstWrite = Infinity, strayReturn = false;
    const walk = (n, inFn) => {
      if (!n || typeof n.type !== "string") return;
      if (n.type === "CallExpression" && n.callee.type === "MemberExpression" && ["insert", "update", "delete", "upsert"].includes(n.callee.property.name)) firstWrite = Math.min(firstWrite, n.start);
      if (n.type === "ReturnStatement" && !inFn && n !== last && n.start > firstWrite) strayReturn = true;
      for (const k of Object.keys(n)) { if (k === "loc" || k === "leadingComments" || k === "trailingComments") continue; const v = n[k]; const nested = inFn || /Function/.test(n.type) && n !== fn; if (Array.isArray(v)) v.forEach((c) => walk(c, nested)); else if (v && typeof v.type === "string") walk(v, nested); }
    };
    for (const s of stmts) walk(s, false);
    if (strayReturn) { skipped.push(`${w.fn}:${w.line} (return before the end, after the write)`); continue; }
    const call = `invalidateKeys(${listName});`;
    if (last.type === "ReturnStatement") { const ls = src.lastIndexOf("\n", last.start - 1) + 1; const indent = src.slice(ls, last.start).match(/^\s*/)[0]; edits.push({ pos: ls, text: indent + call + "\n" }); }
    else { const indent = (src.slice(src.lastIndexOf("\n", last.start - 1) + 1, last.start).match(/^\s*/) || [""])[0]; edits.push({ pos: last.end, text: "\n" + indent + call }); }
  }
}
edits.sort((a, b) => b.pos - a.pos);
let next = src;
for (const e of edits) next = next.slice(0, e.pos) + e.text + next.slice(e.pos);
fs.writeFileSync(path.join(ROOT, FILE), next);
console.log(`edited ${FILE}: ${byTable.size} table(s), ${flagged.length} flagged writer×table pairs, ${edits.length} edit(s)`);
if (skipped.length) { console.log("NOT edited — hand-edit these:"); for (const s of skipped) console.log("  " + s); }
