// Injection cases for probe-filter-labels-honour-units.mjs.
//
// The probe's healthy output is "24/24 passed", which is also what a probe asserting nothing
// prints. Each case reverts ONE half of the fix, proves the edit landed BY CHECKSUM, restores the
// file byte-identically, and is judged on the probe's OWN failure text rather than on an exit code
// — several cases perturb more than one assertion, so an exit status cannot tell them apart.
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";

const FILE = "ClimbMatchCore.jsx";
const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);

const CASES = [
  {
    name: "hardcoded-length-map",
    why: "the length chips go back to the hand-copied imperial literal — a metric climber reads ft",
    edit: (s) => s.replace("ROUTE_LENGTHS.map(b=>[b[0],routeLengthLabel(b[0])])",
      '[["any","Any"],["u200","200 ft or less"],["200","201–600 ft"],["600","600–1500 ft"],["1500","1500+ ft"]]'),
    expect: "fail",
    must: /BUILT from ROUTE_LENGTHS/,
  },
  {
    name: "hardcoded-distance-chips",
    why: "the distance chips go back to `Within 50 mi` while the SLIDER beside them converts",
    edit: (s) => s.replace('["50","Within "+uDistMi(50)]', '["50","Within 50 mi"]'),
    expect: "fail",
    must: /distance chip calls uDistMi/,
  },
  {
    name: "label-claims-600",
    why: "THE REAL HISTORICAL DEFECT — the second bucket's stated upper bound goes back to 600, " +
         "which its own predicate (`ft<600`) rejects",
    edit: (s) => s.replace('["200",201,599]', '["200",201,600]'),
    expect: "fail",
    must: /accepts its own high bound 600 ft/,
  },
  {
    name: "label-ignores-units",
    why: "routeLengthLabel pins the unit word to ft, so the setting stops reaching the label",
    edit: (s) => s.replace("const u=uElevUnit();", 'const u="ft";'),
    expect: "fail",
    must: /carries m|still says ft/,
  },
  {
    name: "unit-word-not-converted",
    why: "the aria-label unit word goes back to a literal, so a metric climber hears `miles`",
    edit: (s) => s.replace('const uDistMiUnitLong=()=>uImp()?"miles":"kilometres";', 'const uDistMiUnitLong=()=>"miles";'),
    expect: "fail",
    must: /aria-label unit word converts/,
  },
  {
    name: "cosmetic-dash",
    why: "MUST STAY SILENT — swapping the en dash for a hyphen is a cosmetic edit, and a probe " +
         "that failed on it would pin punctuation rather than the claim",
    edit: (s) => s.replace('uElevN(b[1])+"–"+uElevN(b[2])', 'uElevN(b[1])+"-"+uElevN(b[2])'),
    expect: "pass",
  },
];

const original = fs.readFileSync(FILE, "utf8");
const before = sum(original);
let bad = 0;

for (const c of CASES) {
  const mutated = c.edit(original);
  const landed = sum(mutated) !== before;
  let out = "", code = 0;
  try {
    fs.writeFileSync(FILE, mutated);
    try { out = execSync("node scripts/oneoff/probe-filter-labels-honour-units.mjs 2>&1", { encoding: "utf8" }); }
    catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); code = e.status || 1; }
  } finally {
    fs.writeFileSync(FILE, original);
  }
  const restored = sum(fs.readFileSync(FILE, "utf8")) === before;
  const failed = code !== 0;
  const wanted = c.expect === "fail";
  let verdict;
  if (!landed) verdict = "EDIT NEVER LANDED";
  else if (failed !== wanted) verdict = wanted ? "MISSED" : "FIRED WHEN IT SHOULD BE SILENT";
  else if (wanted && c.must && !c.must.test(out)) verdict = "WRONG FAILURE";
  else verdict = "ok";
  if (verdict !== "ok") bad++;
  console.log(`  ${verdict.padEnd(30)} ${c.name.padEnd(26)} landed=${landed} restored=${restored} probe=${failed ? "fail" : "pass"} (want ${c.expect})`);
  console.log("      " + c.why);
  if (c.note) console.log("      NOTE: " + c.note);
}

console.log(`\n${CASES.length - bad}/${CASES.length} cases behaved as specified.`);
if (sum(fs.readFileSync(FILE, "utf8")) !== before) { console.error("BROKEN: " + FILE + " was not restored."); process.exit(1); }
if (bad) process.exit(1);
