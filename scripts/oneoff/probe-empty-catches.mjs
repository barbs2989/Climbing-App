// Which failures does the app catch and then say nothing about?
//
// The lib/ sweep found three reads that answered a database error with []. The app-layer
// analogue is an empty catch: the failure is caught, so nothing crashes and no guard fires, and
// the user is told nothing at all. `check:writes` covers the WRITE side — no success message in
// front of an unobservable failure — and says nothing about a failure that produces silence.
//
// An empty catch is NOT automatically wrong, and this is report-only for that reason. Plenty
// are correct: a best-effort cache warm, an analytics ping, a cleanup on unmount. What matters
// is whether the user asked for something and got no answer — the shape recorded in
// `where-the-app-says-nothing-back`.
//
//   node scripts/oneoff/probe-empty-catches.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = process.argv.slice(2).length ? process.argv.slice(2)
  : ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

// A handler that does nothing observable. A single `console.*` still counts as empty from the
// user's point of view — nobody has the console open on a phone.
function isSilent(fn, src) {
  if (!fn) return false;
  const body = fn.body;
  if (!body) return false;
  if (body.type !== "BlockStatement") return false;           // an expression body does something
  const stmts = body.body.filter(s => s.type !== "EmptyStatement");
  if (!stmts.length) return true;
  const text = src.slice(body.start, body.end);
  // Only console noise, or only a flag reset, is still silent to the user.
  return stmts.every(s => {
    const t = src.slice(s.start, s.end);
    return /^console\.\w+\(/.test(t.trim()) || /^\/\//.test(t.trim());
  }) && !/showToast|setErr|setError|alert\(/.test(text);
}

let total = 0;
const findings = [];
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { console.log(`  (skipped ${f}: ${e.message.slice(0, 60)})`); continue; }

  traverse(ast, {
    // .catch(fn)
    CallExpression(p) {
      const c = p.node.callee;
      if (!c || c.type !== "MemberExpression" || !c.property || c.property.name !== "catch") return;
      const fn = p.node.arguments[0];
      if (!fn || (fn.type !== "ArrowFunctionExpression" && fn.type !== "FunctionExpression")) return;
      total++;
      if (!isSilent(fn, src)) return;
      // What was being awaited? The receiver's text is the best short label available.
      const recv = src.slice(c.object.start, c.object.end).replace(/\s+/g, " ");
      findings.push({ file: f, line: p.node.loc.start.line, what: recv.slice(0, 120) });
    },
    // try { … } catch (e) { }
    TryStatement(p) {
      const h = p.node.handler;
      if (!h) return;
      total++;
      const stmts = h.body.body.filter(s => s.type !== "EmptyStatement");
      const text = src.slice(h.body.start, h.body.end);
      const silent = !stmts.length ||
        (stmts.every(s => /^console\.\w+\(/.test(src.slice(s.start, s.end).trim())) &&
         !/showToast|setErr|setError|alert\(/.test(text));
      if (!silent) return;
      const tryText = src.slice(p.node.block.start, p.node.block.end).replace(/\s+/g, " ");
      findings.push({ file: f, line: p.node.loc.start.line, what: `try { ${tryText.slice(1, 110)}` });
    },
  });
}

const byFile = new Map();
for (const x of findings) {
  if (!byFile.has(x.file)) byFile.set(x.file, []);
  byFile.get(x.file).push(x);
}
for (const [f, list] of byFile) {
  console.log(`\n${f}  (${list.length} silent of the file's handlers)`);
  for (const x of list) console.log(`  ${String(x.line).padStart(5)}  ${x.what}`);
}

console.log(`\n${total} error handler(s) across ${FILES.length} files; ${findings.length} say nothing to the user`);
console.log("\nReport only. An empty catch is often correct — a best-effort warm, a cleanup, an");
console.log("optimistic update that has already been rolled back. The question per row is whether");
console.log("the USER asked for something and got no answer.");
