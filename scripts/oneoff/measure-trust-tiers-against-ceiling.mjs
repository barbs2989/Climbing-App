// FOUR TRUST BARS CALIBRATED AGAINST A SCALE THAT DOES NOT EXIST.
//
// #1704 moved the group-join gate from 55 to 20 because 55 sat ONE POINT above the 54 a climber
// with no vouches and no belay catches can reach. It fixed that one threshold and left every other
// number calibrated the same way — the Profile card's "/ 90 goal", its progress denominator, its
// "✓ Well-trusted" line, and TrustBadge's "Highly Trusted" (>=90) and "Trusted" (>=70).
//
// The model's CAP is 99 and its EARNABLE ceiling is lower, because `compute_trust_score` pays for a
// government ID and for club/guide credentials that nothing in the app can grant. A bar in that gap
// is not strict, it is unreachable: no climber can ever be shown it.
//
// WHAT THIS PRINTS AND WHY IT IS NOT A PROPOSAL. It reports the ceiling, what real milestones
// score, and which bars sit above what anybody can reach. Where a reachable bar then SITS is a
// product call — the same call #1704 recorded for the join threshold, whose guard deliberately
// bounds the number rather than pinning it.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { reachableVerificationTypes, partnerlessCeiling, dayOneScore, earnableCeiling } from "../lib/verification-reach.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// The app is JSX, so it is bundled rather than imported — the same route check:trust-breakdown
// takes. Written INSIDE the project: with react external, node resolves it from the nearest
// node_modules and a bundle in the OS temp dir throws ERR_MODULE_NOT_FOUND.
const tmp = path.join(ROOT, ".trust-tier-measure");
fs.mkdirSync(tmp, { recursive: true });
const entry = path.join(tmp, "entry.mjs");
const bundle = path.join(tmp, "core.mjs");
fs.writeFileSync(entry, `export { serverTrustScore, serverTrustFactors, SERVER_TRUST_CAP } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};\n`);
try {
  execFileSync("npx", ["esbuild", entry, "--bundle", "--format=esm", "--platform=node",
    "--jsx=automatic", "--loader:.jsx=jsx", "--external:react", "--external:react-dom",
    "--external:@tanstack/react-query", "--define:import.meta.env={}", `--outfile=${bundle}`],
    { cwd: ROOT, stdio: "pipe" });
} catch (e) {
  console.error("FAIL - could not bundle the app:", String(e.stderr || e).slice(0, 400));
  process.exit(1);
}
const mod = await import(bundle + "?t=" + Date.now());
fs.rmSync(tmp, { recursive: true, force: true });

const { serverTrustScore: score, SERVER_TRUST_CAP: CAP } = mod;
if (typeof score !== "function") { console.error("FAIL - ClimbMatchCore.jsx does not export serverTrustScore"); process.exit(1); }

const { types: reachable, scanned } = reachableVerificationTypes(path.join(ROOT, "supabase", "migrations"));
if (scanned < 20) { console.error(`FAIL - only ${scanned} migration(s) scanned; an unscanned tree reports every verification unreachable and collapses every ceiling below.`); process.exit(1); }
if (!reachable.size) { console.error("FAIL - no verification type parsed as reachable; a broken scan, not a finding."); process.exit(1); }

const dayOne = dayOneScore(score, reachable);
const partnerless = partnerlessCeiling(score, reachable);
const ceiling = earnableCeiling(score, reachable);
if (!(ceiling >= partnerless && partnerless > dayOne)) { console.error(`FAIL - ceilings are not ordered (${dayOne} / ${partnerless} / ${ceiling}); the model did not load.`); process.exit(1); }

console.log(`cap ${CAP} · EARNABLE CEILING ${ceiling} · partnerless ${partnerless} · day one ${dayOne}`);
console.log(`reachable verifications: ${[...reachable].join(", ") || "(none)"}`);
console.log(`unreachable and therefore never scored: ${["id", "member_club", "guide_certified"].filter((t) => !reachable.has(t)).join(", ") || "(none)"}\n`);

