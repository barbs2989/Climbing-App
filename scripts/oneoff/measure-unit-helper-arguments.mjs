// RESULT: 0 mismatches across the 40 call sites whose argument name declares a unit. The class is
// clean, and NO GUARD WAS BUILT — "a detector for a class of zero is the thing this repo keeps
// refusing to build". This is the measurement, kept so the number is findable.
//
// The rule differs from the display-helper-bypass one rejected beside it (see
// measure-display-helper-bypass.mjs, 528 candidates / 0 real): this one has perfect precision BY
// CONSTRUCTION — a value in metres handed to a feet formatter is never correct — it simply has
// nothing to find. That is the opposite failure and the opposite reason not to ship it.
//
// THE DENOMINATOR IS THE CAVEAT: 47 of 87 arguments carry a name that declares no unit
// (`uElev(<expr>)`, `uTemp(hi)`), so they are counted and NOT judged. The three most suspicious
// were traced by hand: uElev(elevation), uElev(prominence) and uElev(maxEl) all resolve through
// `_dbArea` to `elevation_ft` / `prominence_ft` — feet, which is what uElev wants. Clean.
//
// FIVE unit helpers, each expecting its argument in a DIFFERENT unit:
//   uElev(ft)  uDist(km)  uDistMi(mi)  uGain(m)  uTemp(f)
// Passing the wrong one is silent — it renders a plausible number with no error and no type to
// catch it. That is the class #1567 and #1578 came from.
//
// The field names encode the unit (gainM/lossM/distKm metric; gainFt/elevFt/highPointFt/distMi
// imperial), so a mismatch between the helper and its argument's suffix is checkable.
// Read-only, static.
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];
const EXPECTS = { uElev: "ft", uDist: "km", uDistMi: "mi", uGain: "m", uTemp: "f" };

// what unit a field NAME declares, by suffix. null = says nothing.
function unitOfName(n) {
  if (!n) return null;
  if (/Km$/.test(n)) return "km";
  if (/Mi$/.test(n)) return "mi";
  if (/Ft$/.test(n)) return "ft";
  if (/[a-z]M$/.test(n)) return "m";          // gainM, lossM — but not "elevM"? it is metres too
  if (/^elevM$/.test(n)) return "m";
  if (/^(elev|highPoint|gain|loss)$/.test(n)) return "ft"; // documented: bare elev is FEET
  return null;
}
// units that are interchangeable for a helper (same physical quantity, same scale)
const OK = { ft: ["ft"], km: ["km"], mi: ["mi"], m: ["m"], f: ["f"] };

// The expected output is ZERO, which is also exactly what a broken rule prints. So the rule is
// exercised on both directions before the catalog is read: it must fire on a wrong unit and stay
// quiet on a right one, or the 0 below is a statement about the rule rather than about the app.
{
  const cases = [
    ["uElev", "gainM",  true,  "metres into a feet formatter - the defect"],
    ["uGain", "gainFt", true,  "feet into a metres formatter - the mirror"],
    ["uDist", "distMi", true,  "miles into a km formatter"],
    ["uElev", "elevFt", false, "correct: feet into uElev"],
    ["uGain", "lossM",  false, "correct: metres into uGain"],
    ["uDist", "distKm", false, "correct: km into uDist"],
  ];
  let sbad = 0;
  for (const c of cases) {
    const u = unitOfName(c[1]);
    const fired = u !== null && !OK[EXPECTS[c[0]]].includes(u);
    if (fired !== c[2]) {
      sbad++;
      console.log("  SELFTEST FAIL " + c[0] + "(" + c[1] + ") -> " + (fired ? "MISMATCH" : "clean") + "  - " + c[3]);
    }
  }
  if (sbad) {
    console.log("\n" + sbad + " self-test case(s) failed - the rule is broken, so any count below means nothing.");
    process.exit(1);
  }
  console.log("self-test: the rule fires on 3 wrong-unit calls and stays quiet on 3 correct ones.\n");
}

let checked = 0, silent = 0;
const bad = [], unnamed = [];
for (const f of FILES) {
  const src = fs.readFileSync(f, "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type !== "Identifier" || !EXPECTS[c.name]) return;
      const a = p.node.arguments[0];
      if (!a) return;
      let fieldName = null;
      if (a.type === "MemberExpression" && !a.computed && a.property.type === "Identifier") fieldName = a.property.name;
      else if (a.type === "Identifier") fieldName = a.name;
      const u = unitOfName(fieldName);
      if (!u) { silent++; unnamed.push(`${c.name}(${fieldName || "<expr>"})`); return; }
      checked++;
      const want = EXPECTS[c.name];
      if (!OK[want].includes(u))
        bad.push({ f, line: p.node.loc.start.line, call: c.name, want, got: u, field: fieldName,
                   snip: src.slice(Math.max(0, p.node.start - 30), p.node.end + 30).replace(/\s+/g, " ") });
    },
  });
}
console.log(`argument units CHECKABLE from the field name: ${checked}`);
console.log(`arguments whose name declares no unit (not judged): ${silent}`);
console.log(`MISMATCHES: ${bad.length}`);
for (const b of bad)
  console.log(`  ${b.f}:${b.line}  ${b.call}() wants ${b.want}, got "${b.field}" (${b.got})\n      ${b.snip.slice(0, 150)}`);

// THE DENOMINATOR. A 0 above is only as good as what could be judged, so the unjudged half is
// printed rather than dropped — an argument whose name carries no unit is where the next
// mismatch would hide, and it is also the list to read if this is ever made a guard.
const tally = new Map();
for (const s of unnamed) tally.set(s, (tally.get(s) || 0) + 1);
console.log("\nnot judged, by call (the argument's name declares no unit):");
for (const [k, n] of [...tally.entries()].sort((a, b) => b[1] - a[1]))
  console.log(`  ${String(n).padStart(3)}  ${k}`);

