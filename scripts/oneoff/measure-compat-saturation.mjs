#!/usr/bin/env node
// Does the partner MATCH % actually discriminate, or does it sit on its ceiling?
//
// The Partners screen says "Match % blends your shared objectives, grade range, disciplines,
// availability overlap and verified trust" — and the demo walk shows three climbers whose grades
// run 5.10a / 5.11a / 5.12b all reading 99%.
//
// compat() returns Math.min(99, ...) and TWO of its terms are UNCAPPED:
//     shared disciplines × 16      shared objectives × 14
// so 3 shared disciplines + 2 shared objectives is 20 + 48 + 28 = 96 before grade, pace or
// availability contribute anything at all.
//
// This measures rather than asserts: how many real seed pairs land on the ceiling, and what the
// score would have been without the clamp. Report-only — the weights are a product decision.
//
//   node scripts/oneoff/measure-compat-saturation.mjs

import { build } from "esbuild";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

// compat() is not exported, so it is LIFTED FROM SOURCE with a fail-closed anchor rather than
// re-typed: a copy would agree with itself whatever the app does, which is the whole question.
const src = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const ANCHOR = "function compat(a,b){";
if (src.split(ANCHOR).length - 1 !== 1) {
  console.error("ANCHOR LOST: `function compat(a,b){` is not present exactly once — nothing below is meaningful.");
  process.exit(1);
}
const start = src.indexOf(ANCHOR);
let d = 0, end = -1;
for (let i = src.indexOf("{", start); i < src.length; i++) {
  if (src[i] === "{") d++;
  else if (src[i] === "}") { d--; if (d === 0) { end = i + 1; break; } }
}
if (end < 0) { console.error("could not balance compat()"); process.exit(1); }
const compatSrc = src.slice(start, end);
if (compatSrc.length < 800) { console.error(`compat() lifted short (${compatSrc.length} chars)`); process.exit(1); }

// It calls paceOf/availOf, which are in core — bundle core so the real helpers are used.
const ENTRY = `
import { CLIMBERS, ME, paceOf, availOf } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
${compatSrc}
// The same arithmetic with the ceiling removed, so we can see how far past 99 a pair lands.
function compatRaw(a,b){
  let s=20;a=a||{};b=b||{};
  var _ad=Array.isArray(a.disciplines)?a.disciplines:[],_bd=Array.isArray(b.disciplines)?b.disciplines:[];
  s+=(_ad.filter(x=>_bd.includes(x)).length)*16;
  const g2=g=>{const m=g&&String(g).match(/5\\.(\\d+)([a-d]?)/);if(!m)return 0;var n=parseInt(m[1]),li=m[2]?"abcd".indexOf(m[2]):1;return 1+(n<=8?0:n===9?1:n===10?2+li:n===11?6+li:n===12?10+li:14);};
  const v2=g=>{const m=g&&String(g).match(/V(\\d+)/i);return m?parseInt(m[1])+1:0;};
  const _yA=g2(a.sportGrade)||g2(a.tradGrade),_yB=g2(b.sportGrade)||g2(b.tradGrade);
  const _vA=v2(a.boulderGrade),_vB=v2(b.boulderGrade);
  const _gp=(_yA&&_yB)?[_yA,_yB]:((_vA&&_vB)?[_vA,_vB]:null);
  s+=_gp?Math.max(0,28-Math.abs(_gp[0]-_gp[1])*3):14;
  var _ao2=Array.isArray(a.objectiveIds)?a.objectiveIds:[],_bo2=Array.isArray(b.objectiveIds)?b.objectiveIds:[];
  s+=(_ao2.filter(x=>_bo2.includes(x)).length)*14;
  if(b.verified)s+=8;
  var _pa=paceOf(a),_pb=paceOf(b);
  if(_pa&&_pb){s+=Math.max(0,10-Math.floor(Math.abs(_pa-_pb)/100));}else{s+=5;}
  const _ao=availOf(a),_bo=availOf(b);
  const _flex=_ao.indexOf("flexible")>=0||_bo.indexOf("flexible")>=0;
  s+=(!_ao.length||!_bo.length)?4:Math.min(12,(_flex?2:_ao.filter(x=>x!=="flexible"&&_bo.indexOf(x)>=0).length)*6);
  return s;
}
export { CLIMBERS, ME, compat, compatRaw };
`;

