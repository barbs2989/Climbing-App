#!/usr/bin/env node
// RUN EVERY BROWSER-DRIVING ONE-OFF PROBE. The third and last third of the corpus.
//
// #1678 swept the static one-offs and #1695 the DB-reading ones. Between them they found ten red
// probes and NOT ONE was an app defect -- every one read like a live regression on the surface it
// watches, and following any of them would have sent somebody to edit working code. The browser
// third has never been run as a set, and it is the third where that hazard is worst: a browser
// verdict is the kind this repo most often quotes back as proof.
//
// WHY THIS IS A SCRIPT RATHER THAN A SHELL ONE-LINER, and it is not tidiness:
//
//   * THE LIST IS DERIVED, never hand-maintained. A hand list is a restated vocabulary, which is
//     how this codebase ended up with four grade parsers -- and the first attempt at this sweep
//     really did carry one, wrong in both directions (7 entries that launch no browser, and it
//     would have gone stale the day probe #57 landed).
//   * IT CHECKS THE BOX FIRST AND REFUSES, because a sweep is exactly where a loaded run does the
//     most damage: 56 unbelievable verdicts arriving as a reading list. The probes each refuse
//     individually (check:quiet-box-wiring proves it), but a sweep that spends an hour producing
//     56 refusals is its own waste.
//   * macOS HAS NO `timeout(1)`. The first attempt at the static sweep used it and returned exit
//     127 for all 77 -- a uniform, plausible, catastrophic-looking result that measured nothing.
//     Each probe gets its own watchdog here.
//
// READ THE OUTPUT, NEVER THE COUNT. An exit code is not evidence a probe is telling the truth:
// probe-terrain-corpus-blind-columns exited 0 while printing seven false LIVE findings.
//
//   node scripts/oneoff/run-browser-probe-sweep.mjs [--cap=480] [--out=DIR]
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertQuietBox, loadLine, boxLoad, QUIET_X, REFUSE_X } from "../lib/quiet-box.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
// `--dir` is a TEST SEAM and nothing else passes it -- the same idiom as check:column-drift's
// --fixture. Without it the PASS/FAIL/TIMEOUT machinery could only be exercised by launching 56
// browsers, which is exactly the run this refuses to make on a loaded box; three of the four
// verdict branches would ship unproven. Proven against a fixture of four one-line probes --
// exit 0, exit 1, a hang, exit 2 -- which reports PASS/FAIL/TIMEOUT/BROKEN and correctly excludes
// a fifth that launches no browser.
const dirArg = process.argv.find((a) => a.startsWith("--dir="));
const DIR = dirArg ? path.resolve(dirArg.slice(6)) : path.join(ROOT, "scripts/oneoff");
const FLOOR = dirArg ? 1 : 40;
const CAP = Number(process.argv.find((a) => a.startsWith("--cap="))?.slice(6) || 480) * 1000;
const SETTLE_MS = Number(process.argv.find((a) => a.startsWith("--settle="))?.slice(9) || 240) * 1000;
const RETRIES = Number(process.argv.find((a) => a.startsWith("--retries="))?.slice(10) || 2);
const OUT = process.argv.find((a) => a.startsWith("--out="))?.slice(6)
  || path.join(process.env.TMPDIR || "/tmp", "browser-probe-sweep");

// The sweep obeys the same rule its members do. Refusing here costs a second; refusing 56 times
// after spawning 56 node processes costs a great deal more and produces the same nothing.
assertQuietBox("run-browser-probe-sweep.mjs");

// Same behavioural discovery check:quiet-box-wiring uses -- a probe that LAUNCHES a browser,
// never one whose name suggests it.
const probes = fs.readdirSync(DIR)
  .filter((f) => f.startsWith("probe-") && f.endsWith(".mjs")).sort()
  .map((f) => ({ file: f, src: fs.readFileSync(path.join(DIR, f), "utf8") }))
  .filter((p) => /playwright|chromium/.test(p.src))
  .map((p) => p.file);

// Fails CLOSED: a walk that matched almost nothing would otherwise print a short, clean sweep.
if (probes.length < FLOOR) {
  console.error(`REFUSING — only ${probes.length} browser probes discovered (floor ${FLOOR}). The scan broke, or scripts/oneoff/ moved.`);
  process.exit(2);
}

