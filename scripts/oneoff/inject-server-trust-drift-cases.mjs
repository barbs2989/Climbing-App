// DOES check:trust-breakdown SECTION 3 ACTUALLY SEE A DRIFTING TRANSCRIPTION?
//
// Section 3 exists because `serverTrustFactors` is a JS copy of `compute_trust_score`'s plpgsql,
// and this repo has been burned four times by a second implementation of one formula drifting from
// the first. Its healthy output is "everything matches", which is also exactly what a broken
// comparison prints — so it is worth nothing until it has been shown to fail.
//
// Each case proves its edit LANDED BY CHECKSUM before judging the guard, and restores the file
// byte-identically afterwards. An injection that produces a different failure is not a catch, so
// every case asserts the failure text names SECTION 3 rather than an assertion above it.
//
// The cases drift the two sides in BOTH directions on purpose: a comparison that only ever reads
// the JS would pass when the MIGRATION moves, which is the case that actually happens — somebody
// re-weights the model in SQL and nothing tells them the panel now lies.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const SQL = path.join(ROOT, "supabase", "migrations", "0038_trust_vouches.sql");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");

const CASES = [
  { name: "js-cap-drift", file: CORE, expect: "fail",
    why: "the JS vouch cap moves to 25 while 0038 still says 20", says: /FAIL\s+SERVER MODEL: Peer vouches/,
    from: 'pts:Math.min(v,20),max:20', to: 'pts:Math.min(v,25),max:25' },
  { name: "js-rate-drift", file: CORE, expect: "fail",
    why: "the JS pays 3 points a belay catch where 0038 pays 2", says: /FAIL\s+SERVER MODEL: Verified belay catches/,
    from: 'pts:Math.min(ct*2,10)', to: 'pts:Math.min(ct*3,10)' },
  { name: "js-divisor-drift", file: CORE, expect: "fail",
    why: "the JS pays a point per 4 logged climbs where 0038 pays one per 5", says: /FAIL\s+SERVER MODEL: Logged climbs/,
    from: 'pts:Math.min(Math.floor(lg/5),15)', to: 'pts:Math.min(Math.floor(lg/4),15)' },
  { name: "sql-reweight", file: SQL, expect: "fail",
    why: "the MIGRATION re-weights vouches to 30 and the JS is not told — the case that actually happens", says: /FAIL\s+SERVER MODEL: Peer vouches/,
    from: "base_score := base_score + least(vouch_count, 20);", to: "base_score := base_score + least(vouch_count, 30);" },
  { name: "sql-cap-reweight", file: SQL, expect: "fail",
    why: "the MIGRATION raises the overall cap and the JS still says 99", says: /FAIL\s+SERVER MODEL: the cap is/,
    from: "return least(base_score, 99);", to: "return least(base_score, 95);" },
  { name: "rows-prop-dropped", file: CORE, expect: "fail",
    why: "TrustBreakdown ignores `rows` and falls back to the client model — a silent revert that changes no number", says: /FAIL\s+the panel does not render the supplied server rows/,
    from: "function TrustBreakdown({climber,rows}){return <div>{(rows||trustContributions(climber)).map(",
    to:   "function TrustBreakdown({climber,rows}){return <div>{trustContributions(climber).map(" },
  // MUST STAY SILENT. A comment in the migration that names a different number is documentation:
  // 0038's own header lists component RANGES ("verification (0-20)") that are not the weights, and a
  // guard reading those would fail on the file explaining itself.
  { name: "sql-comment-only", file: SQL, expect: "pass",
    why: "a comment naming other numbers is prose, not a weight",
    from: "-- Vouches: 1 point per unique vouch, capped at 20",
    to: "-- Vouches: 1 point per unique vouch, capped at 20 (was 44 before, and 77 in an older draft)" },
];

let pass = 0, fail = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  if (!before.includes(c.from)) {
    console.log(`  BROKEN CASE ${c.name}: its anchor is not in the file — the case tests nothing`);
    fail++; continue;
  }
  if (before.split(c.from).length - 1 !== 1) {
    console.log(`  BROKEN CASE ${c.name}: anchor is not unique — the edit could land anywhere`);
    fail++; continue;
  }
  fs.writeFileSync(c.file, before.replace(c.from, c.to));
  if (sum(c.file) === beforeSum) {
    console.log(`  BROKEN CASE ${c.name}: edit did not change the file`);
    fs.writeFileSync(c.file, before); fail++; continue;
  }
  let out = "", code = 0;
  try {
    out = execFileSync("node", [path.join(ROOT, "scripts", "check-trust-breakdown.mjs")],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(c.file, before);
  if (sum(c.file) !== beforeSum) { console.log(`  FATAL ${c.name}: restore was not byte-identical`); process.exit(1); }

  const fired = code !== 0;
  // JUDGED ON THE CASE'S OWN FAILURE TEXT. A first version tested /SERVER MODEL/ against the whole
  // output — which matches the "ok SERVER MODEL: ..." lines too, so it credited any run that merely
  // REACHED section 3, and scored a section-4 failure as a section-3 catch. An injection that
  // produces a different failure is not a catch, and a matcher that cannot tell ok from FAIL cannot
  // tell the difference.
  const saidIt = c.says ? c.says.test(out) : false;
  if (c.expect === "fail") {
    if (fired && saidIt) { console.log(`  CAUGHT  ${c.name} — ${c.why}`); pass++; }
    else if (fired) { console.log(`  WRONG FAILURE ${c.name}: the guard failed, but not with ${c.says} — it broke rather than saw this`); fail++; }
    else { console.log(`  MISSED  ${c.name} — ${c.why}`); fail++; }
  } else {
    if (!fired) { console.log(`  SILENT  ${c.name} — ${c.why}`); pass++; }
    else { console.log(`  FALSE ALARM ${c.name}: the guard flagged correct work — ${c.why}`); fail++; }
  }
}
console.log(`\n${pass}/${CASES.length} case(s) behaved; ${fail} did not.`);
process.exit(fail ? 1 : 0);
