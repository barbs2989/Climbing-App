#!/usr/bin/env node
// check:no-nul — no source file may hold a LITERAL NUL byte.
//
// Git classifies a file containing NUL as BINARY. The whole file then renders in a pull request as
// `Bin 0 -> 12464 bytes`, or as +0/-0, and nobody can read the diff. THE CODE IS USUALLY CORRECT,
// which is exactly why nothing catches it: NUL is the right composite-key separator and the right
// hold-aside sentinel precisely because it cannot occur in the data. The cost is to REVIEW, and
// review is what this repo runs on — every guard here exists because somebody read a diff.
//
// #1210 shipped `fix-approach-variants-working-language.mjs` with four of them, on a change whose
// entire risk was that a mechanical transform might damage good prose. #1213 fixed that one file.
// IT WAS ONE OF FOUR: main still carried three more, and a fifth arrived the next day in a
// different file by a different route — a `.join(" \x00 ")` where three spaces were intended. An
// instance fixed by hand is not a class closed, which is what this script is for.
//
// The repair is never to remove the NUL: write it as the two-character escape `\x00`. Identical at
// runtime, readable in a diff.
//
// Static — no browser, no DB, no network — so it sits in `npm run build`.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const EXTS = /\.(jsx?|mjs|cjs|tsx?|json|md|sql|ya?ml|html|css|txt|sh)$/;

const files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n").filter((f) => f && EXTS.test(f));

// Fails CLOSED. The healthy output of this guard is "nothing found", which is also what a broken
// walk prints — the failure mode `guard-sources.mjs` exists to stop.
if (files.length < 500) {
  console.error(`check:no-nul FAILED — only ${files.length} source file(s) found; a broken walk, not a small repo.`);
  process.exit(1);
}

const NUL = 0;
const hits = [];
for (const f of files) {
  let buf;
  try { buf = readFileSync(ROOT + f); } catch { continue; }   // deleted between ls-files and here
  let n = 0, first = -1;
  for (let i = 0; i < buf.length; i++) if (buf[i] === NUL) { n++; if (first < 0) first = i; }
  if (n) {
    const line = buf.subarray(0, first).toString("utf8").split("\n").length;
    const src = buf.toString("utf8").split("\n")[line - 1] || "";
    hits.push({ f, n, line, src: src.replace(/\0/g, "<NUL>").trim().slice(0, 110) });
  }
}

// This script NAMES the byte it forbids, and must not contain one. That it passes on itself is the
// cheapest possible self-test, and it is asserted rather than assumed.
const self = readFileSync(new URL(import.meta.url)).includes(NUL);
if (self) { console.error("check:no-nul FAILED — the guard itself holds a literal NUL. Write it as an escape."); process.exit(1); }

if (!hits.length) {
  console.log(`check:no-nul: ok — ${files.length} source files, none holding a literal NUL byte.`);
  process.exit(0);
}

console.error(`check:no-nul: ${hits.length} source file(s) hold a literal NUL byte, so git treats them as BINARY`);
console.error(`and their diffs cannot be read:\n`);
for (const h of hits) {
  console.error(`  ${h.f}  (${h.n} NUL, first at line ${h.line})`);
  console.error(`      ${h.src}`);
}
console.error(`\nWrite it as the two-character escape \\x00 instead. Identical at runtime, readable in a diff.`);
console.error(`Do NOT remove the NUL: it is usually the correct separator or sentinel, chosen because it`);
console.error(`cannot occur in the data. The defect is how it is spelled, not that it is there.`);
process.exit(1);

// Injection-tested (scripts/oneoff/inject-nul-byte-cases.mjs):
//   1  a NUL written into a real source file        -> caught, naming the file and line
//   2  the same byte written as the escape \x00     -> PASSES; that is the prescribed repair, and a
//                                                     guard that flagged it would forbid the fix
//   3  the walk narrowed to a handful of files      -> fails closed rather than reporting clean
