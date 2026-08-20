#!/usr/bin/env node
// check:read-failures — a failed READ must not be indistinguishable from an empty one.
//
// `check:writes` already forbids a success message in front of a write whose failure is
// unobservable. The read side had no such rule, and on 2026-08-19 three message fetches in
// lib/db.js were found answering a database error with `[]`. Every caller drew a conclusion
// from that emptiness: the two pagers set `crewMsgMore`/`dmMore` false — permanently hiding
// the "load older" control for that chat — and toasted "No earlier messages", while
// `fetchMyDirectMessages` is what renders the Inbox's "No friend chats yet" and invites the
// user to go start a conversation. Each pager already had a `.catch` carrying the right
// wording; the swallow made those branches UNREACHABLE.
//
// That rule now lives in CLAUDE.md as prose, and prose rots — the reason
// check:correction-readers and check:crew-member-readers exist at all. This is the script.
//
// WHAT IT CHECKS, and the narrowness is deliberate: an exported read that answers a PostgREST
// `error` with an empty value must be declared, with a reason. It does NOT attempt the strong
// form — "does anything downstream conclude absence from this emptiness?" — which needs caller
// analysis across two 400kB files and would flag correct guard clauses. A guard that flags
// correct work teaches people to ignore it, which is worse than the hole it closes.
//
// Static. Sits in `npm run build`.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "lib", "db.js");

// Swallows that are correct, each with the reason it is correct. A stale entry — declared but
// no longer a swallow — FAILS, so this cannot rot into a description of code that is gone.
// Same standard as check:field-renders' KNOWN map and audit:terrain's NOT_TERRAIN_EVIDENCE.
const DECLARED = {
  claimMyCrewEmailInvites:
    "returns 0 for PGRST202 specifically — an unapplied migration, not a failed query. Degrading " +
    "there is deliberate so the app runs against a database that predates the RPC. Noted as a " +
    "known cost: a broken deploy and an empty invite list are the same number.",
};

const src = fs.readFileSync(FILE, "utf8");
if (src.length < 10000) { console.error("check:read-failures — lib/db.js is implausibly short; refusing to report on it"); process.exit(1); }

let ast;
try {
  ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
} catch (e) {
  console.error(`check:read-failures — could not parse lib/db.js: ${e.message}`);
  process.exit(1);
}

// An "empty" answer: something a caller reads as "there is nothing", not as "this failed".
// `null` and `undefined` are NOT here — a caller must null-check, so the failure is visible.
function isEmptyish(node) {
  if (!node) return "a bare return";
  if (node.type === "ArrayExpression" && !node.elements.length) return "[]";
  if (node.type === "ObjectExpression" && !node.properties.length) return "{}";
  if (node.type === "StringLiteral" && node.value === "") return '""';
  if (node.type === "NumericLiteral" && node.value === 0) return "0";
  if (node.type === "BooleanLiteral" && node.value === false) return "false";
  return null;
}

// The shape: `if (error) return <empty>` — the error object is in scope and is being discarded.
// Matching the IDENTIFIER rather than the word means a comment explaining this rule cannot
// trip it, the false pass check:ci-cancel records from the other side.
function testsAnError(test) {
  let found = false;
  const walk = n => {
    if (!n || typeof n !== "object" || found) return;
    if (n.type === "Identifier" && /^(error|err|e)$/.test(n.name)) { found = true; return; }
    if (n.type === "MemberExpression") { walk(n.object); walk(n.property); return; }
    for (const k of ["left", "right", "argument", "expressions", "test"]) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk); else walk(v);
    }
  };
  walk(test);
  return found;
}

const swallows = [];
let exportedFns = 0;

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
    exportedFns++;

    p.traverse({
      Function(inner) { inner.skip(); },
      ReturnStatement(r) {
        const gate = r.findParent(x => x.isIfStatement());
        if (!gate || !testsAnError(gate.node.test)) return;
        const empty = isEmptyish(r.node.argument);
        if (!empty) return;
        swallows.push({ name, line: r.node.loc.start.line, empty,
          cond: src.slice(gate.node.test.start, gate.node.test.end).replace(/\s+/g, " ").slice(0, 80) });
      },
    });
  },
});

// Fails closed: if the walk finds no exported functions at all, the parse or the traversal
// broke and "no swallows" would be a false pass, not a clean file.
if (exportedFns < 50) {
  console.error(`check:read-failures — only ${exportedFns} exported function(s) found in lib/db.js; the scan is broken, not the file clean`);
  process.exit(1);
}

const undeclared = swallows.filter(s => !(s.name in DECLARED));
const stale = Object.keys(DECLARED).filter(n => !swallows.some(s => s.name === n));

console.log(`check:read-failures — ${exportedFns} exported function(s), ${swallows.length} error-swallowing return(s)`);

if (undeclared.length) {
  console.error("\nThese answer a failed read with a value a caller cannot tell from an empty result:");
  for (const s of undeclared) {
    console.error(`  lib/db.js:${s.line}  ${s.name}() returns ${s.empty} when (${s.cond})`);
  }
  console.error("\nEither throw the error so the caller's .catch can run, or add the function to");
  console.error("DECLARED in this script with the reason the swallow is correct.");
  process.exit(1);
}

if (stale.length) {
  console.error(`\nSTALE declaration(s) — these no longer swallow, so the recorded reason describes code that is gone:`);
  for (const n of stale) console.error(`  ${n}`);
  process.exit(1);
}

console.log(`ok — every error-swallowing read is declared (${swallows.length} declared, 0 undeclared).`);
