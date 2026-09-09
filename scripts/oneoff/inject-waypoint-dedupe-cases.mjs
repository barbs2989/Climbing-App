// Injection suite for `check:waypoint-dedupe`.
//
// The healthy output of that guard is "6 assertions", which is also what a guard asserting nothing
// prints. So each case mutates lib/waypoints.js, proves the edit LANDED BY CHECKSUM, and is judged
// on the guard's own failure TEXT rather than on its exit code — a run that dies for a different
// reason is not a catch, which this repo has read as one twice.
//
// Case 1 is the real historical rule, restored verbatim.
// Case 4 must stay SILENT: the same rule written a different way is not a change.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = join(ROOT, "lib", "waypoints.js");
const GUARD = join(ROOT, "scripts", "check-waypoint-dedupe.mjs");
const sum = (s) => createHash("sha256").update(s).digest("hex").slice(0, 12);

const CASES = [
  {
    name: "revert",
    why: "the real historical rule — `trailhead` back in SINGLETON",
    find: "const SINGLETON = /^(summit|topout)$/i;",
    repl: "const SINGLETON = /^(summit|topout|trailhead)$/i;",
    expect: "two DIFFERENT trailheads survive",
  },
  {
    name: "spelt-out",
    why: "the same revert written as an extra alternation, which a textual scan for the old string would miss",
    find: "const SINGLETON = /^(summit|topout)$/i;",
    repl: "const SINGLETON = /^(summit|topout|trail\\x68ead)$/i;".replace("\\x68", "h"),
    expect: "two DIFFERENT trailheads survive",
  },
  {
    name: "gutted",
    why: "the tempting OVER-correction: drop SINGLETON entirely, so two summit pins stop merging",
    find: "const SINGLETON = /^(summit|topout)$/i;",
    repl: "const SINGLETON = /^(?!)$/i;",
    expect: "two SUMMIT pins still merge",
  },
  {
    name: "no-place-merge",
    why: "removing the coordinate path, so one trailhead recorded twice at one spot stops merging",
    find: "      if (sameSpot(p, w)) return true;",
    repl: "      if (false && sameSpot(p, w)) return true;",
    expect: "AT THE SAME SPOT still merges",
  },
  {
    name: "reordered-alternation",
    why: "MUST STAY SILENT — the same rule with its two members swapped is not a change",
    find: "const SINGLETON = /^(summit|topout)$/i;",
    repl: "const SINGLETON = /^(topout|summit)$/i;",
    expect: null,
  },
];

const original = readFileSync(FILE, "utf8");
const originalSum = sum(original);
let pass = 0;

for (const c of CASES) {
  if (!original.includes(c.find)) {
    console.error(`ANCHOR LOST: ${c.name} — its find text is not in lib/waypoints.js. The case cannot land.`);
    process.exit(1);
  }
  const mutated = original.replace(c.find, c.repl);
  if (mutated === original) { console.error(`${c.name}: EDIT NEVER LANDED (no-op replace)`); process.exit(1); }
  writeFileSync(FILE, mutated);
  const landed = sum(readFileSync(FILE, "utf8")) !== originalSum;

  let out = "", code = 0;
  try { out = execFileSync("node", [GUARD], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status ?? 1; out = String(e.stdout || "") + String(e.stderr || ""); }

  writeFileSync(FILE, original);
  const restored = sum(readFileSync(FILE, "utf8")) === originalSum;

  // Match the expected text ON A FAIL LINE, never `"FAIL - " + expect` — the guard prefixes each
  // line with the assertion's own label, so demanding the expect at the START of it reported a
  // guard firing on exactly the right rule as a WRONG FAILURE. A case that reports MISSED while the
  // guard is innocent is worse than no case.
  const failLines = out.split("\n").filter((l) => l.startsWith("FAIL"));
  const fired = code !== 0 && failLines.some((l) => l.includes(c.expect));
  const good = c.expect === null ? code === 0 : fired;
  const verdict = !landed ? "EDIT NEVER LANDED"
    : !restored ? "FILE NOT RESTORED"
    : good ? (c.expect === null ? "SILENT (correct)" : "CAUGHT")
    : c.expect === null ? `WRONGLY FIRED (exit ${code})`
    : code === 0 ? "MISSED" : `WRONG FAILURE (exit ${code})`;
  if (landed && restored && good) pass++;
  console.log(`${verdict.padEnd(20)} ${c.name.padEnd(22)} ${c.why}`);
  if (landed && restored && !good && code !== 0) {
    console.log(`    it failed, but not on "${c.expect}". Got:`);
    for (const l of out.split("\n").filter((l) => l.startsWith("FAIL"))) console.log(`      ${l}`);
  }
}

console.log(`\n${pass}/${CASES.length}`);
if (sum(readFileSync(FILE, "utf8")) !== originalSum) {
  console.error("lib/waypoints.js was NOT restored byte-identically. Fix that before anything else.");
  process.exit(1);
}
process.exit(pass === CASES.length ? 0 : 1);
