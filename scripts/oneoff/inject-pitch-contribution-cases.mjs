#!/usr/bin/env node
// Injection suite for probe-pitch-contribution-keeps-what-was-typed.mjs.
//
// The branch loses work in four independent ways, so each is reverted on its own: a fix that
// restored the length and left bolts hardcoded would otherwise read as finished.
//
// `filter-tests-only-the-old-three` is the one worth reading. It keeps every field correct and
// narrows only the filter, which is enough to make a pitch carrying ONLY a length vanish — the
// sharpest form of the defect, and invisible to any assertion that inspects a row it dropped.
//
// IT EDITS RouteDetail.jsx IN PLACE. Do not commit, and do not build, while it runs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = "RouteDetail.jsx";
const abs = path.join(ROOT, FILE);
const sum = () => crypto.createHash("sha1").update(fs.readFileSync(abs)).digest("hex");

const CASES = [
  // THE REAL HISTORICAL DEFECT, restored verbatim: a key no editor row carries.
  { name: "length-read-from-a-key-nothing-writes", expect: "fail",
    find: "var _len=uLenIn(p.lengthM)", repl: "var _len=uLenIn(p.len)",
    says: /length was typed and the submitted row carries/ },

  // UNITS: the box asks in the climber's units and the column holds METRES, so there are four
  // separate edges, and reverting any ONE is silent -- the value still flows, in the wrong unit,
  // under a success toast. Each is reverted on its own for the reason the header already gives.
  { name: "stored-without-converting", expect: "fail",
    find: "var _len=uLenIn(p.lengthM)", repl: "var _len=parseInt(p.lengthM,10)",
    says: /the column holds metres|not converting/ },
  // THE WORST ONE: open an imperial climber's 45 m pitch, touch nothing, save -> 14 m.
  { name: "prefill-not-converted", expect: "fail",
    find: 'lengthM:p.lengthM!=null?uLenN(p.lengthM):""', repl: 'lengthM:p.lengthM!=null?p.lengthM:""',
    says: /prefill converts a stored length/ },
  { name: "box-still-asks-for-metres", expect: "fail",
    find: '"Pitch "+(idx+1)+" length in "+(uImp()?"feet":"metres")', repl: '"Pitch "+(idx+1)+" length in metres"',
    says: /asks in the climber.s own units/ },
  { name: "summary-hardcodes-metres", expect: "fail",
    find: 'pp.lengthM?pp.lengthM+uLenUnit():""', repl: 'pp.lengthM?pp.lengthM+"m":""',
    says: /labels the unit it is showing/ },
  { name: "current-value-fed-canonical-rows", expect: "fail",
    find: "pitchStr(routePitches)", repl: "pitchStr(route.pitchDetail)",
    says: /SAME convention/ },
  { name: "bolts-hardcoded", expect: "fail",
    find: "bolts:isFinite(_bolts)?_bolts:0,", repl: "bolts:0,",
    says: /bolts was typed/ },
  { name: "anchor-hardcoded", expect: "fail",
    find: 'anchor:String(p.anchor||"").trim(),', repl: 'anchor:"",',
    says: /anchor was typed/ },
  { name: "crux-hardcoded", expect: "fail",
    find: "crux:!!p.crux,photos:[]", repl: "crux:false,photos:[]",
    says: /crux was typed/ },
  // EVERY FIELD CORRECT AND THE ROW STILL VANISHES. Only the length-only case can see this.
  { name: "filter-tests-only-the-old-three", expect: "fail",
    find: "return p.grade||p.gear||p.note||p.lengthM||p.anchor||p.bolts||p.crux;",
    repl: "return p.grade||p.gear||p.note;",
    says: /a pitch carrying only a length is discarded/ },
  // MUST STAY SILENT: an empty row must go on being dropped, or every untouched blank pitch in
  // the editor is submitted as a row. A fix that only ever KEPT rows would satisfy the rest.
  { name: "widened-filter-keeps-blank-rows", expect: "fail",
    find: "return p.grade||p.gear||p.note||p.lengthM||p.anchor||p.bolts||p.crux;",
    repl: "return true;",
    says: /blank pitch row\(s\) would be submitted/ },
  // MUST STAY SILENT: trimming the anchor is ordinary work, not a change to what is carried.
  { name: "anchor-not-trimmed", expect: "pass",
    find: 'anchor:String(p.anchor||"").trim(),', repl: 'anchor:p.anchor||"",',
    says: null },
];

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(abs, "utf8");
  const beforeSum = sum();
  const hits = before.split(c.find).length - 1;
  if (hits !== 1) { console.log(`  BROKEN CASE  ${c.name}: pattern matched ${hits} times — the case is wrong, not the probe`); bad++; continue; }
  fs.writeFileSync(abs, before.replace(c.find, c.repl));
  if (sum() === beforeSum) { console.log(`  BROKEN CASE  ${c.name}: edit did not change the file`); fs.writeFileSync(abs, before); bad++; continue; }

  let out = "", code = 0;
  try { out = execFileSync("node", [path.join(ROOT, "scripts", "oneoff", "probe-pitch-contribution-keeps-what-was-typed.mjs")],
    { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(abs, before);
  if (sum() !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

  const caught = code !== 0;
  if (c.expect === "fail") {
    // Judged on the FAIL lines only: a case written against the wording an assertion prints when
    // it PASSES reports MISSED against a probe that is firing correctly.
    const named = c.says.test(out.split("\n").filter((l) => /FAIL|^ {2}- /.test(l)).join("\n"));
    if (caught && named) console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
    else { console.log(`  FAIL  ${c.name}: ${caught ? "failed for the WRONG reason" : "MISSED"}`); bad++; }
  } else {
    if (!caught) console.log(`  ok    ${c.name}: stayed SILENT, as it must`);
    else { console.log(`  FAIL  ${c.name}: flagged CORRECT code`); bad++; }
  }
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
