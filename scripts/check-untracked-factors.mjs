#!/usr/bin/env node
// A FACTOR NOBODY HAS MEASURED MUST NOT READ AS ZERO.
//
// #1569's other half, and the one the journey walk cannot reach: it is a RENDER question rather
// than a did-it-store one, so no amount of driving a browser and then asking the database can see
// it. `check:new-climber-journey` covers the five defects that leave a trace in a table; this
// covers the one that leaves none.
//
// THE DEFECT. The sign-in reset sets `relLedger` to {honored:0, committed:0} -- correct, since the
// demo's 23/24 must not follow a real account. App then computed
//
//     ME.reliability = Math.round(relLedger.honored / Math.max(1, relLedger.committed) * 100)
//
// which turns "nothing tracked" into the NUMBER 0. `trustFactors` already had the right branch for
// nothing-tracked -- `_rel != null ? ... : "Not yet tracked"`, with `max: 0` so an untracked factor
// leaves the denominator entirely -- and a 0 is not null, so it took the TRACKED branch instead.
// A climber who has never committed to a crew was told they honour 0% of them, on the card that
// tells them how to raise their trust score. Measured: it costs 9 points and holds 18 points of
// goal the climber cannot fill, because `max` stays 18 for a measurement nobody made.
//
// `relLedger` has NO persistence anywhere -- no column, no read, no write -- so it is 0/0 for every
// real signed-in account until they mark attendance in that same session.
//
// WHY THIS IS A GATE. It ran as `scripts/oneoff/probe-reliability-zero-vs-untracked.mjs` and
// NOTHING RUNS `scripts/oneoff/` -- the "a verification nobody runs is not a verification" shape
// this file records for check:overflow, check:pitch-discount, check:policy-claims,
// check:offline-claims and check:photo-removal. The fix is also invisible to `audit:silent-reverts`
// by its own closing caveat: it changes a ternary and a string, not an identifier, so a stale-base
// squash could restore the accusation with every other guard green.
//
// Static -- one esbuild bundle, no browser, no database -- so it sits in `npm run build`.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ROOT-ANCHORED, never cwd. Promotion changes a script's DEPTH, and this file already records
// `measure-which-tab-renders-each-field.mjs` silently measuring another branch's tree for weeks.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, ".check-untracked-factors.mjs");

let fails = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { console.log("  FAIL  " + m); fails++; };
const dead = (m) => { console.error("FAIL-CLOSED: " + m); process.exit(1); };

execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"), "--bundle", "--format=esm",
  "--jsx=automatic", "--loader:.jsx=jsx", "--platform=node",
  "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--define:import.meta.env={}", "--outfile=" + OUT], { stdio: ["ignore", "ignore", "inherit"] });
let core;
try { core = await import(OUT + "?t=" + Date.now()); } finally { fs.unlinkSync(OUT); }
const { vScore, trustFactors } = core;
if (typeof trustFactors !== "function") dead("trustFactors is not exported — the breakdown moved.");
if (typeof vScore !== "function") dead("vScore is not exported.");

// A real account just after the sign-in reset: everything zeroed, email confirmed, some history.
const acct = (reliability) => ({
  id: 0, verified: true, years: 8, certifications: [],
  routesLogged: 40, communityVouches: 3,
  catchLedger: { totalCatches: 8, highFactorCatches: 2, lastCatch: "2026-08-01" },
  reliability,
});

const rowsUntracked = trustFactors(acct(null));
const rowsZero = trustFactors(acct(0));
// FAIL CLOSED: with no factors parsed every assertion below passes vacuously.
if (rowsUntracked.length < 6) dead(`trustFactors returned ${rowsUntracked.length} factors — too few to be the breakdown.`);
const relU = rowsUntracked.find((f) => f.label === "Reliability");
const relZ = rowsZero.find((f) => f.label === "Reliability");
if (!relU || !relZ) dead("no Reliability factor — the label moved, so this guard proved nothing.");

console.log("SECTION 1 — untracked is not zero (executed)");

// ---- UNTRACKED MUST SAY SO, AND MUST LEAVE THE DENOMINATOR ------------------------------------
if (relU.sub === "Not yet tracked") ok('an untracked reliability reads "Not yet tracked"');
else bad(`an untracked reliability reads ${JSON.stringify(relU.sub)} — a climber who has committed to nothing is being given a figure for it`);
if (relU.max === 0) ok("...and its max is 0, so it leaves the denominator rather than sitting there unfillable");
else bad(`an untracked reliability still carries max ${relU.max} — that is ${relU.max} points of goal the climber cannot fill`);
if (relU.pts === 0) ok("...and it scores nothing, which is the only honest answer");
else bad(`an untracked reliability scored ${relU.pts} points from no measurement at all`);

