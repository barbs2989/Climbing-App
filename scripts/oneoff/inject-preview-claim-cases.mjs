// Is check:preview-claims measuring anything?
//
// Its healthy output is "every client-only control says what this preview does not do", which is
// exactly what a guard whose anchors all missed would print -- except that a missed anchor is a
// FAILURE here, which is the point of ANCHOR LOST. So each of the nine original messages is put
// back, verbatim as it stood on main, and the guard has to fail NAMING that control.
//
// Two cases must stay SILENT. A guard that only ever demands more apologising would drive authors
// to caveat working features, so a reworded caveat must pass and a control that gains a REAL write
// must be removable without the guard arguing.
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

// The real historical strings, restored one at a time.
const CASES = [
  { name: "joined",
    why: "the sample group-invite Accept as it stood: 'Joined Alpine Start' with no caveat",
    find: 'showToast("Joined "+cl.name+" on this device — this preview doesn’t tell the group.");',
    repl: 'showToast("Joined "+cl.name+" ");',
    expect: /accepting a group invite reports a real outcome/ },
  { name: "approved",
    why: "'Approved — Reed added', on a card whose own heading said approving adds them",
    find: 'showToast("Approved on this device — this preview doesn’t tell "+(who?who.name.split(" ")[0]:"them")+".");',
    repl: 'showToast("Approved — "+(who?who.name.split(" ")[0]:"member")+" added");',
    expect: /approving a join request reports a real outcome/ },
  { name: "eventcreated",
    why: "'Event created — 4 occurrences scheduled', the strongest claim of the nine; nothing is stored",
    find: 'showToast(rep!=="none"?("Event created on this device — "+n+" occurrences, but this preview doesn’t share it with the group yet."):"Event created on this device — this preview doesn’t share it with the group yet.");',
    repl: 'showToast(rep!=="none"?("Event created — "+n+" occurrences scheduled "):"Event created ");',
    expect: /creating an event reports a real outcome/ },
  { name: "kudos",
    why: "'Kudos sent to X' — while its own sibling already said 'this preview doesn’t deliver it to'",
    find: 'onKudos={it=>showToast("Kudos noted — this preview doesn’t deliver it to "+it.f.name.split(" ")[0]+".")}',
    repl: 'onKudos={it=>showToast("Kudos sent to "+it.f.name.split(" ")[0])}',
    expect: /kudos from the friends feed reports a real outcome/ },
  { name: "heading",
    why: "the section heading claiming approving adds them — on screen the whole time, not for 2.6s",
    find: '"Climbers asking to join a group you moderate. Approving adds them on this device — this preview doesn’t tell them or the group."',
    repl: '"Climbers asking to join a group you moderate — approving adds them."',
    expect: /section heading promises approving adds them/ },
  { name: "anchorlost",
    why: "a control whose handler is rewritten must fail LOUD, not silently stop being checked",
    find: 'onNudge={(cid,nm,mid)=>{showToast(',
    repl: 'onNudge={(cid,nm,mID)=>{showToast(',
    expect: /ANCHOR LOST for nudging a crew member/ },
  { name: "reworded", silent: true,
    why: "a DIFFERENT honest wording must pass — the admission is fixed, the words are not",
    find: 'showToast("Joined "+cl.name+" on this device — this preview doesn’t tell the group.");',
    repl: 'showToast("Joined "+cl.name+" — saved on this device only for now.");' },
  { name: "vocabgone", dead: true,
    why: "if the app stops using the convention at all, every assertion here is vacuous — say so",
    all: (s) => s.split("this preview").join("this pre_view") },
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
  if (c.dead) verdict = (code === 2 && /convention/.test(out)) ? "FAILED CLOSED (correct)" : "did NOT fail closed";
  else if (c.silent) verdict = (code === 0) ? "SILENT (correct)" : "FIRED — false positive";
  else verdict = (code === 1 && c.expect.test(out)) ? "CAUGHT" : "MISSED";

  if (/MISSED|false positive|did NOT/.test(verdict)) bad++;
  console.log(`${c.name}: ${verdict}   (edit landed: ${landed}, restored byte-identical: ${restored}, exit ${code})`);
  console.log(`   ${c.why}\n`);
}

if (sum() !== before) { console.error("ClimbMatch.jsx was NOT restored"); process.exit(2); }
console.log(bad ? `FAILED — ${bad} case(s) wrong` : `ok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
