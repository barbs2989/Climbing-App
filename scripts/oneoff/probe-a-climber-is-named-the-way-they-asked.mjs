// IS A CLIMBER NAMED THE WAY THEY ASKED TO BE NAMED, ONCE THEIR ROW BECOMES A CLIMBER OBJECT?
//
// `PARTNER_COLS` states the contract in its own comment: "show_name is on every list that becomes
// a CLIMBER OBJECT, because pubName() decides between the display name and the @handle from it —
// a select that omits it makes the column arrive undefined, which reads as false, which silently
// ignores the climber's own setting." #1619 fixed the HOOK (useProfilesByIds now selects
// `show_name, username` and maps `showName`), and #1681 fixed `_asMember` for groups.
//
// FOUR MAPPINGS STILL HAD THE FIELDS AND DROPPED OR FORGED THEM, and the four fail in three
// different directions -- which is why "does it call pubName?" is the wrong question to sweep for:
//
//   A  the crew INVITE SEARCH pool hardcoded `showName:true` and then called pubName(c). It reads
//      as compliant at the call site and publishes the real name of every climber in the results
//      who turned the setting OFF. Going THROUGH the protective function with a forged input is
//      worse than skipping it, because nothing about the call site looks wrong.
//   B  crewMemberById dropped `username` AND `showName`, so pubName fell through to a handle
//      DERIVED from the real name -- "Robin Belay" -> @robinbelay, which need not be theirs. That
//      object feeds the chat header, the avatar strip, the safety brief and the trip recap.
//   C  the crew JOIN-REQUEST card rendered a bare `{c.name}` for a real profile. The requester is
//      a stranger to the organiser, which is exactly when a climber would have the setting off.
//   D  the open-crew ORGANISER chip carried `username` but not `showName`, so a climber who WANTS
//      their name shown was always reduced to a handle. Under-claiming, same field, same contract.
//
// pubName/pubFirst are LIFTED FROM SOURCE rather than retyped -- a copy would agree with itself
// whatever the app did, which is the whole question. Section 3 asserts the mappings as SOURCE
// beside the executed rule: a merge that keeps pubName and drops a field from one mapping restores
// that mapping's defect with every execution assertion still green.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let bad = 0;
const ok = (m) => console.log("  ok   " + m);
const fail = (m) => { bad++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("\nBROKEN PROBE: " + m); process.exit(2); };

const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const db = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");

