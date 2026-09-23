// Injection suite for probe-crew-readiness-is-derived-once.mjs.
//
// Each case reverts ONE half of the consolidation, proves the edit LANDED by checksum, restores
// the file byte-identically, and is judged on the probe's OWN failure text matched against
// FAIL/BROKEN lines only -- never the text an assertion prints when it passes. The harness
// captures the clean run first and refuses to attribute anything if the probe is not green.
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
const PROBE = path.join(ROOT, "scripts/oneoff/probe-crew-readiness-is-derived-once.mjs");

const sum = (s) => createHash("sha1").update(s).digest("hex");
const run = () => {
  try { return { rc: 0, out: execFileSync("node", [PROBE], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) }; }
  catch (e) { return { rc: e.status == null ? -1 : e.status, out: (e.stdout || "") + (e.stderr || "") }; }
};
const failLines = (out) => out.split("\n").filter((l) => l.startsWith("FAIL") || l.includes("- BROKEN:"));

const CASES = [
  // The real historical defect, restored verbatim.
  { name: "isready-skips-your-row", file: CORE, silent: false,
    find: "function isReady(c,hasMessages){return !!(c&&crewAllConfirmed(c)&&",
    repl: 'function isReady(c,hasMessages){return !!(c&&crewInCrew(c).filter(m=>m.climberId!==0).every(m=>m.status==="confirmed")&&',
    expect: "isReady no longer calls a crew you have not accepted READY" },

  { name: "celebration-rederives-it", file: APP, silent: false,
    find: "var rdy=crewAllConfirmed(c)",
    repl: 'var rdy=c.members&&c.members.length>0&&crewInCrew(c).every(function(m){return m.status==="confirmed";})',
    expect: "and so does the celebration" },

  { name: "vacuous-on-an-empty-crew", file: CORE, silent: false,
    find: "return inC.length>0&&inC.every(function(m){return m.status===\"confirmed\";});",
    repl: "return inC.every(function(m){return m.status===\"confirmed\";});",
    expect: "a crew with nobody in it is not unanimous" },

  { name: "a-requester-blocks-readiness", file: CORE, silent: false,
    find: "function crewAllConfirmed(c){var inC=crewInCrew(c);",
    repl: "function crewAllConfirmed(c){var inC=((c&&c.members)||[]);",
    expect: "a climber who only ASKED to join does not block it" },

  { name: "always-confirmed", file: CORE, silent: false,
    find: "function crewAllConfirmed(c){var inC=",
    repl: "function crewAllConfirmed(c){return true;var inC=",
    expect: "an invite YOU have not answered is not 'everyone confirmed'" },

  // The load-bearing negative: sweeping the DATE test in too would make the celebration claim
  // everyone confirmed a day the organiser forced.
  { name: "date-test-swept-in-too", file: APP, silent: false,
    find: "&&datesAgreed(c)&&!!(c.meetPlace&&c.meetTime)&&(crewMsgs[c.id]||[]).length>0;",
    repl: "&&(datesAgreed(c)||(c.date&&c.dateForced))&&!!(c.meetPlace&&c.meetTime)&&(crewMsgs[c.id]||[]).length>0;",
    expect: "it still refuses a FORCED date" },

  { name: "chat-requirement-dropped", file: APP, silent: false,
    find: "&&!!(c.meetPlace&&c.meetTime)&&(crewMsgs[c.id]||[]).length>0;",
    repl: "&&!!(c.meetPlace&&c.meetTime);",
    expect: "and still requires the chat to have started" },

  // MUST STAY SILENT -- a comment quoting the old expression is this fix's own documentation.
  { name: "SILENT-comment-quotes-the-old-form", file: CORE, silent: true,
    find: "const CREW_ARCHIVE_GRACE_DAYS=3;",
    repl: '/* was crewInCrew(c).filter(m=>m.climberId!==0).every(m=>m.status==="confirmed") */\nconst CREW_ARCHIVE_GRACE_DAYS=3;' },

  // MUST STAY SILENT -- renaming the helper's own local is a correct refactor.
  { name: "SILENT-local-renamed", file: CORE, silent: true,
    find: "function crewAllConfirmed(c){var inC=crewInCrew(c);return inC.length>0&&inC.every(function(m){return m.status===\"confirmed\";});}",
    repl: "function crewAllConfirmed(c){var rows=crewInCrew(c);return rows.length>0&&rows.every(function(m){return m.status===\"confirmed\";});}" },
];

console.log("=== clean run ===");
const clean = run();
if (clean.rc !== 0) { console.log(clean.out); console.log("\nREFUSING: the probe is not green on this tree, so nothing can be attributed."); process.exit(1); }
for (const c of CASES) {
  if (!c.silent && clean.out.split("\n").some((l) => l.startsWith("FAIL") && l.includes(c.expect))) {
    console.log("HARNESS BUG: " + c.name + " expects text the CLEAN run already fails with"); process.exit(1);
  }
}
console.log("probe is green\n");

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
