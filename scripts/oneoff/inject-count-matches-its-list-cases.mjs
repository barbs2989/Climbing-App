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

// The "View all N alerts" control exactly as it stood before the fix: the count is the notifs
// array alone, over a panel that also renders the requests. Spliced back rather than paraphrased,
// so case 4 reproduces the shipped defect rather than something that resembles it.
const VIEW_ALL_STYLE = 'style={{width:"100%",background:"none",border:"none",color:C.blue,fontSize:12.5,fontWeight:700,cursor:"pointer",padding:"6px 0",textAlign:"left"}}';
const PRE_FIX_VIEW_ALL = '{mergedNotifs.length>8?<button onClick={()=>{setAlertsOpen(false);setNotifOpen(true);}} '
  + VIEW_ALL_STYLE + '>{"View all "+mergedNotifs.length+" alerts"}</button>:null}';
const replaceViewAll = (s, withText) => {
  const a = s.indexOf("{(function(){/* This button LEAVES");
  if (a < 0) return s;
  const e = s.indexOf(":null;})()}", a);
  if (e < 0) return s;
  return s.slice(0, a) + withText + s.slice(e + ":null;})()}".length);
};

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
  {
    name: "view-all-counted-only-the-notifs",
    why: "REAL DEFECT 4: the bell read 15 and the button below it said \"View all 14 alerts\" about the same panel",
    edit: (s) => replaceViewAll(s, PRE_FIX_VIEW_ALL),
    expect: /never counts _notifRequests/,
  },
  {
    name: "gate-and-count-ask-about-different-lists",
    why: "the number describes the panel while the condition beside it asks about one of its two lists",
    edit: (s) => s.replace("return _all>_shown?", "return mergedNotifs.length>8?"),
    expect: /describe two different lists/,
  },
  {
    name: "requests-counted-only-in-a-comment",
    why: "presence is not use — a comment naming the array must not read as counting it",
    edit: (s) => s.replace("_all=_notifRequests.length+mergedNotifs.length",
      "_all=mergedNotifs.length/* _notifRequests is what the bell adds */"),
    expect: /never counts _notifRequests/,
  },
  {
    name: "SILENT-label-reworded",
    why: "MUST PASS — a guard pinned to one phrasing forbids improving the copy",
    edit: (s) => s.replace('{"View all "+_all+" alerts"}', '{"See all "+_all+" alerts"}'),
    expect: null,
  },
  {
    name: "SILENT-the-past-crews-control-changed",
    why: "MUST PASS — a sibling control sharing the words \"View all\" opens somewhere else entirely",
    edit: (s) => s.replace('"View all "+pastCrews.length+" past crews"', '"Show all "+pastCrews.length+" past crews"'),
    expect: null,
  },
];

// THE USUAL "refuse an expectation that matches the CLEAN run" GUARD IS DELIBERATELY NOT USED
// HERE, and trying it is what established why: this guard prints the array's NAME on its ok line
// and on its FAIL line alike ("accounts for myCrewInvitesQ" / "does not test it ... myCrewInvitesQ"),
// so every correct expectation legitimately appears in a green run and the check refuses the whole
// suite. What protects against writing a needle against PASSING text is that every case is judged
// on FAIL lines only, which it is below.
//
// What IS checked first is that the guard is green on this tree at all: against a dirty tree no
// case is attributable, and a MISS then reads as a guard defect.
try { execFileSync("node", [path.join(ROOT, "scripts", "check-count-matches-its-list.mjs")], { cwd: ROOT, encoding: "utf8" }); }
catch (e) { console.log("HARNESS BUG: the guard is not green on this tree, so no case is attributable"); process.exit(1); }

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
