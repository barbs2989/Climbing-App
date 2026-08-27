// Does the group Members row still print the literal "undefined" for a climber with no seed level?
//
// check:zero and check:signed-in both went red on main with the same two lines:
//   modal:postMenuFor      the literal 'undefined' rendered as text
//   modal:reactPickerFor   the literal 'undefined' rendered as text
// and the screen dump shows where: the group Members list, "@climber" above "undefined · 0".
//
// The row was `c._profile ? (Owner|Moderator|Member) : (c.level + " · " + vScore(c))`. That gate
// asks whether the member is a REAL PROFILE OBJECT, and ME is not one — under a real session ME is
// the signed-in climber with no seed `level`, so it fell through and printed one it did not have.
// The class check:real-profile-rows exists for, at a site gated on only one of the three flags.
//
// This proves the repair WITHOUT a browser: both guards need Chrome and a dev server, and the CI
// run is minutes away, but the question — does this expression still emit "undefined" — is answered
// by executing the function over the shapes that reach it.
//
// climberLine is LIFTED FROM SOURCE with ANCHOR LOST, never copied. A copy would agree with itself
// whatever the app did, which is the whole failure mode here.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");

const i = core.indexOf("climberLine=c=>{");
if (i < 0) { console.error("ANCHOR LOST — climberLine=c=>{ is not in ClimbMatchCore.jsx"); process.exit(1); }
// Balance braces from the arrow body so the whole function comes out, however long it grows.
let d = 0, end = -1;
for (let k = core.indexOf("{", i); k < core.length; k++) {
  if (core[k] === "{") d++;
  else if (core[k] === "}" && --d === 0) { end = k + 1; break; }
}
if (end < 0) { console.error("ANCHOR LOST — could not balance climberLine's body"); process.exit(1); }
const src = core.slice(i, end);
if (src.length < 80) { console.error(`ANCHOR LOST — lifted only ${src.length} chars`); process.exit(1); }

// vScore is the only dependency. Stubbed to a NUMBER, because the defect is about the LEVEL half of
// the string; a stub returning undefined would manufacture the very failure being tested for.
const climberLine = new Function("vScore", `const ${src}; return climberLine;`)(() => 0);

/* The shapes that actually reach this row:
   - ME at zero state, and ME under a real session: id 0, no level.       <- the defect
   - a real DB member: _profile true, so the row never calls this.
   - a seed climber in the demo: has a level, and MUST render unchanged. */
const CASES = [
  { what: "ME at zero state (no level)", c: { id: 0, name: "You" }, mustNotMatch: /undefined/ },
  { what: "ME under a real session", c: { id: 0, name: "Nathan", username: "nathanclimbs" }, mustNotMatch: /undefined/ },
  { what: "a real profile member", c: { _profile: true, id: "uuid-1", username: "robin", location: "Bellingham, WA" }, mustNotMatch: /undefined/ },
  { what: "a seed climber (must be unchanged)", c: { id: 5, level: "5.11", name: "Maya" }, mustMatch: /^5\.11 · / },
];

let bad = 0;
for (const t of CASES) {
  const out = climberLine(t.c);
  const okNo = !t.mustNotMatch || !t.mustNotMatch.test(out);
  const okYes = !t.mustMatch || t.mustMatch.test(out);
  const good = okNo && okYes;
  if (!good) bad++;
  console.log(`${good ? "ok    " : "FAIL  "}${t.what.padEnd(34)} -> ${JSON.stringify(out)}`);
}

/* The seed case is the one that stops this being a free win: the repair must leave the demo's own
   rows byte-identical, and climberLine's fallback is literally (c.level||"Climber")+" · "+vScore(c),
   which is the expression that was there before. Nothing about a populated row changes. */
console.log(bad
  ? `\n${bad} case(s) still emit the literal "undefined" or changed a populated row`
  : `\nok — no shape reaching this row emits "undefined", and a seed climber renders exactly as before.`);
process.exit(bad ? 1 : 0);
