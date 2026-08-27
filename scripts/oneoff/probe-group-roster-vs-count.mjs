#!/usr/bin/env node
// Does the group detail screen's member COUNT agree with the roster printed underneath it?
//
// Before the fix these came from two paths:
//
//     count  = mem.length + (isMod && mem.indexOf(_meGid) < 0 ? 1 : 0)
//     roster = mem.map(id => cl._db ? _asMember(id) : cById(id)).filter(Boolean)
//
// — the count was `mem` plus a hardcoded fudge, the roster was `mem` MINUS anything that failed to
// resolve, and they agreed only by luck. Measured with the app's own lifted expressions, 4 of 5
// cases disagreed:
//
//   * profiles read FAILED        -> "Members · 2" above NOTHING AT ALL
//   * one profile row missing     -> "Members · 2" above one row
//   * the +1 fudge fired          -> "Members · 3" above two rows. A locally-created group is
//                                    `memberIds:[], moderatorIds:[0]`, so this is the DEFAULT
//                                    state of every group you create: "Members · 1", nobody listed
//   * seed group holding ME (id 0)-> cById(0) is not in CLIMBERS, so you vanish from your own group
//
// `memory/group-member-count-intermittent-reads-1.md` settled that this was NOT what produced
// check:signed-in's intermittent red — that was the guard's own scope — and said in as many words
// that the underlying disagreement "is still real and still worth fixing". This is that.
//
// NO BROWSER AND NO DATABASE, deliberately: the interesting inputs are ones live data cannot
// produce on demand (a failed profiles read, a profile row that is missing). Same reason
// probe-verification-survives-its-own-read.mjs is static.
//
// The expressions are LIFTED FROM SOURCE with ANCHOR LOST rather than retyped. A copy would agree
// with itself whatever the app did, which is the whole question here.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

let bad = 0;
const lost = (what) => {
  console.error(`ANCHOR LOST: ${what}`);
  console.error("Nothing was measured. Re-anchor this probe rather than deleting it.");
  process.exit(1);
};

function balanced(src, from) {
  let d = 0;
  for (let i = from; i < src.length; i++) {
    if (src[i] === "{") d++;
    else if (src[i] === "}") { d--; if (d === 0) return i + 1; }
  }
  return -1;
}
// Stop at a `;` AT DEPTH ZERO. A naive indexOf(";") cuts `_roster` inside its own callback — the
// statement's body contains `return ...;` — and hands back half an expression, which fails as a
// syntax error rather than as a wrong measurement. Strings are skipped so a `;` inside one
// ("A climber" today, but any future copy) cannot end the scan early.
function stmt(anchor, label) {
  const i = SRC.indexOf(anchor);
  if (i < 0) lost(label || anchor);
  let d = 0, q = null;
  for (let j = i + anchor.length; j < SRC.length; j++) {
    const c = SRC[j];
    if (q) { if (c === "\\") j++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "(" || c === "{" || c === "[") d++;
    else if (c === ")" || c === "}" || c === "]") d--;
    else if (c === ";" && d === 0) return SRC.slice(i, j + 1);
  }
  lost(`could not find the end of ${label || anchor}`);
}

const aStart = SRC.indexOf("var _asMember=function(id){");
if (aStart < 0) lost("var _asMember=function(id){");
const aEnd = balanced(SRC, SRC.indexOf("{", SRC.indexOf("function(id)", aStart)));
if (aEnd < 0) lost("could not balance _asMember's body");
const ASMEMBER = SRC.slice(aStart, aEnd);              // ends at `}` — supply the `;` when joining

const ROSTER_IDS = stmt("var _rosterIds=", "var _rosterIds=");
const ROSTER = stmt("var _roster=", "var _roster=");
const COUNT = stmt("var _memN=", "var _memN=");

console.log("lifted from ClimbMatch.jsx:");
console.log("  _rosterIds: " + ROSTER_IDS);
console.log("  _roster   : " + ROSTER.slice(0, 118) + "...");
console.log("  _memN     : " + COUNT);
console.log("");

function run({ db, mem, profiles, isMod, meGid, climbers, ME }) {
  const cl = { _db: db };
  const _profMap = {};
  for (const p of profiles) _profMap[p.id] = p;
  const cById = (id) => climbers.find((c) => c.id === id);
  // eslint-disable-next-line no-new-func
  const f = new Function("cl", "mem", "_profMap", "cById", "ME", "isMod", "_meGid",
    `${ASMEMBER}; ${ROSTER_IDS} ${ROSTER} ${COUNT}
     return { count: _memN, rows: _roster.length, ids: _rosterIds.length,
              names: _roster.map(function(m){return m&&m.name;}),
              // A row without _profile falls to the subtitle branch c.level + " · " + vScore(c).
              // NO BACKTICKS IN HERE — this comment lives inside a template literal, and one ends it.
              unlevelled: _roster.filter(function(m){return m && !m._profile && m.level===undefined;}).map(function(m){return m.name;}) };`);
  return f(cl, mem, _profMap, cById, ME, isMod, meGid);
}