// ---- AND A REAL ZERO MUST STILL BE SHOWN. This is the half that keeps the rule honest: a guard
// demanding only "Not yet tracked" is satisfied by making the row ALWAYS untracked, which would
// hide a genuine no-show record -- a rule that only ever suppresses is satisfied by deleting the
// feature, which this file records for pitchShortfall and for the impossible-leg suppression.
// THE PROPERTY, NEVER THE PHRASING. A first version keyed on /^0% of confirmed crews honored/
// and the SILENT injection case duly fired on a reworded sentence whose nullability was untouched —
// a guard forbidding an improvement to its own copy, which is what teaches people to ignore one.
// What must hold is that a measured row does NOT take the untracked sentence and DOES state the
// percentage; how it words the rest is the author's business.
if (relZ.sub !== "Not yet tracked" && /0\s*%/.test(relZ.sub)) ok("a REAL 0% is still stated — 0 of 4 honored is a measurement, not a blank");
else bad(`a real 0% reliability reads ${JSON.stringify(relZ.sub)} — a genuine no-show record must not be hidden as untracked`);
if (relZ.max > 0) ok("...and it counts, because it is something the climber can actually improve");
else bad("a real 0% reliability carries max 0 — a measured factor has left the denominator");

// ---- THE DENOMINATOR MOVES, which is what makes the two branches different rather than cosmetic.
const denU = rowsUntracked.reduce((s, f) => s + f.max, 0);
const denZ = rowsZero.reduce((s, f) => s + f.max, 0);
if (denU < denZ) ok(`the untracked branch drops ${denZ - denU} points of unfillable goal (${denZ} -> ${denU})`);
else bad(`the denominator did not move (${denZ} -> ${denU}) — untracked and measured are being treated alike`);
const scoreU = vScore(acct(null)), scoreZ = vScore(acct(0));
if (scoreU > scoreZ) ok(`and the score reflects it: ${scoreZ} with a coerced 0 against ${scoreU} untracked`);
else bad(`the trust score is ${scoreZ} either way — the coercion costs the climber nothing, so this guard is measuring the wrong thing`);

// ---- THE SIBLING FACTORS, so the rule is a rule rather than one row's special case. The memory
// record for #1569 names these as "the correct twin that already existed": four factors already
// read "Not yet tracked", and Reliability was the outlier.
const untrackedLabels = rowsUntracked.filter((f) => f.sub === "Not yet tracked").map((f) => f.label);
if (untrackedLabels.length >= 4) ok(`${untrackedLabels.length} factors say "Not yet tracked" on a fresh account: ${untrackedLabels.join(", ")}`);
else bad(`only ${untrackedLabels.length} factors say "Not yet tracked" (${untrackedLabels.join(", ") || "none"}) — the convention Reliability was the outlier to has itself eroded`);
for (const f of rowsUntracked) {
  if (f.sub === "Not yet tracked" && f.max !== 0) bad(`"${f.label}" says "Not yet tracked" and still carries max ${f.max}`);
}

// ---- SECTION 2: THE WIRING, ASSERTED AS SOURCE -----------------------------------------------
// Executing trustFactors proves the BRANCH; it cannot prove App still hands it null. A stale-base
// squash takes exactly that half -- the ternary goes back to Math.max(1,committed), every assertion
// above still passes, and the accusation returns with no identifier moved.
console.log("\nSECTION 2 — App still hands it null (source)");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
if (app.length < 100000) dead(`ClimbMatch.jsx read as ${app.length} chars — too short to be the app.`);

for (const [needle, why] of [
  ["ME.reliability=relLedger.committed?Math.round(relLedger.honored/relLedger.committed*100):null;",
   "reliability is null until a crew commitment exists"],
  ["setRelLedger({honored:0,committed:0})",
   "the sign-in reset still zeroes the ledger — without it the demo's 23/24 would follow a real account"],
]) {
  const n = app.split(needle).length - 1;
  if (n === 1) ok(why); else bad(`${why} — matched ${n}, expected 1`);
}
if (app.includes("Math.max(1,relLedger.committed)")) bad("the divide-by-zero guard is back, which is what coerced 0/0 into 0%");
else ok("no Math.max(1,…) coercion remains");

// A COUNT of zero must stay a NUMBER: "0 trip reports shared" is true, and nulling it would swap
// one wrong answer for another by hiding a real, fillable goal. The rule is about a RATIO with no
// denominator, never about every zero on the card.
for (const [needle, why] of [
  ["ME.routesLogged=logs.length;", "logged climbs stays a count"],
  ["ME.conditionsReported=condReports.length;", "conditions reported stays a count"],
]) {
  if (app.includes(needle)) ok(why); else bad(`${why} — missing \`${needle}\``);
}

// ---- AND #1569's OTHER DEFECT, found by the same census and fixed in the same change ----------
// THE JOURNEY WALK DOES NOT COVER THIS ONE, and it is worth being exact about why: phase 5 drives
// `FullProfile`'s connect button, which the census names as the correct TWIN that already called
// connect(). The forked one was the TRIP REPORT's, which pushed the climber into local
// `connections` and toasted "you are now friends" -- claiming a MUTUAL state the real flow cannot
// create, since connect() opens ConnectModal and sends a request the other person must accept.
if (app.includes("onConnect={c=>connect(c)}")) ok("the trip report connects through the real flow");
else bad("the trip report's connect button has forked from connect() again");
if (/onConnect=\{c=>\{setConnections\(pp=>pp\.find/.test(app)) bad("the local-only connect handler is back");
else ok("no local-only connect handler remains");

if (fails) { console.log(`\ncheck:untracked-factors FAILED — ${fails} problem(s).`); process.exit(1); }
console.log("\ncheck:untracked-factors: ok — a factor nobody measured reads as untracked, a measured zero is still stated, and connect goes through the real flow.");