fs.mkdirSync(OUT, { recursive: true });
console.log(`${probes.length} browser probes — ${loadLine(boxLoad())}`);
console.log(`logs: ${OUT}\n`);

function runOne(file, log) {
  return new Promise((resolve) => {
    const fd = fs.openSync(log, "w");
    const child = spawn("node", [path.join(DIR, file)], { cwd: ROOT, stdio: ["ignore", fd, fd] });
    const wd = setTimeout(() => { child.kill("SIGKILL"); }, CAP);
    child.on("close", (code, signal) => {
      clearTimeout(wd); fs.closeSync(fd);
      if (signal === "SIGKILL") return resolve("TIMEOUT");
      // The child's OWN refusal exits 1 with a banner -- indistinguishable from a real failure
      // by exit code alone, which is what produced the false reading list.
      if (code !== 0 && /REFUSING TO RUN/.test(fs.readFileSync(log, "utf8"))) return resolve("REFUSED");
      resolve(code === 0 ? "PASS" : code === 2 ? "BROKEN" : "FAIL");
    });
    child.on("error", () => { clearTimeout(wd); fs.closeSync(fd); resolve("BROKEN"); });
  });
}

// A SWEEP OF BROWSER PROBES **IS** THE LOAD, AND THE FIRST RUN OF THIS DEFEATED ITSELF.
// Each probe spawns a dev server and a Chrome; by probe 16 the box had been driven from 1.0x to
// 8.6x and every probe after that REFUSED. Worse, the runner reported each refusal as `FAIL`:
// 42 of 45 "failures" in that run were refusals, i.e. exactly the reading list of non-findings
// the whole quiet-box mechanism exists to prevent, manufactured by the tool built to collect it.
//
// So: wait for the box to come back under QUIET_X before each probe, and RETRY a refusal rather
// than recording it. A refusal is the absence of a result, never a result.
const settle = async (label) => {
  const deadline = Date.now() + SETTLE_MS;
  while (boxLoad().perCore > QUIET_X && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
  }
  const b = boxLoad();
  if (b.perCore > REFUSE_X) console.log(`     (waiting on the box — ${loadLine(b)})`);
  return b;
};

const rows = [];
for (const [i, file] of probes.entries()) {
  const base = path.basename(file, ".mjs");
  const log = path.join(OUT, base + ".txt");
  await settle(base);
  const started = Date.now();

  const verdict = await runOne(file, log);

  let v = verdict, secs = ((Date.now() - started) / 1000).toFixed(0);
  for (let attempt = 0; v === "REFUSED" && attempt < RETRIES; attempt++) {
    console.log(`     REFUSED — box too loaded; waiting, then retrying ${base}`);
    await settle(base);
    const t0 = Date.now();
    v = await runOne(file, log);
    secs = ((Date.now() - t0) / 1000).toFixed(0);
  }
  rows.push({ base, verdict: v, secs });
  console.log(`${String(i + 1).padStart(2)}/${probes.length}  ${verdict.padEnd(7)} ${secs.padStart(4)}s  ${base}`);
}

const by = (v) => rows.filter((r) => r.verdict === v);
console.log(`\n${by("PASS").length} pass, ${by("FAIL").length} fail, ${by("TIMEOUT").length} timeout, `
  + `${by("BROKEN").length} broken, ${by("REFUSED").length} REFUSED`);
for (const r of rows.filter((r) => r.verdict !== "PASS")) console.log(`  ${r.verdict.padEnd(8)} ${r.base}  —  ${path.join(OUT, r.base + ".txt")}`);
if (by("REFUSED").length) {
  console.log(`\n${by("REFUSED").length} probe(s) REFUSED even after ${RETRIES} retries. A refusal is the ABSENCE`);
  console.log(`of a result, not a result -- do not read these as findings. Re-run them on a quieter box.`);
}
console.log(`\nREAD EACH LOG. The two previous corpus sweeps found ten red probes and zero app`);
console.log(`defects: a probe out of step with a fix reads exactly like the fix having regressed.`);
