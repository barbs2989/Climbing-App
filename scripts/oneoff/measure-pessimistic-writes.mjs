#!/usr/bin/env node
// WHICH WRITES MAKE THE CLIMBER WAIT? The census behind the owner's note "Optimistic ui updates".
//
// measure-optimistic-writes-by-handler.mjs asked whether a write's RESULT is handled. This asks
// the other half: when a climber taps, does the screen move BEFORE the server answers
// (optimistic), or only once the promise settles (pessimistic: the setter lives inside the
// write's own .then, after an `await`, or there is no setter and the change waits on a refetch)?
//
// Per write call site it records:
//   before  -- state changes in the enclosing handler that run before the write (not inside the
//              write's .then/.catch, not after an await of it)
//   after   -- state changes inside the write's .then / after its await
//   busy    -- a setter whose argument is literally `true` before the call (a spinner/"Saving…")
// and classes the site OPTIMISTIC (before has a non-busy setter), PESSIMISTIC (only after / only
// busy), or BLIND (no state change found either side -- read it by hand).
//
// Report-only, static: no DB, no browser, no network.
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "EnrichmentPanels.jsx",
  ...fs.readdirSync(path.join(ROOT, "lib")).filter((f) => /\.jsx$/.test(f)).map((f) => "lib/" + f),
  ...fs.readdirSync(path.join(ROOT, "src/components")).filter((f) => /\.tsx?$/.test(f)).map((f) => "src/components/" + f)];

const dbSrc = fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");
const WRITES = new Set([...dbSrc.matchAll(/export\s+async\s+function\s+(\w+)/g)].map((m) => m[1])
  .filter((n) => /^(create|update|delete|add|remove|log|give|revoke|submit|insert|set|mark|ack|unack|invite|claim|verify|upload|approve|save|toggle|join|leave|rsvp|react|send|accept|decline|block|unblock|follow|unfollow|cancel|like|unlike|vote|withdraw|dismiss|pin|unpin|report|request|respond|confirm|reject|edit|post|clear|move|rename|reorder|transfer|upsert|hide|unhide|mute|unmute|flag|resolve|close|reopen|archive|restore)/i.test(n)));
if (WRITES.size < 40) { console.error(`FAIL: only ${WRITES.size} write names parsed from lib/db.js`); process.exit(1); }

const SETTER = /^(patchQueries$|.*Patch$|_?set[A-Z_]|_restore$|_undo|.*[Uu]ndo$|refetch$|invalidate|toast$|showToast$|flash$)/;
const isRefetch = (n) => /refetch|invalidate/i.test(n);
const isToast = (n) => /toast|flash/i.test(n);

function dbWriteName(p, name) {
  const b = p.scope.getBinding(name);
  if (!b || !b.path || !(b.path.isImportSpecifier() || b.path.isImportDefaultSpecifier())) return null;
  const src = String(b.path.parentPath.node.source.value);
  if (!/(^|\/)db(\.js)?$/.test(src)) return null;
  const imported = b.path.node.imported ? b.path.node.imported.name : name;
  return WRITES.has(imported) ? imported : null;
}
function calleeName(q) {
  const c = q.node.callee;
  return c && c.type === "Identifier" ? c.name : c && c.type === "MemberExpression" && c.property && c.property.type === "Identifier" ? c.property.name : null;
}
// The callbacks chained on the write: write(...).then(cb).catch(cb2) -- their nodes.
function chainedCallbacks(p) {
  const cbs = []; let cur = p;
  for (let i = 0; i < 8; i++) {
    const m = cur.parentPath; if (!m || !m.isMemberExpression() || m.node.object !== cur.node) break;
    const call = m.parentPath; if (!call || !call.isCallExpression()) break;
    if (/^(then|catch|finally)$/.test(m.node.property.name)) call.node.arguments.forEach((a) => cbs.push({ kind: m.node.property.name, node: a }));
    cur = call;
  }
  return cbs;
}
function awaited(p) { let cur = p; for (let i = 0; i < 6; i++) { const q = cur.parentPath; if (!q) return null; if (q.isAwaitExpression()) return q; if (q.isCallExpression() || q.isMemberExpression()) { cur = q; continue; } return null; } return null; }

