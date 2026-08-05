#!/usr/bin/env node
// Catches identifiers that are referenced but never bound in any enclosing scope.
//
// This repo has no linter or type checker, and ClimbMatch.jsx is one huge file
// where module-level components sit next to the `App` component that owns most
// of the state. It is easy to write a module-level component that reads a name
// only `App` defines: the build succeeds, and the app blank-screens at runtime
// the moment that component renders. That has now shipped to production twice
// (PR #317's `require("react")`, PR #359's `comments` in `PitchTable`).
//
// Known-but-unfixed violations live in undefined-refs-baseline.json. Anything
// NOT in the baseline fails the build. Baseline entries that no longer occur are
// reported so the baseline can shrink, but never fail.
//
//   node scripts/check-undefined-refs.mjs            # check
//   node scripts/check-undefined-refs.mjs --update   # rewrite the baseline

import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE = path.join(ROOT, "scripts", "undefined-refs-baseline.json");

// Files to scan: the app source, not build output or tooling.
// Every app source file, not just the entry ones. `ClimbMatchCore.jsx` and
// `RouteDetail.jsx` were split out of ClimbMatch.jsx (#497/#508) and this list was
// never updated, so for a week the check that exists to stop production blank screens
// was reading 24% of the app — the other 76%, including the 900KB core, was invisible
// to it. A guard with a hardcoded file list silently narrows every time the code moves.
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "main.jsx"]
  .concat(fs.existsSync(path.join(ROOT, "lib")) ? fs.readdirSync(path.join(ROOT, "lib")).filter(f => /\.jsx?$/.test(f)).map(f => "lib/" + f) : [])
  .filter(f => fs.existsSync(path.join(ROOT, f)));

const GLOBALS = new Set([
  // ECMAScript
  "Array","ArrayBuffer","BigInt","Boolean","DataView","Date","Error","EvalError","Float32Array","Float64Array",
  "Function","Infinity","Int8Array","Int16Array","Int32Array","Intl","JSON","Map","Math","NaN","Number","Object",
  "Promise","Proxy","RangeError","ReferenceError","Reflect","RegExp","Set","String","Symbol","SyntaxError",
  "TypeError","URIError","Uint8Array","Uint8ClampedArray","Uint16Array","Uint32Array","WeakMap","WeakRef","WeakSet",
  "decodeURI","decodeURIComponent","encodeURI","encodeURIComponent","escape","eval","globalThis","isFinite",
  "isNaN","parseFloat","parseInt","undefined","unescape","structuredClone","queueMicrotask",
  // DOM / browser
  "AbortController","AbortSignal","Blob","CanvasRenderingContext2D","CustomEvent","DOMParser","Document",
  "Element","Event","EventTarget","File","FileReader","FormData","HTMLElement","Headers","Image","Audio",
  "IDBKeyRange","IntersectionObserver","MutationObserver","Node","Notification","ReadableStream","Request","ResizeObserver",
  "Response","Storage","TextDecoder","TextEncoder","URL","URLSearchParams","WebSocket","Window","Worker",
  "XMLHttpRequest","alert","atob","btoa","cancelAnimationFrame","clearInterval","clearTimeout","confirm",
  "console","crypto","document","fetch","getComputedStyle","history","indexedDB","localStorage","location",
  "matchMedia","navigator","performance","prompt","requestAnimationFrame","screen","sessionStorage",
  "setInterval","setTimeout","window",
  // Node (used by scripts / SSR-ish guards)
  "process","Buffer","__dirname","__filename","module","exports","require","global",
]);

function ownerOf(nodePath) {
  const fn = nodePath.getFunctionParent();
  if (!fn) return "(module scope)";
  return fn.node.id?.name || fn.parentPath?.node?.id?.name || fn.parentPath?.node?.key?.name || "(anonymous)";
}

function scan() {
  const found = new Map(); // key -> {file, name, owner, line}
  for (const rel of FILES) {
    const abs = path.join(ROOT, rel);
    const code = fs.readFileSync(abs, "utf8");
    let ast;
    try {
      ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
    } catch (e) {
      console.error(`\n  Could not parse ${rel}: ${e.message}\n`);
      process.exit(1);
    }
    traverse(ast, {
      ReferencedIdentifier(p) {
        const name = p.node.name;
        if (GLOBALS.has(name)) return;
        // `arguments` is bound inside every non-arrow function but has no Babel binding,
        // so it reads as undefined. Not added to GLOBALS: inside an ARROW function it
        // really is unbound, and that is a genuine bug worth keeping catchable.
        if (name === "arguments") {
          const fn = p.getFunctionParent();
          if (fn && fn.node.type !== "ArrowFunctionExpression") return;
        }
        if (p.scope.hasBinding(name, { noGlobals: true })) return;
        const owner = ownerOf(p);
        const key = `${rel} :: ${name} :: ${owner}`;
        if (!found.has(key)) found.set(key, { file: rel, name, owner, line: p.node.loc?.start.line });
      },
    });
  }
  return found;
}

const found = scan();

if (process.argv.includes("--update")) {
  const out = [...found.keys()].sort();
  fs.writeFileSync(BASELINE, JSON.stringify({ note: "Known undefined references awaiting a fix. Shrink this list; never grow it.", allowed: out }, null, 2) + "\n");
  console.log(`Baseline updated: ${out.length} known reference(s).`);
  process.exit(0);
}

const baseline = new Set(
  fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, "utf8")).allowed : []
);

const added = [...found.entries()].filter(([k]) => !baseline.has(k));
const cleared = [...baseline].filter(k => !found.has(k));

if (cleared.length) {
  console.log(`\n${cleared.length} baseline entr${cleared.length === 1 ? "y is" : "ies are"} now fixed — prune with 'npm run check:refs -- --update':`);
  for (const k of cleared) console.log(`  - ${k}`);
}

if (!added.length) {
  console.log(`\nNo new undefined references. (${baseline.size - cleared.length} known, awaiting fixes.)\n`);
  process.exit(0);
}

console.error(`\n${added.length} NEW undefined reference(s) — these blank-screen the app at runtime:\n`);
for (const [, v] of added) console.error(`  ${v.file}:${v.line}  '${v.name}' is not defined  (referenced in ${v.owner})`);
console.error(`\nPass it in as a prop, or define it at module scope. If it is genuinely a`);
console.error(`global, add it to GLOBALS in scripts/check-undefined-refs.mjs.\n`);
process.exit(1);
