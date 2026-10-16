// EVERY BROWSER-DRIVING PROBE MUST REFUSE AN OVERSUBSCRIBED BOX, AND UNTIL NOW 46 OF 56 DID NOT.
//
// `scripts/lib/quiet-box.mjs` exists because a browser result from a loaded machine is not
// evidence IN EITHER DIRECTION -- its own header records four occasions this cost real work. It
// was wired into the ten probes CLAUDE.md cites as proof of a claim, and the other 46 were left,
// on the reasoning that those ten are the ones quoted. That scoping is wrong for the failure the
// guard exists to prevent: a climber-facing defect is not what a stale verdict produces. What it
// produces is a session, months later, running a probe by hand while investigating a surface,
// reading a MISS, and going off to edit correct code. Whether CLAUDE.md happens to quote that
// probe has nothing to do with it.
//
// So the invariant is the whole class: a probe that launches a browser asks first.
//
// WHY THIS IS A GATE RATHER THAN A COMMENT. The wiring is 56 call sites and one sentence of
// reasoning, and nothing about a missing one is visible: the probe runs, prints a verdict, and
// the verdict is wrong in a way that reads exactly like a finding. `a semantic invariant in a
// comment rots` -- and this one rots silently, per new probe, forever.
//
// WHY IT CANNOT MAKE CI REFUSE TO RUN, which is the objection quiet-box's own header raises
// against gating on it: this guard checks that the CALL IS PRESENT. It never evaluates the load
// and never declines anything. No workflow executes scripts/oneoff/ (both mentions under
// .github/workflows/ are comments) and package.json names no probe, so nothing in CI can reach
// the refusal at all.
//
// Static -- one readdir and a read per probe, no Babel, no browser, no database, no child
// processes -- so it sits in `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "scripts/oneoff");
const LIB = path.join(ROOT, "scripts/lib/quiet-box.mjs");

// A probe may pass --dir to point this at a fixture tree; nothing else does.
const dirArg = process.argv.find((a) => a.startsWith("--dir="));
const scanDir = dirArg ? path.resolve(dirArg.slice(6)) : DIR;
const FLOOR = Number(process.argv.find((a) => a.startsWith("--floor="))?.slice(8) || 40);

function dead(msg) {
  console.error("FAIL: " + msg);
  console.error("Nothing below was actually checked, so this run proved nothing.");
  process.exit(1);
}

// FAIL CLOSED ON THE MODULE. With quiet-box gone or renamed every probe's import is broken and
// every probe is unguarded -- and a guard that only looks for a call would still find 56 of them
// and print a clean sweep.
if (!fs.existsSync(LIB)) dead("scripts/lib/quiet-box.mjs does not exist -- every probe's import is dead.");
const lib = fs.readFileSync(LIB, "utf8");
if (!/export\s+function\s+assertQuietBox\b/.test(lib)) dead("quiet-box.mjs no longer exports assertQuietBox.");

let files;
try {
  files = fs.readdirSync(scanDir).filter((f) => f.startsWith("probe-") && f.endsWith(".mjs")).sort();
} catch (e) {
  dead(`could not read ${scanDir}: ${e.message}`);
}

// A BROWSER PROBE IS ONE THAT LAUNCHES A BROWSER, never one whose NAME suggests it. Discovery is
// behavioural for the reason check:overlay-discovery gives: a naming convention is a proxy, and a
// probe added tomorrow under any name has to come into frame by itself.
const LAUNCH = /chromium\s*\.\s*launch|launchPersistentContext/;

// MASK FULL-LINE COMMENTS BEFORE COUNTING ANYTHING. This guard's own failure message tells an
// author to write `assertQuietBox("probe-x.mjs");`, and several of these probes carry long
// explanatory headers -- so a probe that quotes the prescribed repair in a comment would be
// reported as calling it twice. That is a guard failing on its own documentation, the trap
// check:ci-cancel records, and this repo has watched three separate checkers take it in one day.
//
// Full-line only, deliberately. A mid-line `//` is not reliably a comment -- these files are full
// of `https://localhost:5199/` -- and stripping there would blank real code, which is how the
// offsets-preserving blanker once ate 21% of RouteDetail.jsx. RESIDUAL, stated rather than
// hidden: a call quoted in a TRAILING same-line comment is still counted. Nothing writes one.
const maskComments = (src) => src.split("\n")
  .map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? "" : l))
  .join("\n");

