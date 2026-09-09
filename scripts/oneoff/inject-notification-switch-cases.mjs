// Does `check:notification-switches` actually catch what it claims to?
//
// Its healthy output is "every switch governs something it names, each remembered", which is also
// exactly what a broken guard prints. So each case edits the tree, proves the edit LANDED by
// checksum, runs the guard, and judges it on the guard's OWN failure text rather than on an exit
// code — an edit that trips a different assertion, or a fail-closed branch, is not a catch.
//
// Every file is restored byte-identically. Do not commit while this is running.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const MOD = path.join(ROOT, "lib", "notif-pref.js");
const sum = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const CASES = [
  {
    name: "messages-switch-restored",
    why: "THE REAL DEFECT: a switch whose category no notification carries. Restored verbatim.",
    file: APP,
    edit: (s) => s.replace(
      '[["crew","Crew updates","Day proposals, members joining, ready to climb"],',
      '[["crew","Crew updates","Day proposals, members joining, ready to climb"],["messages","Messages","New direct & crew messages"],'),
    expect: /suppresses nothing/,
  },
  {
    name: "seed-not-from-storage",
    why: "the stored choice is written and never read back — the switches open all-on every load",
    file: APP,
    edit: (s) => s.replace("=useState(loadNotifPrefs)", "=useState({crew:true,conditions:true,requests:true})"),
    expect: /not seeded from loadNotifPrefs/,
  },
  {
    name: "toggle-does-not-save",
    why: "the choice is read back but never written — it lasts exactly one session",
    file: APP,
    edit: (s) => s.replace("saveNotifPrefs(n);return n;", "return n;"),
    expect: /does not call saveNotifPrefs/,
  },
  {
    name: "stored-key-with-no-switch",
    why: "a key left in the module after its switch is gone — a preference nobody can reach",
    file: MOD,
    edit: (s) => s.replace('const FLAGS = ["crew"', 'const FLAGS = ["messages", "crew"'),
    expect: /which no switch offers/,
  },
  {
    name: "switch-the-module-does-not-store",
    why: "a switch added to the UI and not to the module — it would revert on every reload",
    file: APP,
    // TWO edits, and both are needed to test the rule this case NAMES. A new switch whose key no
    // notification carries trips rule 1 ("suppresses nothing") instead, and the run then proves
    // nothing about the stored-keys comparison — my first version did exactly that and reported a
    // MISS against a guard that was working. So the case also TAGS a notification with the new
    // key, which is what an author adding a switch properly would do, leaving the module as the
    // only thing out of step.
    edit: (s) => s
      .replace('["requests","Requests & vouches","Friend / crew requests and vouches"]]',
               '["requests","Requests & vouches","Friend / crew requests and vouches"],["photos","Photo tags","Someone tagged you in a route photo"]]')
      .replace('{id:"nk",icon:"",climberId:1,', '{id:"nk",icon:"",cat:"photos",climberId:1,'),
    expect: /does not store it/,
    skipIf: (s) => !s.includes('["requests","Requests & vouches","Friend / crew requests and vouches"]]'),
  },
  {
    name: "default-muted",
    why: "unset would mean HIDDEN — the one failure of this feature nobody reports, they just never see the invite",
    file: MOD,
    edit: (s) => s.replace("DEFAULT_NOTIF_ON = true", "DEFAULT_NOTIF_ON = false"),
    expect: /would have alerts hidden/,
  },
  {
    name: "SILENT-untagged-notification",
    why: "MUST PASS — an app prompt no switch names is correctly untagged and always shown. A guard that demanded a cat on every notification would forbid that.",
    file: APP,
    edit: (s) => s.replace('{id:"n3",icon:"",text:"Finish verification', '{id:"n3x",icon:"",text:"A brand new untagged prompt",read:false},{id:"n3",icon:"",text:"Finish verification'),
    expect: null,
  },
  {
    name: "SILENT-extra-tagged-notification",
    why: "MUST PASS — tagging one more notification into an existing category is ordinary work",
    file: APP,
    edit: (s) => s.replace('{id:"nk",icon:"",climberId:1,', '{id:"nk",icon:"",cat:"crew",climberId:1,'),
    expect: null,
  },
];

let pass = 0, fail = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  if (c.skipIf && c.skipIf(before)) { console.log(`SKIP  ${c.name} — its anchor is not in the tree`); fail++; continue; }
  const after = c.edit(before);
  if (after === before) { console.log(`HARNESS BUG  ${c.name}: the edit changed nothing — it proves nothing about the guard`); fail++; continue; }
  fs.writeFileSync(c.file, after);
  if (sum(c.file) === beforeSum) { console.log(`HARNESS BUG  ${c.name}: checksum unmoved`); fs.writeFileSync(c.file, before); fail++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts", "check-notification-switches.mjs")], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); code = e.status ?? 1; }

  fs.writeFileSync(c.file, before);
  if (sum(c.file) !== beforeSum) { console.log(`HARNESS BUG  ${c.name}: file not restored byte-identically`); fail++; continue; }

  if (c.expect === null) {
    // Silent cases are judged on the FAIL lines only. A guard that went quiet by breaking would
    // also print nothing, so a fail-closed exit must not read as silence.
    if (/BROKEN GUARD/.test(out)) { console.log(`MISS  ${c.name}: expected silence, got a fail-closed branch\n${out.trim().split("\n").slice(-3).join("\n")}`); fail++; }
    else if (code === 0 && !/^FAIL/m.test(out)) { console.log(`ok    ${c.name} — correctly silent`); pass++; }
    else { console.log(`MISS  ${c.name}: fired on correct work\n${out.split("\n").filter((l) => l.startsWith("FAIL")).join("\n")}`); fail++; }
  } else {
    const fails = out.split("\n").filter((l) => l.startsWith("FAIL")).join("\n");
    if (code !== 0 && c.expect.test(fails)) { console.log(`ok    ${c.name} — caught, by its own message`); pass++; }
    else { console.log(`MISS  ${c.name} (${c.why})\n  exit=${code}\n${out.trim().split("\n").slice(-6).map((l) => "  " + l).join("\n")}`); fail++; }
  }
}
console.log(`\n${pass}/${CASES.length} cases behaved as specified`);
process.exit(fail ? 1 : 0);
