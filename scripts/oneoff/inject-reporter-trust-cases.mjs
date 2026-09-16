#!/usr/bin/env node
/* Injection suite for probe-reporter-trust-is-not-a-constant.mjs.
 *
 * Every case proves its edit LANDED by checksum before the probe is believed — checksum movement
 * proves an edit happened, not that it was the right one, so each case is judged on the probe's
 * OWN failure text and on FAIL lines only. The harness captures the clean run first and REFUSES
 * any expectation that already appears in it: an expectation written against the text an
 * assertion prints when it PASSES reports MISSED against a probe firing correctly, which this
 * repo has recorded getting wrong three times.
 *
 * TWO CASES MUST STAY SILENT and they are the load-bearing half — a suite that only proves the
 * probe can fail is satisfied by a probe that fails on everything.
 *
 * It edits the app files in place, so: do not commit while it runs, and two runs must never
 * overlap. A lockfile enforces the second; the tree checksum reports TREE NOT RESTORED rather
 * than exiting 0 on a tree it has damaged.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROBE = path.join(ROOT, "scripts", "oneoff", "probe-reporter-trust-is-not-a-constant.mjs");
const FILES = {
  core: path.join(ROOT, "ClimbMatchCore.jsx"),
  rd: path.join(ROOT, "RouteDetail.jsx"),
  app: path.join(ROOT, "ClimbMatch.jsx"),
};
const LOCK = path.join(ROOT, ".inject-reporter-trust.lock");

const sha = p => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const run = () => {
  try { return execFileSync("node", [PROBE], { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }); }
  catch (e) { return (e.stdout || "") + (e.stderr || ""); }
};
const failLines = out => out.split("\n").filter(l => /^\s*(FAIL|BROKEN)\b/.test(l.trim()) || /^\s*BROKEN:/.test(l));

// ---- cases -------------------------------------------------------------------------------
const SHADOW = "const trustOf=n=>{const a=seedAuthor(n);return a?vScore(a):50;};";
const CASES = [
  {
    name: "historical-shadow",
    why: "THE REAL DEFECT: buildConsensus scores an unknown reporter at a literal 50 and renders it",
    file: "core",
    find: "const wOf=it=>{const base=0.45+0.55*(reporterWeightTrust(it.user)/100);",
    repl: SHADOW + "const wOf=it=>{const base=0.45+0.55*(trustOf(it.user)/100);",
    also: [["trust:reporterTrust(a.user)", "trust:trustOf(a.user)"]],
    expect: "hazard row carries trust 50",
  },
  {
    name: "kwScan-shadow",
    why: "the same defect in the OTHER file — one fix must not pass on the strength of its sibling",
    file: "rd",
    find: "const out={};const nowY=",
    repl: SHADOW + "const out={};const nowY=",
    also: [["trust:reporterTrust(r.user)", "trust:trustOf(r.user)"]],
    expect: "shadowed copies remain",
  },
  {
    name: "ladder-back",
    why: "the pre-#1740 90/70 ladder returns, whose green sits above the earnable ceiling",
    file: "rd",
    find: '{h.trust!=null?<span style={{fontSize:12,color:trustTier(h.trust).color,fontWeight:700,flexShrink:0}}>{""+h.trust}</span>:null}',
    repl: '<span style={{fontSize:12,color:h.trust>=90?C.green:h.trust>=70?C.blue:C.amber,fontWeight:700,flexShrink:0}}>{""+h.trust}</span>',
    expect: "hand-copied ladder is back",
  },
  {
    name: "suppress-everything",
    why: "OVER-REACH: a rule that only ever suppresses is satisfied by deleting the feature",
    file: "core",
    find: "export function reporterTrust(n){var a=seedAuthor(n);return a?vScore(a):null;}",
    repl: "export function reporterTrust(n){return n?null:null;}",
    expect: "seed reporter lost their trust number",
  },
  {
    name: "prior-becomes-zero",
    why: "the WEIGHTING moves — an unscoreable author drops to 0 instead of the neutral prior",
    file: "core",
    find: "export function reporterWeightTrust(n){var t=reporterTrust(n);return t==null?TRUST_PRIOR:t;}",
    repl: "export function reporterWeightTrust(n){var t=reporterTrust(n);return t==null?0:t;}",
    expect: "the weighting MOVED",
  },
  {
    name: "app-weighting-site",
    why: "the WEIGHTING sites in ClimbMatch.jsx — value-identical (50 == TRUST_PRIOR), so ONLY the AST scan can see this revert",
    file: "app",
    find: "const weightOf=function(e){return reporterWeightTrust(e._by);};",
    repl: "const weightOf=function(e){const cl=seedAuthor(e._by);return cl?vScore(cl):50;};",
    also: [["vouchRowsFrom,seedIdentity,reporterWeightTrust,", "vouchRowsFrom,seedAuthor,seedIdentity,reporterWeightTrust,"]],
    expect: "ClimbMatch.jsx: a ? vScore(a) : 50",
  },
  {
    name: "SILENT-comment-quoting-the-shape",
    why: "a comment quoting the forbidden shape is DOCUMENTATION — an AST does not see comments",
    file: "core",
    silent: true,
    find: "export const TRUST_PRIOR=50;",
    repl: "/* the defect this replaced: const trustOf=n=>{const a=seedAuthor(n);return a?vScore(a):50;}; */\nexport const TRUST_PRIOR=50;",
  },
  {
    name: "SILENT-longhand",
    why: "the same rule written longhand is correct work; a probe pinned to one spelling forbids it",
    file: "core",
    silent: true,
    find: "export function reporterTrust(n){var a=seedAuthor(n);return a?vScore(a):null;}",
    repl: "export function reporterTrust(n){var a=seedAuthor(n);if(!a)return null;return vScore(a);}",
  },
];