const browser = [];
for (const f of files) {
  const full = path.join(scanDir, f);
  const raw = fs.readFileSync(full, "utf8");
  if (!/playwright|chromium/.test(raw)) continue;
  const src = maskComments(raw);
  browser.push({ file: f, src, launch: src.search(LAUNCH) });
}

// FAIL CLOSED ON THE SCAN. A walk that matched almost nothing prints the same clean line as a
// clean tree, and this one is a readdir plus a regex -- both easy to break silently.
if (browser.length < FLOOR) {
  dead(`only ${browser.length} browser probes found (floor ${FLOOR}). Either the discovery broke, `
    + `or scripts/oneoff/ moved. Raise the floor when the corpus grows; never lower it to make a run pass.`);
}

const problems = [];
for (const b of browser) {
  const base = path.basename(b.file, ".mjs");
  const calls = b.src.split("assertQuietBox(").length - 1;

  if (calls === 0) {
    problems.push(`${b.file}: launches a browser and never calls assertQuietBox(). A verdict from `
      + `this probe on a loaded box is not evidence. Add:\n`
      + `    import { assertQuietBox } from "../lib/quiet-box.mjs";\n`
      + `  and, after the leading import block, assertQuietBox(${JSON.stringify(base + ".mjs")});`);
    continue;
  }
  if (calls > 1) {
    problems.push(`${b.file}: calls assertQuietBox() ${calls} times. One call, before the browser.`);
    continue;
  }
  if (!/from\s+["']\.\.\/lib\/quiet-box\.mjs["']/.test(b.src)) {
    problems.push(`${b.file}: calls assertQuietBox() without importing it -- this throws on every run.`);
    continue;
  }

  // ORDER IS THE POINT. The whole purpose is to spend NOTHING on a run whose verdict could not be
  // believed, so a call placed after the launch still refuses -- having already paid for Chrome,
  // and on some of these a dev server and an esbuild bundle too.
  const iCall = b.src.indexOf("assertQuietBox(");
  if (b.launch >= 0 && iCall > b.launch) {
    problems.push(`${b.file}: calls assertQuietBox() AFTER the browser launches. Move it above, to `
      + `just below the leading import block -- the point is to spend nothing on an unbelievable run.`);
    continue;
  }

  // THE REFUSAL NAMES A PROBE, AND A COPY-PASTE FROM A SIBLING MAKES IT NAME THE WRONG ONE. That
  // is silent: the guard still refuses, the message blames a file you are not running, and the
  // next reader goes looking at it. Nothing else would ever report this.
  const m = b.src.match(/assertQuietBox\(\s*(["'`])([^"'`]*)\1/);
  if (!m) {
    problems.push(`${b.file}: assertQuietBox() is called with no literal name, so its refusal cannot say `
      + `which probe refused.`);
  } else if (m[2] !== base + ".mjs" && m[2] !== base) {
    problems.push(`${b.file}: assertQuietBox(${JSON.stringify(m[2])}) names a DIFFERENT probe -- a `
      + `copy-paste from a sibling. The refusal would blame ${JSON.stringify(m[2])}.`);
  }
}

if (problems.length) {
  console.error(`FAIL: ${problems.length} of ${browser.length} browser probes are not guarded:\n`);
  for (const p of problems) console.error("  - " + p + "\n");
  console.error("See scripts/lib/quiet-box.mjs. A browser verdict from an oversubscribed box is not");
  console.error("evidence in either direction: a miss reads as a live defect and sends you to edit");
  console.error("correct code, and a pass can be vacuous because screens never settled.");
  process.exit(1);
}

console.log(`ok — all ${browser.length} browser-driving probes refuse an oversubscribed box before launching one`);
