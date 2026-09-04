#!/usr/bin/env node
// A group browse card must not tell you "the community" organises a group somebody owns — and a
// group YOU own must say so.
//
// The card resolved its organiser as
//
//     cl.ownerId===0 ? "you"
//       : (cById(cl.ownerId) ? <first name>
//       : (membs[0] ? <first name> : "the community"))
//
// `cl.ownerId===0` is the SEED id, so a DB group you own could never say "you" — the #680 defect,
// which was fixed for the detail view's controls (`cl._db?(!!uid&&cl.ownerId===uid):(cl.ownerId===0)`)
// and left standing here. And `cById` resolves against seed CLIMBERS, so for a DB group both the
// uuid owner AND the uuid roster drop out and the chain ends at "the community".
//
// MEASURED: all 4 seed groups resolve an owner, so "the community" was reachable ONLY for DB
// groups — and `groups.created_by` is NOT NULL by construction, so it was ALWAYS FALSE. Seen on
// CI's signed-in walk: the fixture's own group, which it created, carried "Organized by the
// community" on its card while the detail view two taps away said "Owner".
//
// WHY THE EXPRESSION IS EXECUTED RATHER THAN RENDERED. This lives inside `App`, and standing App
// up is far more than the question is worth — the precedent check:policy-claims records for the
// privacy sheet. So the resolution is LIFTED FROM SOURCE with a fail-closed anchor and run over
// the four real shapes; a re-typed copy would agree with itself whatever the app did.
//
//   node scripts/oneoff/probe-group-card-organiser.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };

// ---- lift the resolution, fail closed if it moved.
const START = "var _orgName=";
if (src.split(START).length - 1 !== 1) {
  console.error("ANCHOR LOST: `var _orgName=` is not present exactly once — nothing below is meaningful.");
  process.exit(1);
}
const from = src.indexOf(START) + START.length;
const end = src.indexOf(";", from);
const expr = src.slice(from, end);
if (expr.length < 80 || !/ownerId/.test(expr)) {
  console.error(`the lifted expression looks wrong (${expr.length} chars): ${expr.slice(0, 120)}`);
  process.exit(1);
}
ok(`lifted the organiser resolution (${expr.length} chars)`);

const SEED = [{ id: 3, name: "Alex Torres" }, { id: 7, name: "Maya Chen" }];
const resolve = new Function("cl", "uid", "cById", "membs", `return (${expr});`);
const cById = (id) => SEED.find((c) => c.id === id);
const run = (cl, uid, membs) => resolve(cl, uid, cById, membs || []);

const MY_UID = "u_1111-2222";

// ---- 1. A DB group you own says "you". This is the #680 case.
const dbMine = { _db: true, ownerId: MY_UID, memberIds: [MY_UID, "u_3333"] };
const r1 = run(dbMine, MY_UID, []);
if (r1 === "you") ok('a DB group you own resolves to "you"');
else fail(`a DB group you own resolves to ${JSON.stringify(r1)} — it should be "you"`);

// ---- 2. A DB group somebody else owns must NOT claim the community runs it. We cannot name them
// from this scope (the profile map is built inside the open-group view only), so the honest answer
// is null and the chip is dropped.
const dbTheirs = { _db: true, ownerId: "u_9999", memberIds: ["u_9999", MY_UID] };
const r2 = run(dbTheirs, MY_UID, []);
if (r2 === null) ok("a DB group somebody else owns resolves to null, so the chip is dropped");
else if (r2 === "the community") fail('a DB group still claims "the community" organises it');
else fail(`a DB group somebody else owns resolves to ${JSON.stringify(r2)} — expected null`);

// ---- 3. THE SEED PATHS MUST BE UNCHANGED, or this trades one wrong label for another.
const seedMine = { ownerId: 0, memberIds: [3] };
const r3 = run(seedMine, MY_UID, [SEED[0]]);
if (r3 === "you") ok('CONTROL — a seed group you own still says "you"');
else fail(`CONTROL — a seed group you own resolves to ${JSON.stringify(r3)}`);

const seedTheirs = { ownerId: 3, memberIds: [3, 7] };
const r4 = run(seedTheirs, MY_UID, [SEED[0], SEED[1]]);
if (r4 === "Alex") ok('CONTROL — a seed group Alex owns still says "Alex"');
else fail(`CONTROL — a seed group Alex owns resolves to ${JSON.stringify(r4)}`);

// ---- 4. The member fallback still works for a seed group with no owner recorded.
const seedNoOwner = { ownerId: null, memberIds: [7] };
const r5 = run(seedNoOwner, MY_UID, [SEED[1]]);
if (r5 === "Maya") ok("CONTROL — a seed group with no owner still names a member");
else fail(`CONTROL — a seed group with no owner resolves to ${JSON.stringify(r5)}`);

// ---- 5. SIGNED OUT: `uid` is null, so a DB group must not read as yours.
const r6 = run({ _db: true, ownerId: null, memberIds: [] }, null, []);
if (r6 !== "you") ok("a DB group with no uid does not read as yours");
else fail("a DB group resolves to 'you' with no uid — !!uid is not guarding it");

// ---- 6. THE RENDER GATE, AS SOURCE. Executing the expression proves it can return null; it
// cannot prove the chip stops rendering. A merge that keeps the resolution and drops the guard
// puts "Organized by null" on the card.
if (/\{_orgName\?<span/.test(src)) ok("the chip renders only when an organiser is known");
else fail('the chip is not gated on _orgName — a null resolution would render "Organized by null"');

// COMMENTS STRIPPED. The fix's own comment quotes the withdrawn phrase to explain why it went, so
// a raw search finds the PROSE and fails on a correct tree — which it did, the FOURTH time in this
// session that a checker was fooled by the comment written to explain it. See
// [[a-checker-is-fooled-by-its-own-explanation]]; an AST-free test must strip first.
const bare = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
if (!/"the community"/.test(bare)) ok('the "the community" claim is gone from the app');
else fail('"the community" is still rendered — it is false for every group that reaches it');

// ---- 7. The neighbouring seed-id test must STAY seed-only: its one consumer is the +1 on the
// member count, and a DB roster already includes the owner. Making it uuid-aware double-counts.
if (/var _cardIsMod=cl\.ownerId===0\|\|/.test(src))
  ok("CONTROL — _cardIsMod is still seed-only, so the member count is not double-counted");
else fail("_cardIsMod changed — re-check cardMemCount, a DB roster already contains the owner");

console.log(bad ? `\n${bad} problem(s).` : "\nall assertions passed");
process.exit(bad ? 1 : 0);
