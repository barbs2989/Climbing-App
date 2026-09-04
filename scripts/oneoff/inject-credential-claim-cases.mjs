// Is section 5 of check:guard-wiring measuring anything?
//
// Its healthy output is "no CLAUDE.md line calls any of the N privileged guards anon-safe", which
// is exactly what a scan that matches nothing prints. So the real historical sentence is put back
// -- verbatim, as it stood on main from 2026-09-02 to 2026-09-04 -- plus the two shapes that must
// stay SILENT, because a rule that fires on a precedent citation would tell an author to delete
// correct documentation.
import fs from "fs";
import crypto from "crypto";
import { execFileSync } from "child_process";

const MD = "CLAUDE.md";
const sum = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");

const ANCHOR = "`check:column-drift` needs **no link** — it does not shell out to the CLI — but it is **not**";

const CASES = [
  { name: "historical",
    why: "the real sentence that was on main for two days: half right, and wrong about the credential",
    line: "`check:column-drift` needs no link (anon key) and also agrees: 41 tables / 480 columns.",
    expect: /attributes the ANON key to check:column-drift/ },
  { name: "othername",
    why: "the same claim about a different privileged guard — the rule must not be fitted to one name",
    line: "`check:function-drift` runs fine on the anon key, so it could go on a schedule.",
    expect: /attributes the ANON key to check:function-drift/ },
  { name: "precedent", silent: true,
    why: "citing check:signed-in's anon-key accounts as the PRECEDENT for an exemption is correct prose",
    line: "`check:column-drift` needs the service key — the rule that put `check:signed-in` on two durable anon-key accounts." },
  { name: "unprivileged", silent: true,
    why: "check:counts genuinely IS anon-key, and saying so must not fire",
    line: "`check:counts` is read-only, anon key only — a checker that could write can corrupt what it checks." },
];

const before = sum(MD);
const orig = fs.readFileSync(MD, "utf8");
if (orig.split(ANCHOR).length - 1 !== 1) { console.error("ANCHOR LOST in CLAUDE.md"); process.exit(2); }

// The clean run first: it proves the tree is clean before anything is injected, AND refuses any
// expectation that matches the healthy output -- the trap that made two cases report MISSED
// against guards firing correctly.
let clean = "";
try { clean = execFileSync("node", ["scripts/check-guard-wiring.mjs"], { encoding: "utf8" }); }
catch (e) { console.error("the guard already fails on a clean tree:\n" + (e.stdout || "")); process.exit(2); }
for (const c of CASES) {
  if (c.expect && c.expect.test(clean)) {
    console.error(`HARNESS BUG: ${c.name}'s expectation matches the HEALTHY run, so it cannot discriminate.`);
    process.exit(2);
  }
}

let bad = 0;
for (const c of CASES) {
  fs.writeFileSync(MD, orig.replace(ANCHOR, c.line + "\n" + ANCHOR), "utf8");
  const landed = sum(MD) !== before;
  let out = "", code = 0;
  try { out = execFileSync("node", ["scripts/check-guard-wiring.mjs"], { encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); code = e.status; }
  fs.writeFileSync(MD, orig, "utf8");
  const restored = sum(MD) === before;

  const fired = c.expect ? c.expect.test(out) : false;
  const verdict = c.silent
    ? (code === 0 && !/attributes the ANON key/.test(out) ? "SILENT (correct)" : "FIRED — false positive")
    : (fired && code === 1 ? "CAUGHT" : "MISSED");
  if (verdict.startsWith("MISSED") || verdict.startsWith("FIRED")) bad++;
  console.log(`${c.name}: ${verdict}   (edit landed: ${landed}, restored byte-identical: ${restored}, exit ${code})`);
  console.log(`   ${c.why}\n`);
}
if (sum(MD) !== before) { console.error("CLAUDE.md was NOT restored"); process.exit(2); }
console.log(bad ? `FAILED — ${bad} case(s) wrong` : `ok — ${CASES.length}/${CASES.length}, section 5 fires on the real defect and stays quiet on correct prose`);
process.exit(bad ? 1 : 0);
