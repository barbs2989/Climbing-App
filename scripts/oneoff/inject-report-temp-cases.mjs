#!/usr/bin/env node
// Injection suite for probe-report-temps-honour-units.mjs.
//
// The probe's healthy output is a page of "ok" lines, which is exactly what a probe that has
// stopped asking anything prints. Each case below reverts ONE link of the chain, asserts by
// CHECKSUM that the edit actually landed, runs the probe, and restores the file byte-identically.
//
// Cases 1-6 are the real defect taken apart one link at a time, so the probe cannot pass on the
// strength of its neighbours. Case 7 must stay SILENT: the forecast's own uTemp deliberately
// prints a bare degree sign, and a probe that flagged it would forbid #1567's convention.
//
// IT EDITS THE APP FILES IN PLACE. Do not commit, and do not run the build, while it is running.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const RD = path.join(ROOT, "RouteDetail.jsx");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");

const CASES = [
  { name: "consensus-bakes-F", file: CORE, expect: "fail",
    find: '/ws),n:pool.length}', repl: '/ws)+"°F",n:pool.length}',
    says: /buildConsensus stores tempF as string|chip reads|Fahrenheit figure survives/ },
  { name: "chip-does-not-convert", file: RD, expect: "fail",
    find: '{p[0]==="tempF"?uTempU(cd.value):cd.value}</span>', repl: '{cd.value}</span>',
    says: /could not read the Temp chip|chip reads|metric chip/ },
  { name: "reportstats-bakes-F", file: CORE, expect: "fail",
    find: '["Temp",uTempU(cond.tempF)]', repl: '["Temp",cond.tempF+"°F"]',
    says: /Fahrenheit figure survives|still append a fixed/ },
  { name: "form-stores-what-was-typed", file: CORE, expect: "fail",
    find: 'if(temp!=="")o.tempF=uTempIn(temp);', repl: 'if(temp!=="")o.tempF=Number(temp);',
    says: /nothing calls uTempIn/ },
  { name: "form-seeds-raw-fahrenheit", file: CORE, expect: "fail",
    find: 'String(uTempN(x.cond.tempF))', repl: 'String(x.cond.tempF)',
    says: /seeds from raw tempF/ },
  { name: "label-is-fixed-text", file: CORE, expect: "fail",
    find: '>{"TEMP "+(uImp()?"°F":"°C")+" (optional)"}</div>', repl: '>TEMP °F (optional)</div>',
    says: /label is fixed text/ },
  // MUST STAY SILENT. The forecast prints a bare degree by design (#1567); only the climber's
  // own chip carries the scale letter, because that one is labelled just "Temp".
  { name: "forecast-keeps-a-bare-degree", file: CORE, expect: "pass",
    find: 'const uTemp=f=>{const n=uTempN(f);return n===null?NOVAL:n+"\\u00b0";};',
    repl: 'const uTemp=f=>{const n=uTempN(f);return n===null?NOVAL:n+"\\u00b0"+"";};',
    says: null },
];

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  const hits = before.split(c.find).length - 1;
  if (hits !== 1) {
    console.log(`  BROKEN CASE  ${c.name}: pattern matched ${hits} times — the case is wrong, not the probe`);
    bad++; continue;
  }
  fs.writeFileSync(c.file, before.replace(c.find, c.repl));
  if (sum(c.file) === beforeSum) {
    console.log(`  BROKEN CASE  ${c.name}: edit did not change the file`);
    fs.writeFileSync(c.file, before); bad++; continue;
  }
  let outText = "", code = 0;
  try {
    outText = execFileSync("node", [path.join(ROOT, "scripts", "oneoff", "probe-report-temps-honour-units.mjs")],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { code = e.status || 1; outText = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(c.file, before);
  if (sum(c.file) !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

  const caught = code !== 0;
  if (c.expect === "fail") {
    // A failure for a DIFFERENT reason is not a catch — this repo has read one as the other twice.
    const named = c.says ? c.says.test(outText) : true;
    if (caught && named) console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
    else { console.log(`  FAIL  ${c.name}: ${caught ? "failed for the WRONG reason" : "MISSED"}`); bad++; }
  } else {
    if (!caught) console.log(`  ok    ${c.name}: stayed SILENT, as it must`);
    else { console.log(`  FAIL  ${c.name}: flagged CORRECT code`); bad++; }
  }
}
console.log(bad ? `\n${bad} case(s) wrong` : "\nok — 7/7");
process.exit(bad ? 1 : 0);
