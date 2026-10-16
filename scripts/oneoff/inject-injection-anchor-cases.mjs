#!/usr/bin/env node
// Injection cases for check:injection-anchors.
//
// The guard's healthy output is "every anchor still lands", which is also exactly what a scanner
// that has stopped resolving anything prints — so the fail-CLOSED cases matter as much as the
// detection ones.
//
// THE CORPUS CASES USE A DISPOSABLE FIXTURE SUITE RATHER THAN A REAL ONE, and that is forced
// rather than tidy. The guard scans every `inject-*.mjs`, so a case that mutates a real suite
// mutates the very anchor the guard reads out of it — the first version did exactly that, and the
// guard truthfully reported THIS suite as rotted on every case. A fixture removes the
// self-reference: it is a genuine member of the corpus while it exists, and is asserted absent
// both before and after.
//
// TWO CASES MUST STAY SILENT, and they are what stops this guard arguing with correct work:
//   * a comment quoting a dead anchor is documentation — the guard reads an AST, so a comment is
//     not a case, and firing on one would forbid a suite from explaining its own history.
//   * an anchor matching MORE THAN ONCE is a reading list, not a defect: a deliberately global
//     split/replaceAll, or a first-match replace where any match serves the case.
//
// Expectations are matched against the guard's own FAIL text, never against the text an assertion
// prints when it PASSES — a mistake this repo has recorded three times.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const GUARD = path.join(ROOT, "scripts", "check-injection-anchors.mjs");
const FIXTURE = path.join(ROOT, "scripts", "oneoff", "inject-zz-anchor-fixture-cases.mjs");
const sum = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0, 12);

// A real, unique line in a real file — so a fixture case naming it is genuinely live, and the
// SILENT cases are silent because the guard resolved them rather than because it saw nothing.
const LIVE = 'const KEY = "climbmatch-datefmt";';

const fixture = (body) =>
  "// A DISPOSABLE FIXTURE written by inject-injection-anchor-cases.mjs. If you are reading this in\n" +
  "// a working tree, a run of that suite died before it could delete this file — remove it.\n" +
  `const CASES = [\n${body}\n];\nexport default CASES;\n`;

const CASES = [
  {
    name: "1 an anchor stops matching — THE REAL SHAPE (a fold or refactor moved the code)",
    fixture: '  { name: "x", file: "lib/date-pref.js", find: "zzz-no-such-string-anywhere", repl: "y" },',
    expect: /can no longer land/,
    alsoSays: /inject-zz-anchor-fixture/,
  },
  {
    name: "2 an anchor this guard cannot resolve is REPORTED, never skipped",
    fixture: '  { name: "x", file: "lib/date-pref.js", find: SOME_COMPUTED_ANCHOR(), repl: "y" },',
    expect: /could not be read/,
    alsoSays: /UNPARSED/,
  },
  {
    name: "3 an anchor inside an `edit:` arrow is checked too — the shape half the corpus uses",
    fixture: '  { name: "x", file: "lib/date-pref.js", edit: (s) => s.replace("zzz-no-such-string-anywhere", "y") },',
    expect: /can no longer land/,
    alsoSays: /inject-zz-anchor-fixture/,
  },
  {
    name: "4 SILENT — a COMMENT quoting a dead anchor is documentation, not a case",
    fixture: '  // this used to read find: "zzz-no-such-string-anywhere"\n' +
             `  { name: "x", file: "lib/date-pref.js", find: '${LIVE}', repl: "y" },`,
    silent: true,
  },
  {
    name: "5 SILENT — an anchor matching MORE THAN ONCE is a reading list, not a defect",
    fixture: '  { name: "x", file: "lib/date-pref.js", find: "const ", repl: "y" },',
    silent: true,
  },
  {
    name: "6 the walk finds nothing — must fail CLOSED, never print a clean sweep",
    file: GUARD,
    find: 'f.startsWith("inject-") && f.endsWith(".mjs")',
    repl: 'f.startsWith("zzz-none-") && f.endsWith(".mjs")',
    expect: /broken walk, not a clean sweep/,
  },
  {
    name: "7 the conventions are renamed off — the floors must catch it",
    file: GUARD,
    find: 'const ANCHOR_KEYS = new Set(["find", "from"]);',
    repl: 'const ANCHOR_KEYS = new Set(["zzz-find", "zzz-from"]);',
    expect: /proved almost nothing/,
  },
];

