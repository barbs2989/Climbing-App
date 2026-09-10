// WHERE SHOULD THE FOUR TRUST TIERS SIT, AGAINST A SCALE THAT ONLY REACHES 84?
//
// #1731 fixed the two claims on that card that were unarguably false -- "Add a cert" named a step
// nobody can take, and TrustBadge's tooltip stated a 0-100 range twice over. It deliberately left
// the four NUMBERS alone, because where they belong changes what every climber is CALLED on every
// screen, and that is a product decision rather than polish. This measures what each candidate
// would mean, so the decision is taken against paths a climber can walk rather than against a
// percentage of a scale.
//
// THE CEILING IS DERIVED, NEVER TYPED. `compute_trust_score` pays 10 for a government ID and 10 for
// club/guide credentials, both read off `verification_records` at status='verified'; 0085 pins every
// client write to 'pending' and the one definer that writes 'verified' hardcodes 'email'. So 20 of
// the model's 104 points cannot be earned. That set is parsed out of the migrations by the shared
// reach library, so the day an ID-verification RPC ships this widens by itself instead of leaving a
// stale number here. It FAILS CLOSED on a parse that finds nothing: an empty set makes every
// component look unreachable and the ceiling collapse, which is a broken scan reading as a finding.
//
// NOTE 0181 DOES NOT MOVE THIS, and that is worth stating because it looks as though it should:
// it gives `profiles` a certifications column so the profile editor stops dropping what it collects.
// The trust model counts VERIFIED RECORDS, not self-reported text, so the 10 points stay unreachable.
//
// No database and no browser -- the model is a pure function of its inputs.
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";
import { reachableVerificationTypes } from "../lib/verification-reach.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const die = (m) => { console.error("FAIL: " + m); process.exit(1); };

// ---------------------------------------------------------------------------
// 1. What can actually be verified?
const { types: REACHABLE, scanned } = reachableVerificationTypes(path.join(ROOT, "supabase", "migrations"));
if (scanned < 20) die(`only ${scanned} migrations scanned -- the walk broke`);
if (!REACHABLE.size) die("no verification type is reachable -- the parse broke, and an empty set would collapse the ceiling");

