#!/usr/bin/env node
// THE GROUP OWNER'S OWN ROSTER ROW CARRIES ME.id — WHICH IS 0, IN A GROUP KEYED BY UUID.
//
// `_roster` appends you to the roster when you are the creator and NOT in `mem`:
//
//   _rosterIds = (isMod && mem.indexOf(_meGid) < 0) ? mem.concat([_meGid]) : mem
//   m = _asMember(id) || (id === _meGid ? ME : {id, name:"A climber", …})
//
// ON THAT EXACT PATH THE FALLBACK IS NOT A RACE, IT IS GUARANTEED. `_profMap` is built from
// `useProfilesByIds(mem)`, so when `mem` does not contain you, your profile was never fetched and
// `_asMember(_meGid)` returns null every time. The fallback is bare `ME`, and CLAUDE.md records
// that `ME.id` is **never reassigned — it is 0 signed in or out**. So your row gets id 0 in a
// group whose every other id is a uuid, and four things read that id:
//
//   subtitle   cl.ownerId === c.id ? "Owner" : …      -> uuid === 0 is false  -> "Member"
//   MOD badge  modIds.indexOf(c.id) >= 0              -> 0 is not in a uuid list
//   + Mod      isCreator && c.id !== _meGid           -> RENDERS, on YOURSELF
//   remove ✕   isMod && !cmod                         -> RENDERS, on YOURSELF
//
// So the creator of a group sees themselves listed as a plain Member, with buttons offering to
// promote and to remove themselves. Same family as #569/#680: a seed integer id meeting a uuid.
//
// FOUND FROM A CI ARTIFACT, not from reading. check:signed-in's failing dump (run 34432418081
// attempt 1) shows `+ Mod` and `✕` on BOTH rows while the passing attempt shows them on one —
// so neither rendered row matched `_meGid`, which is only possible if a row carried the wrong id.
//
// THE EXPRESSIONS ARE LIFTED FROM SOURCE AND EXECUTED, never re-typed: a copy would agree with
// itself whatever the app did. ANCHOR LOST if either moves.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const problems = [];
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); problems.push(m); };

const start = src.indexOf("var _rosterIds=");
if (start < 0) { console.error("ANCHOR LOST: `var _rosterIds=` is not in ClimbMatch.jsx — the group roster moved"); process.exit(1); }
const end = src.indexOf("var mods=", start);
if (end < 0) { console.error("ANCHOR LOST: could not bound the _roster expression"); process.exit(1); }
let block = src.slice(start, end);
// comments out, so the explanatory prose cannot be executed or matched
block = block.replace(/\/\*[\s\S]*?\*\//g, " ");
if (!/_rosterIds/.test(block) || !/_asMember/.test(block)) { console.error("ANCHOR LOST: the lifted block is not the roster shape"); process.exit(1); }

const OWNER = "11111111-1111-4111-8111-111111111111";
const MATE = "22222222-2222-4222-8222-222222222222";

// The app's own ME: CLAUDE.md — "ME, whose id is NEVER reassigned — it is 0 signed in or out".
const ME = { id: 0, name: "Quinn Fixture", username: "climbmatch-ci-owner" };

function roster({ mem, resolvable }) {
  const _asMember = (id) => (resolvable.indexOf(id) >= 0
    ? { id: id, name: "@" + id.slice(0, 4), avatar: "", username: id.slice(0, 4), showName: false, _profile: true }
    : null);
  const fn = new Function("mem", "isMod", "_meGid", "_asMember", "ME", block + " return _roster;");
  return fn(mem, true, OWNER, _asMember, ME);
}

// ── THE PATH: creator not in `mem`, so `_profMap` (keyed on mem) cannot hold their profile.
const r = roster({ mem: [MATE], resolvable: [MATE] });

if (r.length === 2) ok("the roster is 2 rows — the mate plus your appended self row");
else fail(`expected 2 rows, got ${r.length} — the fixture no longer exercises the append path`);

// FOUND BY ELIMINATION, NOT BY POSITION. Keying on r[r.length-1] pinned the append ORDER, and the
// injection suite caught it flagging a reordered roster — a layout choice, not a correctness one.
// Keying on the id would be circular, since a wrong id is the defect. The mate is the only other
// row, so whatever is not the mate is you.
const self = r.filter((x) => x && x.id !== MATE)[0] || r[r.length - 1];
// THE ASSERTION. Your own row must carry YOUR id, or every id test on it silently reads false.
if (self && self.id === OWNER) ok("your own roster row carries your real id");
else fail(`your own roster row carries id ${JSON.stringify(self && self.id)} — it must be your uuid, or "Owner" never matches and the app offers to promote and remove YOU`);

// The four readers, executed rather than described.
const ownerId = OWNER, modIds = [OWNER], meGid = OWNER;
const subtitle = (c) => (c._profile ? (ownerId === c.id ? "Owner" : (modIds.indexOf(c.id) >= 0 ? "Moderator" : "Member")) : "climberLine");
const offersMod = (c) => c.id !== meGid;

if (self && subtitle(self) === "Owner") ok('your row is labelled "Owner"');
else fail(`your row is labelled "${self && subtitle(self)}" — you created this group`);

if (self && !offersMod(self)) ok("no + Mod button on your own row");
else fail("the roster offers a + Mod button on YOUR OWN row — it is testing c.id !== _meGid against the wrong id");

// NON-VACUITY: the mate row must still be an ordinary member with the controls.
const mate = r.filter((x) => x && x.id === MATE)[0];  // by id, not position — same reason as above
if (mate && mate.id === MATE && subtitle(mate) === "Member" && offersMod(mate)) ok("the mate is still an ordinary member with the moderator control");
else fail("the mate row changed — this fixture is no longer measuring what it claims");

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — the group creator's own roster row carries their real id.");
