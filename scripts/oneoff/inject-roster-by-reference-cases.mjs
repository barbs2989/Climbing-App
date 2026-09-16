// check:crew-member-readers section 2 -- a SEED resolver passed by REFERENCE over a list of
// people ids. Section 1 scans for the literal `cById(` and then filters on `climberId`, so
// `cl.memberIds.map(cById)` was invisible twice over: a reference rather than a call, and an
// id list called memberIds.
//
// Each case proves its edit LANDED BY CHECKSUM before the guard is believed, and every file is
// restored byte-identically. A case that fails for its own reasons proves nothing.
//
//   node scripts/oneoff/inject-roster-by-reference-cases.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const GUARD = path.join(ROOT, "scripts", "check-crew-member-readers.mjs");
const sum = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

const run = () => {
  try {
    execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out: "" };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
};

// The clean run first: an expectation that already matches it can never be evidence, which is
// a mistake this repo has recorded three times.
const clean = run();
if (clean.code !== 0) {
  console.error("REFUSING TO RUN: the guard is not green on this tree, so no case is attributable.");
  console.error(clean.out);
  process.exit(1);
}

const CASES = [
  {
    name: "the-real-defect",
    file: APP,
    expect: "pass a SEED resolver by reference",
    why: "the card's roster exactly as it stood: cl.memberIds.map(cById).filter(Boolean)",
    edit: (s) => s.replace(
      'var membs=_cardRosterIds.map(function(id){return _asCardMember(id)||(id===_meCardId?Object.assign({},ME,{id:_meCardId}):{id:id,name:"A climber",avatar:"",_profile:true});});',
      "var membs=cl.memberIds.map(cById).filter(Boolean);"),
  },
  {
    name: "SILENT-resolver-consults-real-profiles",
    file: APP,
    silent: true,
    why: "a .map(cById) whose own expression also reads a profiles query is the SANCTIONED answer, not an exemption -- flagging it would tell an author to un-fix it",
    edit: (s) => s.replace(
      "var friendsIn=cl.memberIds.filter(",
      "var _demoRef=(cl.memberIds||[]).map(cById);void _demoRef;void grpCardProfilesQ;var friendsIn=cl.memberIds.filter("),
  },
  {
    name: "SILENT-comment-quoting-the-shape",
    file: APP,
    silent: true,
    why: "a comment naming the forbidden shape is documentation; a guard that failed on it would forbid explaining itself",
    edit: (s) => s.replace(
      "var friendsIn=cl.memberIds.filter(",
      "/* never write cl.memberIds.map(cById) here */var friendsIn=cl.memberIds.filter("),
  },
  {
    name: "scan-cannot-fire",
    file: GUARD,
    expect: "the by-reference pattern no longer behaves",
    why: "narrowing BY_REF until it matches nothing must fail CLOSED -- a scan that cannot fire prints identically to a clean app. The message moved when the floor stopped depending on a LIVE instance: the mutualIds stub was the last one, and implementing mutual friends (0182) removed it, so the guard exercises constructed samples instead",
    edit: (s) => s.replace("(map|filter|find|some|every|flatMap)", "(thisMethodDoesNotExist)"),
  },
  {
    name: "stale-exemption",
    file: GUARD,
    expect: "by-reference exemption(s) match nothing",
    why: "ALLOW_REF must fail when its site is gone, or the list rots into a description of code that does not exist",
    // Inserts its own entry rather than editing a live one: ALLOW_REF is EMPTY now (the stub it
    // exempted is implemented), and a case that needs a real exemption to exist rots the day the
    // last one is cleared -- which is exactly what happened here.
    edit: (s) => s.replace("const ALLOW_REF = [];", 'const ALLOW_REF = [{key:"aSiteThatDoesNotExist(",why:"injected by inject-roster-by-reference-cases"}];'),
  },
];

let pass = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  const after = c.edit(before);
  if (after === before) { console.log(`  HARNESS BUG  ${c.name} -- edit matched nothing`); continue; }
  fs.writeFileSync(c.file, after);
  if (sum(c.file) === beforeSum) { console.log(`  HARNESS BUG  ${c.name} -- checksum did not move`); continue; }

  const r = run();
  fs.writeFileSync(c.file, before);
  if (sum(c.file) !== beforeSum) { console.error(`  TREE NOT RESTORED: ${c.file}`); process.exit(1); }

  if (c.silent) {
    if (r.code === 0) { pass++; console.log(`  ok    ${c.name}  (stayed SILENT)`); }
    else console.log(`  FIRED ON CORRECT WORK  ${c.name}\n      ${r.out.split("\n").find((l) => /FAILED/.test(l)) || ""}`);
  } else {
    // Judged on the guard's OWN failure text, never on the exit code: these edits can break the
    // run for unrelated reasons, and an injection that produces a different failure is not a catch.
    const fired = r.code !== 0 && r.out.includes(c.expect);
    if (fired) { pass++; console.log(`  ok    ${c.name}  (caught: "${c.expect}")`); }
    else console.log(`  MISS  ${c.name}  exit=${r.code}\n      wanted: ${c.expect}\n      got: ${r.out.split("\n").slice(0, 2).join(" | ")}`);
  }
}

console.log(`\n${pass}/${CASES.length} behaved as declared`);
process.exit(pass === CASES.length ? 0 : 1);
