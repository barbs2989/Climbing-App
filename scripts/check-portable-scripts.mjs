#!/usr/bin/env node
import { fileURLToPath } from "node:url";
// check:portable-scripts — no script may use one of the four spellings that work on macOS and
// Linux and break on Windows.
//
// Every guard here was written on a Mac. The first `npm run build` on a Windows machine
// (2026-11-04) failed 92 of 122 build guards before checking anything, from three spellings:
//
//   1. `new URL("..", import.meta.url).pathname` as a FILE PATH. On Windows that is "/C:/Users/…",
//      which no filesystem call accepts: git spawned with it as cwd reported ENOENT, readFileSync
//      found nothing. 164 scripts. Write `fileURLToPath(new URL("..", import.meta.url))`.
//   2. `spawn("npx", …)` / `execFileSync("npm", …)`. On Windows those are .cmd batch files, which
//      Node will neither find by the bare name nor (since CVE-2024-27980) spawn without a shell —
//      and a shell would re-split the SQL and paths the guards pass. 150 scripts. Use
//      `NPX, [...NPX_PRE, …]` / `NPM, [...NPM_PRE, …]` from scripts/lib/npx.mjs.
//   3. `await import(somePath)` with a computed path. On Windows an absolute path starts "C:",
//      which the ESM loader reads as a URL scheme (ERR_UNSUPPORTED_ESM_URL_SCHEME). 100 sites.
//      Wrap it: `await import(fileHref(somePath))` from scripts/lib/file-href.mjs, or pass a
//      `pathToFileURL(…).href`.
//   4. A literal home-directory path, "/Users/<name>/…" or "/home/<name>/…". It names one person's
//      Mac: on Windows, or any other machine, the file is simply not there. audit:summit-pins read
//      its credentials from one and died with ENOENT on its first Windows run (2026-11-04). Use
//      scripts/lib/supabase-env.mjs for credentials, `path.join(os.homedir(), …)` for the rest.
//      scripts/oneoff/ is NOT scanned for this rule: those are finished runs whose paths name job
//      folders that no longer exist — history, not tools.
//
// A fourth class, paths printed or compared with "\" separators, is not checked here: it has no
// single spelling, and the guards that compare paths fail CLOSED on coverage when it happens —
// which is how the first Windows run found it. See docs/guards/infrastructure.md.
//
// Static — no browser, no DB, no network — so it sits in `npm run build`. `--selftest` proves each
// rule still fires on its own bad spelling and stays quiet on the good one.
import fs from "node:fs";
import path from "node:path";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const GUARD = "check:portable-scripts";

// Comments are stripped first: scripts/lib/npx.mjs and this file DESCRIBE the bad spellings, and a
// scan that read comments would fail on its own documentation. `(^|[^:])` so "https://" survives.
// Block comments keep their newlines, so a reported line is the file's line.
const strip = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  .split("\n").map((l) => l.replace(/(^|[^:])\/\/.*$/, "$1")).join("\n");

const RULES = [
  {
    name: "import.meta.url .pathname used as a file path",
    re: /import\.meta\.url\s*\)\s*\.pathname\b/g,
    fix: "fileURLToPath(new URL(…, import.meta.url))",
  },
  {
    name: "npx/npm spawned by bare name",
    re: /\b(?:spawn|spawnSync|execFile|execFileSync)\(\s*["'`](?:npx|npm)["'`]/g,
    fix: "NPX, [...NPX_PRE, …] (or NPM, [...NPM_PRE, …]) from scripts/lib/npx.mjs",
  },
  {
    name: "import() of a computed path",
    // A literal specifier ("node:fs", "./x.mjs") is fine; so is anything already wrapped. `${` and
    // `?` open template text and regex groups ("→ import(${x})", /import(?:ed)?/), and `s)` is
    // prose ("3 import(s) resolve to no file") — none of them is an argument.
    re: /(?<![\w$.])import\(\s*(?!["'`]|fileHref\(|pathToFileURL\(|require\("node:url"\)\.pathToFileURL\(|\)|\$\{|\?|s\))[^)]/g,
    fix: "import(fileHref(p)) from scripts/lib/file-href.mjs, or import(pathToFileURL(p).href)",
  },
  {
    name: "a literal home-directory path (one person's machine)",
    re: /["'`]\/(?:Users|home)\/[A-Za-z0-9_.-]+\//g,
    fix: "scripts/lib/supabase-env.mjs for credentials; path.join(os.homedir(), …) otherwise",
    skip: (rel) => rel.startsWith("scripts/oneoff/"),
  },
];

function findings(code, rel = "") {
  const out = [];
  for (const r of RULES) if (!r.skip?.(rel)) for (const m of code.matchAll(r.re)) out.push({ rule: r, line: code.slice(0, m.index).split("\n").length });
  return out;
}

if (process.argv.includes("--selftest")) {
  const cases = [
    ['const R = new URL("..", import.meta.url).pathname;', 0],
    ['const R = fileURLToPath(new URL("..", import.meta.url));', null],
    ['execFileSync("npx", ["esbuild"]);', 1],
    ['spawn(NPX, [...NPX_PRE, "vite"]);', null],
    ['const m = await import(out + "?t=1");', 2],
    ['const m = await import(fileHref(out));', null],
    ['const m = await import("node:fs");', null],
    ['// spawn("npx", [...]) in a comment', null],
    ['readFileSync("/Users/someone/dev/Climbing-App/.env.local");', 3],
    ['const D = path.join(os.homedir(), "dev", "mp-fresh");', null],
  ];
  let bad = 0;
  for (const [src, want] of cases) {
    const got = findings(strip(src));
    const ok = want === null ? got.length === 0 : got.length === 1 && got[0].rule === RULES[want];
    if (!ok) { bad++; console.error(`SELF-TEST FAIL — ${JSON.stringify(src)}: wanted ${want === null ? "nothing" : RULES[want].name}, got ${got.map((g) => g.rule.name).join(", ") || "nothing"}`); }
  }
  if (bad) process.exit(1);
  console.log(`${GUARD} self-test: ${cases.length} cases, each rule fires on its bad spelling and not on its fix.`);
  process.exit(0);
}

const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (/\.(mjs|cjs|js)$/.test(e.name)) files.push(p);
  }
})(path.join(ROOT, "scripts"));

// Fails CLOSED: "nothing found" is also what a broken walk prints.
if (files.length < 300) { console.error(`${GUARD} FAILED — only ${files.length} script(s) found under scripts/; a broken walk, not a small repo.`); process.exit(1); }

const fails = [];
for (const f of files) {
  const rel = path.relative(ROOT, f).split(path.sep).join("/");
  if (rel === "scripts/check-portable-scripts.mjs") continue; // its RULES spell every bad pattern; --selftest covers it
  for (const x of findings(strip(fs.readFileSync(f, "utf8")), rel)) fails.push(`  ${rel}:${x.line}  ${x.rule.name}\n      write: ${x.rule.fix}`);
}
if (fails.length) {
  console.error(`${GUARD} FAILED — ${fails.length} spelling(s) that break on Windows:\n${fails.join("\n")}`);
  process.exit(1);
}
console.log(`${GUARD}: ok — ${files.length} scripts, none roots a path in a URL's .pathname, spawns npx/npm by name, import()s a bare path, or names a home directory.`);
