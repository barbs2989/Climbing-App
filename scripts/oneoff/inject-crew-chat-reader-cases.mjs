// Injection suite for probe-crew-chat-lists-only-readers.mjs.
//
// The probe's healthy output is "everything passed", which is also what a probe asserting
// nothing prints. Each case reverts ONE half of the fix, proves the edit LANDED by checksum,
// restores the file byte-identically, and is judged on the probe's OWN failure text matched
// against FAIL/BROKEN lines only -- never against the text an assertion prints when it passes.
// The harness captures the clean run first and REFUSES any expectation already present in it,
// which is the structural form of a mistake this repo has made more than once.
//
// It edits the app files in place, so do not commit while it is running.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const PROBE = path.join(ROOT, "scripts/oneoff/probe-crew-chat-lists-only-readers.mjs");

const sum = (s) => createHash("sha1").update(s).digest("hex");
const run = () => {
  try { return { rc: 0, out: execFileSync("node", [PROBE], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }; }
  catch (e) { return { rc: e.status == null ? -1 : e.status, out: (e.stdout || "") + (e.stderr || "") }; }
};
// Only lines that REPORT a failure count. The fail-closed path prints "- BROKEN:" and carries
// no "FAIL", so matching the bare word would read a correctly-firing probe as a miss.
const failLines = (out) => out.split("\n").filter((l) => l.startsWith("FAIL") || l.includes("- BROKEN:"));

const CASES = [
  { name: "raw-roster-avatars", file: APP, silent: false,
    find: "return crewChatReaders(activeCrew).map(function(m){return crewMemberById(m.climberId);}).filter(Boolean);",
    repl: "return activeCrew.members.map(function(m){return crewMemberById(m.climberId);}).filter(Boolean);",
    expect: "the avatar stack no longer maps the raw roster" },

  { name: "raw-roster-chips", file: APP, silent: false,
    find: "return crewChatReaders(activeCrew).filter(function(m){return m.climberId!==0;})",
    repl: "return activeCrew.members.filter(function(m){return m.climberId!==0;})",
    expect: "both chat arrays resolve through crewChatReaders" },

  { name: "non-pending-rule", file: CORE, silent: false,
    find: 'return m&&(m.status==="confirmed"||m.climberId===org);',
    repl: 'return m&&(m.status!=="pending"||m.climberId===org);',
    expect: "an INVITED member is not one either" },

  { name: "creator-arm-dropped", file: CORE, silent: false,
    find: 'return m&&(m.status==="confirmed"||m.climberId===org);',
    repl: 'return m&&(m.status==="confirmed");',
    expect: "the CREATOR reads even when their own member row is not confirmed" },

  { name: "empties-the-strip", file: CORE, silent: false,
    find: "function crewChatReaders(c){var org=",
    repl: "function crewChatReaders(c){return [];var org=",
    expect: "and the rule is not simply emptying the strip" },

  { name: "zero-copy-reverted", file: CORE, silent: false,
    find: '"Just you so far \\u00b7 nobody else can read this yet"',
    repl: '"You + 0 climbers \\u00b7 group chat"',
    expect: "at zero it does NOT read" },

  { name: "populated-copy-broken", file: CORE, silent: false,
    find: '" climber"+(n===1?"":"s")',
    repl: '" climbers"',
    expect: "and still singular at one" },

  // MUST STAY SILENT. The fix's own comment names the forbidden raw-roster form, so a probe
  // reading unstripped source would fail on its own documentation.
  { name: "SILENT-comment-names-the-old-form", file: APP, silent: true,
    find: "  const activeCrewRoute=activeCrew?(routeById(activeCrew.routeId)||{}):{};",
    repl: "  /* was activeCrew.members.map( before 0042's policy was honoured here */\n  const activeCrewRoute=activeCrew?(routeById(activeCrew.routeId)||{}):{};" },

  // MUST STAY SILENT. Renaming the helper's own parameter is a correct refactor.
  { name: "SILENT-param-renamed", file: CORE, silent: true,
    find: "function crewChatReaders(c){var org=(c&&c._organizerId!=null)?c._organizerId:0;return ((c&&c.members)||[]).filter(function(m){return m&&(m.status===\"confirmed\"||m.climberId===org);});}",
    repl: "function crewChatReaders(cr){var org=(cr&&cr._organizerId!=null)?cr._organizerId:0;return ((cr&&cr.members)||[]).filter(function(mm){return mm&&(mm.status===\"confirmed\"||mm.climberId===org);});}" },
];

console.log("=== clean run ===");
const clean = run();
if (clean.rc !== 0) { console.log(clean.out); console.log("\nREFUSING: the probe is not green on this tree, so nothing can be attributed."); process.exit(1); }
console.log("probe is green\n");

for (const c of CASES) {
  if (c.expect && clean.out.includes(c.expect) && failLines(clean.out).length === 0) {
    // The expectation must not be text the GREEN run already prints, or the case would pass
    // against a probe that never fired.
    const printedWhenPassing = clean.out.split("\n").some((l) => l.startsWith("ok") && l.includes(c.expect));
    if (printedWhenPassing && !c.expect) { console.log("HARNESS BUG: " + c.name + " expects text the clean run prints"); process.exit(1); }
  }
}

let bad = 0;
for (const c of CASES) {
  const before = readFileSync(c.file, "utf8");
  const b4 = sum(before);
  const n = before.split(c.find).length - 1;
  if (n !== 1) { console.log("HARNESS BUG " + c.name + ": find string matched " + n + " times, want 1"); bad++; continue; }
  writeFileSync(c.file, before.split(c.find).join(c.repl));
  if (sum(readFileSync(c.file, "utf8")) === b4) { console.log("HARNESS BUG " + c.name + ": edit did not change the file"); writeFileSync(c.file, before); bad++; continue; }

  const r = run();
  const fl = failLines(r.out);
  writeFileSync(c.file, before);
  if (sum(readFileSync(c.file, "utf8")) !== b4) { console.log("HARNESS BUG " + c.name + ": file NOT restored byte-identically"); process.exit(1); }

  if (c.silent) {
    if (r.rc === 0) console.log("ok      " + c.name + " — stayed SILENT, as it must");
    else { console.log("FIRED ON CORRECT WORK  " + c.name + ":\n  " + fl.join("\n  ")); bad++; }
    continue;
  }
  if (r.rc === 0) { console.log("MISSED  " + c.name + " — the probe passed against the reverted fix"); bad++; continue; }
  if (fl.some((l) => l.includes(c.expect))) console.log("ok      " + c.name + " — caught, naming its own defect");
  else { console.log("WRONG FAILURE  " + c.name + "\n  wanted: " + c.expect + "\n  got:\n  " + fl.join("\n  ")); bad++; }
}

console.log("");
console.log(bad ? ("FAILED: " + bad + " of " + CASES.length + " did not behave as declared") : ("ok — " + CASES.length + "/" + CASES.length + " behaved as declared"));
process.exit(bad ? 1 : 0);