// ---------------------------------------------------------------------------
// 2. The app's own model, bundled rather than transcribed.
const out = path.join(ROOT, `.tmp_tiers_${process.pid}.cjs`);
const entry = path.join(ROOT, `.tmp_tiers_entry_${process.pid}.jsx`);
fs.writeFileSync(entry, `export { serverTrustFactors, serverTrustScore, SERVER_TRUST_CAP } from "./ClimbMatchCore.jsx";\n`);
esbuild.buildSync({
  entryPoints: [entry], bundle: true, format: "cjs", platform: "node",
  external: ["react", "react-dom", "react-dom/server", "@tanstack/react-query", "@supabase/supabase-js", "leaflet"],
  jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { serverTrustFactors, serverTrustScore, SERVER_TRUST_CAP } = require_(out);
process.on("exit", () => { fs.rmSync(out, { force: true }); fs.rmSync(entry, { force: true }); });

// ---------------------------------------------------------------------------
// 3. The four bars, READ FROM THE APP so this cannot describe numbers that have moved.
// The ladder is ONE declaration now, so this reads that rather than four ternary chains. When it
// was four, this regex had to spell the whole chain out -- and the hoist is exactly why it stopped
// matching, which is the fail-closed branch working rather than a defect.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
// LINE-ANCHORED AND UNIQUE. The comment above the declaration names the ladder it replaced, and an
// unanchored `.exec` takes the FIRST match — so this would measure numbers out of prose and print a
// confident table about a ladder the app does not have. Found by an injection against the guard
// that shares this rule, not by reading either of them.
const tierDecls = core.match(/^export var TRUST_TIERS\s*=\s*\{\s*high:\s*\d+\s*,\s*trusted:\s*\d+\s*,\s*building:\s*\d+\s*\}/gm) || [];
if (tierDecls.length !== 1) die(`ANCHOR LOST: TRUST_TIERS is declared as a literal at the start of a line ${tierDecls.length} time(s), expected 1`);
const tierM = /high:\s*(\d+)\s*,\s*trusted:\s*(\d+)\s*,\s*building:\s*(\d+)/.exec(tierDecls[0]);
if (!tierM) die("ANCHOR LOST: TRUST_TIERS matched but its three tiers did not parse");
const [HIGH, TRUSTED, BUILDING] = [Number(tierM[1]), Number(tierM[2]), Number(tierM[3])];
if (!(HIGH > TRUSTED && TRUSTED > BUILDING)) die(`the ladder is not descending: ${HIGH}/${TRUSTED}/${BUILDING}`);
// The goal is DERIVED from the top tier rather than being a fifth number that can drift from it --
// "goal met" and "Highly Trusted" naming different scores on one card is the disagreement this
// whole exercise is about. Asserted rather than assumed, so a future edit that splits them is loud.
const goalDecls = core.match(/^export var TRUST_GOAL\s*=\s*([A-Za-z_.]+|\d+)/gm) || [];
const goalM = goalDecls.length === 1 ? /TRUST_GOAL\s*=\s*([A-Za-z_.]+|\d+)/.exec(goalDecls[0]) : null;
if (!goalM) die(`ANCHOR LOST: TRUST_GOAL is declared at the start of a line ${goalDecls.length} time(s), expected 1`);
if (!/TRUST_TIERS\.high/.test(goalM[1])) die(`TRUST_GOAL is ${goalM[1]}, not derived from TRUST_TIERS.high -- the card's goal and the top tier would drift`);
const GOAL = HIGH;

// ---------------------------------------------------------------------------
// 4. The reachable ceiling.
const MAXED = { emailVerified: true, idVerified: true, certCount: 2, tenureDays: 40 * 30,
                vouches: 40, logs: 400, reports: 200, catches: 20 };
const factors = serverTrustFactors(MAXED);
if (factors.length < 6) die(`parsed only ${factors.length} factors -- the model did not load`);
const unreachable = factors.filter((f) => {
  if (f.label === "ID verified") return !REACHABLE.has("id");
  if (f.label === "Certifications") return !REACHABLE.has("member_club") && !REACHABLE.has("guide_certified");
  return false;
});
const modelMax = factors.reduce((s, f) => s + f.max, 0);
const ceiling = Math.min(modelMax - unreachable.reduce((s, f) => s + f.max, 0), SERVER_TRUST_CAP);

console.log(`THE FOUR BARS TODAY: card goal ${GOAL}; badge ${HIGH}+ "Highly Trusted", ${TRUSTED}+ "Trusted", ${BUILDING}+ "Building Trust", below that "New".\n`);
console.log(`  the model's own maxima total ${modelMax}, capped at ${SERVER_TRUST_CAP}`);
console.log(`  verification types a climber can reach 'verified' on: ${[...REACHABLE].join(", ")}`);
for (const f of unreachable) console.log(`  UNREACHABLE  ${f.label.padEnd(16)} ${String(f.max).padStart(3)} pts`);
console.log(`  so the REACHABLE ceiling is ${ceiling}.\n`);

// ---------------------------------------------------------------------------
// 5. Structural limits -- what a bar rules out whatever a climber does.
const only = (o) => serverTrustScore(Object.assign({ emailVerified: true }, o));
const partnerless = only({ tenureDays: 40 * 30, logs: 400, reports: 200 });
console.log("  what each bar rules out, whatever else is true:");
console.log(`    ${String(ceiling).padStart(3)}  everything earnable, at full stretch`);
console.log(`         -> a bar ABOVE this can never be shown to anybody`);
console.log(`    ${String(partnerless).padStart(3)}  every log and report, full tenure, but no vouch and no belay catch`);
console.log(`         -> a bar above this needs OTHER PEOPLE, whatever you climb\n`);

// ---------------------------------------------------------------------------
// 6. Plausible paths, and what each is CALLED at a given ladder.
const ROUTES = [
  ["day one, email confirmed", {}],
  ["3 months, 1 vouch, 8 logs", { tenureDays: 90, vouches: 1, logs: 8 }],
  ["6 months, 3 vouches, 20 logs, 5 reports", { tenureDays: 180, vouches: 3, logs: 20, reports: 5 }],
  ["1 year, 6 vouches, 40 logs, 12 reports, 4 catches", { tenureDays: 365, vouches: 6, logs: 40, reports: 12, catches: 4 }],
  ["2 years, 12 vouches, 60 logs, 20 reports, 9 catches", { tenureDays: 730, vouches: 12, logs: 60, reports: 20, catches: 9 }],
  ["4 years, 25 vouches, 150 logs, 60 reports, 15 catches", { tenureDays: 1460, vouches: 25, logs: 150, reports: 60, catches: 15 }],
];
const scores = ROUTES.map(([, o]) => only(o));
console.log("  what a climber scores along a plausible path:");
ROUTES.forEach(([label], i) => console.log(`    ${String(scores[i]).padStart(3)}  ${label}`));

const name = (s, h, t, b) => (s >= h ? "Highly Trusted" : s >= t ? "Trusted" : s >= b ? "Building Trust" : "New");
// Deliberately NOT a proportion of the ceiling. The components are not interchangeable -- tenure
// cannot be hurried and a vouch needs another person -- so a percentage says nothing about whether
// anybody can walk the ladder. Each candidate is judged on what it CALLS the paths above.
const LADDERS = [
  ["today", HIGH, TRUSTED, BUILDING, GOAL],
  ["proportional to 84", 76, 59, 42, 76],
  ["tuned to the paths", 70, 45, 15, 70],
  ["gentler still", 55, 35, 12, 55],
];
console.log("\n  what each path is CALLED under each ladder:");
console.log("    ladder                       goal  " + scores.map((s) => String(s).padStart(4)).join(" "));
for (const [label, h, t, b, g] of LADDERS) {
  const row = scores.map((s) => name(s, h, t, b)[0].padStart(4));
  const reach = scores.some((s) => s >= h) ? "" : "   <- top tier unreachable";
  console.log(`    ${(label + ` (${h}/${t}/${b})`).padEnd(28)} ${String(g).padStart(4)}  ` + row.join(" ") + reach);
}
console.log("\n  H=Highly Trusted  T=Trusted  B=Building Trust  N=New");
console.log(`  A goal above ${ceiling} can never read "goal met"; a top tier above ${ceiling} is shown to nobody.`);
