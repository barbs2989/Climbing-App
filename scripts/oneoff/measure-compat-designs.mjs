#!/usr/bin/env node
// WHICH REBALANCE REMOVES THE MATCH-% SATURATION, AND DID THAT ONE SHIP? Report-only.
//
// The defect: compat() ended `Math.min(99, …)` while TWO of its terms were UNCAPPED (shared
// disciplines × 16, shared objectives × 14). The bounded terms alone summed to 78 of a 99 ceiling,
// so a climber with a broad profile saturated before grade contributed anything — 16 of 30 seed
// pairs sat exactly on 99, and on a rich profile 5.6 and 5.14a both read 99% against the same
// person. The clamp was deciding the score instead of the blend the screen advertises.
//
// This does not pick a design by argument. It reimplements the same arithmetic with the term
// maxima as PARAMETERS and reports, for each candidate:
//
//   - how many pairs sit on the ceiling
//   - whether grade discriminates at the top of the range
//   - how many pairs REORDER, which is the cost side of any change here
//   - the ACTUAL ranking of the 'My Objectives' pane, because an aggregate can look healthy while
//     the one list a climber reads is still wrong
//
// It then asserts that the SHIPPED compat() reproduces the chosen candidate exactly, so this stays
// a live check that the design measured is the design running rather than a historical note.
//
//   node scripts/oneoff/measure-compat-designs.mjs

import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

const outdir = fs.mkdtempSync(path.join(ROOT, ".cm-compat-design-"));
process.on("exit", () => { try { fs.rmSync(outdir, { recursive: true, force: true }); } catch {} });
const out = path.join(outdir, "b.cjs");

// The REAL compat() and the REAL maxima are imported, never copied — a retyped formula would agree
// with itself whatever the app does, which is the entire question.
const CORE = JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"));
const ENTRY = `
import { CLIMBERS, ME, paceOf, availOf, compat,
         CMAX_DISC, CMAX_GRADE, CMAX_OBJ, CMAX_VERIF, CMAX_PACE, CMAX_AVAIL,
         COMPAT_BASE, COMPAT_TOP, COMPAT_MAX } from ${CORE};

const g2=g=>{const m=g&&String(g).match(/5\\.(\\d+)([a-d]?)/);if(!m)return 0;var n=parseInt(m[1]),li=m[2]?"abcd".indexOf(m[2]):1;return 1+(n<=8?0:n===9?1:n===10?2+li:n===11?6+li:n===12?10+li:14);};
const v2=g=>{const m=g&&String(g).match(/V(\\d+)/i);return m?parseInt(m[1])+1:0;};

// Term-by-term, mirroring compat(). Returns the raw parts so a candidate can bound one without
// the arithmetic being restated.
function parts(a,b){
  a=a||{};b=b||{};
  const _ad=Array.isArray(a.disciplines)?a.disciplines:[],_bd=Array.isArray(b.disciplines)?b.disciplines:[];
  const discN=_ad.filter(x=>_bd.includes(x)).length;
  const _yA=g2(a.sportGrade)||g2(a.tradGrade),_yB=g2(b.sportGrade)||g2(b.tradGrade);
  const _vA=v2(a.boulderGrade),_vB=v2(b.boulderGrade);
  const _gp=(_yA&&_yB)?[_yA,_yB]:((_vA&&_vB)?[_vA,_vB]:null);
  const grade=_gp?Math.max(0,CMAX_GRADE-Math.abs(_gp[0]-_gp[1])*3):CMAX_GRADE/2;
  const _ao2=Array.isArray(a.objectiveIds)?a.objectiveIds:[],_bo2=Array.isArray(b.objectiveIds)?b.objectiveIds:[];
  const objN=_ao2.filter(x=>_bo2.includes(x)).length;
  const verified=b.verified?CMAX_VERIF:0;
  const _pa=paceOf(a),_pb=paceOf(b);
  const pace=(_pa&&_pb)?Math.max(0,CMAX_PACE-Math.floor(Math.abs(_pa-_pb)/100)):CMAX_PACE/2;
  const _ao=availOf(a),_bo=availOf(b);
  const _flex=_ao.indexOf("flexible")>=0||_bo.indexOf("flexible")>=0;
  const avail=(!_ao.length||!_bo.length)?4:Math.min(CMAX_AVAIL,(_flex?2:_ao.filter(x=>x!=="flexible"&&_bo.indexOf(x)>=0).length)*6);
  return {discN,grade,objN,verified,pace,avail};
}

// cand: {discMax, objMax, rescale}. {legacy:true} is the historical behaviour — both terms
// uncapped under a hard clamp at 99.
function score(a,b,cand){
  cand=cand||{};
  const p=parts(a,b);
  let disc=p.discN*16, obj=p.objN*14;
  if(!cand.legacy){
    if(cand.discMax!=null) disc=Math.min(cand.discMax,disc);
    if(cand.objMax!=null)  obj =Math.min(cand.objMax, obj);
  }
  const raw=20+disc+p.grade+obj+p.verified+p.pace+p.avail;
  if(!cand.rescale) return Math.min(99,Math.max(raw,20));
  const max=20+cand.discMax+CMAX_GRADE+cand.objMax+CMAX_VERIF+CMAX_PACE+CMAX_AVAIL;
  return Math.max(20,Math.min(99,Math.round(20+((raw-20)/(max-20))*79)));
}

module.exports={CLIMBERS,ME,compat,score,parts,
  K:{CMAX_DISC,CMAX_GRADE,CMAX_OBJ,CMAX_VERIF,CMAX_PACE,CMAX_AVAIL,COMPAT_BASE,COMPAT_TOP,COMPAT_MAX}};
`;

