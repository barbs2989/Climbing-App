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

/* SCOPE WAS lib/db.js ALONE, AND THAT WAS A STATED FACT READ AS A GUARANTEE. #1404 was a read in
   `lib/auth.js` — `getProfile` returning `(await …single()).data`, the error discarded — whose
   caller could not tell a failed read from an account with no profile row. A failed Edit-profile
   hydration then wrote seven empty columns over a live row. This file's own header used to record
   that applying its predicate to lib/auth.js finds zero sites: true of the predicate, and not a
   statement about the file.

   Both scopes are DISCOVERED rather than listed, because a hardcoded list is the thing that rots:
     - section 1 walks every lib/ file that touches `supabase` at all;
     - section 2 walks every lib/ file that declares a `useQuery`. Query keys are GLOBAL, so a fork
       across two files is the same defect as a fork inside one, and comparing per-file would miss it.
   Neither list is written down; both fail closed if discovery returns implausibly little. */
const LIB = path.join(ROOT, "lib");
const libFiles = fs.readdirSync(LIB).filter((f) => /\.(js|jsx)$/.test(f)).sort();

function load(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { console.error(`check:read-failures — could not parse ${rel}: ${e.message}`); process.exit(1); }
  return { rel, src, ast };
}

const READ_FILES = [], QUERY_FILES = [];
for (const f of libFiles) {
  const rel = "lib/" + f;
  const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
  if (/\bsupabase\b/.test(text)) READ_FILES.push(rel);
  if (/\buseQuery\s*\(/.test(text)) QUERY_FILES.push(rel);
}

// Fails closed. Discovery returning little is a broken walk, not a clean tree — and lib/db.js is
// the one file whose absence would make every number below meaningless.
if (!READ_FILES.includes("lib/db.js") || !QUERY_FILES.includes("lib/db.js")) {
  console.error("check:read-failures — lib/db.js was not discovered by either scan; the walk is broken");
  process.exit(1);
}
if (READ_FILES.length < 3 || QUERY_FILES.length < 2) {
  console.error(`check:read-failures — discovery found ${READ_FILES.length} read file(s) and ${QUERY_FILES.length} query file(s); too few to be real`);
  process.exit(1);
}
const dbSrc = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
if (dbSrc.length < 10000) { console.error("check:read-failures — lib/db.js is implausibly short; refusing to report on it"); process.exit(1); }

/* Swallows that are correct, each with the reason it is correct. A stale entry — declared but no
   longer a swallow — FAILS, so this cannot rot into a description of code that is gone. Same
   standard as check:field-renders' KNOWN map and audit:terrain's NOT_TERRAIN_EVIDENCE.
   Keyed "file:function" now that the scan spans files, so two same-named exports in different
   files cannot excuse each other. */
const DECLARED = {
  "lib/db.js:claimMyCrewEmailInvites":
    "returns 0 for PGRST202 specifically — an unapplied migration, not a failed query. Degrading " +
    "there is deliberate so the app runs against a database that predates the RPC. Noted as a " +
    "known cost: a broken deploy and an empty invite list are the same number.",
};

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

for (const rel of READ_FILES) {
  const { src, ast } = load(rel);
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
          swallows.push({ file: rel, key: `${rel}:${name}`, name, line: r.node.loc.start.line, empty,
            cond: src.slice(gate.node.test.start, gate.node.test.end).replace(/\s+/g, " ").slice(0, 80) });
        },
      });
    },
  });
}

// Fails closed: if the walk finds no exported functions at all, the parse or the traversal
// broke and "no swallows" would be a false pass, not a clean file.
if (exportedFns < 50) {
  console.error(`check:read-failures — only ${exportedFns} exported function(s) found across ${READ_FILES.length} file(s); the scan is broken, not the files clean`);
  process.exit(1);
}

const undeclared = swallows.filter(s => !(s.key in DECLARED));
const stale = Object.keys(DECLARED).filter(k => !swallows.some(s => s.key === k));

console.log(`check:read-failures — ${exportedFns} exported function(s) across ${READ_FILES.length} file(s), `
  + `${swallows.length} error-swallowing return(s)`);

