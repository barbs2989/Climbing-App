// INJECTION SUITE for check:policy-claims section 4 (scattered copy).
//
// Section 4's healthy output is "every path names something real", which is exactly what a scan
// that matches nothing prints. So every case here edits the APP in place, proves the edit landed
// BY CHECKSUM, restores the file byte-identically, and is judged on the guard's own FAIL lines.
// The harness captures the CLEAN run first and REFUSES any expectation that already appears in
// it — an expectation written against the text an assertion prints when it PASSES reports MISSED
// against a guard firing correctly, and this repo has made that mistake more than once.
//
// FOUR cases must stay SILENT, and they are the load-bearing half: a comment quoting the
// forbidden path (section 4 strips comments, or it fails on its own documentation), a path naming
// a CONTROL rather than a section (correct copy), the FAQ answer reworded honestly (a guard
// pinned to one phrasing forbids improving it), and an emergency contact that becomes settable in
// a way section 4b must report as a moved premise rather than as a defect in the copy.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "lib/PartnerSearch.jsx", "lib/Help.jsx"].map((f) => path.join(ROOT, f));
const sum = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");

const CASES = [
  { name: "faq-settings-control", file: "lib/Help.jsx", fires: true,
    find: '"Is my emergency contact private?","Yes. The emergency contact you save in Edit profile is stored with your account where only you can read it',
    repl: '"Is my emergency contact private?","Yes. You control who can see it in Settings — keep it private, share with your crew only, or show it to partners.","XX',
    expect: "claims a Settings control over an emergency contact",
    why: "the real historical FAQ answer, restored verbatim" },

  { name: "toast-profile-field", file: "ClimbMatch.jsx",
    find: "\"Float plan saved. ClimbMatch can't alert anyone for you — fill in the Float Plan form with your emergency contact, and send it to them yourself.\"",
    repl: "\"Float plan saved. Add an emergency contact in your profile, and send them the plan yourself — ClimbMatch can't alert anyone for you.\"",
    fires: false,
    why: "the real historical toast — false while nothing could set a contact, TRUE since 0237 added one to Edit profile, so the rule stands down by itself (its own design: a hardcoded ban would forbid the fix)" },

  { name: "settings-privacy-section", file: "lib/PartnerSearch.jsx", fires: true,
    find: "under Settings → Privacy & safety.",
    repl: "under Settings → Privacy.",
    expect: 'Settings renders no such section or control',
    why: "the real historical path — a section called Privacy does not exist" },

  { name: "contact-denied-again", file: "lib/Help.jsx", fires: true,
    find: '"Yes. The emergency contact you save in Edit profile',
    repl: '"There is no emergency-contact field on your profile. The emergency contact you save in Edit profile',
    expect: "still denies the emergency contact",
    why: "the real pre-0237 FAQ sentence: once a contact CAN be saved, saying there is none is the false claim (4b, re-aimed)" },

  { name: "faq-answer-deleted", file: "lib/Help.jsx", fires: true,
    find: '"Is my emergency contact private?"',
    repl: '"Is my emergency contact PRIVATE?"',
    expect: "no longer answers",
    why: "a rule that only FORBIDS is satisfied by deleting the line — the question is a climber's" },

  { name: "SILENT-comment-quoting-the-path", file: "ClimbMatchCore.jsx", fires: false,
    find: "export function wpPlaced",
    repl: "// the old copy sent people to Settings → Privacy, which is not a section\nexport function wpPlaced",
    why: "section 4 strips comments, or it fails on its own documentation" },

  { name: "SILENT-path-naming-a-control", file: "lib/PartnerSearch.jsx", fires: false,
    find: "under Settings → Privacy & safety.",
    repl: "under Settings → Show me on leaderboards.",
    why: "a path may name a CONTROL Settings renders, not only a section" },

  { name: "SILENT-answer-reworded", file: "lib/Help.jsx", fires: false,
    find: '"Yes. The emergency contact you save in Edit profile is stored with your account where only you can read it',
    repl: '"Yes — only you can read the emergency contact saved in Edit profile; it is kept with your account',
    why: "a guard pinned to one phrasing forbids improving it — the rule is that the answer still names where a contact goes" },
];

const run = () => {
  try { return execFileSync("node", [path.join(ROOT, "scripts", "check-policy-claims.mjs")], { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { return (e.stdout || "") + (e.stderr || ""); }
};
const failLines = (out) => out.split("\n").filter((l) => /^\s*(FAIL|check:policy-claims BROKEN)/.test(l) || l.includes("BROKEN:")).join("\n");

const before = FILES.map(sum);
const clean = run();
const cleanFails = failLines(clean);
if (cleanFails.trim()) { console.error("REFUSING TO RUN: the tree is not green.\n" + cleanFails); process.exit(2); }

let pass = 0;
for (const c of CASES) {
  const p = path.join(ROOT, c.file);
  const orig = fs.readFileSync(p, "utf8");
  const n = orig.split(c.find).length - 1;
  if (n !== 1) { console.log(`  HARNESS BUG  ${c.name}: find matched ${n} times, expected 1`); continue; }
  if (c.expect && clean.includes(c.expect)) { console.log(`  HARNESS BUG  ${c.name}: its expectation already appears in the GREEN run`); continue; }
  const h0 = sum(p);
  fs.writeFileSync(p, orig.replace(c.find, c.repl));
  if (sum(p) === h0) { console.log(`  HARNESS BUG  ${c.name}: the edit moved no byte`); fs.writeFileSync(p, orig); continue; }
  const out = failLines(run());
  fs.writeFileSync(p, orig);
  if (sum(p) !== h0) { console.log(`  TREE NOT RESTORED  ${c.name}`); process.exit(2); }

  if (c.fires) {
    if (out.includes(c.expect)) { console.log(`  ok    ${c.name}: caught`); pass++; }
    else if (out.trim()) console.log(`  WRONG FAILURE  ${c.name}: fired, but not on "${c.expect}"\n${out}`);
    else console.log(`  MISSED  ${c.name}`);
  } else {
    if (!out.trim()) { console.log(`  ok    ${c.name}: silent, as required`); pass++; }
    else console.log(`  FIRED ON CORRECT WORK  ${c.name}\n${out}`);
  }
  console.log(`        ${c.why}`);
}
const after = FILES.map(sum);
if (String(before) !== String(after)) { console.error("TREE NOT RESTORED at exit"); process.exit(2); }
console.log(`\n${pass}/${CASES.length}`);
process.exit(pass === CASES.length ? 0 : 1);
