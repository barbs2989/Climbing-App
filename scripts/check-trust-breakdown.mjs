// Do the factors under WHAT FEEDS YOUR SCORE add up to the score they claim to feed?
//
// THIS GUARD WAS CLAIMED IN A COMMENT AND DID NOT EXIST. `trustContributions` in
// ClimbMatchCore.jsx says, in as many words, "check:trust-breakdown asserts it over a spread of
// accounts" — and there was no such script and no such npm entry. That is worse than an unguarded
// invariant: a reader looking for coverage finds a sentence saying it is covered and stops. It is
// also invisible to check:guard-wiring, which asks whether a guard ON DISK actually runs; a guard
// named only in prose has no file for it to find.
//
// THE DEFECT IT PINS. trustFactors returns points on its own scale — `max` is conditional per
// factor, so the denominator differs per account — while vScore renders a PERCENTAGE,
// Math.round(sum/max*99). The breakdown used to print the raw `pts`, so an account with only its
// email verified showed one factor at "+20" above a headline of "17 / 90 goal": a single
// contributor apparently larger than the whole score, on a panel headed WHAT FEEDS YOUR SCORE.
//
// TWO SECTIONS, AND THE SECOND IS THE ONE A MERGE TAKES. Section 1 executes the real
// trustContributions and checks the arithmetic. Section 2 RENDERS the panel, because a stale-base
// squash that restored `{"+"+f.pts}` changes no identifier trustContributions exports: every
// arithmetic assertion in section 1 would still pass while the panel went back to printing the
// wrong scale. Same split as check:topo-outage-copy — executing the function proves the number,
// not that the screen uses it.
//
// Section 2 renders rather than matching source deliberately. A text match on TrustBreakdown's
// body would also fire on a comment inside it naming the old expression, which is a guard
// forbidding the code from explaining itself — the trade check:access-checked-line's case 4 exists
// to refuse. The render is immune to prose in either direction.
//
// Static: bundles ClimbMatchCore.jsx and executes the real exported functions. No browser, no
// database, no network.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(ROOT, `.trustbreakdown-${process.pid}.mjs`);
const clean = () => fs.rmSync(out, { force: true });

let failures = 0, cases = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const dead = (what) => {
  console.error(`\ncheck:trust-breakdown FAILED — ${what}.`);
  console.error("Nothing below was checked. Every assertion here passes against an account whose");
  console.error("score is zero and whose factors are all zero, so a broken scan must never read clean.\n");
  clean();
  process.exit(1);
};

try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { dead("esbuild could not bundle ClimbMatchCore.jsx"); }

const mod = await import(out + "?t=" + Date.now());
const { vScore, trustContributions, trustFactors, CLIMBERS } = mod;
if (typeof vScore !== "function") dead("ClimbMatchCore.jsx does not export vScore — ANCHOR LOST");
if (typeof trustContributions !== "function") dead("ClimbMatchCore.jsx does not export trustContributions — ANCHOR LOST");
if (typeof trustFactors !== "function") dead("ClimbMatchCore.jsx does not export trustFactors — ANCHOR LOST");

// A SPREAD, not one account, because `max` is conditional per factor: an account with nothing
// tracked has a different denominator from one with everything, and largest-remainder
// apportionment is exactly the kind of arithmetic that is right in the middle and wrong at an end.
const ACCOUNTS = [
  ["a brand-new account", { id: 0 }],
  ["email verified and nothing else", { id: 0, verified: true }],
  ["email plus one vouch", { id: 0, verified: true, communityVouches: 1 }],
  ["a few climbs logged", { id: 0, routesLogged: 7 }],
  ["a partial mix", { id: 0, verified: true, reliability: 73, responseRate: 41, routesLogged: 23, years: 4 }],
  ["every factor tracked", { id: 0, verified: true, communityVouches: 6, routesLogged: 60, reliability: 100, responseRate: 100, partnerCount: 40, conditionsReported: 30, floatPlans: 9, years: 20, certifications: ["a", "b", "c", "d"], catchLedger: { totalCatches: 20, highFactorCatches: 8, lastCatch: "2026-08-01" } }],
];
for (const c of (CLIMBERS || []).slice(0, 6)) ACCOUNTS.push(["seed climber " + (c && c.name), c]);

const factorCount = trustFactors({ id: 0 }).length;
if (factorCount < 6) dead(`trustFactors returned only ${factorCount} factor(s) — the scan broke`);
if (ACCOUNTS.length < 8) dead(`only ${ACCOUNTS.length} account(s) to test — the seed climbers did not load`);

