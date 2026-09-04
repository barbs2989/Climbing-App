#!/usr/bin/env node
// check:writes — a database write whose failure is unobservable must not sit behind a
// message telling the user it worked.
//
// The pattern this exists to stop:
//
//     setLogs(p => p.filter(...));                       // optimistic local change
//     showToast("Trip report deleted");                  // told the user it happened
//     deleteClimbLog(row._dbId).catch(function(){});     // ...and swallowed the failure
//
// A rejected write then looks EXACTLY like a successful one. The row comes back on the next
// hydration with no explanation, or the thing the user was told was saved never existed. It
// is the same dishonesty as the fabricated-data bugs — the app asserting something it has
// not verified — and it has been fixed one instance at a time in #548 and #551 without
// anything preventing the next one.
//
// The rule, deliberately narrow so it flags claims rather than style:
//
//   FAIL when a call to a known write in lib/db.js has an EMPTY .catch handler AND the
//   enclosing function also calls showToast.
//
// The `showToast` clause is what keeps this honest. Empty catches on reads and hydration
// (trust scores, message backfill, chunk prefetch) are correct — silence is the right
// behaviour there and a toast would be noise. 53 empty catches existed when this was
// written; only 5 were claims. This flags those 5 and ignores the rest.
//
// Fixing a hit means one of:
//   - revert the optimistic change in the catch and say what happened (what updateCrew does), or
//   - move the toast inside .then so it only fires on success, or
//   - handle the rejection some other visible way.
//
//   node scripts/check-write-feedback.mjs
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertCovered } from "./lib/guard-sources.mjs";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Walk the app source the same way check:zindex does, so a new file is covered the day it
// lands rather than the day someone remembers to add it to a list (#547 fixed exactly that
// gap in check:refs/check:hooks after the monolith split cut them to a quarter of the app).
const SKIP = new Set(["node_modules", "dist", ".git", ".claude", "catalog", "scripts", "supabase", "public"]);
const walk = (dir, out = []) => {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP.has(name) || name.startsWith(".")) continue; // a dot entry is never app source,
    // and a guard temp file that vanishes between this readdir and the stat below would
    // otherwise kill this walk — the guards now run concurrently.
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(name)) out.push(p);
  }
  return out;
};

// The write vocabulary comes from lib/db.js itself, so a new write function is covered
// without editing this file.
const dbSrc = fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");
const WRITES = new Set(
  [...dbSrc.matchAll(/export\s+async\s+function\s+(\w+)/g)]
    .map((m) => m[1])
    .filter((n) => /^(create|update|delete|add|remove|log|give|revoke|submit|insert|set|mark|ack|unack|invite|claim|verify|upload|approve)/i.test(n))
);

// Deriving the vocabulary from db.js is the right design, but it fails open: every check
// below starts with "is the .catch()'d call a known write?", so an EMPTY set makes each
// one return early and the run reports "no write failure is swallowed" having examined
// nothing. That needs only a style change in db.js to happen — the regex matches
// `export async function x`, not `export const x = async () =>`.
if (!WRITES.size) {
  console.error("\ncheck-writes FAILED — no write functions were found in lib/db.js.");
  console.error("The vocabulary is matched as `export async function <name>`; if db.js now");
  console.error("exports writes some other way, this check silently verifies nothing.\n");
  process.exit(1);
}

const isEmptyFn = (n) =>
  n && (n.type === "ArrowFunctionExpression" || n.type === "FunctionExpression") &&
  n.body && n.body.type === "BlockStatement" && n.body.body.length === 0;

const findings = [];
for (const file of assertCovered(walk(ROOT), ROOT, "check:writes")) {
  const src = fs.readFileSync(file, "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"], errorRecovery: true }); }
  catch { continue; }

  traverse(ast, {
    CallExpression(p) {
      // ...().catch(<empty>)
      const callee = p.node.callee;
      if (!callee || callee.type !== "MemberExpression") return;
      if (!callee.property || callee.property.name !== "catch") return;
      if (!isEmptyFn(p.node.arguments[0])) return;

      // is the thing being .catch()'d a known write?
      let write = null;
      p.get("callee").get("object").traverse({
        CallExpression(q) {
          const c = q.node.callee;
          const nm = c && (c.name || (c.property && c.property.name));
          if (nm && WRITES.has(nm)) write = nm;
        },
      });
      // the awaited expression may BE the write call itself
      const objCallee = callee.object && callee.object.callee;
      const direct = objCallee && (objCallee.name || (objCallee.property && objCallee.property.name));
      if (!write && direct && WRITES.has(direct)) write = direct;
      if (!write) return;

      // Does the enclosing function announce success UNCONDITIONALLY?
      //
      // A toast inside a .then callback is correct — it only fires when the write landed:
      //
      //     submitContribution({...}).then(() => showToast("Your GPS track was added")).catch(() => {})
      //
      // That is honest (nothing is claimed on failure) and must not be flagged, so toasts
      // reached only through a .then handler are ignored. Only a toast on the handler's own
      // path is a claim.
      const fn = p.getFunctionParent();
      if (!fn) return;
      const insideThen = (q) => {
        for (let a = q.parentPath; a && a !== fn; a = a.parentPath) {
          const pc = a.parentPath;
          if (pc && pc.isCallExpression() && pc.node.callee.type === "MemberExpression" &&
              pc.node.callee.property && pc.node.callee.property.name === "then" &&
              pc.node.arguments.includes(a.node)) return true;
        }
        return false;
      };
      let toasts = false;
      fn.traverse({
        CallExpression(q) {
          const c = q.node.callee;
          if (!c || (c.name !== "showToast" && !(c.property && c.property.name === "showToast"))) return;
          if (!insideThen(q)) toasts = true;
        },
      });
      if (!toasts) return;

      findings.push({ file: file.slice(ROOT.length + 1), line: p.node.loc.start.line, write });
    },
  });
}

if (!findings.length) {
  console.log("check-writes: ok — no write failure is swallowed behind a success message.");
  process.exit(0);
}
console.log(`\n${findings.length} write(s) report success but discard the failure:\n`);
for (const f of findings) console.log(`  ${f.file}:${f.line}  ${f.write}(...).catch(){}  — the enclosing handler calls showToast`);
console.log(`
Either revert the optimistic change inside .catch and say what happened (see updateCrew),
or move the toast into .then so it only fires when the write actually landed.`);
process.exit(1);