// Balance braces from the declaration rather than anchoring on a LINE: a comment written beside
// the helper must not read as ANCHOR LOST, which is a probe refusing to run because somebody
// documented the thing it checks.
const lift = (name) => {
  const decl = "function " + name + "(";
  const at = core.indexOf(decl);
  if (at < 0 || core.indexOf(decl, at + 1) >= 0)
    dead("`" + decl + "` is not in ClimbMatchCore.jsx exactly once — ANCHOR LOST");
  let depth = 0, q = null;
  for (let j = core.indexOf("{", at); j < core.length; j++) {
    const ch = core[j];
    if (q) { if (ch === "\\") j++; else if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { q = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (!depth) return core.slice(at, j + 1); }
  }
  dead("`" + decl + "` does not close — ANCHOR LOST");
};
const { pubName, pubFirst } = new Function(
  [lift("pubName"), lift("pubFirst")].join("\n") + "\nreturn {pubName,pubFirst};"
)();

// A climber who has turned the switch OFF, exactly as useProfilesByIds hands them over.
const HIDDEN = { id: "u1", name: "Robin Belay", username: "rb_climbs", showName: false };
const SHOWN = { id: "u2", name: "Quinn Fixture", username: "qfix", showName: true };

console.log("\n1. the rule, executed\n");

if (pubName(HIDDEN) === "@rb_climbs")
  ok("a climber with the switch OFF is named by their own handle");
else fail(`pubName gave "${pubName(HIDDEN)}" for a climber who hid their name`);

if (pubName(SHOWN) === "Quinn Fixture")
  ok("...and one with it ON is named by their name — the rule cuts both ways");
else fail(`pubName gave "${pubName(SHOWN)}" for a climber who asked to be shown`);

console.log("\n2. the three ways a mapping broke it\n");

// A: the forged setting. This is what the invite pool did.
const forged = { ...HIDDEN, showName: true };
if (pubName(forged) === "Robin Belay")
  ok("A — hardcoding showName:true makes pubName publish the hidden real name (the defect reproduces)");
else fail("hardcoding showName no longer publishes the name; case A proves nothing");

// B: the dropped fields. This is what crewMemberById did.
const stripped = { id: HIDDEN.id, name: HIDDEN.name };
const derived = pubName(stripped);
if (derived === "@robinbelay" && derived !== pubName(HIDDEN))
  ok(`B — dropping username/showName invents "${derived}" from the real name, not "${pubName(HIDDEN)}"`);
else fail(`expected a handle derived from the name, got "${derived}"`);

// C: the bare read.
if (HIDDEN.name === "Robin Belay")
  ok("C — reading `.name` directly publishes it whatever the switch says");
else fail("fixture broken");

// D: the under-claim.
const noShow = { id: SHOWN.id, name: SHOWN.name, username: SHOWN.username };
if (pubName(noShow) === "@qfix" && pubName(SHOWN) === "Quinn Fixture")
  ok("D — omitting showName reduces a climber who ASKED to be shown to a handle");
else fail("the under-claim case no longer reproduces");

console.log("\n3. every mapping carries the fields (asserted as SOURCE)\n");

const SITES = [
  ["core", "A — the crew invite-search pool reads the real column, not a constant",
    "showName:!!rp.show_name"],
  ["core", "A — ...and `showName:true` is gone from that mapping",
    "username:rp.username,showName:true", true],
  ["core", "C — the join-request card names the climber through pubName",
    '<div style={{fontSize:14,fontWeight:700}}>{pubName(c)}</div>'],
  ["app", "B — crewMemberById carries username and showName",
    "username:pr.username,showName:!!pr.showName"],
  ["app", "D — the open-crew organiser chip carries showName",
    "username:p.username||\"\",showName:!!p.showName"],
  ["db", "the hook still SELECTS the columns all four depend on",
    'select("id, name, avatar, show_name, username")'],
  ["db", "...and PARTNER_COLS still carries show_name for the search pool",
    "show_name,resume_public"],
  // THE TWO HOOKS HAVE DIFFERENT SHAPES AND WHICH FIX READS WHICH DEPENDS ON IT:
  // useProfilesByIds MAPS camelCase (so crewMemberById reads `pr.showName`), while
  // useProfileSearch returns RAW rows (so the invite pool reads `rp.show_name`). If this
  // mapping is ever dropped, `pr.showName` becomes undefined, reads as false, and those
  // surfaces silently return to a derived handle -- a fix that is INERT while still looking
  // correct at every call site.
  ["db", "useProfilesByIds still MAPS showName, which three of the four fixes read",
    "showName: !!p.show_name"],
];
for (const [which, what, needle, mustBeAbsent] of SITES) {
  const src = which === "core" ? core : which === "app" ? app : db;
  const n = src.split(needle).length - 1;
  if (mustBeAbsent) {
    if (n === 0) ok(what);
    else fail(what + ` — the forged constant is still there (${n})`);
  } else if (n === 1) ok(what);
  else if (n === 0) fail(what + " — mapping is NOT carrying the field (or was reworded; re-anchor)");
  else fail(what + ` — matched ${n} times, so this assertion is about an unknown site`);
}

console.log("\n4. what must NOT change\n");

// A sweep that "fixes" this by making everything a handle would satisfy every leak assertion
// above and quietly delete a feature climbers opted into.
if (pubName(SHOWN) === "Quinn Fixture" && pubFirst(SHOWN) === "Quinn")
  ok("a climber who asked to be shown is still shown, by both helpers");
else fail("the switch stopped working in the ON direction — this fix would delete the feature");

if (pubName({ id: "x", name: "", username: "" }) === "Climber")
  ok("a row with nothing usable still degrades to a label rather than empty");
else fail(`empty row gave "${pubName({ id: "x", name: "", username: "" })}"`);

console.log("");
if (bad) { console.log(`${bad} assertion(s) failed.`); process.exit(1); }
console.log("ok — a climber is named the way they asked, on every surface that maps their row.");