const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-compat-")), "b.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { CLIMBERS, ME, compat, compatRaw } = require_(out);

if (!CLIMBERS || CLIMBERS.length < 3) { console.error("fewer than 3 seed climbers — nothing to measure"); process.exit(1); }

// ---- 1. What the demo screen actually shows: ME against each seed climber, with ME carrying
// the seed objectives (the Partners screen's "My Objectives" mode).
console.log("ME vs each seed climber (the 'My Objectives' pane):");
let sat = 0;
const rows = [];
for (const c of CLIMBERS) {
  const shown = compat(ME, c), raw = compatRaw(ME, c);
  const shDisc = (ME.disciplines || []).filter(x => (c.disciplines || []).includes(x)).length;
  const shObj = (ME.objectiveIds || []).filter(x => (c.objectiveIds || []).includes(x)).length;
  rows.push({ name: c.name, shown, raw, shDisc, shObj, sport: c.sportGrade || "", boulder: c.boulderGrade || "" });
  if (shown >= 99) sat++;
}
for (const r of rows) {
  console.log(`  ${String(r.shown).padStart(3)}%  (uncapped ${String(r.raw).padStart(3)})  ` +
    `${r.shDisc} disc / ${r.shObj} obj shared   ${r.name} — ${r.sport || r.boulder}`);
}
console.log(`  => ${sat} of ${CLIMBERS.length} sit ON THE 99 CEILING\n`);

// ---- 2. Every seed pair, so the answer is not an artifact of ME's own profile.
let pairs = 0, pinned = 0, over = 0, maxRaw = 0;
const dist = {};
for (let i = 0; i < CLIMBERS.length; i++) {
  for (let j = 0; j < CLIMBERS.length; j++) {
    if (i === j) continue;
    pairs++;
    const shown = compat(CLIMBERS[i], CLIMBERS[j]), raw = compatRaw(CLIMBERS[i], CLIMBERS[j]);
    if (shown >= 99) pinned++;
    if (raw > 99) over++;
    if (raw > maxRaw) maxRaw = raw;
    const b = Math.floor(shown / 10) * 10;
    dist[b] = (dist[b] || 0) + 1;
  }
}
console.log(`all ordered seed pairs: ${pairs}`);
console.log(`  on the ceiling (99): ${pinned}  (${(100 * pinned / pairs).toFixed(0)}%)`);
console.log(`  uncapped score over 99: ${over}, highest uncapped ${maxRaw}`);
console.log("  distribution of the SHOWN score:");
for (const k of Object.keys(dist).sort((a, b) => a - b)) console.log(`    ${k}-${+k + 9}: ${dist[k]}`);

// ---- 3. Does GRADE change the answer once a pair shares objectives? This is the claim the copy
// makes — "blends ... grade range" — so a pair that shares enough should still move when the
// grades move.
const base = { name: "A", disciplines: ["sport", "trad", "alpine"], sportGrade: "5.11a",
  objectiveIds: ["r1", "r2"], hikingSpeedFtHr: 1000, availability: ["weekends"] };
console.log("\nholding 3 shared disciplines + 2 shared objectives, varying only the partner's grade:");
for (const g of ["5.6", "5.9", "5.10a", "5.11a", "5.12b", "5.14a"]) {
  const other = Object.assign({}, base, { name: "B", sportGrade: g });
  console.log(`  partner ${g.padEnd(6)} -> ${compat(base, other)}%   (uncapped ${compatRaw(base, other)})`);
}
console.log("\nwith ONE shared discipline and NO shared objectives, varying the same grade:");
const thin = { name: "A", disciplines: ["sport"], sportGrade: "5.11a", objectiveIds: [],
  hikingSpeedFtHr: 1000, availability: ["weekends"] };
for (const g of ["5.6", "5.9", "5.10a", "5.11a", "5.12b", "5.14a"]) {
  const other = Object.assign({}, thin, { name: "B", sportGrade: g });
  console.log(`  partner ${g.padEnd(6)} -> ${compat(thin, other)}%   (uncapped ${compatRaw(thin, other)})`);
}
