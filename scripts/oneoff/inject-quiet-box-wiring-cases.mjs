// Injection suite for check:quiet-box-wiring.
//
// The healthy output of that guard is "all 56 are guarded", which is also exactly what a guard
// whose discovery has broken prints. So the cases are the only evidence it can fail at all, and
// each is judged on the guard's OWN failure text rather than on an exit code -- a case that fails
// because the run died for an unrelated reason is not a catch, which this repo has read as one
// twice.
//
// Every case proves its edit LANDED by checksum before the guard is believed. Checksum movement
// proves an edit happened, not that it was the right one, so each case also names the text its
// own failure must carry.
//
//   node scripts/oneoff/inject-quiet-box-wiring-cases.mjs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GUARD = path.join(ROOT, "scripts/check-quiet-box-wiring.mjs");

// A probe with a shebang and one with none, so the suite exercises both shapes the applier met.
const A = path.join(ROOT, "scripts/oneoff/probe-stage-overlap.mjs");          // no shebang
const B = path.join(ROOT, "scripts/oneoff/probe-overlay-clipping.mjs");       // shebang on line 1

const sum = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");

function runGuard() {
  try {
    const out = execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
}

// FAIL LINES ONLY, never the word "FAIL": this guard's prose legitimately contains it, and
// matching the word has already made a correctly-firing guard read as a miss elsewhere here.
const failLines = (out) => out.split("\n").filter((l) => /^\s*(-|FAIL:)/.test(l)).join("\n");

const clean = runGuard();
if (clean.code !== 0) {
  console.error("REFUSING TO RUN — the guard is already failing on a clean tree, so no case would be");
  console.error("attributable. Fix the tree first.\n" + clean.out);
  process.exit(2);
}

const CASES = [
  {
    name: "call-gone",
    why: "the real historical state of 46 of the 56 probes",
    file: A,
    edit: (s) => s.replace(/^assertQuietBox\("probe-stage-overlap\.mjs"\);\n/m, ""),
    expect: "never calls assertQuietBox()",
  },
  {
    name: "import-gone",
    why: "a call with no import throws on every run — louder than being unguarded, and still broken",
    file: A,
    edit: (s) => s.replace('import { assertQuietBox } from "../lib/quiet-box.mjs";\n', ""),
    expect: "without importing it",
  },
  {
    name: "call-after-launch",
    why: "THE case only the ordering check can see: it still refuses, having already paid for Chrome",
    file: B,
    edit: (s) => {
      const call = 'assertQuietBox("probe-overlay-clipping.mjs");\n';
      if (!s.includes(call)) return s;
      const moved = s.replace(call, "");
      const i = moved.search(/const browser = await chromium\.launch|await chromium\.launch/);
      if (i < 0) return s;
      const nl = moved.indexOf("\n", i) + 1;
      return moved.slice(0, nl) + call + moved.slice(nl);
    },
    expect: "AFTER the browser launches",
  },
  {
    name: "wrong-name",
    why: "a copy-paste from a sibling: the refusal blames a probe you are not running. Nothing else reports this",
    file: A,
    edit: (s) => s.replace('assertQuietBox("probe-stage-overlap.mjs")', 'assertQuietBox("probe-overlay-clipping.mjs")'),
    expect: "names a DIFFERENT probe",
  },
  {
    name: "two-calls",
    why: "a merge that kept both halves — one of them is somewhere it should not be",
    file: A,
    edit: (s) => s.replace('assertQuietBox("probe-stage-overlap.mjs");\n',
      'assertQuietBox("probe-stage-overlap.mjs");\nassertQuietBox("probe-stage-overlap.mjs");\n'),
    expect: "calls assertQuietBox() 2 times",
  },
  {
    name: "SILENT-comment-quoting-the-repair",
    why: "the guard's own failure message prescribes this line; firing on a comment that quotes it "
       + "would be a guard failing on its own documentation",
    file: A,
    edit: (s) => s.replace('import { build } from "esbuild";',
      '// Wired per scripts/lib/quiet-box.mjs — the call below is assertQuietBox("probe-stage-overlap.mjs");\nimport { build } from "esbuild";'),
    expect: null,
  },
  {
    name: "SILENT-extra-blank-lines",
    why: "reformatting around the call is ordinary work; a guard pinned to layout forbids touching it",
    file: A,
    edit: (s) => s.replace('assertQuietBox("probe-stage-overlap.mjs");\n',
      '\nassertQuietBox("probe-stage-overlap.mjs");\n\n'),
    expect: null,
  },
];

// STRUCTURAL REFUSAL of an expectation that already appears in the CLEAN run. An expectation
// written against the text an assertion prints when it PASSES reports MISSED against a guard
// firing correctly, and this repo has made that mistake more than once.
for (const c of CASES) {
  if (c.expect && clean.out.includes(c.expect)) {
    console.error(`HARNESS BUG — case "${c.name}" expects ${JSON.stringify(c.expect)}, which already`);
    console.error("appears in the healthy run. It could never distinguish a catch from a pass.");
    process.exit(2);
  }
}

let pass = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  const after = c.edit(before);
  if (after === before) {
    console.log(`HARNESS BUG  ${c.name} — the edit changed nothing; re-point it.`);
    continue;
  }
  fs.writeFileSync(c.file, after);
  const landed = sum(c.file) !== beforeSum;

  let verdict;
  const r = runGuard();
  const fails = failLines(r.out);
  if (!landed) verdict = "HARNESS BUG  (edit never landed)";
  else if (c.expect === null) {
    verdict = r.code === 0 ? "SILENT (ok)" : `FIRED ON CORRECT WORK\n${fails}`;
  } else if (r.code === 0) verdict = "MISSED";
  else if (fails.includes(c.expect)) verdict = "CAUGHT";
  else verdict = `WRONG FAILURE (wanted ${JSON.stringify(c.expect)})\n${fails}`;

  fs.writeFileSync(c.file, before);
  if (sum(c.file) !== beforeSum) {
    console.error(`TREE NOT RESTORED after ${c.name} — ${c.file}`);
    process.exit(2);
  }

  const good = verdict === "CAUGHT" || verdict === "SILENT (ok)";
  if (good) pass++;
  console.log(`${good ? "ok  " : "BAD "} ${c.name.padEnd(34)} ${verdict}`);
  console.log(`     ${c.why}`);
}

console.log(`\n${pass}/${CASES.length} behaved as declared`);
process.exit(pass === CASES.length ? 0 : 1);
