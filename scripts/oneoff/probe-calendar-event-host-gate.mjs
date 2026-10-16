#!/usr/bin/env node
// You must be able to put an event in a group you OWN.
//
// The Calendar asked "can I host here?" twice, with the SEED-ID test:
//
//     joinedGroups.includes(c.id) && ((c.eventPolicy||"anyone")!=="mods"
//                                     || c.ownerId===0
//                                     || (c.moderatorIds||[]).indexOf(0)>=0)
//
// A DB group carries `ownerId: g.created_by` — a uuid — and a uuid roster, so on a group whose
// eventPolicy is "mods" and which YOU CREATED, both clauses are false. The Calendar's
// "+ Create an event" then toasted "Join a group to create events" about a group you not only
// joined but own, and the group picker in the event form omitted it.
//
// Meanwhile the group DETAIL view's own "+ Create event" button asked the same question through
// `isMod`, which IS uuid-aware (`cl._db?uid:0`, `cl._db?(!!uid&&cl.ownerId===uid):(cl.ownerId===0)`).
// So one surface was right and two were wrong — the #680 shape, on a capability gate rather than
// a label, and the same split the group-card organiser had.
//
// Both sites now call one predicate, `groupCanHostEvent`, so they cannot drift again.
//
// LIFTED FROM SOURCE rather than re-typed: a copy would agree with itself whatever the app did.
//
//   node scripts/oneoff/probe-calendar-event-host-gate.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };

// ---- lift the function body, fail closed if it moved.
const ANCHOR = "function groupCanHostEvent(cl,uid,joinedGroups,groupMods){";
if (src.split(ANCHOR).length - 1 !== 1) {
  console.error("ANCHOR LOST: groupCanHostEvent is not present exactly once — nothing below is meaningful.");
  process.exit(1);
}
const start = src.indexOf(ANCHOR);
let d = 0, end = -1;
for (let i = src.indexOf("{", start); i < src.length; i++) {
  if (src[i] === "{") d++;
  else if (src[i] === "}") { d--; if (d === 0) { end = i + 1; break; } }
}
if (end < 0) { console.error("could not balance groupCanHostEvent"); process.exit(1); }
const fnSrc = src.slice(start, end);
if (fnSrc.length < 200) { console.error(`lifted short (${fnSrc.length} chars)`); process.exit(1); }
ok(`lifted groupCanHostEvent (${fnSrc.length} chars)`);

const can = new Function(`${fnSrc}; return groupCanHostEvent;`)();

const UID = "u_abc-123";
const OTHER = "u_zzz-999";

// ---- 1. THE DEFECT: a DB mods-only group you created.
const dbMine = { id: "g1", _db: true, eventPolicy: "mods", ownerId: UID, moderatorIds: [UID] };
if (can(dbMine, UID, ["g1"], {})) ok("you can host in a DB mods-only group you own");
else fail("you still cannot host an event in a group you created");

// ...and the CREATOR clause must carry it on its own. 0090's groups_add_owner trigger normally
// seats the creator with a non-member role, so the moderator clause usually ALSO matches and MASKS
// this — an injection reverting `creator` to the seed id came back MISS against a fixture that had
// the owner in both lists. Owner-not-in-mods is the shape that tests the clause it names.
const dbMineNoMod = { id: "g1b", _db: true, eventPolicy: "mods", ownerId: UID, moderatorIds: [] };
if (can(dbMineNoMod, UID, ["g1b"], {})) ok("...on the CREATOR clause alone, with an empty mod list");
else fail("the creator clause does not carry it — only the moderator list does");

// ---- 2. A DB mods-only group you are only a MEMBER of must still refuse, or the gate is gone.
const dbTheirs = { id: "g2", _db: true, eventPolicy: "mods", ownerId: OTHER, moderatorIds: [OTHER] };
if (!can(dbTheirs, UID, ["g2"], {})) ok("a mods-only group you merely joined still refuses");
else fail("the mods-only policy is no longer enforced — anyone can host");

// ---- 3. ...unless you are a MODERATOR of it, by uuid.
const dbModded = { id: "g3", _db: true, eventPolicy: "mods", ownerId: OTHER, moderatorIds: [OTHER, UID] };
if (can(dbModded, UID, ["g3"], {})) ok("a DB moderator can host, matched by uuid");
else fail("a DB moderator still cannot host");

// ---- 4. groupMods (a promotion made in THIS session) is honoured, as the detail view does.
const dbPromoted = { id: "g4", _db: true, eventPolicy: "mods", ownerId: OTHER, moderatorIds: [OTHER] };
if (can(dbPromoted, UID, ["g4"], { g4: [OTHER, UID] })) ok("a mod promoted this session can host");
else fail("groupMods is ignored — this surface disagrees with the detail view");

// ---- 5. SEED PATHS UNCHANGED, or this trades one wrong gate for another.
const seedMine = { id: "s1", eventPolicy: "mods", ownerId: 0, moderatorIds: [0] };
if (can(seedMine, UID, ["s1"], {})) ok("CONTROL — a seed mods-only group you own still hosts");
else fail("CONTROL — a seed group you own can no longer host");

const seedTheirs = { id: "s2", eventPolicy: "mods", ownerId: 3, moderatorIds: [3] };
if (!can(seedTheirs, UID, ["s2"], {})) ok("CONTROL — a seed mods-only group you joined still refuses");
else fail("CONTROL — the seed mods-only gate stopped working");

// ---- 6. "anyone" policy and the joined requirement are untouched.
const openGroup = { id: "g5", _db: true, eventPolicy: "anyone", ownerId: OTHER, moderatorIds: [OTHER] };
if (can(openGroup, UID, ["g5"], {})) ok("an 'anyone' group hosts for any member");
else fail("an 'anyone' group no longer hosts");
if (!can(openGroup, UID, [], {})) ok("a group you have NOT joined still refuses");
else fail("you can host in a group you have not joined");
if (!can(dbMine, null, ["g1"], {})) ok("signed out, a DB group does not read as yours");
else fail("a DB group reads as yours with no uid — !!uid is not guarding it");

// ---- 7. ONE PREDICATE, BOTH SITES. Executing it proves the logic; only source proves the
// Calendar actually calls it. A merge that keeps the function and restores either inline test
// would pass everything above.
const inline = /\(c\.eventPolicy\|\|"anyone"\)!=="mods"\|\|c\.ownerId===0/;
if (!inline.test(src.replace(/\/\*[\s\S]*?\*\//g, " "))) ok("neither Calendar site still tests ownerId===0 inline");
else fail("a Calendar site still carries the seed-id test inline");

const calls = (src.match(/groupCanHostEvent\(c,uid,joinedGroups,groupMods\)/g) || []).length;
if (calls === 2) ok("both Calendar sites call the shared predicate");
else fail(`expected 2 call sites, found ${calls} — the two surfaces can drift again`);

console.log(bad ? `\n${bad} problem(s).` : "\nall assertions passed");
process.exit(bad ? 1 : 0);
