// A CLIMBER WHO HAS NEVER COMMITTED TO A CREW IS TOLD THEY HONOUR 0% OF THEM.
//
// The sign-in reset sets `relLedger` to {honored:0, committed:0} -- correct, demo numbers must not
// follow a real account. App then computes
//
//     ME.reliability = Math.round(relLedger.honored / Math.max(1, relLedger.committed) * 100)
//
// which turns "nothing tracked" into the NUMBER 0. And trustFactors already has the right branch
// for nothing-tracked -- `_rel != null ? ... : "Not yet tracked"`, with max 0 so an untracked
// factor is excluded from the denominator entirely. A 0 is not null, so it takes the tracked
// branch instead and the climber gets both halves of a measurement nobody made.
//
// `relLedger` has NO persistence anywhere (no column, no read, no write), so it is 0/0 for every
// real signed-in account until they mark attendance in that same session.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), ".probe-rel.mjs");
execFileSync("npx", ["esbuild", "ClimbMatchCore.jsx", "--bundle", "--format=esm",
  "--jsx=automatic", "--loader:.jsx=jsx", "--platform=node",
  "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--define:import.meta.env={}", "--outfile=" + OUT], { stdio: ["ignore", "ignore", "inherit"] });
const core = await import(OUT + "?t=" + Date.now());
fs.unlinkSync(OUT);
const { vScore, trustFactors } = core;
if (typeof vScore !== "function") { console.error("FAIL-CLOSED: vScore not exported."); process.exit(1); }

// A real account just after the sign-in reset: everything zeroed, email confirmed, some history.
const acct = (reliability) => ({
  id: 0, verified: true, years: 8, certifications: [],
  routesLogged: 40, communityVouches: 3,
  catchLedger: { totalCatches: 8, highFactorCatches: 2, lastCatch: "2026-08-01" },
  reliability,
});

const zero = trustFactors(acct(0)).find((f) => f.label === "Reliability");
const untracked = trustFactors(acct(null)).find((f) => f.label === "Reliability");
if (!zero || !untracked) { console.error("FAIL-CLOSED: no Reliability factor — the label moved."); process.exit(1); }

console.log("THE RELIABILITY FACTOR, as a real account sees it\n");
console.log(`  reliability = 0 (today)   pts ${zero.pts}/${zero.max}   met=${zero.met}`);
console.log(`      sub: "${zero.sub}"`);
console.log(`  reliability = null        pts ${untracked.pts}/${untracked.max}   met=${untracked.met}`);
console.log(`      sub: "${untracked.sub}"`);

const a = vScore(acct(0)), b = vScore(acct(null));
console.log(`\nTRUST SCORE: ${a} with the 0, ${b} with it untracked  (a ${b - a}-point difference)`);
const dA = trustFactors(acct(0)).reduce((s, f) => s + f.max, 0);
const dB = trustFactors(acct(null)).reduce((s, f) => s + f.max, 0);
console.log(`DENOMINATOR: ${dA} -> ${dB}. The 0 keeps ${dA - dB} points of goal the climber cannot fill.`);

console.log("\nTHE SAME QUESTION OF THE OTHER not-yet-tracked FACTORS, so the finding is scoped:");
for (const [k, v] of [["partnerCount", 3], ["conditionsReported", 2], ["floatPlans", 1]]) {
  const f0 = trustFactors(Object.assign(acct(null), { [k]: 0 })).find((x) => x.max > 0 && x.sub.includes("0"));
  const fn = trustFactors(acct(null)).filter((x) => x.sub === "Not yet tracked").map((x) => x.label);
  console.log(`  ${k}: untracked labels present -> ${fn.join(", ") || "(none)"}`);
  break;
}

// ---------------------------------------------------------------------------------------------
// THE WIRING, ASSERTED AS SOURCE. Executing trustFactors proves the BRANCH; it cannot prove App
// still hands it null. A stale-base squash takes exactly that half -- the ternary goes back to
// Math.max(1,committed), every assertion above still passes, and the accusation returns.
console.log("\nSECTION 2 — App still hands it null (source)");
let fails = 0;
const ok2 = (m) => console.log("  ok    " + m);
const bad2 = (m) => { console.log("  FAIL  " + m); fails++; };
const app = fs.readFileSync("ClimbMatch.jsx", "utf8");

for (const [needle, why] of [
  ["ME.reliability=relLedger.committed?Math.round(relLedger.honored/relLedger.committed*100):null;",
   "reliability is null until a crew commitment exists"],
  ["setRelLedger({honored:0,committed:0})",
   "the sign-in reset still zeroes the ledger — without it the demo's 23/24 would follow a real account"],
]) {
  const n = app.split(needle).length - 1;
  if (n === 1) ok2(why); else bad2(`${why} — matched ${n}, expected 1`);
}
if (app.includes("Math.max(1,relLedger.committed)")) bad2("the divide-by-zero guard is back, which is what coerced 0/0 into 0%");
else ok2("no Math.max(1,…) coercion remains");

// A COUNT of zero must stay a number: "0 trip reports shared" is true, and nulling it would swap
// one wrong answer for another by hiding a real, fillable goal.
for (const [needle, why] of [
  ["ME.routesLogged=logs.length;", "logged climbs stays a count"],
  ["ME.conditionsReported=condReports.length;", "conditions reported stays a count"],
]) {
  if (app.includes(needle)) ok2(why); else bad2(`${why} — missing \`${needle}\``);
}

// AND THE TRIP REPORT'S CONNECT BUTTON, found by the same census.
if (app.includes("onConnect={c=>connect(c)}")) ok2("the trip report connects through the real flow");
else bad2("the trip report's connect button has forked from connect() again");
if (/onConnect=\{c=>\{setConnections\(pp=>pp\.find/.test(app)) bad2("the local-only connect handler is back");
else ok2("no local-only connect handler remains");

console.log(fails ? `\n${fails} FAILURE(S)` : "\nok — untracked reads as untracked, and connect goes through the real flow");
process.exit(fails ? 1 : 0);
