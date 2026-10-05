// INJECTION SUITE for check:policy-claims section 5 (the crew float plan).
//
// Section 5's healthy output is "no surface claims it", which is exactly what a scan matching
// nothing prints — so every case edits the APP in place, proves the edit landed BY CHECKSUM,
// restores the file byte-identically, and is judged on the guard's own FAIL lines. The harness
// captures the CLEAN run first and REFUSES any expectation that already appears in it: an
// expectation written against the text an assertion prints when it PASSES reports MISSED against a
// guard firing correctly, and this repo has made that mistake more than once.
//
// THREE cases restore the real historical claims verbatim. TWO move a PREMISE rather than breaking
// copy, and they must be told apart — a settable contact and a rendered plan are different repairs,
// so the two expectations are the two halves of section 5's own message. ONE deletes the disclosure,
// because a rule that only forbids is satisfied by deleting the sentence and a policy silent on a
// row other crew members can read is worse than the false version. TWO must stay SILENT: a comment
// quoting the property access section 5 forbids (it masks comments with Babel, or its own
// explanation decides the verdict), and the honest sentence REWORDED, since a guard pinned to one
// phrasing forbids improving the copy.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "lib/CrewCard.jsx", "lib/LegalView.jsx"].map((f) => path.join(ROOT, f));
const sum = (p) => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex");

const CASES = [
  { name: "collect-claim", file: "lib/LegalView.jsx", fires: true,
    find: "climbing logs, float plans you file against a crew, the home area you type in, your zip code if you add one, an emergency contact if you save one (visible only to you), and",
    repl: "climbing logs, optional emergency contacts, the home area you type in, your zip code if you add one, and",
    expect: "names an emergency contact without saying where it lives or who can read it",
    why: "the real historical collection list — profiles has 24 columns and none is a contact" },

  { name: "crew-shares-contact", file: "lib/LegalView.jsx", fires: true,
    find: "You can save one emergency contact (a name and a phone number) in Edit profile, where only you can read it: it is stored with your account, never shown on your profile or to another climber, never contacted by ClimbMatch, and used only to fill in your own float plans. What you write into a float plan is held on your own device until you send it to somebody. Filing a float plan against a crew records the date you filed it and the crew’s agreed return day on that crew’s record, which the other members can read — but no screen in the app shows it back to them, so do not rely on your crew to raise the alarm.",
    repl: "Emergency contacts are never shown on your public profile. If you file a float plan with a crew, your emergency contact is shared with that crew so they can raise the alarm if you do not return.",
    expect: "says an alarm gets raised off a float plan",
    why: "the real historical Privacy §\"What others can see\", restored verbatim" },

  { name: "sheet-crew-sees-it", file: "ClimbMatch.jsx", fires: true,
    find: "The float plan you fill in stays on your phone until you send it to somebody yourself. Filing one against a crew records the date and the crew’s agreed return day on that crew, which the other members can read — nothing in the app shows it back to them, so ClimbMatch cannot raise the alarm for you.",
    repl: "A float plan you share is seen by your crew so they know your route and return time — it includes your emergency contact, so they can raise the alarm if you do not come back.",
    expect: "says an alarm gets raised off a float plan",
    why: "the real historical in-app sheet sentence — float_plan carries no route at all" },

  { name: "profile-contact-fed-to-crew", file: "ClimbMatch.jsx", fires: true,
    find: "ME.certExpiry=profile.certExpiry||{};",
    repl: "ME.certExpiry=profile.certExpiry||{};ME.emergencyContact=(myEcQ.data&&myEcQ.data.name)||\"\";",
    expect: "something now sets the emergencyContact the crew float plan stores",
    why: "0237's contact is owner-only and deliberately NOT fed to the crew float plan; the day it is, a crew can read it and the premise has moved" },

  { name: "plan-becomes-rendered", file: "lib/CrewCard.jsx", fires: true,
    find: "{crew.floatPlan?\"✓ Float plan\":\"⚠ Set float plan\"}",
    repl: "{crew.floatPlan?\"✓ Back by \"+crew.floatPlan.returnBy:\"⚠ Set float plan\"}",
    expect: "a screen reads the stored crew float plan",
    why: "the day a crew is SHOWN the plan, \"your crew can see it\" becomes true — the other half of the premise, and a different repair from a settable contact" },

  { name: "disclosure-deleted", file: "lib/LegalView.jsx", fires: true,
    find: " Filing a float plan against a crew records the date you filed it and the crew’s agreed return day on that crew’s record, which the other members can read — but no screen in the app shows it back to them, so do not rely on your crew to raise the alarm.",
    repl: "",
    expect: "no longer says the other members of a crew can read",
    why: "a rule that only FORBIDS is satisfied by deleting the sentence, and something a climber types really does land on a row other members can read" },

  { name: "SILENT-comment-quoting-the-access", file: "ClimbMatchCore.jsx", fires: false,
    find: "export function wpPlaced",
    repl: "/* nothing renders crew.floatPlan.returnBy back to the crew that stored it */\nexport function wpPlaced",
    why: "section 5 masks comments with Babel, or its own documentation of the forbidden access decides the verdict" },

  { name: "SILENT-honest-mention-reworded", file: "lib/LegalView.jsx", fires: false,
    find: "where only you can read it: it is stored with your account, never shown on your profile or to another climber,",
    repl: "and only you can read it: it is kept with your account, never shown on your profile or to another climber,",
    why: "a guard pinned to one phrasing forbids improving the copy — the rule is that a sentence naming a contact carries its own honesty" },
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
