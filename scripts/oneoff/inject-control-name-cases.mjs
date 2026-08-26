// inject-control-name-cases — prove check:control-names FAILS on the defects it claims to catch.
//
// The healthy output of that guard is "no findings", which is exactly what a broken scan prints,
// so a green run is evidence of nothing until these cases have been seen to fire. Every case
// proves its edit LANDED BY CHECKSUM before the guard is believed — CLAUDE.md records more than
// one case in this repo that reported "guard missed" when the edit had never been applied.
//
// Cases 4 and 5 must PASS. They pin the two rules that stop this guard reporting correct work:
// a button named only by <Lbl>, and aria-pressed accepted as a state announcement alongside
// aria-checked.
//
//   node scripts/oneoff/inject-control-name-cases.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const ROOT = new URL("../..", import.meta.url).pathname;
const sum = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);

const CASES = [
  {
    name: "1 unnamed switch",
    file: "ClimbMatch.jsx",
    find: 'role="switch" aria-checked={showOnRanks} aria-label="Show me on leaderboards" ',
    repl: 'role="switch" aria-checked={showOnRanks} ',
    expect: "fail",
    why: "the real historical defect: the leaderboards switch with no name",
  },
  {
    name: "2 switch loses aria-checked",
    file: "ClimbMatch.jsx",
    find: 'role="switch" aria-checked={locPrecise} ',
    repl: 'role="switch" ',
    expect: "fail",
    why: "a switch that says what it is but not what it is set to",
  },
  {
    name: "3 switch loses role",
    file: "ClimbMatch.jsx",
    find: '<button onClick={()=>setShowOnline(v=>!v)} aria-label="Toggle online status" role="switch" ',
    repl: '<button onClick={()=>setShowOnline(v=>!v)} aria-label="Toggle online status" ',
    expect: "fail",
    why: "announced as a plain button, so aria-checked has no role to attach to",
  },
  {
    // Two claims in one edit: that this button is SCANNED at all, and that <Lbl> is what names it.
    // A no-op attribute edit proved neither -- it would have passed against a guard that never
    // looked at the button. Swapping Lbl for a component that renders NO text must therefore FAIL.
    name: "4 Lbl is what names a back button",
    file: "ClimbMatch.jsx",
    find: 'setRouteView("areas")} style={{background:C.surface',
    repl: 'setRouteView("areas")} data-inj="1" style={{background:C.surface',
    then: { find: '{<Lbl s={"\u2190 Back"}/>}</button>', repl: '{<ActionIcon name="back" size={14}/>}</button>' },
    expect: "fail",
    why: "with Lbl swapped for a text-less component the button is genuinely unnamed, so this MUST fail",
  },
  {
    name: "5 aria-pressed accepted as state",
    file: "ClimbMatch.jsx",
    find: 'role="switch" aria-checked={resumePublic} ',
    repl: 'role="switch" aria-pressed={resumePublic} ',
    expect: "pass",
    why: "MUST PASS: demanding one spelling tells the author to swap working markup for working markup",
  },
  {
    name: "6 shape test matches nothing",
    file: "ClimbMatch.jsx",
    find: "width:46,height:26,borderRadius:13",
    repl: "width:47,height:26,borderRadius:13",
    all: true,
    expect: "fail",
    why: "fail-closed: a restyle must be reported as 'section 2 checked nothing', never as ok",
  },
];

let pass = 0;
for (const c of CASES) {
  const path = ROOT + c.file;
  const original = readFileSync(path, "utf8");
  const before = sum(original);
  const n = original.split(c.find).length - 1;
  if (n === 0 || (!c.all && n !== 1)) {
    console.log(`${c.name}: ANCHOR NOT USABLE (${n} match(es)) — case not run`);
    continue;
  }
  let edited = c.all ? original.split(c.find).join(c.repl) : original.replace(c.find, c.repl);
  if (c.then) {
    const m = edited.split(c.then.find).length - 1;
    if (m !== 1) { console.log(`${c.name}: SECOND ANCHOR NOT UNIQUE (${m}) — case not run`); continue; }
    edited = edited.replace(c.then.find, c.then.repl);
  }
  writeFileSync(path, edited);
  const landed = sum(readFileSync(path, "utf8")) !== before;

  let exit = 0;
  try {
    execSync("node " + ROOT + "scripts/check-control-names.mjs", { stdio: "pipe" });
  } catch (e) { exit = e.status || 1; }

  writeFileSync(path, original);
  const restored = sum(readFileSync(path, "utf8")) === before;

  const got = exit === 0 ? "pass" : "fail";
  const ok = landed && restored && got === c.expect;
  if (ok) pass++;
  console.log(`${c.name}: edit landed=${landed} restored=${restored} guard=${got} `
    + `expected=${c.expect} -> ${ok ? "OK" : "PROBLEM"}`);
  console.log(`    ${c.why}`);
}
console.log(`\n${pass}/${CASES.length} cases behaved as specified.`);
process.exit(pass === CASES.length ? 0 : 1);