const run = () => {
  try {
    return { code: 0, out: execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8" }) };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
};
// FAIL lines only: the guard prints its own labels on ok lines too.
const failText = (out) => out.split("\n").filter((l) => /^(FAIL|ROTTED|UNPARSED)/.test(l.trim())).join("\n");

if (fs.existsSync(FIXTURE)) {
  console.error(`REFUSING TO START: ${path.basename(FIXTURE)} already exists — an earlier run died. Remove it first.`);
  process.exit(1);
}
if (!fs.readFileSync(path.join(ROOT, "lib", "date-pref.js"), "utf8").includes(LIVE)) {
  console.error("REFUSING TO START: the live anchor this suite builds its SILENT cases from has moved.");
  process.exit(1);
}
const healthy = run();
if (healthy.code !== 0) {
  console.error("REFUSING TO START: the guard is not green on this tree, so no case would be attributable.");
  console.error(healthy.out.slice(-1200));
  process.exit(1);
}
for (const c of CASES) {
  if (c.expect && c.expect.test(failText(healthy.out))) {
    console.error(`HARNESS BUG: ${c.name}'s expectation matches the HEALTHY run, so it cannot discriminate.`);
    process.exit(1);
  }
}

let bad = 0;
for (const c of CASES) {
  let restore = null;
  if (c.fixture) {
    fs.writeFileSync(FIXTURE, fixture(c.fixture));
  } else {
    const before = fs.readFileSync(c.file, "utf8");
    const beforeSum = sum(c.file);
    const n = before.split(c.find).length - 1;
    if (n !== 1) {
      console.log(`  HARNESS BUG  ${c.name}: its find string matches ${n} times, so the edit is not attributable.`);
      bad++;
      continue;
    }
    fs.writeFileSync(c.file, before.replace(c.find, c.repl));
    if (sum(c.file) === beforeSum) {
      console.log(`  HARNESS BUG  ${c.name}: the edit never landed (checksum unmoved).`);
      fs.writeFileSync(c.file, before);
      bad++;
      continue;
    }
    restore = { before, beforeSum };
  }

  const r = run();

  if (c.fixture) {
    fs.unlinkSync(FIXTURE);
    if (fs.existsSync(FIXTURE)) { console.log(`  FIXTURE NOT REMOVED after ${c.name}`); process.exit(1); }
  } else {
    fs.writeFileSync(c.file, restore.before);
    if (sum(c.file) !== restore.beforeSum) {
      console.log(`  TREE NOT RESTORED after ${c.name} — fix this before trusting anything else.`);
      process.exit(1);
    }
  }

  if (c.silent) {
    if (r.code === 0) console.log(`  ok    ${c.name}: stayed SILENT, as it must`);
    else { console.log(`  FIRED ON CORRECT WORK  ${c.name}\n${failText(r.out).slice(0, 400)}`); bad++; }
    continue;
  }
  const ft = failText(r.out);
  if (r.code === 1 && c.expect.test(ft) && (!c.alsoSays || c.alsoSays.test(ft))) {
    console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
  } else {
    console.log(`  ${r.code === 1 ? "WRONG FAILURE" : "MISSED"}  ${c.name}\n${(ft || r.out).slice(0, 400)}`);
    bad++;
  }
}

console.log(bad ? `\n${bad} case(s) did NOT behave as declared` : `\nok — ${CASES.length}/${CASES.length} cases behaved as declared`);
process.exit(bad ? 1 : 0);
