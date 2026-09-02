// TWO queryFns ON ONE queryKey. React Query keeps ONE Query object per key; the observer that
// triggers a fetch supplies the body that runs. So two call sites sharing a key but disagreeing on
// what to do with an error, or on an offline fallback, produce whichever behaviour happened to
// fetch -- and every consumer of that key inherits it.
//
// The live case: useStates (line ~540) binds and throws both errors and wraps in
// orOffline(..., offlineStates). useMyHomeStatePath's inner query (line ~192) shares the key
// ["area-children","roots"], DISCARDS both errors, returns [], and has no offline fallback. If that
// body is the one that fetches, a failed read yields [] with isError FALSE -- so statesUnavailable
// stays false and Manage areas tells a climber 46 of 50 states have no catalog. That is the exact
// defect check:outage-copy was written for, re-armed through a second implementation of one query.
//
// Measure the class before deciding whether a detector is warranted.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const REL = "lib/db.js";
const src = fs.readFileSync(path.join(ROOT, REL), "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });

// A queryKey is comparable only when it is a literal-only array — a key holding a variable
// (["route-search", qq, lim]) is per-call and cannot collide the way a constant one does.
function literalKey(node) {
  if (!node || node.type !== "ArrayExpression") return null;
  const parts = [];
  for (const el of node.elements) {
    if (!el) return null;
    if (el.type === "StringLiteral") parts.push(JSON.stringify(el.value));
    else if (el.type === "NumericLiteral") parts.push(String(el.value));
    else return null;                      // dynamic segment — not a constant key
  }
  return "[" + parts.join(",") + "]";
}

const byKey = new Map();
traverse(ast, {
  CallExpression(p) {
    const callee = p.node.callee;
    if (!callee || callee.name !== "useQuery") return;
    const arg = p.node.arguments[0];
    if (!arg || arg.type !== "ObjectExpression") return;
    let key = null, fn = null;
    for (const pr of arg.properties) {
      if (!pr.key) continue;
      if (pr.key.name === "queryKey") key = literalKey(pr.value);
      if (pr.key.name === "queryFn") fn = src.slice(pr.value.start, pr.value.end);
    }
    if (!key || !fn) return;
    const line = p.node.loc.start.line;
    const before = src.slice(0, p.node.start);
    const ex = [...before.matchAll(/(?:export\s+)?function\s+(use\w+)/g)].pop();
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push({ line, fn, owner: ex ? ex[1] : "(unknown)" });
  },
});

const norm = (s) => s.replace(/\s+/g, " ").trim();
let clashes = 0;
for (const [key, uses] of byKey) {
  if (uses.length < 2) continue;
  const bodies = new Set(uses.map((u) => norm(u.fn)));
  if (bodies.size < 2) {
    console.log(`\n${key} — ${uses.length} call sites, IDENTICAL bodies (fine)`);
    continue;
  }
  clashes++;
  console.log(`\n${key} — ${uses.length} call sites with ${bodies.size} DIFFERENT bodies`);
  for (const u of uses) {
    const throws = /throw\s+\w*[Ee]rr/.test(u.fn);
    const offline = /orOffline/.test(u.fn);
    console.log(`   ${REL}:${u.line}  ${u.owner}`);
    console.log(`      throws on error: ${throws ? "yes" : "NO"}   offline fallback: ${offline ? "yes" : "NO"}`);
  }
}
console.log(`\n${byKey.size} constant queryKey(s); ${clashes} carry more than one implementation.`);
if (!byKey.size) console.log("0 keys parsed — the scan is broken, not the file clean.");