// ME carries NO `level` and no vouches once signed in — that is the whole point of
// check:real-profile-rows — and its `id` stays 0 whether signed in or out, so it can never equal a
// uuid `_meGid`. Both facts are load-bearing here and both were got wrong first.
const ME = { id: 0, name: "Nathan" };
// Seed climbers DO carry a level (`level:"Intermediate"` and friends live in ClimbMatchCore.jsx),
// so a fixture without one makes every seed row look like the defect. Checked against the source
// rather than assumed — an early run flagged "Robin" and the fixture was the thing that was wrong.
const CLIMBERS = [{ id: 5, name: "Robin", level: "Intermediate" }, { id: 6, name: "Sam", level: "Advanced" }];

// `want` is who is ACTUALLY in the group — the thing both the number and the rows describe.
const CASES = [
  { name: "DB group, both profiles loaded — the healthy case", want: 2,
    args: { db: true, mem: ["u1", "u2"], profiles: [{ id: "u1", name: "Robin" }, { id: "u2", name: "Sam" }], isMod: false, meGid: "u1", climbers: CLIMBERS, ME } },
  { name: "DB group, profiles READ FAILED (data undefined -> map empty)", want: 2,
    args: { db: true, mem: ["u1", "u2"], profiles: [], isMod: false, meGid: "u1", climbers: CLIMBERS, ME } },
  { name: "DB group, ONE profile row missing (RLS, or a deleted account)", want: 2,
    args: { db: true, mem: ["u1", "u2"], profiles: [{ id: "u1", name: "Robin" }], isMod: false, meGid: "u1", climbers: CLIMBERS, ME } },
  { name: "the +1 fudge: I am a mod but not in mem", want: 3,
    args: { db: true, mem: ["u1", "u2"], profiles: [{ id: "u1", name: "Robin" }, { id: "u2", name: "Sam" }], isMod: true, meGid: "uME", climbers: CLIMBERS, ME } },
  { name: "seed group holding ME (id 0) — cById(0) is not in CLIMBERS", want: 2,
    args: { db: false, mem: [0, 5], profiles: [], isMod: false, meGid: 0, climbers: CLIMBERS, ME } },
  { name: "a group you just created: memberIds:[], moderatorIds:[0]", want: 1,
    args: { db: false, mem: [], profiles: [], isMod: true, meGid: 0, climbers: CLIMBERS, ME } },
];

console.log("case                                                              in group  count  rows  verdict");
for (const c of CASES) {
  const r = run(c.args);
  const ok = r.count === r.rows && r.rows === c.want && !r.unlevelled.length;
  if (!ok) bad++;
  console.log("  " + c.name.padEnd(62) + String(c.want).padStart(7) + String(r.count).padStart(7) + String(r.rows).padStart(6) +
    "  " + (ok ? "ok" : "** WRONG"));
  console.log("        rows: " + (r.names.length ? r.names.join(", ") : "(nothing at all)"));
  // The subtitle prints `c.level+" · "+vScore(c)` for any row without `_profile`. A real account
  // has neither, so such a row renders "undefined · 0" — check:real-profile-rows' shape. This
  // caught a regression THIS change introduced: putting ME in the roster made the latent case live.
  if (r.unlevelled.length) console.log("        ** would render \"undefined · 0\" for: " + r.unlevelled.join(", "));
}

// The three surfaces must be one number, not three. `membObjs` is deliberately still the MENTION
// list — a placeholder must never become an @-mention candidate — so it is checked as absent from
// the display sites rather than reused.
console.log("");
const structural = [
  ["heading uses the hoist", SRC.includes('"Members · "+_memN')],
  ["rows render _roster", SRC.includes("(membersOpen[cl.id]?_roster:_roster.slice(0,6))")],
  ["show-all label uses the same number", SRC.includes('"Show all "+_memN+" members"')],
  ["count is the rendered length", /var _memN=_roster\.length;/.test(SRC)],
  ["no second copy of the old compound count", !/mem\.length\+\(isMod&&mem\.indexOf\(_meGid\)<0\?1:0\)/.test(SRC)],
  ["mentions still take the RESOLVED list", SRC.includes("mentionCandidates={membObjs}")],
];
for (const [label, held] of structural) {
  if (!held) bad++;
  console.log("  " + (held ? "ok   " : "FAIL ") + label);
}

console.log("");
if (bad) { console.log(`${bad} problem(s).`); process.exit(1); }
console.log("ok — the number, the rows and the show-all label are one value, and no member is dropped.");
