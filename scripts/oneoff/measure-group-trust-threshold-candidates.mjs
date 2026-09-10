// WHERE SHOULD "TRUST N+ ONLY" SIT, NOW THAT THE GATE READS THE SERVER SCORE?
//
// `measure-group-trust-gate-scale.mjs` measured that moving the gate onto the displayed score
// changes which example profiles are admitted. This asks the next question: what does a given
// threshold DEMAND, in things a climber can actually do?
//
// TWO OF THE EIGHT COMPONENTS CANNOT BE EARNED, AND THAT IS DERIVED HERE RATHER THAN DECLARED.
// `compute_trust_score` scores an ID verification at 10 and club/guide credentials at 10, both read
// off `verification_records` where `status = 'verified'`. 0085 pinned the INSERT and UPDATE policies
// so a client can only ever write 'pending', and the one definer function that writes 'verified'
// hardcodes a single verification_type. So the reachable ceiling is lower than the model's own
// maxima suggest, and a threshold set against 99 is set against a scale that does not exist.
//
// The reachable set is parsed out of the migrations, so a future ID-verification RPC widens it by
// itself instead of leaving a number here describing a database that has moved on. It FAILS CLOSED
// if that parse finds nothing: an empty set would make every component look unreachable and the
// ceiling collapse, which is a broken scan reading as a finding.
//
// No database and no browser — both models are pure functions of their inputs.
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);
const die = (m) => { console.error("FAIL: " + m); process.exit(1); };

// ---------------------------------------------------------------------------
// 1. Which verification types can a real climber actually reach 'verified' on?
const migDir = path.join(ROOT, "supabase", "migrations");
const migs = fs.readdirSync(migDir).filter((f) => f.endsWith(".sql")).sort();
if (migs.length < 20) die(`only ${migs.length} migrations found — the walk broke`);

const REACHABLE = new Set();
for (const f of migs) {
  const sql = fs.readFileSync(path.join(migDir, f), "utf8");
  // A definer function inserting a row with status 'verified'. Its verification_type is a literal
  // in the same VALUES list; anything else cannot be attributed and is deliberately not guessed.
  // The list is taken to the end of its LINE rather than to the first ")": `auth.uid()` closes a
  // paren inside it, so a non-greedy match to ")" captures nine characters and finds nothing —
  // which this script's own fail-closed branch then reports as a broken scan. It did, once.
  const re = /insert\s+into\s+verification_records[\s\S]{0,400}?values\s*\(([^\n]*)\)/gi;
  let m;
  while ((m = re.exec(sql))) {
    const vals = m[1];
    if (!/'verified'/.test(vals)) continue;
    for (const lit of vals.match(/'([a-z_]+)'/g) || []) {
      const v = lit.slice(1, -1);
      if (v !== "verified" && v !== "pending" && v !== "expired") REACHABLE.add(v);
    }
  }
}
if (!REACHABLE.size) die("parsed no reachable verification type at all — a broken scan, not a finding");

