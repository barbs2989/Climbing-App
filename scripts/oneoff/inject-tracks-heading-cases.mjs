#!/usr/bin/env node
// Injection cases for section 5 of `check:track-caveat` — the tracks-list heading, its empty
// state, and the Help FAQ that names it.
//
// Its healthy output is "everything passed", which is also what a guard asking nothing prints.
// Each case proves its edit LANDED by checksum before the verdict is believed, restores every
// file it touched byte-identically, and names the text its OWN failure must carry — matched
// against FAIL lines only, because an expectation taken from the text an assertion prints when it
// PASSES reports MISSED against a guard firing correctly.
//
// THREE cases must stay SILENT, and they are the load-bearing half: a rule pinned to one phrasing
// forbids improving the wording, and one that only ever forbids the old words is satisfied by a
// heading that drops "tracks" — which a seed route really does carry.
//
// TWO FILES, because the claim spans them: the heading is in RouteDetail.jsx and the FAQ that
// points at it is in ClimbMatchCore.jsx, and the drift between them is the defect.
//
//   node scripts/oneoff/inject-tracks-heading-cases.mjs

import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const RD = path.join(ROOT, "RouteDetail.jsx");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const LOCK = path.join(ROOT, ".tracks-heading-injection.lock");

try { fs.writeFileSync(LOCK, String(process.pid), { flag: "wx" }); }
catch { console.error("another run of this suite is in flight (.tracks-heading-injection.lock). Refusing."); process.exit(1); }
const release = () => { try { fs.rmSync(LOCK, { force: true }); } catch {} };
process.on("exit", release);
process.on("SIGINT", () => { release(); process.exit(1); });

const sha = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const run = () => {
  const r = spawnSync("node", [path.join(ROOT, "scripts", "check-track-caveat.mjs")], { cwd: ROOT, encoding: "utf8" });
  return { code: r.status, out: (r.stdout || "") + (r.stderr || "") };
};

const ORIGINAL = { [RD]: fs.readFileSync(RD, "utf8"), [CORE]: fs.readFileSync(CORE, "utf8") };
const BASE = { [RD]: sha(RD), [CORE]: sha(CORE) };
const restore = () => { for (const f of [RD, CORE]) fs.writeFileSync(f, ORIGINAL[f]); };

const clean = run();
if (clean.code !== 0) { console.error("BASELINE NOT GREEN — fix the guard first.\n" + clean.out.slice(-1500)); process.exit(1); }
console.log("baseline green\n");
const cleanText = clean.out;

const HEAD = ">Recent tracks & trip reports<";
const EMPTY = "No recent tracks or trip reports yet — share one after you climb it.";
const FAQ_HEAD = "Recent tracks & trip reports lists recent parties";

const cases = [
  {
    name: "THE REAL DEFECT: the heading claims every row is a recorded track",
    edits: [[RD, HEAD, ">Recent recorded tracks<"]],
    expect: "over rows that say",
  },
  {
    name: "the heading drops tracks entirely — a seed route really does carry one",
    edits: [[RD, HEAD, ">Recent trip reports<"]],
    expect: "no longer names tracks",
  },
  {
    name: "the heading stops naming trip reports, which is what a DB route's list holds",
    edits: [[RD, HEAD, ">Recent lines and pins<"]],
    expect: "does not name trip reports",
  },
  {
    name: "the empty state goes back to covering less than the heading above it",
    edits: [[RD, EMPTY, "No recent tracks yet — be the first to share one after you climb it."]],
    expect: "covers less than the heading",
  },
  {
    // The guard anchors on the CAPTION, so this is what a genuinely restructured section looks
    // like — and it must refuse rather than report the heading clean.
    name: "the section's caption is gone — the guard must refuse, not report clean",
    edits: [[RD, "Recorded lines other parties walked", "Lines and reports"]],
    expect: "ANCHOR LOST",
  },
  {
    name: "THE REAL DEFECT: the Help FAQ promises recorded tracks outright",
    edits: [[CORE, "Rarely — almost no route carries one yet.", "Yes."]],
    expect: 'with "Yes."',
  },
  {
    // The one that proves the heading is DERIVED rather than restated in the guard: rename it in
    // RouteDetail and leave the FAQ pointing at the old name.
    name: "the heading is renamed and the FAQ is left behind — the drift itself",
    edits: [[RD, HEAD, ">Recent parties on this route<"]],
    expect: "have drifted",
  },
  {
    // ...and renaming BOTH consistently is ordinary work the guard must not forbid.
    name: "SILENT: the heading is renamed and the FAQ follows it",
    edits: [
      [RD, HEAD, ">Recent tracks and trip reports<"],
      [CORE, FAQ_HEAD, "Recent tracks and trip reports lists recent parties"],
    ],
    expect: null,
  },
  {
    name: "SILENT: a comment naming the old heading",
    edits: [[RD, "var ctSeed=(route.communityTracks||[]);", "/* was headed Recent recorded tracks */var ctSeed=(route.communityTracks||[]);"]],
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
  const staged = { [RD]: ORIGINAL[RD], [CORE]: ORIGINAL[CORE] };
  let landed = true, why = "";
  for (const [file, find, repl] of c.edits) {
    const n = staged[file].split(find).length - 1;
    if (n !== 1) { landed = false; why = `anchor found ${n}x in ${path.basename(file)}: ${find.slice(0, 60)}`; break; }
    staged[file] = staged[file].replace(find, repl);
  }
  if (!landed) { console.log(`  HARNESS BUG  ${c.name}\n      ${why}`); problems++; continue; }

  for (const f of [RD, CORE]) fs.writeFileSync(f, staged[f]);
  const moved = c.edits.every(([f]) => sha(f) !== BASE[f]);
  const r = run();
  restore();

  const fails = r.out.split("\n").filter((l) => l.includes("FAIL")).join("\n");
  let verdict;
  if (c.expect === null) verdict = r.code === 0 ? "SILENT" : "FIRED (should be silent)";
  else if (r.code === 0) verdict = "MISSED";
  else verdict = fails.includes(c.expect) ? "CAUGHT" : "wrong failure";

  const good = (c.expect === null && verdict === "SILENT") || (c.expect !== null && verdict === "CAUGHT");
  if (!good) problems++;
  console.log(`  ${verdict.padEnd(22)} ${c.name}   (edits landed: ${moved})`);
  if (!good) console.log("      " + (fails.split("\n")[0] || "(no FAIL line)"));
}

for (const f of [RD, CORE]) {
  if (sha(f) !== BASE[f]) { console.log(`\nTREE NOT RESTORED — ${path.basename(f)} differs from the baseline.`); process.exit(1); }
}
console.log("\nboth files restored byte-identically");
console.log(`RESULT: ${cases.length - problems}/${cases.length} as expected`);
process.exit(problems ? 1 : 0);
