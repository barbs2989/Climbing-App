// Is check:preview-claims measuring anything?
//
// Since the 2026-09-30 owner decision the guard FORBIDS preview wording in toasts. Its healthy output
// is "every toast reads as the finished app", which is exactly what a guard that read no toasts would
// print. So real historical preview strings are put back, one at a time, and the guard must fail.
//
// Two cases must stay SILENT or fail CLOSED: a signed-out "on this device — sign in to keep it" is
// true in the finished app and must pass, and a renamed toast function must fail closed rather than
// report a clean app.
//
// Every case proves its edit LANDED by checksum and restores the file byte-identically. Do not
// commit while this runs: it edits an app source in place.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const F = path.join(ROOT, "ClimbMatch.jsx");
const GUARD = path.join(ROOT, "scripts/check-preview-claims.mjs");
const sum = () => crypto.createHash("sha1").update(fs.readFileSync(F)).digest("hex");

// Real historical strings (as they stood before 2026-09-30), restored one at a time.
const CASES = [
  { name: "kudos",
    why: "the friends-feed kudos toast as it stood: 'this preview doesn’t deliver it'",
    find: 'onKudos={it=>showToast("Kudos sent to "+pubFirst(it.f))}',
    repl: 'onKudos={it=>showToast("Kudos noted — this preview doesn’t deliver it to "+it.f.name.split(" ")[0]+".")}',
    expect: /this preview/ },
  { name: "democrew",
    why: "a signed-in climber messaging a seed crew was told 'Demo crew'",
    find: 'showToast("Couldn’t save that message — it’s on your screen but not saved. Try again.");});}\n  };\n  const sendMsg=',
    repl: 'showToast("Couldn’t save that message — it’s on your screen but not saved. Try again.");});}else if(uid){showToast("Demo crew — messages here stay on this device and won’t be saved.");}\n  };\n  const sendMsg=',
    expect: /Demo crew/ },
  { name: "fornow",
    why: "the group member removal suffix '— on this device only for now'",
    find: 'showToast("Removed "+pubFirst(c)+" from the group"+(uid?"":" on this device — sign in to keep it"));',
    repl: 'showToast("Removed "+pubFirst(c)+" from the group"+(_dbr?"":" — on this device only for now"));',
    expect: /only for now/ },
  { name: "simulated",
    why: "the résumé PDF button toasted '(simulated in this preview)' and exported nothing",
    find: 'onExport={(t,h)=>printSheet(t,h,showToast)}',
    repl: 'onExport={()=>showToast("Résumé exported as PDF (simulated in this preview).")}',
    expect: /simulated/ },
  { name: "heading",
    why: "a heading promising an outcome of approving, true of only half the rows it covers",
    find: '"Climbers asking to join a group you moderate."',
    repl: '"Climbers asking to join a group you moderate — approving adds them."',
    expect: /promises an outcome of approving/ },
  { name: "signedout", silent: true,
    why: "the signed-out caveat is true in the finished app and must NOT be flagged",
    find: 'showToast("RSVP cancelled");',
    repl: 'showToast("RSVP cancelled on this device — sign in to keep it");' },
  { name: "renamed", dead: true,
    why: "if the toast function is renamed the guard reads nothing — it must say so, not pass",
    all: (s) => s.split("showToast(").join("showT0ast(") },
];

const before = sum();
const orig = fs.readFileSync(F, "utf8");

let clean = "";
try { clean = execFileSync("node", [GUARD], { encoding: "utf8" }); }
catch (e) { console.error("the guard already fails on a clean tree:\n" + (e.stdout || "")); process.exit(2); }
for (const c of CASES) {
  if (c.expect && c.expect.test(clean)) {
    console.error(`HARNESS BUG: ${c.name}'s expectation matches the HEALTHY run, so it cannot discriminate.`);
    process.exit(2);
  }
}

let bad = 0;
for (const c of CASES) {
  let next;
  if (c.all) next = c.all(orig);
  else {
    const n = orig.split(c.find).length - 1;
    if (n !== 1) { console.log(`${c.name}: HARNESS — find matched ${n} times, not 1\n`); bad++; continue; }
    next = orig.replace(c.find, c.repl);
  }
  fs.writeFileSync(F, next, "utf8");
  const landed = sum() !== before;

  let out = "", code = 0;
  try { out = execFileSync("node", [GUARD], { encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); code = e.status; }
  fs.writeFileSync(F, orig, "utf8");
  const restored = sum() === before;

  let verdict;
  if (c.dead) verdict = (code === 2 && /BROKEN/.test(out)) ? "FAILED CLOSED (correct)" : "did NOT fail closed";
  else if (c.silent) verdict = (code === 0) ? "SILENT (correct)" : "FIRED — false positive";
  else verdict = (code === 1 && c.expect.test(out)) ? "CAUGHT" : "MISSED";

  if (/MISSED|false positive|did NOT/.test(verdict)) bad++;
  console.log(`${c.name}: ${verdict}   (edit landed: ${landed}, restored byte-identical: ${restored}, exit ${code})`);
  console.log(`   ${c.why}\n`);
}

if (sum() !== before) { console.error("ClimbMatch.jsx was NOT restored"); process.exit(2); }
console.log(bad ? `FAILED — ${bad} case(s) wrong` : `ok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
