// How far does the SELF trust score move when the reads that feed it fail?
//
// meLive = {...ME, catchLedger:meLedger, routesLogged:logs.length, communityVouches:vouchesIn} --
// and all three of those come from queries that already carry a flag (catchesUnavailable,
// logsUnavailable, vouchesInUnavailable). The Profile renders vScore(meLive) as a number with a
// "/ 90 goal" progress bar and a WHAT FEEDS YOUR SCORE breakdown, consulting none of them.
//
// A count is visibly a count; a trust score of 41 where the truth is 58 looks like an ordinary
// trust score. There is no tell at all. So measure the movement before deciding it matters.
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const OUT = path.join(process.cwd(), ".probe-trust-bundle.mjs");
execFileSync("npx", ["esbuild", "ClimbMatchCore.jsx", "--bundle", "--format=esm",
  "--jsx=automatic", "--loader:.jsx=jsx", "--platform=node",
  "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--define:import.meta.env={}", "--outfile=" + OUT], { stdio: ["ignore", "ignore", "inherit"] });

const core = await import(OUT + "?t=" + Date.now());
fs.unlinkSync(OUT);
const { vScore, trustFactors } = core;
if (typeof vScore !== "function" || typeof trustFactors !== "function") {
  console.error("FAIL-CLOSED: vScore/trustFactors not exported — the probe measured nothing.");
  process.exit(1);
}

// A signed-in climber's own object. ME is spread in, so the seed identity's `years`/`verified`
// survive the sign-in reset; the three DB-backed values are what an outage zeroes.
const base = (logs, catches, vouches) => ({
  id: 0, verified: true, years: 8, certifications: [],
  routesLogged: logs,
  communityVouches: vouches,
  catchLedger: { totalCatches: catches, highFactorCatches: Math.floor(catches / 3), lastCatch: "2026-08-01" },
});

const rows = [];
for (const [label, logs, catches, vouches] of [
  ["a new-ish account   ", 6, 1, 1],
  ["a typical account   ", 40, 8, 3],
  ["an established one  ", 120, 25, 6],
]) {
  const healthy = vScore(base(logs, catches, vouches));
  const out = vScore(base(0, 0, 0));
  rows.push([label, healthy, out, healthy - out]);
}

console.log("SELF TRUST SCORE, healthy vs all three reads failing\n");
console.log("  profile                healthy   outage   drop");
for (const [l, h, o, d] of rows) console.log(`  ${l}   ${String(h).padStart(5)}   ${String(o).padStart(6)}   ${String(d).padStart(4)}`);

// Per-flag, so the repair can be attributed rather than lumped.
console.log("\nONE READ AT A TIME (typical account: 40 logs, 8 catches, 3 vouches)");
const t = [40, 8, 3];
const full = vScore(base(...t));
for (const [name, idx] of [["logsUnavailable      ", 0], ["catchesUnavailable   ", 1], ["vouchesInUnavailable ", 2]]) {
  const a = t.slice(); a[idx] = 0;
  console.log(`  ${name}  ${full} -> ${vScore(base(...a))}   (drop ${full - vScore(base(...a))})`);
}

// The denominator is what makes this bite: max is UNCONDITIONAL for these three factors, so a
// failed read does not shrink the goal -- it just removes the points.
const f = trustFactors(base(...t));
const affected = ["Peer vouches", "Verified belay catches", "Logged climbs"];
const maxAll = f.reduce((a, x) => a + x.max, 0);
const maxAff = f.filter((x) => affected.includes(x.label)).reduce((a, x) => a + x.max, 0);
console.log(`\nfactors with a nonzero max: ${f.filter((x) => x.max > 0).length}`);
console.log(`denominator: ${maxAll} total, ${maxAff} of it (${Math.round(maxAff / maxAll * 100)}%) from the three flagged reads`);
console.log("the three factors' max is UNCONDITIONAL, so a failed read removes points and keeps the goal.");

// ---------------------------------------------------------------------------------------------
// SECTION 2 -- THE JOIN, AND THE RENDER.
// trustGapLabels names factors by their string label, and trustFactors owns those literals. A
// rename there would leave the map matching nothing and every caveat silently absent, with the
// panel back to reporting 0 as a fact. So assert the join, then assert the panel actually says it.
import { renderToStaticMarkup } from "react-dom/server";

let fails = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { console.log("  FAIL  " + m); fails++; };

