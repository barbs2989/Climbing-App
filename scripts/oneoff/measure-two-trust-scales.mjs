// One climber, two trust scores, and which one you see depends on who is looking.
//
// FullProfile picks between them in a single expression:
//
//     const ts = climber._real ? (realTrust != null ? realTrust : 0) : vScore(climber);
//
// `_real` is set only when the id is a uuid. So ANOTHER climber opening your profile sees
// `fetchTrustScore(uuid)` -- the SERVER's compute_trust_score -- while your own Profile tab and
// your own "View public profile" both render `vScore(meLive)`, the CLIENT's model, because ME.id
// is 0 signed in or out and the enrichment is skipped.
//
// They are not two implementations of one formula. They are two different models, with different
// factors and different weights, and neither is derived from the other:
//
//   CLIENT  trustFactors() -> vScore(), normalised so the factors sum to 99
//           email 20 · reliability 18 · response rate 10 · peer vouches 22 (4 each)
//           · belay catches · logged climbs
//
//   SERVER  compute_trust_score(), a raw sum capped at 99            (0038_trust_vouches.sql)
//           email 5 · id 10 · club/guide certs 10 · TENURE 20 (1/month)
//           · vouches 20 (1 each) · logs 15 (1 per 5) · reports 14 (1 per 3) · catches 10 (2 each)
//
// TENURE and REPORTS exist only on the server; RELIABILITY and RESPONSE RATE only on the client.
// A vouch is worth 4 points on one and 1 on the other. So the two cannot agree except by accident.
//
// THIS IS A PRODUCT QUESTION, NOT A BUG REPORT, and it is why nothing here is changed: which model
// is canonical is a decision. What is measurable is the size of the disagreement, and that is what
// this prints. CLAUDE.md already records the sibling question -- whether the breakdown's factors
// sum to its own headline -- as CLOSED; this is the other axis, client against server.
//
// The server side is TRANSCRIBED from 0038 rather than executed: compute_trust_score is not
// reachable through PostgREST as a plain read, and `check:function-drift` reports the live body
// agreeing with the migrations, so the transcription is against the file that describes production.
// It is arithmetic on inputs this script supplies, so nothing here depends on a live row.
//
// Static: one esbuild bundle of core for the real vScore. No browser, no database.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const bundle = path.join(ROOT, `.twoscales-${process.pid}.mjs`);

let vScore;
try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + bundle], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  const mod = await import(bundle + "?t=" + Date.now());
  vScore = mod.vScore;
} finally { fs.rmSync(bundle, { force: true }); }

if (typeof vScore !== "function") {
  console.error("FAIL — vScore is not exported from core. Nothing below would be the client's model.");
  process.exit(1);
}

// 0038_trust_vouches.sql, transcribed term by term. Integer division throughout, as plpgsql does.
function serverScore({ emailVerified = false, idVerified = false, certs = 0, tenureDays = 0, vouches = 0, logs = 0, reports = 0, catches = 0 }) {
  let s = 0;
  if (emailVerified) s += 5;
  if (idVerified) s += 10;
  s += Math.min(certs * 5, 10);
  s += Math.min(Math.floor(tenureDays / 30), 20);
  s += Math.min(vouches, 20);
  s += Math.min(Math.floor(logs / 5), 15);
  s += Math.min(Math.floor(reports / 3), 14);
  s += Math.min(catches * 2, 10);
  return Math.min(s, 99);
}

// A climber shaped the way the CLIENT reads one. Only the fields both models actually consume are
// varied, so a gap is attributable to the WEIGHTS rather than to a field one side cannot see.
const client = (o) => vScore(Object.assign({
  id: 0, verified: false, communityVouches: 0, certifications: [], routesLogged: 0,
  catchLedger: { totalCatches: 0, highFactorCatches: 0, lastCatch: "" },
  reliability: null, responseRate: null,
}, o));

const CASES = [
  ["a brand-new account, nothing yet",              {}, {}],
  ["email verified, nothing else",                  { verified: true }, { emailVerified: true }],
  ["verified, 1 vouch, 1 logged climb",             { verified: true, communityVouches: 1, routesLogged: 1 },
                                                    { emailVerified: true, vouches: 1, logs: 1 }],
  ["verified, 5 vouches, 20 climbs",                { verified: true, communityVouches: 5, routesLogged: 20 },
                                                    { emailVerified: true, vouches: 5, logs: 20 }],
  ["verified, 20 climbs, 6 catches",                { verified: true, routesLogged: 20, catchLedger: { totalCatches: 6, highFactorCatches: 2, lastCatch: "2026-08-01" } },
                                                    { emailVerified: true, logs: 20, catches: 6 }],
  ["two years on the app, otherwise identical",     { verified: true, communityVouches: 1, routesLogged: 1 },
                                                    { emailVerified: true, vouches: 1, logs: 1, tenureDays: 730 }],
];

console.log("  what the climber has                          you see   they see   gap");
console.log("  " + "-".repeat(72));
let worst = 0;
for (const [label, c, s] of CASES) {
  const a = client(c), b = serverScore(s);
  const gap = Math.abs(a - b);
  if (gap > worst) worst = gap;
  console.log(`  ${label.padEnd(44)}${String(a).padStart(6)}${String(b).padStart(10)}${String(gap).padStart(7)}`);
}

console.log(`\n  Worst gap across these six: ${worst} points on a 0-99 scale.`);
console.log("  'you see' is vScore(meLive) -- your Profile tab and your own public profile.");
console.log("  'they see' is compute_trust_score(uuid) -- what any other climber's view of you renders.");
console.log("\n  The last row is the clearest single reason they cannot converge: TENURE is worth up to");
console.log("  20 server points and does not exist in the client model at all, so simply having had");
console.log("  the account longer moves one number and not the other.");
console.log("\n  Nothing is changed here. Which model is canonical is a product decision.");

if (worst === 0) {
  console.error("\nFAIL — the two models agreed on every case, which means one of them is not being");
  console.error("evaluated. That is a broken measurement, not a finding of agreement.");
  process.exit(1);
}
