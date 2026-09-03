#!/usr/bin/env node
// Injection harness for check:trailhead-directions.
//
// Its healthy output is "one drive control per screen", which is exactly what a guard that has
// stopped looking prints. Each case edits RouteDetail.jsx in place, proves the edit LANDED by
// checksum, runs the guard, and restores the file byte-identically.
//
// Cases 1-3 put #1437's duplication back one piece at a time, so the guard cannot pass on the
// strength of its neighbours. Case 4 is the mislabelled row. Case 5 is the neighbouring field the
// consolidation could have stranded. Cases 6 and 7 must stay SILENT — they are the two false
// positives the counting method was chosen to avoid, and a guard that fired on either would be
// telling authors to rewrite real trailhead prose or to delete a working control.
//
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
    name: "1. the standalone 'Directions to trailhead' button is back beside the card",
    find: '<TrailheadCard route={route} onEdit={()=>{setFixOpenSection("approach");setFixOpen(true);}}/>',
    repl: '<TrailheadCard route={route} onEdit={()=>{setFixOpenSection("approach");setFixOpen(true);}}/><button onClick={()=>window.open("https://maps.example","_blank")}>Directions to trailhead (Google Maps)</button>',
    expect: "fail",
  },
  {
    name: "2. TrailheadCard restates the road again",
    find: '    {(dir&&!dup)?<div style={{fontSize:12.5,',
    repl: '    <div>{"Road \\u00b7 "}{route.road&&route.road.name}</div>\n    {(dir&&!dup)?<div style={{fontSize:12.5,',
    expect: "fail",
  },
  {
    name: "3. the coordinates drop off the surviving control",
    find: '{copied?"Copied":lat.toFixed(5)+", "+lng.toFixed(5)}',
    repl: '{copied?"Copied":"Copy"}',
    expect: "fail",
  },
  {
    name: "4. the crag Overview labels the drive note \"Trailhead\" again",
    find: '{route.road.driveNote?"The drive":"Road"}',
    repl: '"Trailhead"',
    expect: "fail",
  },
  {
    name: "5. the seasonal gate loses its only remaining render site",
    find: 'row("Seasonal gate",road.seasonalGate)}',
    repl: "null}",
    expect: "fail",
  },
  {
    name: "6. SILENT: trailhead PROSE that says \"Drive here\" is content, not a control",
    find: "function TrailheadCard({route,onEdit}){",
    repl: "function TrailheadCard({route,onEdit}){\n  route=Object.assign({},route,{approachLogistics:Object.assign({},route.approachLogistics,{trailheadDirection:\"Drive here and park at the gate; Directions to trailhead (Google Maps) is not what this sentence is.\"})});",
    expect: "pass",
  },
  {
    name: "7. SILENT: a handler-only button is still a control (no href to count)",
    find: '<a href={"https://www.google.com/maps/dir/?api=1&destination="+lat+","+lng} target="_blank" rel="noreferrer" style={{flex:"1 1 150px",textAlign:"center",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.greenDim,background:C.greenBg,color:C.green,fontSize:12.5,fontWeight:700,textDecoration:"none"}}>Drive here</a>',
    repl: '<button onClick={()=>window.open("https://www.google.com/maps/dir/?api=1&destination="+lat+","+lng,"_blank")} style={{flex:"1 1 150px",textAlign:"center",padding:"9px 11px",borderRadius:9,border:"1px solid "+C.greenDim,background:C.greenBg,color:C.green,fontSize:12.5,fontWeight:700}}>Drive here</button>',
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
