#!/usr/bin/env node
// The breakdown must ADD UP to the headline. That is the whole point of showing shares instead of
// raw points, and it is a property of the apportionment rather than of any one account -- rounding
// each share independently would be off by a unit or two on most inputs, which is exactly the
// contradiction this replaced.
//
// Runs the REAL trustContributions and vScore over a spread of accounts, including the ones that
// break naive rounding: every factor earned, several partial factors at once, untracked factors
// (whose `max` is 0, so the denominator moves per account), and the zero account.
//
//   node scripts/oneoff/verify-trust-shares-sum-to-score.mjs

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = path.join(ROOT, "node_modules", ".cache-trust-core.cjs");
fs.mkdirSync(path.dirname(OUT), { recursive: true });
// Bundled INSIDE the project: node resolves react from the nearest node_modules, and a bundle in
// the OS temp dir throws ERR_MODULE_NOT_FOUND. import.meta.env is read at module scope by
// lib/supabase.js, so it has to be defined away.
execFileSync("npx", ["esbuild", "ClimbMatchCore.jsx", "--bundle", "--format=cjs", "--platform=node",
  "--define:import.meta.env={}", "--outfile=" + OUT, "--log-level=error"], { cwd: ROOT, stdio: "inherit" });

const { trustContributions, vScore, ME } = await import("file://" + OUT);

const base = (over) => Object.assign({}, ME, {
  vouches: [], communityVouches: 0, vouchesGiven: 0, certifications: [], skills: [],
  catchLedger: { totalCatches: 0, highFactorCatches: 0, partnersSigned: 0, lastCatch: "" },
  trustScore: 0, routesLogged: 0, reliability: null, stats: {}, verified: false,
  years: undefined, partnerCount: null, floatPlans: null, conditionsReported: null,
  responseRate: null, id: "u_" + Math.random().toString(36).slice(2),
}, over);

const CASES = [
  ["zero account", base({})],
  ["email only", base({ verified: true })],
  ["email + 1 log", base({ verified: true, routesLogged: 1 })],
  ["several partials", base({ verified: true, routesLogged: 7, reliability: 62, responseRate: 44,
    communityVouches: 3, certifications: ["WFR"], catchLedger: { totalCatches: 5, highFactorCatches: 1, partnersSigned: 2, lastCatch: "2026-08-01" } })],
  ["untracked mixed", base({ verified: true, reliability: 90, responseRate: null, partnerCount: 11, floatPlans: null, conditionsReported: 4 })],
  ["everything", base({ verified: true, routesLogged: 200, reliability: 100, responseRate: 100,
    communityVouches: 40, certifications: ["WFR", "AMGA", "AIARE"], years: 20, partnerCount: 50,
    floatPlans: 30, conditionsReported: 60,
    catchLedger: { totalCatches: 40, highFactorCatches: 12, partnersSigned: 20, lastCatch: "2026-08-20" } })],
];

let bad = 0;
for (const [label, c] of CASES) {
  const fs_ = trustContributions(c);
  const score = vScore(c);
  const sum = fs_.reduce((a, f) => a + f.share, 0);
  const neg = fs_.filter((f) => f.share < 0);
  const overEarned = fs_.filter((f) => f.pts === 0 && f.share !== 0);
  const ok = sum === score && !neg.length && !overEarned.length;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${label.padEnd(18)} score=${String(score).padStart(3)}  sum(shares)=${String(sum).padStart(3)}` +
    (neg.length ? `  NEGATIVE share on ${neg.map((f) => f.label).join(", ")}` : "") +
    (overEarned.length ? `  share without points on ${overEarned.map((f) => f.label).join(", ")}` : ""));
  if (!ok) for (const f of fs_) console.log(`        ${f.label.padEnd(24)} pts=${f.pts}/${f.max} share=${f.share}`);
}

// IS THE APPORTIONMENT EARNING ITS PLACE? If rounding each share independently summed to the
// headline anyway, the largest-remainder logic would be complexity for nothing. Measured rather
// than assumed.
let naiveOff = 0;
for (const [label, c] of CASES) {
  const fs_ = trustContributions(c);
  let max = 0; fs_.forEach((f) => { max += f.max; });
  if (!max) continue;
  const naive = fs_.reduce((a, f) => a + Math.round(f.pts / max * 99), 0);
  const score = vScore(c);
  if (naive !== score) { naiveOff++; console.log(`      naive rounding would give ${naive} for "${label}" (headline ${score})`); }
}
console.log(`\nnaive per-factor rounding disagrees with the headline on ${naiveOff}/${CASES.length} accounts.`);

// A run that compared nothing would print all-ok. Every case must have produced factors.
const anyFactors = trustContributions(CASES[1][1]).length;
if (!anyFactors) { console.error("\ntrustContributions returned NO factors — nothing above was actually compared."); process.exit(1); }
console.log(`\n${CASES.length - bad}/${CASES.length} accounts: the breakdown sums exactly to the headline (${anyFactors} factors each).`);
fs.rmSync(OUT, { force: true });
process.exit(bad ? 1 : 0);
