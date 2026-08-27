#!/usr/bin/env node
// Does the breakdown RENDER the normalised share, or the raw points?
//
// verify-trust-shares-sum-to-score.mjs proves sum(share) === vScore over a spread of accounts, but
// that is a property of the helper. It says nothing about whether the PANEL reads it — and the two
// are indistinguishable on the account a browser walk happens to produce, because an unverified
// fixture has every factor at 0 and "+0" renders the same either way. So this renders the real
// TrustBreakdown over a climber chosen to make pts and share DIFFER, and asserts on the markup.
//
//   node scripts/oneoff/probe-trust-breakdown-shows-shares.mjs

import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(ROOT, "node_modules", ".cache-trustpanel.cjs");
fs.mkdirSync(path.dirname(OUT), { recursive: true });
// --jsx=automatic, as check:bare does. Without it esbuild uses the CLASSIC runtime, which emits
// React.createElement and needs `React` in the module scope of the bundle -- it is not there, so
// the render died with "React is not defined" (and, on a loaded box, spent itself into an OOM
// first). Bundled INSIDE the project so node resolves react from the nearest node_modules.
execFileSync("npx", ["esbuild", "ClimbMatchCore.jsx", "--bundle", "--format=cjs", "--platform=node",
  "--jsx=automatic", "--loader:.jsx=jsx", "--define:import.meta.env={}",
  "--outfile=" + OUT, "--log-level=error"], { cwd: ROOT, stdio: "inherit" });

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const core = await import("file://" + OUT);
const { TrustBreakdown, trustContributions, vScore, ME } = core;

// Chosen so raw points and normalised shares are clearly different numbers: several partial
// factors, so the largest-remainder path is exercised too.
const climber = Object.assign({}, ME, {
  vouches: [], communityVouches: 3, vouchesGiven: 0, certifications: ["WFR"], skills: [],
  catchLedger: { totalCatches: 5, highFactorCatches: 1, partnersSigned: 2, lastCatch: "2026-08-01" },
  trustScore: 0, routesLogged: 7, reliability: 62, responseRate: 44, stats: {},
  verified: true, years: undefined, partnerCount: null, floatPlans: null, conditionsReported: null,
  id: "u_probe",
});

const facts = trustContributions(climber);
const score = vScore(climber);
const html = renderToStaticMarkup(React.createElement(TrustBreakdown, { climber }));

let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };

if (html.length < 400) fail(`the panel rendered only ${html.length} chars — nothing below is meaningful`);
else ok(`panel rendered (${html.length} chars)`);

const differing = facts.filter((f) => f.pts !== f.share && f.pts > 0);
if (!differing.length) fail("no factor has share !== pts on this fixture, so the assertions below cannot tell them apart");
else ok(`${differing.length} factor(s) where share differs from raw pts — the case that discriminates`);

for (const f of differing) {
  const shareShown = html.includes(">+" + f.share + "<");
  const ptsShown = html.includes(">+" + f.pts + "<");
  if (shareShown && !ptsShown) ok(`${f.label}: renders +${f.share} (share), not +${f.pts} (raw)`);
  else if (ptsShown) fail(`${f.label}: renders the RAW +${f.pts} — the panel is still reading pts`);
  else fail(`${f.label}: neither +${f.share} nor +${f.pts} is in the markup`);
}

const sum = facts.reduce((a, f) => a + f.share, 0);
if (sum === score) ok(`the shares sum to the headline (${sum} === vScore ${score})`);
else fail(`shares sum to ${sum} but the headline is ${score}`);

fs.rmSync(OUT, { force: true });
console.log(bad ? `\n${bad} problem(s).` : "\nall assertions passed");
process.exit(bad ? 1 : 0);
