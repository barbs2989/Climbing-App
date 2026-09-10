#!/usr/bin/env node
// Injection cases for check:seed-history's VOUCH PICKER section.
//
// Its healthy output is "everything passed", which is also what a guard asking nothing prints.
// Each case proves its edit LANDED by checksum, restores ClimbMatchCore.jsx byte-identically, and
// names the text its OWN failure must carry — matched against FAIL lines only, because an
// expectation taken from the text an assertion prints when it PASSES reports MISSED against a
// guard firing correctly. The harness also refuses any expectation already present in the GREEN
// run.
//
// TWO cases must stay SILENT, and they are the load-bearing half: the prompt is DERIVED from the
// source, so rewording it is ordinary work, and the seed path must keep listing seed climbs —
// a rule that only ever withheld them would be satisfied by emptying the picker for everyone.
//
//   node scripts/oneoff/inject-vouch-picker-cases.mjs

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = path.join(ROOT, "ClimbMatchCore.jsx");
const LOCK = path.join(ROOT, ".vouch-picker-injection.lock");

try { fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" }); }
catch { console.error("another run of this suite is in flight (.vouch-picker-injection.lock). Refusing."); process.exit(1); }
const release = () => { try { fs.rmSync(LOCK, { force: true }); } catch {} };
process.on("exit", release);
process.on("SIGINT", () => { release(); process.exit(1); });

const sha = () => crypto.createHash("sha256").update(fs.readFileSync(FILE)).digest("hex");
const run = () => {
  const r = spawnSync("node", [path.join(ROOT, "scripts", "check-seed-history.mjs")], { cwd: ROOT, encoding: "utf8" });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
};

const ORIGINAL = fs.readFileSync(FILE, "utf8");
const BASE = sha();

const clean = run();
if (clean.code !== 0) { console.error("BASELINE NOT GREEN — fix the guard first.\n" + clean.out.slice(-1500)); process.exit(1); }
console.log("baseline green\n");
const cleanText = clean.out;

const SEED = "var seedMs=USE_DB?[]:ROUTES.filter(";
const PROMPT = ':!q?"Search for the climb you did together":"No climbs match."';

const cases = [
  {
    name: "THE REAL DEFECT: the picker offers the seed demo catalog to a real climber",
    edits: [[SEED, "var seedMs=ROUTES.filter("]],
    expect: "offers DEMO climbs to a real climber",
  },
  {
    name: 'the empty picker goes back to claiming "No climbs match." before anything was searched',
    edits: [[PROMPT, ':"No climbs match."']],
    expect: 'says "No climbs match." before anything has been searched',
  },
  {
    name: "the unsearched branch is removed entirely — the guard must refuse, not report clean",
    edits: [[PROMPT, ':!q?"":"No climbs match."']],
    expect: "ANCHOR LOST",
  },
  {
    // Withholding seed climbs from EVERYONE would satisfy a rule that only ever suppresses, and
    // would empty the picker on the seed demo where those routes ARE the catalog.
    name: "seed climbs are withheld on the seed path too — the control must catch it",
    edits: [[SEED, "var seedMs=[]||ROUTES.filter("]],
    expect: "the seed build offered no routes either",
  },
  {
    name: "SILENT: the prompt is reworded (it is derived, not pinned)",
    edits: [[PROMPT, ':!q?"Find the climb the two of you did":"No climbs match."']],
    expect: null,
  },
  {
    name: "SILENT: a comment naming the forbidden shape",
    edits: [["function GiveVouch({friend,onClose,onSave}){", "/* the list was once ROUTES.filter for everyone */function GiveVouch({friend,onClose,onSave}){"]],
    expect: null,
  },
];

for (const c of cases) {
  if (c.expect && cleanText.includes(c.expect)) {
    console.error(`CASE "${c.name}" is unusable: its expectation "${c.expect}" already appears in the GREEN run.`);
    process.exit(1);
  }
}

let problems = 0;
for (const c of cases) {
  let s = ORIGINAL, landed = true, why = "";
  for (const [find, repl] of c.edits) {
    const n = s.split(find).length - 1;
    if (n !== 1) { landed = false; why = `anchor found ${n}x: ${find.slice(0, 60)}`; break; }
    s = s.replace(find, repl);
  }
  if (!landed) { console.log(`  HARNESS BUG  ${c.name}\n      ${why}`); problems++; continue; }

  fs.writeFileSync(FILE, s);
  const moved = sha() !== BASE;
  const r = run();
  fs.writeFileSync(FILE, ORIGINAL);

  const fails = r.out.split("\n").filter((l) => l.includes("FAIL")).join("\n");
  let verdict;
  if (c.expect === null) verdict = r.code === 0 ? "SILENT" : "FIRED (should be silent)";
  else if (r.code === 0) verdict = "MISSED";
  else verdict = fails.includes(c.expect) ? "CAUGHT" : "wrong failure";

  const good = (c.expect === null && verdict === "SILENT") || (c.expect !== null && verdict === "CAUGHT");
  if (!good) problems++;
  console.log(`  ${verdict.padEnd(22)} ${c.name}   (edit landed: ${moved})`);
  if (!good) console.log("      " + (fails.split("\n")[0] || "(no FAIL line)"));
}

if (sha() !== BASE) { console.log("\nTREE NOT RESTORED — ClimbMatchCore.jsx differs from the baseline."); process.exit(1); }
console.log("\nrestored byte-identically");
console.log(`RESULT: ${cases.length - problems}/${cases.length} as expected`);
process.exit(problems ? 1 : 0);
