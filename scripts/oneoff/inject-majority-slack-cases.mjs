// DOES check:track-caveat ACTUALLY SEE THE MAJORITY CONDITION?
//
// The slack in `trackIsJustTheWaypoints` is now two vertices where two is still a MINORITY of the
// line. That is one expression, and both ways of getting it wrong produce a predicate that still
// captions almost everything correctly:
//
//   - REVERT to one of slack and the eight stranded routes go back to posing as recorded GPS
//     tracks, with Download GPX beneath them. Every other line is unaffected.
//   - WIDEN to a flat two and a three-point line qualifies with ONE vertex on a pin, which is not
//     a sketch test at all.
//
// Neither shows up in the healthy output, so the cases are worth nothing until each has been shown
// to fail — and to fail with ITS OWN message. An injection that produces a different failure is not
// a catch; this repo has read one as the other more than once.
//
// Each case proves its edit landed BY CHECKSUM and restores the file byte-identically.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TRACK = path.join(ROOT, "lib", "track.js");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");
const RULE = "const slackFor = n => (n < 3 ? 0 : n - 2 > n / 2 ? 2 : 1);";

const CASES = [
  { name: "revert-to-one", expect: "fail",
    why: "one vertex of slack — the eight two-pin-repair routes pose as recorded tracks again",
    says: /FAIL\s+predicate: a FIVE-point line with two stranded vertices is refused/,
    from: RULE, to: "const slackFor = n => (n < 3 ? 0 : 1);" },

  { name: "flat-two", expect: "fail",
    why: "a flat two of slack — a three-point line qualifies with ONE vertex on a pin",
    says: /FAIL\s+predicate: a THREE-point line with one vertex on a pin qualified/,
    from: RULE, to: "const slackFor = n => (n < 3 ? 0 : 2);" },

  { name: "slack-grows-with-length", expect: "fail",
    why: "slack proportional to the line — at five points three off would qualify, and the caption stops meaning anything",
    says: /FAIL\s+predicate: THREE vertices off a five-point line qualified/,
    from: RULE, to: "const slackFor = n => (n < 3 ? 0 : Math.max(1, Math.round(n * 0.6)));" },

  // MUST STAY SILENT. The pin side of the predicate keeps its floor of one, so a route with few
  // pins is judged exactly as before; rewriting the expression to say so explicitly is a no-op and
  // a guard that flagged it would be forbidding its own documentation.
  { name: "equivalent-rewrite", expect: "pass",
    why: "the same rule written out longhand is not a change",
    from: RULE, to: "const slackFor = n => { if (n < 3) return 0; return n - 2 > n / 2 ? 2 : 1; };" },
];

let pass = 0, fail = 0;
for (const c of CASES) {
  const before = fs.readFileSync(TRACK, "utf8");
  const beforeSum = sum(TRACK);
  if (before.split(c.from).length - 1 !== 1) {
    console.log(`  BROKEN CASE ${c.name}: anchor absent or not unique — the case tests nothing`);
    fail++; continue;
  }
  fs.writeFileSync(TRACK, before.replace(c.from, c.to));
  if (sum(TRACK) === beforeSum) {
    console.log(`  BROKEN CASE ${c.name}: edit did not change the file`);
    fs.writeFileSync(TRACK, before); fail++; continue;
  }
  let out = "", code = 0;
  try {
    out = execFileSync("node", [path.join(ROOT, "scripts", "check-track-caveat.mjs")],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(TRACK, before);
  if (sum(TRACK) !== beforeSum) { console.log(`  FATAL ${c.name}: restore was not byte-identical`); process.exit(1); }

  const fired = code !== 0;
  const saidIt = c.says ? c.says.test(out) : false;
  if (c.expect === "fail") {
    if (fired && saidIt) { console.log(`  CAUGHT  ${c.name} — ${c.why}`); pass++; }
    else if (fired) { console.log(`  WRONG FAILURE ${c.name}: it failed, but not with ${c.says} — it broke rather than saw this`); fail++; }
    else { console.log(`  MISSED  ${c.name} — ${c.why}`); fail++; }
  } else {
    if (!fired) { console.log(`  SILENT  ${c.name} — ${c.why}`); pass++; }
    else { console.log(`  FALSE ALARM ${c.name}: the guard flagged an equivalent rewrite — ${c.why}`); fail++; }
  }
}
console.log(`\n${pass}/${CASES.length} case(s) behaved; ${fail} did not.`);
process.exit(fail ? 1 : 0);
