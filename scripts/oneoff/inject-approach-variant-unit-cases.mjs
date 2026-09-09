#!/usr/bin/env node
// Injection suite for probe-approach-variants-honour-units.mjs.
//
// The fix has four separable parts — seed, store, the accessible name and the placeholder — and a
// change that moved some of them reads as finished. Each is reverted here on its own, so the probe
// cannot pass on the strength of its neighbours.
//
// `orig-preservation-dropped` is not a revert of the defect at all: it reverts the part of the FIX
// that keeps the fix from being lossy. `imperial-converts-too` is the over-reach in the other
// direction, which would be worse than the defect it replaces — it hands an imperial climber their
// own typing back changed.
//
// TWO CASES MUST STAY SILENT, and they are what stop this suite pinning implementation details: a
// renamed local and a reworded placeholder are both ordinary work, and a probe that fired on either
// would tell an author to stop touching correct code.
//
// IT EDITS RouteDetail.jsx IN PLACE. Do not commit, and do not build, while it runs.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const abs = path.join(ROOT, "RouteDetail.jsx");
const sum = () => crypto.createHash("sha1").update(fs.readFileSync(abs)).digest("hex");

const STORE = 'var d=itinStoreVal(x,"distMi");if(d!=null&&isFinite(d))o.distMi=d;\n    var g=itinStoreVal(x,"gainFt");if(g!=null&&isFinite(g))o.gainFt=g;';
const SEED = 'distMi:itinDraftVal(v,"distMi"),gainFt:itinDraftVal(v,"gainFt"),';

const CASES = [
  // THE REAL HISTORICAL DEFECT, both halves, restored verbatim.
  { name: "store-never-converts", expect: "fail",
    find: STORE,
    repl: 'var d=parseFloat(x.distMi);if(isFinite(d))o.distMi=d;\n    var g=parseInt(x.gainFt,10);if(isFinite(g))o.gainFt=g;',
    says: /the column is miles|the column is feet/ },
  { name: "seed-never-converts", expect: "fail",
    find: SEED,
    repl: 'distMi:v.distMi!=null?String(v.distMi):"",gainFt:v.gainFt!=null?String(v.gainFt):"",',
    says: /one walk, two numbers, one screen/ },
  // NOT A REVERT OF THE DEFECT: this reverts the part of the fix that keeps it lossless. Without
  // it, editing one variant's notes rewrites the gain of every way in by a foot.
  { name: "orig-preservation-dropped", expect: "fail",
    find: '        _orig:{distMi:v.distMi,gainFt:v.gainFt},\n',
    repl: "",
    says: /an untouched variant was rewritten/ },
  // THE OVER-REACH IN THE OTHER DIRECTION.
  { name: "imperial-converts-too", expect: "fail",
    find: SEED,
    repl: 'distMi:v.distMi!=null?String(Math.round(v.distMi*1.60934*100)/100):"",gainFt:v.gainFt!=null?String(Math.round(v.gainFt/3.28084)):"",',
    says: /imperial: the distance box holds/ },
  // The announced name and the placeholder are separate expressions: a converted box under a label
  // naming the other unit is the same lie by another route, and a screen reader hears only the one.
  { name: "aria-label-reverts-to-miles", expect: "fail",
    find: '" distance in "+(uImp()?"miles":"kilometres")', repl: '" distance in miles"',
    says: /distance box's aria-label is an expression that consults no unit helper/ },
  { name: "aria-label-reverts-to-feet", expect: "fail",
    find: '" gain in "+(uImp()?"feet":"metres")', repl: '" gain in feet"',
    says: /gain box's aria-label is an expression that consults no unit helper/ },
  { name: "placeholder-reverts-to-fixed-text", expect: "fail",
    find: "placeholder={uDistMiUnit()}", repl: 'placeholder="miles"',
    says: /distance box's placeholder is a fixed string/ },
  // MUST STAY SILENT: a renamed local is not a change to what is stored.
  { name: "local-renamed", expect: "pass",
    find: STORE,
    repl: 'var dm=itinStoreVal(x,"distMi");if(dm!=null&&isFinite(dm))o.distMi=dm;\n    var gf=itinStoreVal(x,"gainFt");if(gf!=null&&isFinite(gf))o.gainFt=gf;',
    says: null },
  // MUST STAY SILENT: a better placeholder is ordinary editorial work. It still consults the unit
  // helper, which is the property the probe asserts — pinning the exact string would forbid this.
  { name: "placeholder-reworded", expect: "pass",
    find: "placeholder={uDistMiUnit()}", repl: 'placeholder={"e.g. 4 "+uDistMiUnit()}',
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
  try {
    out = execFileSync("node", [path.join(ROOT, "scripts", "oneoff", "probe-approach-variants-honour-units.mjs")],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(abs, before);
  if (sum() !== beforeSum) { console.log(`  BROKEN CASE  ${c.name}: restore was not byte-identical`); bad++; continue; }

  const caught = code !== 0;
  if (c.expect === "fail") {
    // Judged on the FAIL lines only. A case written against the wording an assertion prints when it
    // PASSES reports MISSED against a probe firing correctly — a mistake made twice in this repo.
    const named = c.says.test(out.split("\n").filter((l) => /FAIL|ANCHOR LOST|^ {2}- /.test(l)).join("\n"));
    if (caught && named) console.log(`  ok    ${c.name}: CAUGHT, and the message names it`);
    else { console.log(`  FAIL  ${c.name}: ${caught ? "failed for the WRONG reason" : "MISSED"}`); bad++; }
  } else {
    if (!caught) console.log(`  ok    ${c.name}: stayed SILENT, as it must`);
    else { console.log(`  FAIL  ${c.name}: flagged CORRECT code`); bad++; }
  }
}
console.log(bad ? `\n${bad} case(s) wrong` : `\nok — ${CASES.length}/${CASES.length}`);
process.exit(bad ? 1 : 0);
