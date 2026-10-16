#!/usr/bin/env node
/* DOES probe-offline-subtree-search ACTUALLY CATCH ANYTHING?
 *
 * Its healthy output is "29 assertions, all ok", which is also what a probe asserting nothing
 * prints. Each case below reverts ONE line of lib/offline.js to the naive transcription of the
 * SQL that a first draft would write, and requires the probe to fail with a message NAMING that
 * defect — an exit code alone is satisfied by a run that died for an unrelated reason, which this
 * repo has read as a catch twice.
 *
 * THREE SAFEGUARDS, all of them paid for. On 2026-09-09 two runs of inject-offline-claim-cases
 * overlapped: both snapshot, edit and restore the same file, so one run's "restore" wrote the
 * other's injected text back permanently, and the working tree ended up holding six edits nobody
 * made. So: an exclusive lockfile; a refusal to start unless the probe is already GREEN (on a
 * dirty tree no case is attributable); and a checksum of the file taken before and after, so a
 * run that damages the tree says TREE NOT RESTORED rather than exiting 0 over it.
 *
 * TWO CASES MUST STAY SILENT. A suite that only proves it fires is satisfied by a probe that
 * fails on everything, and a rule that admits nothing is as wrong as one that admits everything.
 */

import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TARGET = path.join(ROOT, "lib/offline.js");
const PROBE = path.join(ROOT, "scripts/oneoff/probe-offline-subtree-search.mjs");
const LOCK = path.join(ROOT, ".inject-offline-subtree.lock");

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

