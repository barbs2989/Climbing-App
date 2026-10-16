#!/usr/bin/env node
// THE 13 WRITES CLAUDE.md RECORDS AS **UNMEASURED**, MEASURED — by resolving the enclosing
// HANDLER instead of a character window.
//
// The write census under `check:outage-copy` closed two directions with a measured zero (an
// optimistic change that survives a failed write; a successful write whose result never reaches
// the screen) and then stopped, in as many words:
//
//   "It also flagged 13 writes with no `.then` and no optimistic update 'before' the call --
//    including `saveObjective`, `addComment` and `createClimbLog`. Every one is a false positive:
//    the optimistic `setUserLists(...)` for `saveObjective` sits ~700 characters earlier on the
//    same physical line, outside the 260-character window the scan used. On a file whose longest
//    line is 58,365 characters, *"before the call"* is not a scope, and answering this properly
//    needs the enclosing HANDLER resolved rather than a window. ... the reason those 13 are
//    recorded as unmeasured rather than as findings."
//
// So the claim on record is "every one is a false positive" WITH the admission that the
// instrument could not tell. That is the shape this repo keeps recording: a plausible mechanism
// nobody measured. This resolves the handler with Babel and asks the question properly.
//
// WHAT IT ASKS, per write call site:
//   1. Is the call's result HANDLED at all (`.then`/`.catch`/`await`/returned)?
//   2. If not, does its enclosing HANDLER contain an optimistic state change -- i.e. did the
//      screen already move, so a silent rejection leaves the climber believing it stuck?
//
// A write with a handler is out of scope: `check:writes` and `check:claims` already govern those.
// The interesting cell is NO handling AND an optimistic setter, because that is the combination
// where the screen has moved and nothing can put it back.
//
// THE SETTER TEST IS DELIBERATELY WIDE, and the census records why: its `set[A-Z]` proxy called
// five genuine reverts unguarded, because this app writes `_setVis(_pv)`, `_setMods(cmod)`,
// `catch(_undoLeave)`, `catch(cmFail)` and `_restore(setCondReports, ...)`. A too-narrow proxy
// MANUFACTURES findings here rather than hiding them -- it would send somebody to "fix" correct
// handlers -- so anything shaped like a state change counts.
//
// Report-only, static: no DB, no browser, no network. Read-only on the tree.
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

// The vocabulary comes from lib/db.js itself, exactly as check:write-feedback derives it, so a
// new write is covered without editing this file. Restating it here would be the second copy
// this repo already records four times over.
const dbSrc = fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");
const WRITES = new Set(
  [...dbSrc.matchAll(/export\s+async\s+function\s+(\w+)/g)]
    .map((m) => m[1])
    .filter((n) => /^(create|update|delete|add|remove|log|give|revoke|submit|insert|set|mark|ack|unack|invite|claim|verify|upload|approve)/i.test(n))
);
// FAIL CLOSED. With an empty set every site below is skipped and the run prints a clean sweep
// having examined nothing -- the exact fail-open check:write-feedback documents in its own header.
if (WRITES.size < 20) {
  console.error(`FAIL: parsed ${WRITES.size} write names from lib/db.js — expected 20+. The vocabulary is matched as`);
  console.error("`export async function <name>`; if db.js moved to `export const x = async () =>` this scan is blind.");
  process.exit(1);
}

// Anything shaped like a state change. Wide on purpose -- see the header.
const SETTER = /^(_?set[A-Z_]|_restore$|_undo|.*[Uu]ndo$|.*[Ff]ail$|refetch$|invalidate)/;

// RESOLVE THE BINDING; A NAME IS NOT THE FUNCTION. The first version of this matched the callee's
// NAME against the db vocabulary and reported 10 `addComment` sites as unhandled writes. Every
// one was a false positive: `ClimbMatch.jsx` declares a LOCAL wrapper
//   const addComment=function(tid,txt){ if(cmOn){ dbAddComment(tid,cmUid,txt).then(cmRefetch).catch(cmFail); return; } setLocalComments(...); }
// so the handling -- including a "Could not save your comment" toast -- lives one level in, and
// the db function is imported under an ALIAS the name test could never see. Same trap CLAUDE.md
// records for `clickable`, where a local boolean shadowed the helper and `check:refs` stayed
// green because the identifier WAS bound. Only scope resolution separates the two.
function dbWriteName(p, name) {
  const binding = p.scope.getBinding(name);
  if (!binding || !binding.path) return null;
  const bp = binding.path;
  if (!bp.isImportSpecifier && !bp.isImportDefaultSpecifier) return null;
  if (!(bp.isImportSpecifier() || bp.isImportDefaultSpecifier())) return null;
  const decl = bp.parentPath;
  const src = decl && decl.node && decl.node.source && decl.node.source.value;
  if (!src || !/(^|\/)db(\.js)?$/.test(src.replace(/\.js$/, "") + (src.endsWith(".js") ? ".js" : ""))) {
    if (!/\bdb\b/.test(String(src))) return null;
  }
  const imported = bp.node.imported ? bp.node.imported.name : name;   // honour the alias
  return WRITES.has(imported) ? imported : null;
}

