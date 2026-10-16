// INJECTION SUITE FOR audit:silent-reverts' REVIEWED DECLARATION.
//
// The healthy output of that gate is "no findings", which is exactly what a broken gate prints —
// and the REVIEWED map makes a PASSING run the interesting one, so a suite that only proved the
// gate can fail would say nothing about it. Every case therefore names the text its OWN outcome
// must carry, and the harness refuses any expectation that already appears in the healthy run.
//
// WINDOW. The cases run at --commits 40 rather than the workflow's 120, because the finding
// reproduces there and each run costs minutes on a loaded box. Measured rather than assumed: of
// the six commits that added the deleted probes, three sit at depth 8, 14 and 30, so a 40-commit
// window still sees "several files added by several different commits". The other three (90, 107,
// 117) only make the count larger. If this stops reproducing, widen the window before believing
// the guard changed.
//
// Each case proves its edit LANDED by checksum — a checksum that did not move means the harness
// is broken, not the guard — and the file is restored byte-identically afterwards.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const TARGET = path.join(ROOT, "scripts/audit-silent-reverts.mjs");

/* TWO RUNS OF ONE SUITE MUST NEVER OVERLAP. Both snapshot, edit and restore the same file, so run
   B's snapshot can capture run A's injected text and then "restore" it permanently. That is not
   hypothetical here — it happened to `inject-offline-claim-cases` on 2026-09-09 and left five
   injected edits written back as though they were the original. An exclusive `wx` lockfile,
   released on exit, throw and SIGINT, is the fix that file's entry says to copy. */
const LOCK = path.join(ROOT, ".inject-reviewed-gate.lock");
try { fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" }); }
catch { console.error(`another run holds ${LOCK} — refusing to start.`); process.exit(1); }
const unlock = () => { try { fs.unlinkSync(LOCK); } catch { /* already gone */ } };
process.on("exit", unlock);
process.on("SIGINT", () => { unlock(); process.exit(130); });
process.on("uncaughtException", (e) => { unlock(); console.error(e); process.exit(1); });
const ORIGINAL = fs.readFileSync(TARGET, "utf8");
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);
const BASE_SUM = sum(ORIGINAL);

const REAL_SHA = "9afff4eb84d5a417af540545079d8aace4399c2e";
const HEAD_SHA = "65ebe56367bd058010ac4568f07be2b1328633d2"; // in the window, never flagged
const OLD_SHA = "ff0cf927721e99adec0f97e8fa002a91a8e2bd4f";  // depth 90 — outside a 40-commit window

function run() {
  try {
    const out = execFileSync("node", [TARGET, "--ref", "HEAD", "--commits", "40", "--fail-on-silent"],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status == null ? -1 : e.status, out: String(e.stdout || "") + String(e.stderr || "") };
  }
}

const CASES = [
  {
    name: "baseline-reviewed-clears-the-gate",
    edit: (s) => s,                       // no edit — the PASSING case is the one this map is for
    expectCode: 0,
    expect: ["REVIEWED, not gated", "9afff4eb"],
    why: "the declared promotion must clear the gate AND still print its row",
  },
  {
    name: "entry-gone-gate-returns",
    edit: (s) => s.replace(REAL_SHA, "0000000000000000000000000000000000000000"),
    expectCode: 1,
    expect: ["9afff4eb removed"],
    why: "NON-VACUITY: without the declaration the finding must come back",
  },
  {
    // The gate still fires here (the real declaration is gone), so the assertion is on the NOTE:
    // an entry pointing at an unflagged in-window commit must be reported, not silently ignored.
    name: "entry-matching-nothing-is-reported",
    edit: (s) => s.replace(REAL_SHA, HEAD_SHA),
    expectCode: 1,
    expect: ["matched nothing in this run"],
    why: "a declaration that no longer applies must say so rather than sit unnoticed",
  },
  {
    name: "unmatched-entry-is-not-fatal",
    edit: (s) => s.replace("const REVIEWED = new Map([",
      `const REVIEWED = new Map([\n  ["${OLD_SHA}", "injected out-of-window case"],`),
    expectCode: 0,
    expect: ["matched nothing in this run"],
    why: "MUST NOT REDDEN MAIN: an inert entry is bookkeeping, not a defect",
  },
];

console.log(`baseline checksum ${BASE_SUM}\n`);
console.log("healthy run (used to refuse an expectation that is already true)...");
const healthy = run();
console.log(`  healthy exit=${healthy.code}\n`);

let pass = 0, fail = 0;
for (const c of CASES) {
  const edited = c.edit(ORIGINAL);
  const landed = c.name === "baseline-reviewed-clears-the-gate" || sum(edited) !== BASE_SUM;
  if (!landed) { console.log(`  HARNESS BUG  ${c.name}: edit did not change the file`); fail++; continue; }

  // An expectation that already holds on the clean tree tests nothing. This repo has twice read a
  // case as MISSED while the guard was innocent, because the expectation matched the text an
  // assertion prints when it PASSES.
  const vacuous = c.name !== "baseline-reviewed-clears-the-gate"
    && c.expect.filter((e) => healthy.out.includes(e));
  if (vacuous && vacuous.length) {
    console.log(`  HARNESS BUG  ${c.name}: expectation(s) already in the healthy run: ${vacuous.join(", ")}`);
    fail++; continue;
  }

  fs.writeFileSync(TARGET, edited);
  let r;
  try { r = run(); } finally { fs.writeFileSync(TARGET, ORIGINAL); }
  if (sum(fs.readFileSync(TARGET, "utf8")) !== BASE_SUM) {
    console.log(`  TREE NOT RESTORED after ${c.name} — fix this before trusting anything above`);
    process.exit(1);
  }

  const codeOk = r.code === c.expectCode;
  const missing = c.expect.filter((e) => !r.out.includes(e));
  if (codeOk && !missing.length) { console.log(`  ok       ${c.name}  (${c.why})`); pass++; }
  else {
    console.log(`  MISSED   ${c.name}  exit=${r.code} want=${c.expectCode}` +
      (missing.length ? `  missing: ${missing.join(", ")}` : ""));
    fail++;
  }
}

console.log(`\n${pass}/${CASES.length} cases behaved as declared${fail ? `, ${fail} did not` : ""}.`);
process.exit(fail ? 1 : 0);
