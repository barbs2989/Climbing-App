#!/usr/bin/env node
// FullProfile shows a climber's trust TWICE, from two different models.
//
// The avatar RING is `ts = climber._real ? realTrust : vScore(climber)` — the SERVER score
// for a real climber. Inches below it, under their name, the BADGE is an unconditional
// `<TrustBadge score={vScore(climber)} compact/>` — the CLIENT model, for everybody.
//
// CLAUDE.md's check:real-profile-rows entry states that `vScore()` handed to a
// `<TrustBadge>` is a different question from the text shape it guards because "a badge can
// gate on `_real`, and FullProfile already does". It does not. This measures what that
// ungated badge actually prints for a real climber.
//
// Read-only: no database, no browser. It executes core's own exported vScore/trustTier
// rather than restating them, because a retyped copy would agree with itself whatever the
// app does — which is the entire question.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = path.join(ROOT, ".tmp-badge-vs-ring-" + process.pid + ".mjs");
process.on("exit", () => { try { fs.unlinkSync(out); } catch {} });

execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
  "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
  "--define:import.meta.env={}",
  "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });

const mod = await import(out + "?t=" + Date.now());
const { vScore, trustTier, trustFactors, CLIMBERS, SERVER_TRUST_EARNABLE, TRUST_TIERS } = mod;
for (const [n, v] of [["vScore", vScore], ["trustTier", trustTier], ["trustFactors", trustFactors]])
  if (typeof v !== "function") { console.error(`ANCHOR LOST: core does not export ${n}`); process.exit(1); }
if (!Array.isArray(CLIMBERS) || !CLIMBERS.length) { console.error("ANCHOR LOST: no seed CLIMBERS"); process.exit(1); }

// The shape FullProfile's own memo produces for a real (uuid) climber. Everything here is
// either set by that memo or absent from it — `verified`, `routesLogged`, `catchLedger`,
// `reliability`, `responseRate`, `partnerCount`, `conditionsReported`, `floatPlans` and
// `years` are NOT hydrated, which is what decides the answer.
const realClimber = (nVouches) => ({
  id: "3f2a1b4c-0000-4000-8000-000000000001",
  _real: true,
  name: "Robin Belay", avatar: null, location: "Bellingham, WA", username: "robinbelay",
  bio: "", disciplines: ["trad", "alpine"],
  sportGrade: "5.11a", tradGrade: "5.10c", boulderGrade: "V5",
  vouches: Array.from({ length: nVouches }, () => ({ ratings: { safety: 5 } })),
  communityVouches: nVouches,
  objectiveIds: [], photos: [], certifications: [], skills: [], availability: [], availWeek: [],
});

console.log("THE BADGE, for a real climber, by how many vouches they have RECEIVED");
console.log("  (this is the client model; every factor the memo does not hydrate scores 0)\n");
let ceiling = -1;
for (const n of [0, 1, 2, 3, 4, 5, 6, 10, 25, 100]) {
  const c = realClimber(n);
  const s = vScore(c);
  const t = trustTier(s);
  ceiling = Math.max(ceiling, s);
  const tf = trustFactors(c);
  const max = tf.reduce((a, f) => a + f.max, 0);
  const sum = tf.reduce((a, f) => a + f.pts, 0);
  console.log(`  ${String(n).padStart(3)} vouches -> score ${String(s).padStart(2)}  "${t.label}"   (${sum} of ${max} points)`);
}

console.log(`\n  BADGE CEILING for any real climber: ${ceiling}`);
console.log(`  SERVER score the RING can show:     up to ${SERVER_TRUST_EARNABLE} (the earnable ceiling)`);
const tiers = TRUST_TIERS.map((t) => `${t.label} >=${t.min}`).join(", ");
console.log(`  tiers: ${tiers}`);
const reachable = TRUST_TIERS.filter((t) => t.min <= ceiling).map((t) => t.label);
console.log(`  tiers a real climber's BADGE can ever reach: ${reachable.join(", ")}`);

// The control. If a SEED climber's badge is equally flat the model is simply flat and this
// says nothing about the real path.
console.log("\nCONTROL — the same badge for SEED climbers, who carry the client model's inputs:");
const seedScores = CLIMBERS.slice(0, 8).map((c) => ({ n: c.name, s: vScore(c), l: trustTier(vScore(c)).label }));
for (const r of seedScores) console.log(`  ${String(r.s).padStart(2)}  "${r.l}"  ${r.n}`);
const spread = Math.max(...seedScores.map((r) => r.s)) - Math.min(...seedScores.map((r) => r.s));
console.log(`  seed spread: ${spread} points, reaching "${trustTier(Math.max(...seedScores.map((r) => r.s))).label}"`);

console.log("\nVERDICT");
if (ceiling >= SERVER_TRUST_EARNABLE) {
  console.log("  The badge can reach the server ceiling, so the two surfaces are not obviously");
  console.log("  inconsistent. This measurement no longer describes a defect — re-read it.");
  process.exit(0);
}
console.log(`  A real climber's BADGE is capped at ${ceiling} however trusted they are, because the`);
console.log("  only client-model factor FullProfile's memo hydrates is received vouches, while");
console.log("  the vouches/catches/logs/certs/email denominators all count against them.");
console.log(`  The RING beside it is the SERVER score and reaches ${SERVER_TRUST_EARNABLE}.`);
console.log("  So one screen states one climber's trust twice, from two models, and the badge");
console.log("  is the one a reader sees under the name.");