// Milestones described in things a climber DOES, so a tier can be justified by what it means
// rather than by where it lands on a scale.
const YEAR = 365;
const WHO = [
  ["signed up, email confirmed",                 { emailVerified: true }],
  ["3 months, 8 climbs logged",                  { emailVerified: true, tenureDays: 90, logs: 8 }],
  ["6 months, 20 climbs, 1 vouch",               { emailVerified: true, tenureDays: 180, logs: 20, vouches: 1 }],
  ["1 year, 40 climbs, 3 vouches, 2 catches",    { emailVerified: true, tenureDays: YEAR, logs: 40, vouches: 3, catches: 2, reports: 4 }],
  ["2 years, 60 logs, 12 vouches, 9 catches",    { emailVerified: true, tenureDays: 2 * YEAR, logs: 60, vouches: 12, catches: 9, reports: 20 }],
  ["4 years, 200 logs, 25 vouches, 20 catches",  { emailVerified: true, tenureDays: 4 * YEAR, logs: 200, vouches: 25, catches: 20, reports: 60 }],
];
console.log("WHAT A REAL CLIMBER SCORES");
const scored = WHO.map(([label, x]) => [label, score(x)]);
for (const [label, s] of scored) console.log(`  ${String(s).padStart(3)}  ${label}`);

// The bars as they stand today, read out of the source rather than restated here — a number typed
// into a measurement is a hand-copy, and this whole finding is what a hand-copied scale costs.
//
// THEY USED TO BE SIX SEPARATE LITERALS and this read all six: the card's goal, its progress
// denominator, its "Well-trusted" gate, and a 90/70/50 ladder written out TWICE (TrustBadge and
// FullProfile each carried a copy, so one climber could be called two different things depending
// which screen you were on). Four of the six sat above the ceiling. They are one exported
// TRUST_TIERS table now, with TRUST_GOAL derived from its top tier and the card reading that — so
// this reads the table, and check:trust-breakdown section 7 keeps it honest on every build.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const table = /export var TRUST_TIERS=(\[[^\]]*\])/.exec(core);
if (!table) { console.error("\nFAIL - ANCHOR LOST: TRUST_TIERS is not where this expects it. Re-point this before believing a clean run."); process.exit(1); }
const TIERS = JSON.parse(table[1].replace(/([{,])(\w+):/g, '$1"$2":'));
if (!TIERS.length) { console.error("\nFAIL - the tier table parsed empty; every bar below would read as reachable."); process.exit(1); }

// The card must READ the top tier rather than restate it. A literal there is a fourth copy.
const cardReads = [
  ["Profile card goal ('· goal met')", /myTrustScore>=TRUST_GOAL\?"· goal met"/.test(app)],
  ["Profile progress denominator", /myTrustScore\/TRUST_GOAL\*100/.test(app)],
  ["'✓ Well-trusted' / 'Raise it with' gate", /!_trustUnsure&&myTrustScore<TRUST_GOAL/.test(app)],
];

console.log("\nTHE BARS AS THEY STAND");
let bad = 0;
for (const t of TIERS) {
  const who = scored.filter(([, s]) => s >= t.min).length;
  const over = t.min > ceiling;
  if (over) bad++;
  console.log(`  ${over ? "**" : " ok"} ${String(t.min).padStart(3)}  TrustBadge "${t.label}"` +
    (over ? `  — ABOVE the ${ceiling} ceiling; nobody can ever be shown this`
          : `  — ${who} of ${scored.length} milestones reach it`));
}
for (const [label, ok] of cardReads) {
  if (!ok) bad++;
  console.log(`  ${ok ? " ok" : "**"}       ${label} — ${ok ? "reads TRUST_GOAL" : "does NOT read TRUST_GOAL; a literal there is a copy of the top tier"}`);
}

console.log(`\nThe ladder is written ONCE: ${TIERS.length} tiers in TRUST_TIERS, and TrustBadge and FullProfile`);
console.log("both resolve through trustTier(). It used to be two copies plus two literals in the card, which");
console.log("is the group roster's count shape — a hoist is not a single source of truth until every site");
console.log("uses it.\n");
console.log(`${bad} of ${TIERS.length + cardReads.length} bars are unreachable or restate the goal.`);
console.log("Where a REACHABLE bar then sits is a product call. This prints the constraint, not the answer.");