if (undeclared.length) {
  console.error("\nThese answer a failed read with a value a caller cannot tell from an empty result:");
  for (const s of undeclared) {
    console.error(`  ${s.file}:${s.line}  ${s.name}() returns ${s.empty} when (${s.cond})`);
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

/* SECTION 2 — ONE queryKey, ONE implementation.
 *
 * Section 1 reads a function and asks what IT returns on an error. That is blind to a read whose
 * body is not the one that runs. React Query keeps ONE Query object per key and executes the
 * queryFn belonging to whichever observer triggers the fetch, so two call sites sharing a constant
 * key are interchangeable at runtime — and if either body cannot throw, EVERY consumer of that key
 * can silently receive an empty result with `isError` false.
 *
 * That is section 1's own subject arriving in a shape its predicate cannot express, and it was
 * live: useMyHomeStatePath declared its own body on useStates' key ["area-children","roots"],
 * discarding both errors, returning [], and skipping orOffline. When that body fetched,
 * `statesUnavailable` stayed false and Manage areas claimed 46 of 50 states have no catalog —
 * the defect check:outage-copy exists for, reached around the flag that fixes it.
 *
 * NOT A NEW GUARD, deliberately: measured across this file there were 12 constant keys and exactly
 * ONE clash, and a detector for a class of one is what this repo keeps refusing to build. It is an
 * assertion inside the guard whose subject it already is, costing one traversal and no new file.
 *
 * Only CONSTANT keys are compared. A key holding a variable (["route-search", qq, lim]) is
 * per-call, so two such sites are different queries and flagging them would report correct code. */
function literalKey(node) {
  if (!node || node.type !== "ArrayExpression") return null;
  const parts = [];
  for (const el of node.elements) {
    if (!el) return null;
    if (el.type === "StringLiteral") parts.push(JSON.stringify(el.value));
    else if (el.type === "NumericLiteral") parts.push(String(el.value));
    else return null;
  }
  return "[" + parts.join(",") + "]";
}

/* ACROSS FILES, not per file: a queryKey is global to the QueryClient, so `["states"]` declared in
   lib/db.js and again in an admin panel is ONE Query object and one body wins. Comparing per file
   would report clean on precisely the fork hardest to spot by reading. */
const byKey = new Map();
for (const rel of QUERY_FILES) {
  const { src, ast } = load(rel);
  traverse(ast, {
    CallExpression(p) {
      if (!p.node.callee || p.node.callee.name !== "useQuery") return;
      const arg = p.node.arguments[0];
      if (!arg || arg.type !== "ObjectExpression") return;
      let key = null, fn = null;
      for (const pr of arg.properties) {
        if (!pr.key) continue;
        if (pr.key.name === "queryKey") key = literalKey(pr.value);
        if (pr.key.name === "queryFn") fn = src.slice(pr.value.start, pr.value.end).replace(/\s+/g, " ").trim();
      }
      if (!key || !fn) return;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push({ file: rel, line: p.node.loc.start.line, fn });
    },
  });
}

// Fails closed: parsing no constant keys at all would make every comparison vacuous.
if (!byKey.size) {
  console.error(`check:read-failures — no constant queryKey parsed across ${QUERY_FILES.length} file(s); section 2 is blind, not clean`);
  process.exit(1);
}

const forked = [...byKey.entries()].filter(([, uses]) => new Set(uses.map((u) => u.fn)).size > 1);
if (forked.length) {
  console.error("\nThese queryKeys carry more than one implementation. React Query runs whichever");
  console.error("body the fetching observer supplied, so every consumer of the key inherits it —");
  console.error("and a body that cannot throw hands them an empty result with isError false:");
  for (const [key, uses] of forked) {
    console.error(`  ${key}`);
    for (const u of uses) console.error(`    ${u.file}:${u.line}`);
  }
  console.error("\nCollapse them to one implementation — have one call the other — rather than");
  console.error("making the two bodies match, which only restarts the drift.");
  process.exit(1);
}

/* SECTION 3 — inside a queryFn, a supabase await must BIND `error`.
 *
 * Sections 1 and 2 both need the error to be in scope before they can say anything: section 1 asks
 * what you return when you test it, section 2 asks whether a sibling body throws. A read that never
 * BINDS `error` is invisible to both, and that is not hypothetical — it is how #1404 reached
 * production from lib/auth.js, and how useMyFiledReports could hand the Profile an empty list
 * without throwing, leaving `filedReportsUnavailable` unable to fire for half its failures.
 *
 * Inside a queryFn the rule is exact rather than stylistic: react-query's `isError` is the ONLY
 * channel a query has to report failure, and every xUnavailable flag in this app keys on it. An
 * error discarded there is a failure the UI structurally cannot learn about.
 *
 * CODIFIES WHAT THE FILE ALREADY DID: measured before proposing it, 58 supabase awaits inside a
 * queryFn bound `error` and exactly 1 did not (scripts/oneoff/measure-queryfn-discarded-errors.mjs).
 * That one was fixed rather than exempted, so this rule ships with NO exemption list — and so has
 * nothing that can rot. If a genuine exception ever appears, add the list then, with the reason.
 *
 * Scoped to queryFns deliberately. The same shape before a WRITE is fine: `getSession()` yielding a
 * null uid meets RLS and the write's own error surfaces, so flagging all 15 such sites in this file
 * would report correct work — the failure this repo keeps recording. */
let bindsChecked = 0;
const discarding = [];
for (const rel of QUERY_FILES) {
  const { src, ast } = load(rel);
  traverse(ast, {
    ObjectProperty(p) {
      if (!p.node.key || p.node.key.name !== "queryFn") return;
      p.traverse({
        VariableDeclarator(v) {
          const init = v.node.init;
          if (!init || init.type !== "AwaitExpression") return;
          if (!/supabase/.test(src.slice(init.start, init.end))) return;
          if (v.node.id.type !== "ObjectPattern") return;
          bindsChecked++;
          const keys = v.node.id.properties.map((pr) => pr.key && pr.key.name).filter(Boolean);
          if (keys.includes("error")) return;
          discarding.push({ file: rel, line: v.node.loc.start.line, keys: keys.join(", ") });
        },
      });
    },
  });
}

// Fails closed: finding no destructured supabase await inside any queryFn means the shape moved
// and this section is asserting nothing.
if (bindsChecked < 20) {
  console.error(`check:read-failures — only ${bindsChecked} supabase await(s) examined inside queryFns; section 3 is blind, not clean`);
  process.exit(1);
}

if (discarding.length) {
  console.error("\nThese discard the supabase `error` inside a queryFn, so the failure never reaches");
  console.error("react-query and `isError` stays false — the channel every xUnavailable flag reads:");
  for (const d of discarding) console.error(`  ${d.file}:${d.line}  destructures { ${d.keys} }`);
  console.error("\nBind it and throw. A caller cannot flag an outage it was never told about.");
  process.exit(1);
}

console.log(`ok — every error-swallowing read is declared (${swallows.length} declared, 0 undeclared);`
  + ` ${byKey.size} constant queryKey(s) across ${QUERY_FILES.length} file(s), each with one implementation;`
  + ` ${bindsChecked} supabase await(s) inside a queryFn, all binding \`error\`.`);