// A LOCAL WRAPPER IS A SETTER TOO. The first run of this census called setRouteRating
// pessimistic: its handler moves the stars through `var _put=function(v){setMyStars(...)}; _put(_next);`
// -- a call named `_put`, which no name test can recognise. Resolve the binding and read its body.
function localSetter(q, n, src) {
  if (q.node.callee.type !== "Identifier") return false;
  const b = q.scope.getBinding(n); if (!b || !b.path) return false;
  const node = b.path.isVariableDeclarator() ? b.path.node.init : b.path.isFunctionDeclaration() ? b.path.node : null;
  if (!node || !/Function/.test(node.type)) return false;
  return /\b_?set[A-Z]\w*\(/.test(src.slice(node.start, node.end));
}
const rows = [];
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx", "typescript"], errorRecovery: true });
  traverse(ast, {
    CallExpression(p) {
      const local = p.node.callee.type === "Identifier" ? p.node.callee.name : null;
      if (!local) return;
      const name = dbWriteName(p, local); if (!name) return;
      const fn = p.getFunctionParent();
      const cbs = chainedCallbacks(p);
      const thenNodes = new Set(cbs.filter((c) => c.kind === "then").map((c) => c.node));
      const catchNodes = new Set(cbs.filter((c) => c.kind !== "then").map((c) => c.node));
      const aw = awaited(p);
      const start = p.node.start;
      const before = [], after = [], onFail = [], busy = [];
      if (fn) fn.traverse({
        CallExpression(q) {
          const n = calleeName(q); if (!n || n === local || !(SETTER.test(n) || localSetter(q, n, src))) return;
          // inside a nested function that is NOT one of this write's callbacks: skip (another handler)
          let inThen = false, inCatch = false, nested = false;
          for (let a = q.parentPath; a && a !== fn; a = a.parentPath) {
            if (thenNodes.has(a.node)) { inThen = true; break; }
            if (catchNodes.has(a.node)) { inCatch = true; break; }
            if (a.isFunction() && !(a.parentPath && a.parentPath.isCallExpression() && SETTER.test(calleeName(a.parentPath) || ""))) { nested = true; }
          }
          if (inThen) { after.push(n); return; }
          if (inCatch) { onFail.push(n); return; }
          if (nested) return;
          if (q.node.start < start) {
            const a0 = q.node.arguments[0];
            if (a0 && a0.type === "BooleanLiteral" && a0.value === true) busy.push(n); else if (!isToast(n)) before.push(n);
          } else if (aw) after.push(n);
          // Not awaited and not in a callback: it runs in the same tick as the call, so the screen
          // has moved before any answer -- leaveGroupRow sets its state just AFTER the call.
          else if (!isToast(n)) before.push(n);
        },
      });
      const cls = before.filter((n) => !isRefetch(n)).length ? "OPTIMISTIC" : (after.length || busy.length) ? "PESSIMISTIC" : "BLIND";
      rows.push({ f, line: p.node.loc.start.line, name, handler: (fn && fn.node.id && fn.node.id.name) || (fn && fn.parentPath && fn.parentPath.node.type === "VariableDeclarator" && fn.parentPath.node.id.name) || "(anon)", cls, before: [...new Set(before)], after: [...new Set(after)], onFail: [...new Set(onFail)], busy: [...new Set(busy)] });
    },
  });
}
const by = (c) => rows.filter((r) => r.cls === c);
console.log(`${rows.length} write call sites across ${FILES.length} files: ${by("OPTIMISTIC").length} optimistic, ${by("PESSIMISTIC").length} pessimistic, ${by("BLIND").length} blind\n`);
for (const c of ["PESSIMISTIC", "BLIND"]) {
  console.log(`=== ${c} ===`);
  for (const r of by(c)) console.log(`${r.f}:${r.line}  ${r.name}  [${r.handler}]  busy=${r.busy.join(",")} after=${r.after.slice(0, 5).join(",")} fail=${r.onFail.slice(0, 3).join(",")}`);
  console.log();
}
if (process.argv.includes("--json")) fs.writeFileSync(process.argv[process.argv.indexOf("--json") + 1], JSON.stringify(rows, null, 1));
// THE ROLLBACK QUESTION, for the optimistic ones: a site whose catch only REFETCHES leaves the guess on
// screen whenever the guess lives in local state copied from a query -- the refetch returns the same
// (structurally shared) data, so the copy effect never re-runs. Read each one.
const weak = by("OPTIMISTIC").filter((r) => !r.onFail.some((n) => !/refetch|invalidate|toast/i.test(n)));
console.log(`=== OPTIMISTIC with no rollback beyond refetch/toast: ${weak.length} ===`);
for (const r of weak) console.log(`${r.f}:${r.line}  ${r.name}  [${r.handler}]  before=${r.before.slice(0, 4).join(",")} fail=${r.onFail.join(",")}`);
