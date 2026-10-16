#!/usr/bin/env node
// Injection harness for check:no-nul.
//
// Each case proves its edit LANDED BY CHECKSUM before the guard is judged — the trap this repo has
// hit repeatedly, where a pattern silently fails to match and "guard missed" is reported for a
// guard that was never given the defect. Every file is restored byte-identical afterwards.
//
// CASE 2 MUST PASS, and it is the one that matters: `\x00` written as an escape is the PRESCRIBED
// REPAIR, so a guard that flagged it would forbid its own fix.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const ROOT = new URL("../..", import.meta.url).pathname;
const GUARD = "scripts/check-no-nul-bytes.mjs";
const TARGET = "scripts/oneoff/measure-waypoint-finding-overlap.mjs";
const NUL_CH = String.fromCharCode(0);   // named, never embedded — this harness obeys the rule too

const sum = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);
const read = (f) => readFileSync(ROOT + f, "utf8");
const run = () => {
  try { execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8", stdio: "pipe" }); return { code: 0, out: "" }; }
  catch (e) { return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` }; }
};

const cases = [
  {
    name: "1  a literal NUL in a real source file",
    edit: (s) => s.replace("const seen = new Map();", `const seen = new Map();${NUL_CH}`),
    want: (r) => r.code === 1 && r.out.includes(TARGET),
    why: "must fail, naming the file",
  },
  {
    name: "2  the same byte written as the escape \\x00",
    edit: (s) => s.replace("const seen = new Map();", 'const seen = new Map(); const _x = "\\x00";'),
    want: (r) => r.code === 0,
    why: "must PASS — this is the prescribed repair",
  },
  {
    name: "3  a NUL inside a comment, not a string",
    edit: (s) => s.replace("const seen = new Map();", `// note${NUL_CH}here\nconst seen = new Map();`),
    want: (r) => r.code === 1 && r.out.includes(TARGET),
    why: "must fail — git does not care where the byte is",
  },
];

const original = read(TARGET);
const before = sum(original);
let pass = 0;

const baseline = run();
if (baseline.code !== 0) { console.error(`ABORT — the guard is already failing on a clean tree:\n${baseline.out}`); process.exit(1); }
console.log(`baseline: clean tree passes\n`);

for (const c of cases) {
  const edited = c.edit(original);
  if (sum(edited) === before) { console.log(`?? ${c.name}\n     EDIT NEVER LANDED — fix the case, not the guard\n`); continue; }
  writeFileSync(ROOT + TARGET, edited);
  const r = run();
  writeFileSync(ROOT + TARGET, original);
  if (sum(read(TARGET)) !== before) { console.error(`ABORT — ${TARGET} not restored byte-identically`); process.exit(1); }
  const ok = c.want(r);
  if (ok) pass++;
  console.log(`${ok ? "ok  " : "MISS"} ${c.name}   (${c.why})`);
  if (!ok) console.log(`       exit=${r.code}  ${r.out.split("\n").filter(Boolean)[0] ?? ""}`);
}

// Case 4 needs no file edit: narrow the walk and the guard must fail closed rather than report clean.
{
  const g = read(GUARD);
  const gsum = sum(g);
  const edited = g.replace("if (files.length < 500)", "if (files.length < 999999)");
  if (sum(edited) === gsum) console.log(`?? 4  fail-closed floor\n     EDIT NEVER LANDED`);
  else {
    writeFileSync(ROOT + GUARD, edited);
    const r = run();
    writeFileSync(ROOT + GUARD, g);
    if (sum(read(GUARD)) !== gsum) { console.error("ABORT — guard not restored"); process.exit(1); }
    const ok = r.code === 1 && /broken walk/.test(r.out);
    if (ok) pass++;
    console.log(`${ok ? "ok  " : "MISS"} 4  the walk finds too few files   (must fail closed, never report clean)`);
  }
}

console.log(`\n${pass} of 4 cases behaved as required.`);
process.exitCode = pass === 4 ? 0 : 1;