// ---- harness -----------------------------------------------------------------------------
let fd;
try { fd = fs.openSync(LOCK, "wx"); }
catch { console.log("REFUSED: another run of this suite holds " + LOCK); process.exit(1); }
const release = () => { try { fs.closeSync(fd); } catch {} try { fs.rmSync(LOCK, { force: true }); } catch {} };
process.on("exit", release); process.on("SIGINT", () => { release(); process.exit(1); });

const before = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, sha(p)]));
const original = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, fs.readFileSync(p, "utf8")]));

const clean = run();
if (!/^ok — a reporter's trust/m.test(clean)) {
  console.log("REFUSED: the probe is not green on this tree — every case would be unattributable.\n");
  console.log(clean.split("\n").filter(l => /FAIL|BROKEN/.test(l)).join("\n"));
  process.exit(1);
}
console.log("clean run is green; " + CASES.length + " cases\n");

let good = 0;
for (const c of CASES) {
  // Structural refusal: an expectation already in the GREEN run can never distinguish anything.
  if (c.expect && clean.indexOf(c.expect) >= 0) {
    console.log(`  HARNESS BUG  ${c.name}: expectation "${c.expect}" already appears in the clean run`);
    continue;
  }
  // [file, find, repl] TUPLES rather than {file, find, repl} objects: check:injection-anchors
  // resolves every `find:` key it meets, so an object literal holding `find: c.find` reads as an
  // anchor it cannot resolve. `also` carries pairs for the same reason — its file is always the
  // case's own, so the key was redundant anyway.
  const edits = [[c.file, c.find, c.repl], ...(c.also || []).map(a => [c.file, a[0], a[1]])];
  let landed = true;
  for (const [ef, efind, erepl] of edits) {
    const p = FILES[ef];
    const s = fs.readFileSync(p, "utf8");
    if (s.split(efind).length - 1 !== 1) { landed = false; break; }
    fs.writeFileSync(p, s.replace(efind, erepl));
  }
  if (!landed || edits.every(([ef]) => sha(FILES[ef]) === before[ef])) {
    console.log(`  HARNESS BUG  ${c.name}: the edit never landed (find string matched 0 or >1 times)`);
    for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, original[k]);
    continue;
  }

  const out = run();
  const fails = failLines(out);
  if (c.silent) {
    if (!fails.length) { console.log(`  ok    ${c.name} — SILENT as required (${c.why})`); good++; }
    else console.log(`  FIRED ON CORRECT WORK  ${c.name}: ${fails[0].trim()}`);
  } else if (fails.some(l => l.indexOf(c.expect) >= 0)) {
    console.log(`  ok    ${c.name} — caught, naming its own defect (${c.why})`);
    good++;
  } else if (fails.length) {
    console.log(`  WRONG FAILURE  ${c.name}: wanted "${c.expect}", got:\n        ${fails.map(l => l.trim()).join("\n        ")}`);
  } else {
    console.log(`  MISS  ${c.name}: the probe stayed green (${c.why})`);
  }

  for (const [k, p] of Object.entries(FILES)) fs.writeFileSync(p, original[k]);
}

const after = Object.fromEntries(Object.entries(FILES).map(([k, p]) => [k, sha(p)]));
const dirty = Object.keys(FILES).filter(k => after[k] !== before[k]);
if (dirty.length) { console.log("\nTREE NOT RESTORED: " + dirty.join(", ")); process.exitCode = 1; }
else console.log("\ntree restored byte-identically");

console.log(`${good}/${CASES.length} behaved as declared`);
if (good !== CASES.length) process.exitCode = 1;