// ---- 1. the listed factors must sum to the headline ----
let nonZero = 0;
for (const [label, c] of ACCOUNTS) {
  const head = vScore(c);
  const rows = trustContributions(c);
  cases++;
  if (!Array.isArray(rows) || rows.length !== factorCount) {
    fail(`${label}: trustContributions returned ${Array.isArray(rows) ? rows.length : "not an array"}, expected ${factorCount} factor(s)`);
    continue;
  }
  if (rows.some((f) => typeof f.share !== "number")) {
    fail(`${label}: a factor carries no numeric \`share\` — the breakdown has nothing to render`);
    continue;
  }
  const sum = rows.reduce((s, f) => s + f.share, 0);
  if (head > 0) nonZero++;
  if (sum !== head) {
    fail(`${label}: factors sum to ${sum} but the headline says ${head} — the panel does not add up`);
    continue;
  }
  // The ORIGINAL SYMPTOM, asserted separately: equal is fine (one factor can be the whole score),
  // larger is the defect a reader actually noticed.
  const over = rows.filter((f) => f.share > head);
  if (over.length) {
    fail(`${label}: ${over.map((f) => `"${f.label}" +${f.share}`).join(", ")} exceed(s) the headline of ${head}`);
    continue;
  }
  ok(`${label}: ${rows.length} factors sum to ${sum}, headline ${head}`);
}

// NON-VACUITY. Every assertion above is satisfied by a scoring function that returns 0 for
// everything and shares of 0, so a spread that is entirely zero proves nothing at all.
if (nonZero < 4) dead(`only ${nonZero} account(s) scored above zero — the spread cannot exercise the apportionment`);

// ---- 2. the RENDERER must show the apportioned share, not the raw points ----
// RENDERED, NOT MATCHED AS SOURCE. A merge that restores `{"+"+f.pts}` changes no identifier
// trustContributions exports, so section 1 stays green while the panel goes back to printing the
// wrong scale — section 2 has to exist. But a TEXT match on the function body would also fire on a
// comment inside it that names the old expression, i.e. it would forbid the code explaining
// itself, which this repo has already recorded as the wrong trade. Rendering asks what the panel
// actually shows and cannot be fooled by prose either way.
//
// The fixture is chosen so the two scales DISAGREE: with only the email verified the raw points
// are 20 and the apportioned share is 23. A fixture where they coincide proves nothing.
const { renderToStaticMarkup } = await import("react-dom/server");
const probe = { id: 0, verified: true };
const rawPts = trustFactors(probe).find((f) => f.label === "Email verified");
const shareRow = trustContributions(probe).find((f) => f.label === "Email verified");
if (!rawPts || !shareRow) dead("the Email verified factor is gone — ANCHOR LOST, the fixture cannot separate the two scales");
if (rawPts.pts === shareRow.share) dead(`the fixture no longer separates the scales (pts and share are both ${rawPts.pts}) — pick an account where they differ`);

let markup = "";
try { markup = renderToStaticMarkup(mod.TrustBreakdown({ climber: probe })); }
catch (e) { dead("TrustBreakdown threw while rendering: " + (e && e.message)); }
if (markup.length < 200) dead(`TrustBreakdown rendered ${markup.length} characters — too thin to assert on, so every check below would pass vacuously`);

cases++;
if (!markup.includes("+" + shareRow.share)) {
  fail(`the panel does not show "+${shareRow.share}" for Email verified — the apportioned share reaches no screen`);
} else ok(`the panel shows the apportioned share ("+${shareRow.share}")`);

cases++;
if (markup.includes("+" + rawPts.pts)) {
  fail(`the panel shows "+${rawPts.pts}" — raw points under a headline of ${vScore(probe)}, the defect this guard exists for`);
} else ok(`the panel does not show the raw points ("+${rawPts.pts}")`);

clean();
if (failures) {
  console.error(`\ncheck:trust-breakdown: ${failures} failure(s) across ${cases} case(s).`);
  console.error("The panel headed WHAT FEEDS YOUR SCORE must list numbers that add up to the score");
  console.error("it sits under. If the apportionment changed on purpose, update this guard with it.\n");
  process.exit(1);
}
console.log(`\ncheck:trust-breakdown: ok — ${cases} case(s); ${ACCOUNTS.length} accounts' factors each sum to their headline, and the panel renders the apportioned share.`);
