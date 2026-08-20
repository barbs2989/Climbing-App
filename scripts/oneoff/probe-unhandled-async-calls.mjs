// Which async calls have NO error handling at all?
//
// The empty-catch sweep asks what the app catches and says nothing about. Its complement is
// what the app never catches: a promise-returning call with no `.catch`, and no enclosing
// try/catch if it is awaited. That is not silence, it is an unhandled rejection — and in a
// click handler it means the button appears to do nothing while an error nobody sees goes to
// the console.
//
// This repo has already shipped that exact shape: CLAUDE.md records the guide dashboard, where
// "the rejection became an unhandled promise and the button did nothing at all", and the
// try/catch that fixed it landed while its toast still could not render.
//
// REPORT-ONLY. A fire-and-forget call whose failure genuinely does not matter is fine, and so
// is one inside a React Query `queryFn` (the library catches it and surfaces `isError`). The
// question per row is whether a USER action is waiting on it.
//
// WHAT IT CANNOT SEE, because the limit was found by running it rather than reasoned about:
// a promise assigned to a VARIABLE and chained somewhere else. PhotoReports.jsx does
//
//     const p = what === "down" ? deleteRoutePhoto(...) : dismissPhotoReport(r.id);
//     Promise.resolve(p).then(...).catch(...).finally(...);
//
// which is correctly handled and which this reports as unhandled, because the `.catch` is on
// `Promise.resolve(p)` rather than on the call. Following that needs dataflow, not an AST walk.
// Both of its findings on lib/*.jsx were this shape — so read every row before believing it.
//
// It also took THREE tightenings to stop being noise, and that is worth recording rather than
// hiding: a prefix heuristic (create|remove|update|send…) matched `createElement`,
// `removeLayer` and `useQueryClient` for 69 false findings of 90; excluding `use[A-Z]` hooks
// helped; and the db-export regex captured `export function` as well as `export async function`,
// so synchronous helpers like `areaSearchTotal` and `isGuideVerified` counted as network calls.
// A proxy wide enough to match anything reports a defect either way.
//
//   node scripts/oneoff/probe-unhandled-async-calls.mjs <file>...
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = process.argv.slice(2);
if (!FILES.length) { console.error("give one or more files"); process.exit(1); }

// Names that go to the network or the database. Derived from lib/db.js's own exports plus the
// fetch/supabase primitives, so a new db function is covered without editing this list.
const dbSrc = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");
const DB_FNS = new Set([...dbSrc.matchAll(/export\s+async\s+function\s+([A-Za-z0-9_]+)/g)].map(m => m[1]));
if (DB_FNS.size < 50) throw new Error(`only ${DB_FNS.size} db exports parsed — the scan is broken, not the file clean`);

// Only the real db exports plus `fetch`. An earlier version added a prefix heuristic
// (create|remove|update|send…) and it matched `createElement`, `removeLayer` and
// `useQueryClient` — 69 of 90 "findings" were noise. A proxy wide enough to match anything
// reports a defect either way, which is the failure this whole sweep exists to avoid.
// Hooks are excluded too: `useX()` returns {data,error} and never rejects.
const isNetworky = name => !/^use[A-Z]/.test(name) && (DB_FNS.has(name) || name === "fetch");

let total = 0;
const findings = [];
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { console.log(`  (skipped ${f}: ${e.message.slice(0, 60)})`); continue; }

  traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      const name = c.type === "Identifier" ? c.name
        : (c.type === "MemberExpression" && c.property && c.property.name) || null;
      if (!name || !isNetworky(name)) return;
      total++;

      // Handled if: awaited inside a try, or the chain ends in .catch, or it is returned from a
      // queryFn (React Query owns the rejection then).
      const awaited = p.parentPath && p.parentPath.isAwaitExpression();
      const inTry = !!p.findParent(x => x.isTryStatement());
      let chained = false;
      let q = p.parentPath;
      while (q && (q.isMemberExpression() || q.isCallExpression())) {
        const cc = q.node.callee;
        if (cc && cc.type === "MemberExpression" && cc.property && /^(catch)$/.test(cc.property.name)) { chained = true; break; }
        q = q.parentPath;
      }
      // A queryFn body — the enclosing property is named queryFn/mutationFn.
      const inQuery = !!p.findParent(x => x.isObjectProperty() &&
        x.node.key && /^(queryFn|mutationFn)$/.test(x.node.key.name || ""));

      if ((awaited && inTry) || chained || inQuery) return;
      findings.push({ file: f, line: p.node.loc.start.line, name, awaited,
        text: src.slice(p.node.start, Math.min(src.length, p.node.start + 90)).replace(/\s+/g, " ") });
    },
  });
}

const byFile = new Map();
for (const x of findings) {
  if (!byFile.has(x.file)) byFile.set(x.file, []);
  byFile.get(x.file).push(x);
}
for (const [f, list] of byFile) {
  console.log(`\n${f}  (${list.length})`);
  for (const x of list) console.log(`  ${String(x.line).padStart(5)}  ${x.awaited ? "await " : ""}${x.text}`);
}
console.log(`\n${total} network/db call site(s) across ${FILES.length} file(s); ${findings.length} with no handler`);
console.log("\nReport only. Fire-and-forget is sometimes right — the question is whether a user");
console.log("action is waiting on it, because then the button silently does nothing.");
