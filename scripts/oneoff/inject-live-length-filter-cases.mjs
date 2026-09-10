// Injection cases for check-units.mjs section 5 of `filters` — the LIVE length filter.
//
// The sibling suite (inject-filter-label-cases.mjs) edits ClimbMatchCore.jsx, and every call site
// it perturbs is in `RouteFinder`, which is SEED-ONLY and reaches nobody. This one edits
// lib/DbAreaBrowser.jsx, which owns the filter a real DB-catalog climber uses. Same contract, a
// different file — which is why it is a sibling rather than more cases in that suite, whose FILE
// is a single constant.
//
// Run with `--only=filters`, which prints a PARTIAL banner and can never read as a pass, so a case
// here is only ever judged on a failure. Each reverts ONE half of the fix, proves the edit landed
// BY CHECKSUM, restores the file byte-identically, and is judged on the guard's OWN failure text —
// several cases perturb more than one assertion, so an exit status cannot tell them apart.
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";

const FILE = "lib/DbAreaBrowser.jsx";
const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);

const CASES = [
  {
    name: "unit-word-pinned",
    why: "THE REAL HISTORICAL DEFECT in miniature — the label's unit word goes back to a literal, " +
         "so the setting stops reaching the LIVE filter and a metric climber reads ft",
    edit: (s) => s.replace("  const u = uElevUnit();", '  const u = "ft";'),
    expect: "fail",
    must: /still says ft|carries m/,
  },
  {
    name: "numbers-not-converted",
    why: "the unit word converts and the NUMBERS do not, so the chip reads `200–600 m` — a bound " +
         "the filter does not use. This is the half a units fix most easily half-does",
    edit: (s) => s
      .replace('return "< " + uElevN(o[2]) + " " + u;', 'return "< " + o[2] + " " + u;')
      .replace('return uElevN(o[1]) + "+ " + u;', 'return o[1] + "+ " + u;')
      .replace('return uElevN(o[1]) + "–" + uElevN(o[2]) + " " + u;', 'return o[1] + "–" + o[2] + " " + u;'),
    expect: "fail",
    must: /states the filter's own half-open metre bounds/,
  },
  {
    name: "applied-chip-reverted",
    why: "the bucket chips convert and the APPLIED-FILTER chip goes back to a baked string, so the " +
         "filter bar and the chip saying what you filtered by disagree about units",
    edit: (s) => s.replace("label: lenLabel(lenRange, uElevN, uElevUnit)", 'label: "200–600 ft"'),
    expect: "fail",
    must: /both live label sites go through lenLabel/,
  },
  {
    name: "table-bakes-a-label",
    why: "a squash restores a literal label into the bucket table. It changes NO identifier, which " +
         "audit:silent-reverts says in its own caveat it cannot see — so this assertion is the only " +
         "thing standing between that revert and a silent return to imperial-only",
    edit: (s) => s.replace('["200", 200, 600, 61, 183]', '["200", "200–600 ft", 600, 61, 183]'),
    expect: "fail",
    must: /bakes in no imperial label/,
  },
  {
    name: "props-dropped-at-the-panel",
    why: "the formatter still converts and the call site stops handing it the helpers, so " +
         "`uElevUnit()` is undefined and the panel throws. NEITHER DIRECTION of check:dead-props " +
         "sees this — the component reads the prop, and the call site passes nothing unread",
    edit: (s) => s.replace('C={C} uElevN={uElevN} uElevUnit={uElevUnit} />', "C={C} />"),
    expect: "fail",
    must: /passes them down to the finder panel/,
  },
  {
    name: "panel-stops-destructuring",
    why: "the other end of the same link — the panel stops taking the props while the call site " +
         "still sends them, which is silent to every other guard in the chain",
    edit: (s) => s.replace("function RouteFinderPanel({ scope, onOpen, onBack, C, uElevN, uElevUnit })",
      "function RouteFinderPanel({ scope, onOpen, onBack, C })"),
    expect: "fail",
    must: /RouteFinderPanel destructures them/,
  },
  {
    name: "SILENT-comment-naming-the-literal",
    why: "MUST STAY SILENT — a comment quoting the forbidden string is documentation, and a guard " +
         "that failed on it would forbid explaining itself. Pins the comment masking",
    edit: (s) => s.replace("const lenLabel = (o, uElevN, uElevUnit) => {",
      '// was baked as "200–600 ft" and "1500+ ft" until the live filter learned the setting\nconst lenLabel = (o, uElevN, uElevUnit) => {'),
    expect: "pass",
  },
  {
    name: "SILENT-renamed-parameter",
    why: "MUST STAY SILENT — renaming the bucket parameter is cosmetic, and a guard pinned to a " +
         "local's name would refuse ordinary work",
    edit: (s) => s
      .replace("const lenLabel = (o, uElevN, uElevUnit) => {", "const lenLabel = (bk, uElevN, uElevUnit) => {")
      .replace('  if (o[0] === "any") return "Any";', '  if (bk[0] === "any") return "Any";')
      .replace("  if (o[1] == null) return \"< \" + uElevN(o[2]) + \" \" + u;", "  if (bk[1] == null) return \"< \" + uElevN(bk[2]) + \" \" + u;")
      .replace('  if (o[2] == null) return uElevN(o[1]) + "+ " + u;', '  if (bk[2] == null) return uElevN(bk[1]) + "+ " + u;')
      .replace('  return uElevN(o[1]) + "–" + uElevN(o[2]) + " " + u;', '  return uElevN(bk[1]) + "–" + uElevN(bk[2]) + " " + u;')
      .replace("LEN_BUCKETS.map(o => chip(lenLabel(o, uElevN, uElevUnit)", "LEN_BUCKETS.map(bk => chip(lenLabel(bk, uElevN, uElevUnit)"),
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
    try { out = execSync("node scripts/check-units.mjs --only=filters 2>&1", { encoding: "utf8" }); }
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
  console.log(`  ${verdict.padEnd(30)} ${c.name.padEnd(30)} landed=${landed} restored=${restored} probe=${failed ? "fail" : "pass"} (want ${c.expect})`);
  console.log("      " + c.why);
}

console.log(`\n${CASES.length - bad}/${CASES.length} cases behaved as specified.`);
if (sum(fs.readFileSync(FILE, "utf8")) !== before) { console.error("BROKEN: " + FILE + " was not restored."); process.exit(1); }
if (bad) process.exit(1);