function runProbe() {
  try {
    const outp = execFileSync("node", [PROBE], { stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, text: String(outp || "") };
  } catch (e) {
    // execFileSync defaults stdio[2] to 'inherit', so a guard's fatal console.error would go to
    // OUR stderr and never reach e.stderr — an expectation could then never match. Both pipes are
    // explicit above, and both streams are searched.
    return { code: e.status == null ? -1 : e.status, text: String(e.stdout || "") + String(e.stderr || "") };
  }
}

const CASES = [
  {
    name: "bare-prefix-subtree",
    why: "the subtree test becomes a string prefix, so `wa_index` swallows `wa_index_town_wall`",
    find: 'a.path.startsWith(prefix)',
    repl: 'a.path.startsWith(root.path)',
    expect: "pulled in a SIBLING area's routes",
  },
  {
    name: "null-grade-passes-a-maximum",
    why: "an ungraded route floods every 'and under' search — `Number(null) <= 10` is true",
    find: 'if (f.maxGrade != null && (gn == null || gn > f.maxGrade)) return false;',
    repl: 'if (f.maxGrade != null && Number(r.grade_num) > f.maxGrade) return false;',
    expect: "maxGrade admitted the wrong rows",
  },
  {
    name: "boulder-pitches-read-as-unknown",
    why: "0074's roped/bouldering distinction is lost and boulder problems pass a pitch filter",
    find: 'const p = raw ? raw : (r.discipline === "bouldering" ? 0 : 1);',
    repl: 'const p = raw ? raw : 1;',
    expect: "boulder problem passed a pitch filter",
  },
  {
    name: "nulls-first-on-desc",
    why: "Postgres's own default for `desc` — every unrated route would lead a 'best first' list",
    find: '  if (a == null) return 1;\n  if (b == null) return -1;',
    repl: '  if (a == null) return desc ? -1 : 1;\n  if (b == null) return desc ? 1 : -1;',
    expect: "stars_desc ordering is wrong",
  },
  {
    name: "completeness-gate-gone",
    why: "a half-downloaded state gets searched, and a truncated catalog reads as the whole one",
    find: '  if (!ok.has(root._state)) return null;',
    repl: '  if (false) return null;',
    expect: "half-downloaded state was searched",
  },
  {
    name: "empty-read-as-absent",
    why: "a filter matching nothing reports as a failed read instead of 'no routes match'",
    find: '  return rows.slice(off, off + f.pageSize);',
    repl: '  const _out = rows.slice(off, off + f.pageSize); return _out.length ? _out : undefined;',
    expect: "instead of []",
  },
  /* ── must stay SILENT ────────────────────────────────────────────────────────────────────── */
  {
    name: "comment-naming-the-rule",
    why: "a comment quoting the forbidden shape is documentation, and a probe flagging it would\n"
      + "       forbid explaining the rule",
    find: '// `q is null or q = \'\'` in the SQL',
    repl: '// startsWith(root.path) is NOT the subtree test. `q is null or q = \'\'` in the SQL',
    silent: true,
  },
  {
    name: "same-rule-written-longhand",
    why: "the null-grade guard spelled out is the same rule, and a probe pinned to one phrasing\n"
      + "       would forbid tidying it",
    find: 'if (f.minGrade != null && (gn == null || gn < f.minGrade)) return false;',
    repl: 'if (f.minGrade != null) { if (gn === null) return false; if (gn < f.minGrade) return false; }',
    silent: true,
  },
];

/* ── the three safeguards ────────────────────────────────────────────────────────────────────── */
let lockFd;
try { lockFd = fs.openSync(LOCK, "wx"); }
catch (e) {
  console.error("REFUSING TO START: " + LOCK + " exists, so another run of this suite is live.\n"
    + "Two runs editing one file means one run's 'restore' writes the other's injected text back\n"
    + "PERMANENTLY. Wait for it, or delete the lock if you are sure nothing is running.");
  process.exit(1);
}
const release = () => { try { fs.closeSync(lockFd); } catch (e) {} try { fs.unlinkSync(LOCK); } catch (e) {} };
process.on("exit", release);
process.on("SIGINT", () => { release(); process.exit(130); });

const ORIGINAL = fs.readFileSync(TARGET, "utf8");
const BEFORE = sha(ORIGINAL);

const green = runProbe();
if (green.code !== 0) {
  console.error("REFUSING TO START: the probe is already failing on this tree, so no case below\n"
    + "would be attributable. Fix the tree first.\n" + green.text.split("\n").filter((l) => /FAIL/.test(l)).join("\n"));
  process.exit(1);
}
/* AN EXPECTATION MATCHED AGAINST THE HEALTHY RUN CANNOT MEAN ANYTHING, and the first version of
 * this suite had one: `bare-prefix-subtree` looked for text that appears in the message the
 * assertion prints when it PASSES, so a correctly-firing probe read as WRONG FAILURE. Every
 * expectation is checked against the green output before any file is touched. */
for (const c of CASES) {
  if (!c.silent && green.text.includes(c.expect)) {
    console.error("HARNESS BUG: case " + c.name + " expects “" + c.expect + "”, which the HEALTHY run\n"
      + "already prints — probably the text of an `ok` line rather than a FAIL. It could never fail.");
    process.exit(1);
  }
}
console.log("precondition: the probe is GREEN on this tree (lib/offline.js " + BEFORE + ")\n");

let caught = 0, missed = 0;
for (const c of CASES) {
  const hits = ORIGINAL.split(c.find).length - 1;
  if (hits !== 1) {
    console.log("HARNESS BUG  " + c.name + " — its find string matches " + hits + " time(s), not 1.");
    missed++;
    continue;
  }
  const mutated = ORIGINAL.replace(c.find, c.repl);
  fs.writeFileSync(TARGET, mutated);
  // Checksum movement proves an edit HAPPENED. It does not prove it was the RIGHT one — which
  // this repo has recorded four times — so every case is judged on the probe's own failure text.
  const landed = sha(mutated) !== BEFORE;
  const r = runProbe();
  fs.writeFileSync(TARGET, ORIGINAL);

  if (!landed) { console.log("HARNESS BUG  " + c.name + " — the edit did not change the file."); missed++; continue; }

  const fails = r.text.split("\n").filter((l) => /FAIL/.test(l)).join("\n");
  if (c.silent) {
    if (r.code === 0) { console.log("SILENT       " + c.name + " — correctly not flagged"); caught++; }
    else { console.log("OVER-REACH   " + c.name + " — the probe FAILED on correct work:\n" + fails); missed++; }
    continue;
  }
  if (r.code === 0) { console.log("MISSED       " + c.name + " — the probe passed. " + c.why); missed++; }
  else if (fails.includes(c.expect)) console.log("CAUGHT       " + c.name), caught++;
  else { console.log("WRONG FAILURE " + c.name + " — it failed, but not on “" + c.expect + "”:\n" + fails); missed++; }
}

const AFTER = sha(fs.readFileSync(TARGET, "utf8"));
if (AFTER !== BEFORE) {
  console.error("\nTREE NOT RESTORED: lib/offline.js is " + AFTER + ", was " + BEFORE
    + ".\nDo not commit. `git checkout lib/offline.js` before doing anything else.");
  process.exit(1);
}

console.log("\n" + caught + "/" + CASES.length + " cases behaved; lib/offline.js restored byte-identically ("
  + AFTER + ")");
process.exit(missed ? 1 : 0);