function handled(p) {
  // `.then(...)`, `.catch(...)`, `await x()`, `return x()` -- any of them means the result is not
  // dropped on the floor. Walk out through the member/call chain the call sits in.
  let cur = p;
  for (let i = 0; i < 6 && cur; i++) {
    const parent = cur.parentPath;
    if (!parent) break;
    if (parent.isAwaitExpression() || parent.isReturnStatement()) return "awaited/returned";
    if (parent.isMemberExpression() && parent.node.property && /^(then|catch|finally)$/.test(parent.node.property.name)) return "." + parent.node.property.name;
    if (parent.isCallExpression() || parent.isMemberExpression()) { cur = parent; continue; }
    // CAPTURED IN A VARIABLE AND HANDLED DOWNSTREAM. The climb-log save reads
    //   var op = existingDbId ? updateClimbLog(...) : createClimbLog(...);
    //   ... op.catch(function(){...}); return op.then(function(row){...});
    // so walking up from the CALL finds a ConditionalExpression and stops. Reporting that as
    // unhandled is a false positive with a comment in the source saying so ("the rejection is
    // still handled downstream"). Follow the binding instead.
    if (parent.isConditionalExpression() || parent.isLogicalExpression()) { cur = parent; continue; }
    if (parent.isVariableDeclarator() && parent.node.id && parent.node.id.type === "Identifier") {
      const b = parent.scope.getBinding(parent.node.id.name);
      if (b && b.referencePaths.some((r) => {
        const rp = r.parentPath;
        return rp && rp.isMemberExpression() && rp.node.property && /^(then|catch|finally)$/.test(rp.node.property.name);
      })) return `via \`${parent.node.id.name}\``;
    }
    break;
  }
  return null;
}

// NON-VACUITY. This reports 0 against the app, and 0 is exactly what a scan that can no longer
// fire prints -- a risk that grew the moment `handled()` learned to follow a variable, since
// every widening of "handled" shrinks what can be reported. So the classifier is exercised on
// four constructed shapes FIRST, and a run that cannot reproduce them refuses to report on the
// app at all. Fixtures rather than the live tree: three of the four shapes do not exist there,
// which is the finding, and a self-test drawn from the code under test cannot show that.
const FIXTURE = `
import { createClimbLog, updateClimbLog } from "./lib/db.js";
function handledThen(){ createClimbLog(1, 2, {}).then(function(r){ return r; }); }
function handledViaVar(){ var op = createClimbLog(1, 2, {}); op.catch(function(){}); return op; }
function bareWithSetter(){ setLogs(function(p){ return p; }); createClimbLog(1, 2, {}); }
function bareNoSetter(){ updateClimbLog(7, {}); }
`;

function scan(label, src) {
  const out = [];
  let n = 0;
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true });
  traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      const local = c && c.type === "Identifier" ? c.name : null;
      if (!local) return;
      const name = dbWriteName(p, local);
      if (!name) return;
      n++;
      if (handled(p)) return;
      const fn = p.getFunctionParent();
      const line = p.node.loc && p.node.loc.start.line;
      if (!fn) { out.push({ f: label, name, handler: "(top level)", setters: [], line }); return; }
      const setters = new Set();
      fn.traverse({
        CallExpression(q) {
          const qc = q.node.callee;
          const qn = qc && qc.type === "Identifier" ? qc.name
            : qc && qc.type === "MemberExpression" && qc.property && qc.property.type === "Identifier" ? qc.property.name
            : null;
          if (qn && qn !== local && SETTER.test(qn)) setters.add(qn);
        },
      });
      out.push({ f: label, name, handler: (fn.node.id && fn.node.id.name) || "(anonymous handler)", setters: [...setters], line });
    },
  });
  return { rows: out, sites: n };
}

const self = scan("fixture", FIXTURE);
const selfBare = self.rows.map((r) => r.handler).sort();
const selfOk = self.sites === 4
  && selfBare.length === 2
  && selfBare[0] === "bareNoSetter" && selfBare[1] === "bareWithSetter"
  && self.rows.find((r) => r.handler === "bareWithSetter").setters.length === 1
  && self.rows.find((r) => r.handler === "bareNoSetter").setters.length === 0;
if (!selfOk) {
  console.error("FAIL (self-test): the classifier does not reproduce its four known shapes, so a");
  console.error("clean report about the app would prove nothing. Saw:");
  console.error(`  sites=${self.sites} (want 4), unhandled=${JSON.stringify(selfBare)} (want bareNoSetter, bareWithSetter)`);
  for (const r of self.rows) console.error(`  ${r.handler}: setters=${JSON.stringify(r.setters)}`);
  process.exit(1);
}
console.log("self-test: 4 shapes, 2 correctly reported unhandled (one with a setter, one without).\n");

// ONE implementation, used for the fixture and the app alike. A second copy of the traversal
// would let the self-test pass while the real scan drifted -- the four-grade-parsers shape.
const rows = [];
let sites = 0;
for (const f of FILES) {
  const r = scan(f, fs.readFileSync(path.join(ROOT, f), "utf8"));
  rows.push(...r.rows);
  sites += r.sites;
}

if (!sites) { console.error("FAIL: zero write call sites found across the app files — broken scan, not a clean app."); process.exit(1); }

const optimistic = rows.filter((r) => r.setters.length);
const silent = rows.filter((r) => !r.setters.length);

console.log(`${sites} write call site(s); ${rows.length} with the result unhandled.\n`);

console.log(`=== ${optimistic.length} unhandled AND the handler moves the screen ===`);
console.log("The census predicted these: the optimistic setter is real and simply sat outside its window.\n");
for (const r of optimistic) console.log(`  ${r.f}:${r.line}  ${r.name}  in ${r.handler}\n      moves: ${r.setters.slice(0, 6).join(", ")}`);

console.log(`\n=== ${silent.length} unhandled AND NO state change in the handler ===`);
console.log("Not automatically a defect: a write whose screen never claimed anything cannot mislead.");
console.log("Read each one and ask whether a control is WAITING on it.\n");
for (const r of silent) console.log(`  ${r.f}:${r.line}  ${r.name}  in ${r.handler}`);

console.log(`\nReport only. What this does NOT ask: whether the optimistic change is later RECONCILED`);
console.log(`by a refetch elsewhere, which would make an unhandled rejection self-correcting.`);