await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { CLIMBERS, ME, compat, score, K } = require_(out);

const people = [{ ...ME, name: ME.name || "ME" }, ...CLIMBERS];
const pairs = [];
for (const a of people) for (const b of people) if (a !== b) pairs.push([a, b]);
if (pairs.length < 20) { console.error(`only ${pairs.length} pairs — the seed set did not load`); process.exit(1); }

// The chosen design, named once so the assertion below and the table cannot drift apart.
const SHIPPED = { discMax: K.CMAX_DISC, objMax: K.CMAX_OBJ, rescale: true };

console.log(`maxima in the app: disc ${K.CMAX_DISC}  grade ${K.CMAX_GRADE}  obj ${K.CMAX_OBJ}  verified ${K.CMAX_VERIF}  pace ${K.CMAX_PACE}  avail ${K.CMAX_AVAIL}`);
console.log(`COMPAT_MAX ${K.COMPAT_MAX}, displayed range ${K.COMPAT_BASE}..${K.COMPAT_TOP}\n`);

// NON-VACUITY: the shipped compat() must BE the candidate this script recommends. Without it the
// table below is a statement about a formula the app might not be using.
let mismatch = 0, worst = null;
for (const [a, b] of pairs) {
  const mine = score(a, b, SHIPPED), real = compat(a, b);
  if (mine !== real) { mismatch++; if (!worst) worst = `${a.name} vs ${b.name}: candidate ${mine}, app ${real}`; }
}
if (mismatch) {
  console.error(`THE SHIPPED compat() IS NOT THE CHOSEN CANDIDATE: ${mismatch} of ${pairs.length} pairs differ (${worst}).`);
  process.exit(1);
}
console.log(`the shipped compat() reproduces the chosen candidate on all ${pairs.length} pairs\n`);

const CANDIDATES = [
  ["OLD  uncapped, clamped at 99 (what shipped before)", { legacy: true }],
  ["B    cap only, still clamped: disc<=32 obj<=28", { discMax: 32, objMax: 28 }],
  ["C    cap + rescale: disc<=32 obj<=28", { discMax: 32, objMax: 28, rescale: true }],
  ["D    cap + rescale: disc<=28 obj<=20", { discMax: 28, objMax: 20, rescale: true }],
  ["E    cap + rescale, both boolean: disc<=16 obj<=14", { discMax: 16, objMax: 14, rescale: true }],
  ["F    cap + rescale, nothing outweighs grade: disc<=28 obj<=28", { discMax: 28, objMax: 28, rescale: true }],
  ["I*   SHIPPED — disciplines boolean (16), objectives bounded (20)", SHIPPED],
];

const GRADES = ["5.6", "5.9", "5.10a", "5.11a", "5.12b", "5.14a"];
const rich = (g) => ({ name: "rich", disciplines: ["sport", "trad", "alpine"], sportGrade: g, objectiveIds: ["x", "y"], verified: true });
const meRich = { name: "me", disciplines: ["sport", "trad", "alpine"], sportGrade: "5.11a", objectiveIds: ["x", "y"], verified: true };

for (const [label, cand] of CANDIDATES) {
  const vals = pairs.map(([a, b]) => score(a, b, cand));
  const ceiling = vals.filter((v) => v === 99).length;
  const bands = {};
  for (const v of vals) { const k = `${Math.floor(v / 10) * 10}s`; bands[k] = (bands[k] || 0) + 1; }

  // Reordering, measured against the OLD behaviour. Pairs tied on the ceiling are counted
  // separately: breaking those ties is the point, not a cost.
  let flipped = 0, tieBroken = 0;
  for (let i = 0; i < pairs.length; i++) for (let j = i + 1; j < pairs.length; j++) {
    const a0 = score(...pairs[i], { legacy: true }), b0 = score(...pairs[j], { legacy: true });
    const a1 = score(...pairs[i], cand), b1 = score(...pairs[j], cand);
    if (a0 === b0) { if (a1 !== b1) tieBroken++; continue; }
    if (Math.sign(a0 - b0) !== Math.sign(a1 - b1)) flipped++;
  }

  const sw = GRADES.map((g) => score(meRich, rich(g), cand));
  console.log(label);
  console.log(`   on the ceiling: ${ceiling}/${pairs.length}   bands: ${Object.entries(bands).sort().map(([k, v]) => `${k}:${v}`).join(" ")}`);
  console.log(`   grade sweep (rich profile, me 5.11a): ${GRADES.map((g, i) => `${g}:${sw[i]}`).join("  ")}   spread ${Math.max(...sw) - Math.min(...sw)}`);
  console.log(`   vs OLD: ${flipped} genuine order flips, ${tieBroken} ceiling ties broken\n`);
}

// The concrete case: the pane a climber actually reads.
console.log("ME vs each seed climber, ORDERED as the pane would show them:");
const meGrade = ME.sportGrade || ME.tradGrade || ME.boulderGrade || "(none)";
console.log(`   (ME climbs ${meGrade} — a sensible ranking tracks grade proximity to that)`);
for (const [label, cand] of CANDIDATES) {
  const rows = CLIMBERS.map((c) => ({
    n: c.name.split(" ")[0], g: c.sportGrade || c.tradGrade || c.boulderGrade || "-", v: score(ME, c, cand),
  })).sort((x, y) => y.v - x.v);
  const distinct = new Set(rows.map((r) => r.v)).size;
  console.log(`  ${label.slice(0, 4)} ${rows.map((r) => `${r.n} ${r.g} ${r.v}`).join("  |  ")}   [${distinct}/${rows.length} distinct]`);
}
