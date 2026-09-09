// Does `check:count-matches-its-list` catch what it claims to?
//
// Its healthy output is "every count agrees with the list under it", which is also what a broken
// guard prints. Each case edits the tree, proves the edit LANDED by checksum, runs the guard, and
// is judged on the guard's OWN failure text — an edit that trips a different assertion, or a
// fail-closed branch, is not a catch. Every file is restored byte-identically.
//
// Do not commit while this is running.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const sum = () => crypto.createHash("sha256").update(fs.readFileSync(APP)).digest("hex");

const CASES = [
  {
    name: "reqn-misses-db-crew-invites",
    why: "REAL DEFECT 1: Home listed a DB crew invite and its gate did not count it",
    edit: (s) => s.replace("const reqN=_pendingForMe;",
      "const reqN=friendReqIn.length+crewReqIn.length+groupReqs.length+crewJoinIn.length;"),
    expect: /does not test it.*|myCrewInvitesQ/,
  },
  {
    name: "gate-misses-day-confirmations",
    why: "REAL DEFECT 2: a crew waiting on YOU to confirm a day was listed and not counted",
    edit: (s) => s.replace("&&!crewsNeedingMyDay.length", ""),
    expect: /crewsNeedingMyDay/,
  },
  {
    name: "bell-counts-what-the-panel-does-not-list",
    why: "REAL DEFECT 3: the badge counted crew invites and group requests the panel never renders",
    edit: (s) => s.replace("{(_notifRequests.length+mergedNotifs.filter(n=>!n.read).length)>0?",
      "{(friendReqIn.length+crewReqIn.length+groupReqs.length+mergedNotifs.filter(n=>!n.read).length)>0?")
      .replace("{_notifRequests.length+mergedNotifs.filter(n=>!n.read).length}",
        "{friendReqIn.length+crewReqIn.length+groupReqs.length+mergedNotifs.filter(n=>!n.read).length}"),
    expect: /does not count the array NotifPanel renders/,
  },
  {
    name: "panel-list-inlined-again",
    why: "the panel's list goes back to an inline expression, so nothing else can count the same array",
    edit: (s) => s.replace("<NotifPanel requests={_notifRequests}",
      "<NotifPanel requests={friendReqIn.map(_reqClimber).filter(Boolean)}"),
    expect: /is an expression rather than a named array/,
  },
  {
    name: "a-NEW-source-added-to-the-list-only",
    why: "the rule must generalise past the three known instances — a source nobody has thought of yet",
    edit: (s) => s.replace("var unfinished=[];",
      'var unfinished=[];pendingGearLoans.forEach(function(g){unfinished.push({icon:"crews",text:"Gear loan",go:function(){}});});'),
    expect: /pendingGearLoans/,
  },
  {
    name: "SILENT-source-added-to-BOTH",
    why: "MUST PASS — adding a source to the list and to the gate is ordinary correct work",
    edit: (s) => s
      .replace("var unfinished=[];",
        'var unfinished=[];pendingGearLoans.forEach(function(g){unfinished.push({icon:"crews",text:"Gear loan",go:function(){}});});')
      .replace("{(!reqN&&", "{(!reqN&&!pendingGearLoans.length&&"),
    expect: null,
  },
  {
    name: "SILENT-gate-covers-more-than-the-list",
    why: "MUST PASS — the rule is one-directional; a gate may test something the list does not build from",
    edit: (s) => s.replace("{(!reqN&&", "{(!reqN&&!somethingElseEntirely.length&&"),
    expect: null,
  },
];

let pass = 0, fail = 0;
for (const c of CASES) {
  const before = fs.readFileSync(APP, "utf8");
  const beforeSum = sum();
  const after = c.edit(before);
  if (after === before) { console.log(`HARNESS BUG  ${c.name}: the edit changed nothing`); fail++; continue; }
  fs.writeFileSync(APP, after);
  if (sum() === beforeSum) { console.log(`HARNESS BUG  ${c.name}: checksum unmoved`); fs.writeFileSync(APP, before); fail++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts", "check-count-matches-its-list.mjs")], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); code = e.status ?? 1; }

  fs.writeFileSync(APP, before);
  if (sum() !== beforeSum) { console.log(`HARNESS BUG  ${c.name}: file not restored byte-identically`); fail++; continue; }

  const fails = out.split("\n").filter((l) => l.startsWith("FAIL")).join("\n");
  if (c.expect === null) {
    if (/BROKEN GUARD/.test(out)) { console.log(`MISS  ${c.name}: expected silence, got a fail-closed branch`); fail++; }
    else if (code === 0 && !fails) { console.log(`ok    ${c.name} — correctly silent`); pass++; }
    else { console.log(`MISS  ${c.name}: fired on correct work\n${fails}`); fail++; }
  } else if (code !== 0 && c.expect.test(fails)) { console.log(`ok    ${c.name} — caught, by its own message`); pass++; }
  else { console.log(`MISS  ${c.name} (${c.why})\n  exit=${code}\n${out.trim().split("\n").slice(-5).map((l) => "  " + l).join("\n")}`); fail++; }
}
console.log(`\n${pass}/${CASES.length} cases behaved as specified`);
process.exit(fail ? 1 : 0);