console.log("\nSECTION 2 — the label join and the rendered panel");

const { trustGapLabels, TrustBreakdown } = core;
if (typeof trustGapLabels !== "function" || typeof TrustBreakdown !== "function") {
  console.error("FAIL-CLOSED: trustGapLabels/TrustBreakdown not exported — nothing below was checked.");
  process.exit(1);
}

const probe = base(...t);
const real = new Set(trustFactors(probe).map((f) => f.label));
const mapped = trustGapLabels({ logs: 1, catches: 1, vouches: 1 });
if (mapped.length !== 3) bad(`trustGapLabels returned ${mapped.length} labels, expected 3`);
else ok("trustGapLabels names three factors");
for (const l of mapped) {
  if (real.has(l)) ok(`"${l}" is a real trustFactors label`);
  else bad(`"${l}" matches NO trustFactors label — the caveat can never fire for it`);
}
if (trustGapLabels(undefined).length || trustGapLabels({}).length)
  bad("trustGapLabels invents a gap with no flags set");
else ok("no flags set → no gap");

const healthy = renderToStaticMarkup(TrustBreakdown({ climber: probe }));
if (healthy.length < 200) { console.error(`FAIL-CLOSED: panel rendered ${healthy.length} chars — every assertion below would pass vacuously.`); process.exit(1); }
const CAVEAT = "not counted in the score right now";

if (healthy.includes(CAVEAT)) bad("a HEALTHY panel already shows the couldn’t-load line");
else ok("a healthy panel shows no couldn’t-load line");
for (const [lbl, sub] of [["Logged climbs", "40 recorded"], ["Peer vouches", "3 received"]])
  if (healthy.includes(sub)) ok(`healthy panel still states "${sub}" for ${lbl}`);
  else bad(`healthy panel lost "${sub}" — the fix suppressed a factor it should not`);

// One flag at a time: a caveat that fires on every factor is as wrong as one that never fires.
// `sub` here must be the string the OUTAGE fixture would print (0), not the healthy one. Checking
// for "40 recorded" against a base(0,0,0) climber is satisfied by the defect: the reverted panel
// prints "0 recorded", the needle never matched, and the assertion stayed green through injection.
for (const [key, lbl, sub] of [["logs", "Logged climbs", "0 recorded"],
                               ["vouches", "Peer vouches", "0 received"]]) {
  const out = renderToStaticMarkup(TrustBreakdown({ climber: base(0, 0, 0), failed: { [key]: true } }));
  const n = out.split(CAVEAT).length - 1;
  if (n === 1) ok(`failed=${key}: exactly one factor says it couldn’t load`);
  else bad(`failed=${key}: ${n} factors say it couldn’t load, expected 1`);
  if (out.includes(sub)) bad(`failed=${key}: still reports "${sub}" as a fact about ${lbl}`);
  else ok(`failed=${key}: no longer states 0 as a fact for ${lbl}`);
}


// ---------------------------------------------------------------------------------------------
// SECTION 3 -- THE WIRING, ASSERTED AS SOURCE.
// Section 2 renders TrustBreakdown with the prop handed to it directly, so it proves the COPY and
// not that App still passes one. A stale-base squash takes exactly that half: `failed` arrives
// undefined, trustGapLabels returns [], every assertion above still passes, and the panel goes
// back to reporting 0 as a fact. Same split check:outage-copy and check:topo-outage-copy record.
console.log("\nSECTION 3 — App still wires it (source)");
const app = fs.readFileSync("ClimbMatch.jsx", "utf8");
for (const [needle, why] of [
  ["<TrustBreakdown climber={meLive} failed={_trustGaps}/>", "the breakdown is told which reads failed"],
  ["const _trustGaps={logs:logsUnavailable,catches:catchesUnavailable,vouches:vouchesInUnavailable}", "the gap map is built from all three flags"],
  ["so your score is showing lower than it is", "the headline caveat"],
  ["{(!_trustPartial&&vScore(meLive)<90)?", "the Raise-it-with prompt is withheld while an input is missing"],
]) {
  const n = app.split(needle).length - 1;
  if (n === 1) ok(why);
  else bad(`${why} — matched ${n} times in ClimbMatch.jsx, expected 1`);
}

console.log(fails ? `\n${fails} FAILURE(S)` : "\nok — the gap map joins the real factors and the panel says so");
process.exit(fails ? 1 : 0);