// ---------------------------------------------------------------------------
// 2. The model itself, lifted from the app rather than retyped.
const out = path.join(ROOT, `.tmp_thresh_${process.pid}.cjs`);
const entry = path.join(ROOT, `.tmp_thresh_entry_${process.pid}.jsx`);
fs.writeFileSync(entry, `export { serverTrustFactors, serverTrustScore, SERVER_TRUST_CAP } from "./ClimbMatchCore.jsx";\n`);
esbuild.buildSync({
  entryPoints: [entry], bundle: true, format: "cjs", platform: "node",
  external: ["react", "react-dom", "react-dom/server", "@tanstack/react-query", "@supabase/supabase-js", "leaflet"],
  jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { serverTrustFactors, serverTrustScore, SERVER_TRUST_CAP } = require_(out);
process.on("exit", () => { fs.rmSync(out, { force: true }); fs.rmSync(entry, { force: true }); });

// The gate's own constant, read from the app so this cannot describe a threshold that has moved.
const src = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const gm = /const GROUP_TRUST_MIN\s*=\s*(\d+)/.exec(src);
if (!gm) die("ANCHOR LOST: GROUP_TRUST_MIN is not declared as a literal in ClimbMatch.jsx");
const MIN = Number(gm[1]);

// Every component at full stretch, so each factor's own `max` comes from the app.
const MAXED = { emailVerified: true, idVerified: true, certCount: 2, tenureDays: 40 * 30,
                vouches: 40, logs: 400, reports: 200, catches: 20 };
const factors = serverTrustFactors(MAXED);
if (factors.length < 6) die(`parsed only ${factors.length} factors — the model did not load`);

// A component is unreachable when it is scored off a verification type nothing can grant.
const UNREACHABLE_BY = { "ID verified": "id", "Certifications": "member_club / guide_certified" };
const unreachable = factors.filter((f) => {
  if (f.label === "ID verified") return !REACHABLE.has("id");
  if (f.label === "Certifications") return !REACHABLE.has("member_club") && !REACHABLE.has("guide_certified");
  return false;
});
const modelMax = factors.reduce((s, f) => s + f.max, 0);
const lost = unreachable.reduce((s, f) => s + f.max, 0);
const ceiling = Math.min(modelMax - lost, SERVER_TRUST_CAP);

console.log(`THE GATE TODAY: a group with the "trust" policy admits a climber at ${MIN}+.\n`);
console.log(`  the model's own maxima total ${modelMax}, capped at ${SERVER_TRUST_CAP}`);
console.log(`  verification types a climber can actually reach 'verified' on: ${[...REACHABLE].join(", ")}`);
for (const f of unreachable) {
  console.log(`  UNREACHABLE  ${f.label.padEnd(16)} ${String(f.max).padStart(3)} pts — needs '${UNREACHABLE_BY[f.label]}', which nothing grants`);
}
console.log(`  so the REACHABLE ceiling is ${ceiling}, and ${MIN} is ${Math.round((MIN / ceiling) * 100)}% of it.\n`);

// ---------------------------------------------------------------------------
// 3. Structural limits — what a threshold rules out whatever a climber does.
const only = (o) => serverTrustScore(Object.assign({ emailVerified: true }, o));
const patience = only({ tenureDays: 20 * 30 });                                     // email + full tenure
const solo = only({ tenureDays: 20 * 30, logs: 400, reports: 200 });                // never partners
const social = only({ vouches: 40, catches: 20 });                                  // day one, well known
console.log("  what each threshold rules out, whatever else is true:");
console.log(`    ${String(patience).padStart(3)}  email + the full 20 months of tenure, and nothing else`);
console.log(`         -> above this, no amount of PATIENCE alone is enough`);
console.log(`    ${String(solo).padStart(3)}  ...plus every logged climb and trip report, but no vouch and no belay catch`);
console.log(`         -> above this, a climber with no PARTNERS can never pass`);
console.log(`    ${String(social).padStart(3)}  20 vouches and 5 catches on day one, nothing logged`);
console.log(`         -> above this, a newcomer cannot pass however well known they are\n`);

// ---------------------------------------------------------------------------
// 4. Candidate thresholds, each described by what it costs a real climber.
// Deliberately expressed as ROUTES rather than as a fraction of the ceiling: the components are not
// interchangeable (tenure cannot be hurried, a vouch needs another person), so a percentage of the
// scale says nothing about whether anybody can walk it.
const ROUTES = [
  ["email only, day one", { }],
  ["email + 3 months", { tenureDays: 90 }],
  ["email + 6 months, 2 vouches, 15 logs", { tenureDays: 180, vouches: 2, logs: 15 }],
  ["email + 1 year, 5 vouches, 25 logs, 8 reports, 4 catches", { tenureDays: 365, vouches: 5, logs: 25, reports: 8, catches: 4 }],
  ["email + 2 years, 12 vouches, 60 logs, 20 reports, 9 catches", { tenureDays: 730, vouches: 12, logs: 60, reports: 20, catches: 9 }],
];
console.log("  what a climber scores along a plausible path:");
for (const [label, o] of ROUTES) console.log(`    ${String(only(o)).padStart(3)}  ${label}`);

console.log("\n  admitted by each candidate threshold:");
console.log("    bar   " + ROUTES.map((_, i) => `p${i + 1}`).join("  "));
for (const bar of [55, 45, 35, 25, 20, 15, 10]) {
  const row = ROUTES.map(([, o]) => (only(o) >= bar ? " y" : " ."));
  console.log(`    ${String(bar).padStart(3)}+  ` + row.join("  ") + (bar === MIN ? "   <-- today" : ""));
}
console.log("\n  p1..p5 are the paths above, in order. A '.' is a climber the group turns away.");
