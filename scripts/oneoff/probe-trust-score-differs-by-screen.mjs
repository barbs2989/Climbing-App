// Does one climber's trust score differ between the Profile and the Ranks tab?
//
// CORRECTED 2026-09-02, AND THE FIRST VERSION OF THIS PROBE OVERSTATED THE DEFECT. It modelled
// `routesLogged` as zero on the Profile. It is NOT: the legacy sync hack in App's render body
// writes `ME.routesLogged = logs.length` on every render, so that field is real on EVERY surface
// and always was. `ME.catchLedger` is written NOWHERE, so it alone stays zeroed by the sign-in
// reset. One field, not two — and the Profile was the CORRECT screen, not one of the wrong ones.
//
// The lesson is the method: `ME.<field> =` writes are scattered through a 400kB render body, so
// "the reset zeroes it" is only half the question. Ask what writes it BACK before concluding a
// field is dead.
//
// vScore is rendered for the SIGNED-IN CLIMBER on two screens, from two different objects:
//
//   Profile      vScore(meLive)   where meLive = {...ME, catchLedger: meLedger}
//   Ranks        vScore(pp)       where the self row = {...ME, routesLogged: logs.length, ...}
//                                 (the "Trusted" board's val IS vScore, shown as "N trust")
//
// trustFactors reads BOTH `catchLedger` (belay catches, up to 20 pts) and `routesLogged` (logged
// climbs, up to 16). Each object carries the real value for ONE of them and the sign-in reset's
// zero for the other:
//
//   Object.assign(ME, { ..., catchLedger:{totalCatches:0,...}, routesLogged:0, ... })
//
// So Profile sees the real ledger with routesLogged 0, and Ranks sees the real log count with an
// empty ledger. This executes the real vScore over both shapes rather than reasoning about it.
//
// The two screens disagreeing about ONE fact is the class check:ui's screen-counts guard exists
// for — that one compares list counts across screens and does not look at the trust score.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(ROOT, `.trustsplit-${process.pid}.mjs`);
const clean = () => fs.rmSync(out, { force: true });

execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
  "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
  "--define:import.meta.env={}",
  "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });

const { vScore, trustFactors } = await import(out + "?t=" + Date.now());

// ME as the sign-in reset leaves it, for a real account. Only the fields trustFactors reads.
const RESET_ME = {
  id: 0, verified: true, communityVouches: 0, certifications: [],
  catchLedger: { totalCatches: 0, highFactorCatches: 0, lastCatch: "", partnersSigned: 0 },
  // NOT 0. The sync hack keeps this real on every surface; only catchLedger is actually lost.
  routesLogged: 18, reliability: null, responseRate: null,
  partnerCount: null, conditionsReported: null, floatPlans: null, years: null,
};

const SCENARIOS = [
  ["9 catches, 2 high-factor", 18, { totalCatches: 9, highFactorCatches: 2, lastCatch: "2026-08-20" }],
  ["1 catch", 18, { totalCatches: 1, highFactorCatches: 0, lastCatch: "2026-08-20" }],
  ["20 catches, 8 high-factor", 18, { totalCatches: 20, highFactorCatches: 8, lastCatch: "2026-08-20" }],
  ["no catches at all", 18, { totalCatches: 0, highFactorCatches: 0, lastCatch: "" }],
];

let differ = 0;
console.log("  Profile      = vScore({...ME, catchLedger: meLedger})   <- was already right");
console.log("  Ranks/Share/Resume = vScore(bare ME)                    <- catchLedger zeroed\n");
for (const [label, logCount, ledger] of SCENARIOS) {
  const profile = { ...RESET_ME, catchLedger: ledger };   // meLive: the real ledger
  const ranks = { ...RESET_ME, routesLogged: logCount };  // a bare ME: catchLedger still zeroed
  const p = vScore(profile), r = vScore(ranks);
  if (p !== r) differ++;
  console.log(`  ${p === r ? "agree " : "DIFFER"}  Profile ${String(p).padStart(3)}   Ranks ${String(r).padStart(3)}   ${label}`);
}

// Which factors move, so the diagnosis names a cause rather than a number.
const withBoth = { ...RESET_ME, routesLogged: 18, catchLedger: { totalCatches: 9, highFactorCatches: 2, lastCatch: "2026-08-20" } };
console.log("\n  If ONE object carried both real values, the factors would be:");
for (const f of trustFactors(withBoth)) {
  if (f.label === "Logged climbs" || f.label === "Verified belay catches") {
    console.log(`      ${f.label}: ${f.pts}/${f.max} pts  (${f.sub})`);
  }
}
console.log(`\n  truth (both real): ${vScore(withBoth)}`);

clean();
console.log(`\n${differ} of ${SCENARIOS.length} scenario(s) show the SPLIT objects disagreeing.`);

// ---- the fix is WIRING, so assert the wiring, not only the arithmetic ----
// Executing vScore over two hand-built shapes shows what the split COST. It cannot show that the
// app stopped doing it: that is four call sites in two files, and a merge could restore any one of
// them while every number above stayed identical. Same split as check:topo-outage-copy.
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
let bad = 0;
const must = (cond, label) => { console.log(`  ${cond ? "ok   " : "FAIL "} ${label}`); if (!cond) bad++; };

console.log("\n  wiring — every surface that shows YOUR score must read the one self object:");
const ml = /meLive=useMemo\(function\(\)\{[\s\S]{0,900}?\},\[[^\]]*\]\);/.exec(app);
must(!!ml, "meLive is still a useMemo — ANCHOR");
if (ml) {
  must(/catchLedger:meLedger/.test(ml[0]), "meLive carries the real catchLedger");
  must(/routesLogged:logs\.length/.test(ml[0]), "meLive carries the real routesLogged");
  must(/\[[^\]]*\blogs\b[^\]]*\]/.test(ml[0]), "logs is in meLive's dependency list");
}
must(/<ShareCard climber=\{meLive\}/.test(app), "the share card is handed meLive, not a bare ME");
must(/setResumeFor\(meLive\)/.test(app), "your own resume is handed meLive, not a bare ME");
must(/<Leaderboards meLive=\{meLive\}/.test(app), "Leaderboards is handed meLive");
must(/function Leaderboards\(\{meLive,/.test(core), "Leaderboards destructures it");
must(/const me=\{\.\.\.\(meLive\|\|ME\),routesLogged:logs\.length,/.test(core), "the Ranks self row spreads it");
must(!/<ShareCard climber=\{ME\}/.test(app) && !/setResumeFor\(ME\)/.test(app), "no self surface still spreads a bare ME");

if (bad) { console.error(`\n${bad} wiring assertion(s) failed — a screen is back on its own self object.`); process.exit(1); }
console.log("\n  all four self-facing surfaces read one object, so they cannot disagree.");
