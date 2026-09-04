#!/usr/bin/env node
// Injection cases for check:doc-paths.
//
// The subject is CLAUDE.md, so every case EDITS that file and restores it byte-identically,
// proving the edit landed by CHECKSUM first — this repo has twice read "the guard missed" when
// the truth was "the edit never landed".
//
// Two cases must stay SILENT. A guard proven only to FIRE is satisfied by one that flags
// everything, and the two silent cases are the ones that would make this guard argue with
// correct work: a real path, and a path outside the scoped roots.
import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const DOC = path.join(ROOT, "CLAUDE.md");
const GUARD = path.join(ROOT, "scripts/check-doc-paths.mjs");

const sum = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
const run = () => {
  try {
    return { code: 0, out: execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8" }) };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
};

// Anchor: a line that exists exactly once and is safe to append to.
const ANCHOR = "## Working in this codebase";

const CASES = [
  {
    name: "missing-path", fires: true, expect: /scripts\/oneoff\/zz-not-here\.mjs/,
    why: "THE REAL DEFECT — a cited path that does not exist. The dominant cause is a probe promoted to a guard and renamed in the same commit.",
    edit: (s) => s.replace(ANCHOR, "Proven by `scripts/oneoff/zz-not-here.mjs`.\n\n" + ANCHOR),
  },
  {
    name: "promotion-suggestion", fires: true, expect: /Likeliest cause: it was PROMOTED[\s\S]*check-doc-paths\.mjs/,
    why: "a renamed file must SUGGEST its successor by basename, not merely report the absence — the advice is the half nothing tests",
    edit: (s) => s.replace(ANCHOR, "Proven by `scripts/oneoff/probe-doc-paths.mjs`.\n\n" + ANCHOR),
  },
  {
    name: "stale-gone", fires: true, expect: /declared GONE and exists/,
    why: "GONE must fail when the file comes back, or the list rots into a description of files that are here",
    edit: (s) => s.replace(
      'const GONE = {',
      'const GONE = {\n  "scripts/lib/guard-sources.mjs": "injected: this file exists and is cited",'),
    file: GUARD,
  },
  {
    name: "real-path", fires: false,
    why: "MUST STAY SILENT — citing a file that exists is the normal case, and flagging it would make the guard unusable",
    edit: (s) => s.replace(ANCHOR, "Proven by `scripts/check-doc-paths.mjs`.\n\n" + ANCHOR),
  },
  {
    name: "out-of-scope-root", fires: false,
    why: "MUST STAY SILENT — catalog/ is gitignored (~52MB, regenerable) so a path there is legitimately absent; flagging it would report correct work",
    edit: (s) => s.replace(ANCHOR, "Rebuilt from `catalog/zz-nowhere/routes.json`.\n\n" + ANCHOR),
  },
];

let pass = 0, fail = 0;
for (const c of CASES) {
  const target = c.file || DOC;
  const before = fs.readFileSync(target, "utf8");
  const beforeSum = sum(target);
  const after = c.edit(before);
  if (after === before) { console.error(`HARNESS BUG  ${c.name}: the edit changed nothing — anchor moved.`); fail++; continue; }
  fs.writeFileSync(target, after);
  if (sum(target) === beforeSum) { console.error(`HARNESS BUG  ${c.name}: checksum unchanged after write.`); fs.writeFileSync(target, before); fail++; continue; }

  const r = run();
  fs.writeFileSync(target, before);
  if (sum(target) !== beforeSum) { console.error(`HARNESS BUG  ${c.name}: could not restore ${path.basename(target)}.`); process.exit(1); }

  const fired = r.code !== 0;
  let ok = fired === c.fires;
  if (ok && c.fires && c.expect) ok = c.expect.test(r.out);
  if (ok) { console.log(`ok    ${c.name.padEnd(22)} ${c.fires ? "fires" : "SILENT"}`); console.log(`        ${c.why}`); pass++; }
  else {
    console.error(`FAIL  ${c.name.padEnd(22)} expected ${c.fires ? "a failure" : "silence"}, got exit ${r.code}`);
    console.error(`        ${c.why}`);
    if (c.fires && c.expect && fired) console.error(`        it fired, but nothing matched ${c.expect}`);
    fail++;
  }
}
console.log(`\n${pass}/${CASES.length} cases behaved as specified.`);
process.exit(fail ? 1 : 0);
