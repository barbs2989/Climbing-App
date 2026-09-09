// WHAT DOES "TRUST 55+" MEAN UNDER EACH MODEL?
//
// `groupTrustShortfall` refuses a "Trust 55+ only" group on `vScore` — the CLIENT model — while
// every other climber looking at you, and now your own Profile, sees the SERVER one. So the app
// enforces a group's policy on a number that appears nowhere, and can tell you that you are trust
// 14 and then admit you to a 55+ group.
//
// Switching the gate to the displayed score is the obvious fix and it is NOT free: the two models
// are scaled differently (a vouch is worth 4 points in one and 1 in the other), so the same
// threshold is a different bar. This measures where 55 falls on each, so the change is made with
// the cost stated rather than discovered later.
//
// Read-only, no DB — both models are pure functions of the same eight-or-so inputs.
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const out = path.join(ROOT, `.tmp_gate_${process.pid}.cjs`);
const entry = path.join(ROOT, `.tmp_gate_entry_${process.pid}.jsx`);
fs.writeFileSync(entry, `export { vScore, serverTrustScore } from "./ClimbMatchCore.jsx";\n`);
esbuild.buildSync({
  entryPoints: [entry], bundle: true, format: "cjs", platform: "node",
  external: ["react", "react-dom", "react-dom/server", "@tanstack/react-query", "@supabase/supabase-js", "leaflet"],
  jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { vScore, serverTrustScore } = require_(out);
process.on("exit", () => { fs.rmSync(out, { force: true }); fs.rmSync(entry, { force: true }); });

const MIN = 55;

// Profiles described by what a climber has DONE, then expressed in each model's own input shape.
const PEOPLE = [
  { name: "brand new, email verified",        months: 0,  vouches: 0,  logs: 0,   catches: 0, reports: 0,  certs: 0, id: false },
  { name: "a season in, a few partners",      months: 6,  vouches: 2,  logs: 8,   catches: 1, reports: 2,  certs: 0, id: false },
  { name: "a year in, active",                months: 12, vouches: 5,  logs: 25,  catches: 4, reports: 8,  certs: 0, id: false },
  { name: "two years, well connected",        months: 24, vouches: 12, logs: 60,  catches: 9, reports: 20, certs: 1, id: false },
  { name: "long-standing, ID + cert",         months: 40, vouches: 20, logs: 120, catches: 15, reports: 45, certs: 2, id: true },
];

const asClient = (p) => ({
  id: 1, verified: true, communityVouches: p.vouches, routesLogged: p.logs,
  catchLedger: { totalCatches: p.catches, highFactorCatches: Math.floor(p.catches / 3) },
  certifications: Array(p.certs).fill({}),
});
const asServer = (p) => ({
  emailVerified: true, idVerified: p.id, certCount: p.certs, tenureDays: p.months * 30,
  vouches: p.vouches, logs: p.logs, reports: p.reports, catches: p.catches,
});

console.log(`"Trust ${MIN}+ only" measured on both models\n`);
console.log("  profile                          client  server   admitted by client / by server");
let flipped = 0;
for (const p of PEOPLE) {
  const c = vScore(asClient(p)), s = serverTrustScore(asServer(p));
  const ca = c >= MIN, sa = s >= MIN;
  if (ca !== sa) flipped++;
  console.log(`  ${p.name.padEnd(32)}  ${String(c).padStart(5)}  ${String(s).padStart(6)}   ${ca ? "yes" : "no "} / ${sa ? "yes" : "no "}${ca !== sa ? "   <-- CHANGES" : ""}`);
}
console.log(`\n${flipped} of ${PEOPLE.length} example profiles change side at ${MIN}.`);

// WHERE IS THE BAR ON EACH SCALE? The server model's maxima total 104 against a cap of 99, so 55 is
// reachable — but the mix that reaches it is different, and tenure is 20 of it and cannot be earned
// by climbing at all.
console.log("\nwhat it takes to reach 55 on the SERVER model (its maxima: email 5, id 10, certs 10,");
console.log("tenure 20, vouches 20, logs 15, reports 14, catches 10 — 104 total, capped at 99):");
for (const [label, x] of [
  ["email + 2 years' tenure + 20 vouches", { emailVerified: true, tenureDays: 730, vouches: 20 }],
  ["email + 1 year + 10 vouches + 60 logs", { emailVerified: true, tenureDays: 365, vouches: 10, logs: 60 }],
  ["everything except tenure (brand new)", { emailVerified: true, idVerified: true, certCount: 2, vouches: 20, logs: 120, reports: 45, catches: 15 }],
]) console.log(`   ${String(serverTrustScore(x)).padStart(3)}  ${label}`);
