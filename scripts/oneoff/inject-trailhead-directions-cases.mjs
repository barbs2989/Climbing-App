#!/usr/bin/env node
// Injection harness for check:trailhead-directions.
//
// Its healthy output is "one drive control per page", which is exactly what a guard that has
// stopped looking prints. Cases 1-3 restore the duplication verbatim, one piece at a time, so the
// guard cannot pass on the strength of its neighbours; case 4 is the neighbouring field the change
// could have stranded; case 5 must stay SILENT — prose that happens to say "drive here" is correct
// content, and a guard flagging it would be telling authors to rewrite real trailhead directions.
//
// Each case proves its edit LANDED by checksum and restores the file byte-identically.
// DO NOT COMMIT WHILE THIS RUNS — it edits the app source in place (#1190).

import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = path.join(ROOT, "RouteDetail.jsx");
const sum = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

const CASES = [
  {
    name: "1. TrailheadCard's own drive control restored (the second one)",
    find: '    {hasCoord?null:<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45}}>No trailhead coordinates on file yet',
    repl: '    {hasCoord?<a href={"https://www.google.com/maps/dir/?api=1&destination="+lat+","+lng}>Drive here</a>:<div style={{fontSize:11.5,color:C.textMuted,lineHeight:1.45}}>No trailhead coordinates on file yet',
    expect: "fail",
  },
  {
    name: "2. TrailheadCard restates the road again",
    find: '    {(dir&&!dup)?<div style={{fontSize:12.5,',
    repl: '    <div>{"Road \\u00b7 "}{route.road&&route.road.name}</div>\n    {(dir&&!dup)?<div style={{fontSize:12.5,',
    expect: "fail",
  },
  {
    name: "3. the coordinates dropped from the surviving control",
    // NOT `hidden`: SSR still emits the text inside a hidden element, so that edit lands by
    // checksum and creates no defect — the case reported MISS and the guard was innocent.
    find: '>{copied?"Copied":txt}</button>',
    repl: '>{copied?"Copied":"Copy"}</button>',
    expect: "fail",
  },
  {
    name: "4. the seasonal gate loses its only remaining render site",
    find: 'row("Seasonal gate",road.seasonalGate)}',
    repl: "null}",
    expect: "fail",
  },
  {
    name: "5. SILENT: trailhead prose that says \"drive here\" is content, not a control",
    find: "function TrailheadDirections({route,dest}){",
    repl: "function TrailheadDirections({route,dest}){\n  route=Object.assign({},route,{approachLogistics:Object.assign({},route.approachLogistics,{trailheadDirection:\"Drive here and park at the gate. Directions to trailhead (Google Maps) is not what this sentence is.\"})});",
    expect: "pass",
  },
];

const original = fs.readFileSync(FILE, "utf8");
const before = sum(original);
let bad = 0;

if (run() !== "pass") { console.log("  BROKEN  check:trailhead-directions does not pass on a clean tree"); process.exit(1); }
console.log("  ok      clean tree: check:trailhead-directions passes");

for (const c of CASES) {
  if (!original.includes(c.find)) { console.log(`  BROKEN  ${c.name}: anchor not found — re-anchor this case`); bad++; continue; }
  fs.writeFileSync(FILE, original.replace(c.find, c.repl));
  const landed = sum(fs.readFileSync(FILE, "utf8")) !== before;
  let got;
  try { got = run(); } finally { fs.writeFileSync(FILE, original); }
  if (sum(fs.readFileSync(FILE, "utf8")) !== before) { console.log("  BROKEN  restore did not return the file byte-identically"); process.exit(1); }
  if (!landed) { console.log(`  BROKEN  ${c.name}: edit never landed`); bad++; continue; }
  if (got === c.expect) console.log(`  ok      ${c.name} — guard ${got === "fail" ? "CAUGHT it" : "stayed quiet"}`);
  else { console.log(`  MISS    ${c.name} — guard ${got}ed, expected ${c.expect}`); bad++; }
}

function run() {
  try { execFileSync("node", [path.join(ROOT, "scripts", "check-trailhead-directions.mjs")], { cwd: ROOT, stdio: "pipe" }); return "pass"; }
  catch { return "fail"; }
}

console.log("");
console.log(bad ? `${bad} problem(s) — check:trailhead-directions is not proven.` : `ok — ${CASES.length}/${CASES.length}, and the file is byte-identical to where it started.`);
process.exit(bad ? 1 : 0);
