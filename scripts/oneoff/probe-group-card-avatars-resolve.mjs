// The Groups EXPLORE CARD says "N members", draws an avatar strip, and puts a "+N" overflow
// chip beside it. Those were THREE derivations of one fact, and on a DB group the middle one
// resolved NOTHING.
//
// THE DEFECT. `membs = cl.memberIds.map(cById).filter(Boolean)` -- and `cById` searches the
// seed CLIMBERS/FILLER_CLIMBERS arrays by integer id. `useMyGroups` maps
// `memberIds: active.map(m => m.user_id)`, i.e. UUIDS, and `setCreatedGroups(myGroupsQ.data)`
// puts every DB group into the same `list` the card maps over. So a real 7-member group drew
// ZERO avatars while the header beside it said "7 members" and the chip said "+2". That is
// #569 verbatim -- "a uuid matched nothing and a populated crew read You + 0 climbers" --
// arriving on the group card. Measured before the fix: header 7, avatars 0, chip +2.
//
// IT WAS SEEN AND HALF-FIXED. The comment above `_orgName` on this same card says a previous
// change repaired the ORGANISER chip because "a uuid owner and a uuid ROSTER both drop out".
// It names the roster and repairs the owner. An instance fixed by hand is not a class closed.
//
// WHY NO GUARD CAUGHT IT. check:crew-member-readers exists for exactly this class and was
// blind twice over: it scans for the literal `cById(` -- a CALL, where this is `.map(cById)`,
// a REFERENCE -- and then filters on `climberId`, where this id list is called `memberIds`.
// Section 2 of that guard closes it, injection-tested 5/5.
//
// AND THE THREE DERIVATIONS DISAGREED ON A SEED GROUP TOO, which is the milder half:
//   header   = memberIds.length + (I am a mod && I am not in memberIds ? 1 : 0)
//   avatars  = memberIds.map(cById).filter(Boolean).slice(0,5)   <- FILTERED
//   overflow = memberIds.length - 5                              <- UNFILTERED
// so the chip promised a face for every id that failed to resolve. That is the group DETAIL
// view's defect, fixed there by deriving the count from the list that renders
// (`_memN = _roster.length`) and left standing here.
//
// THE FIX IS THE DETAIL VIEW'S: one `_cardRoster` list, with the count and the chip derived
// from it, and an unresolved member rendered as a PLACEHOLDER rather than vanishing -- so a
// read still in flight cannot silently shrink a count that is otherwise correct.
//
// No browser, no database: the resolver and the shapes are all static.
//   node scripts/oneoff/probe-group-card-avatars-resolve.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const db = fs.readFileSync(path.join(ROOT, "lib/db.js"), "utf8");

let fail = 0, ran = 0;
const ok = (cond, label, detail) => {
  ran++;
  if (cond) console.log(`  ok    ${label}${detail ? "  -- " + detail : ""}`);
  else { fail++; console.log(`  FAIL  ${label}${detail ? "  -- " + detail : ""}`); }
};

// ---------------------------------------------------------------- lift, never retype
// A hand-typed copy would agree with itself whatever the app does, which is the whole question.
const lift = (src, head, what) => {
  const i = src.indexOf(head);
  if (i < 0) { console.error(`ANCHOR LOST: ${what} (${head})`); process.exit(1); }
  if (src.indexOf(head, i + 1) >= 0) { console.error(`ANCHOR AMBIGUOUS: ${what}`); process.exit(1); }
  let d = 0, started = false;
  for (let j = i; j < src.length; j++) {
    if (src[j] === "{") { d++; started = true; }
    else if (src[j] === "}") { d--; if (started && !d) return src.slice(i, j + 1); }
  }
  console.error(`ANCHOR UNCLOSED: ${what}`);
  process.exit(1);
};

const CLIMBERS = [{ id: 0, name: "Nathan Barber" }, { id: 1, name: "Alex Torres" }, { id: 3, name: "Maya Chen" }];
const FILLER_CLIMBERS = [1002, 1005, 1011, 1019, 1027].map((id) => ({ id, name: "Filler " + id }));
const ME = CLIMBERS[0];

const cById = new Function("CLIMBERS", "FILLER_CLIMBERS", lift(core, "function cById(id)", "cById") + "; return cById;")(CLIMBERS, FILLER_CLIMBERS);
const pubName = new Function(lift(core, "function pubName(p)", "pubName") + "; return pubName;")();
const pubNameRow = new Function("pubName", lift(core, "function pubNameRow(p)", "pubNameRow") + "; return pubNameRow;")(pubName);
const groupMemberFromRow = new Function("pubNameRow", lift(core, "function groupMemberFromRow(p)", "groupMemberFromRow") + "; return groupMemberFromRow;")(pubNameRow);

ok(typeof cById === "function" && cById(1) && cById(1).name === "Alex Torres",
   "cById lifted and resolves a seed integer id", "non-vacuity: the lift is not a stub");
ok(groupMemberFromRow({ id: "u1", name: "Robin Belay", username: "robin", showName: true, avatar: "a.png" }).name === "Robin Belay",
   "groupMemberFromRow lifted from core, and it goes through pubNameRow");
ok(groupMemberFromRow(null) === null, "and it returns null for an unknown row");

// ---------------------------------------------------------------- the card's own arithmetic
const rosterSrc = (() => {
  const m = app.match(/var _cardRosterIds=([^;]+);/);
  if (!m) { console.error("ANCHOR LOST: _cardRosterIds"); process.exit(1); }
  return m[1];
})();
const membsSrc = (() => {
  const m = app.match(/var membs=_cardRosterIds\.map\((function[\s\S]*?)\);var cardMemCount/);
  if (!m) { console.error("ANCHOR LOST: membs"); process.exit(1); }
  return m[1];
})();

const card = (cl, uid, profiles) => {
  const _cardMem = cl.memberIds || [];
  const _cardIsMod = cl.ownerId === 0 || (cl.moderatorIds || []).indexOf(0) >= 0;
  const _meCardId = cl._db ? uid : 0;
  const _cardProf = {};
  if (cl._db) (profiles || []).forEach((p) => { _cardProf[p.id] = p; });
  const _asCardMember = (id) => (cl._db ? groupMemberFromRow(_cardProf[id]) : (id === 0 ? ME : cById(id)));
  const _cardRosterIds = new Function("_cardMem", "_cardIsMod", "_meCardId", "return " + rosterSrc + ";")(_cardMem, _cardIsMod, _meCardId);
  const mapper = new Function("_asCardMember", "_meCardId", "ME", "Object", "return " + membsSrc + ";")(_asCardMember, _meCardId, ME, Object);
  const membs = _cardRosterIds.map(mapper);
  return { count: membs.length, avatars: membs.slice(0, 5).length, overflow: membs.length > 5 ? membs.length - 5 : 0, membs };
};

// ---------------------------------------------------------------- 1. the DB group
console.log("\n1. A DB GROUP -- uuid member ids, which is what useMyGroups produces");
const uuids = ["u1", "u2", "u3", "u4", "u5", "u6", "u7"].map((x) => `${x}1111111-1111-4111-8111-111111111111`);
const rows = uuids.map((id, i) => ({ id, name: "Climber " + i, username: "c" + i, showName: false, avatar: "" }));
const dbGroup = { _db: true, memberIds: uuids, ownerId: "owner-uuid", moderatorIds: [] };
const dbCard = card(dbGroup, "me-uuid", rows);
console.log(`   header "${dbCard.count} members" | avatars ${dbCard.avatars} | chip +${dbCard.overflow}`);
ok(dbCard.avatars === 5, "a DB group now DRAWS its avatars", `was 0 before the fix`);
ok(dbCard.count === 7, "the header still counts all 7");
ok(dbCard.count === dbCard.avatars + dbCard.overflow,
   "and the count, the faces and the chip agree BY CONSTRUCTION",
   `${dbCard.count} = ${dbCard.avatars} + ${dbCard.overflow}`);
ok(dbCard.membs.every((m) => m && m.name && m.name !== "undefined"), "every member resolved to a name");
ok(dbCard.membs[0].name.startsWith("@"),
   "and through pubNameRow, so a climber who has not opted in keeps their handle",
   dbCard.membs[0].name);

// ---------------------------------------------------------------- 2. the read has not landed
console.log("\n2. THE PROFILES READ HAS NOT LANDED -- the count must not silently shrink");
const loading = card(dbGroup, "me-uuid", []);
console.log(`   header "${loading.count} members" | avatars ${loading.avatars} | chip +${loading.overflow}`);
ok(loading.count === 7, "the header still says 7, because the ids are known even when the names are not");
ok(loading.count === loading.avatars + loading.overflow, "and the three still agree");
ok(loading.membs.every((m) => m.name === "A climber"),
   "an unresolved member renders as a PLACEHOLDER rather than vanishing");

// ---------------------------------------------------------------- 3. non-vacuity: seed group
console.log("\n3. A SEED GROUP -- the same path must still work, or none of this proves anything");
const seed = { _db: false, memberIds: [1, 3, 1002, 1005, 1011, 1019, 1027], ownerId: 1, moderatorIds: [0, 1] };
const seedCard = card(seed, null, null);
console.log(`   header "${seedCard.count} members" | avatars ${seedCard.avatars} | chip +${seedCard.overflow}`);
ok(seedCard.count === 8, "the header counts 7 members plus me -- a moderator not in memberIds");
ok(seedCard.count === seedCard.avatars + seedCard.overflow,
   "and the faces now account for all 8, me included",
   `${seedCard.count} = ${seedCard.avatars} + ${seedCard.overflow}`);
ok(seedCard.membs.some((m) => m && m.id === 0), "my own row is in the LIST, not added to the number");

// ---------------------------------------------------------------- 4. the wiring, as SOURCE
console.log("\n4. THE WIRING -- executing the arithmetic says nothing about what feeds it");
ok(/var cardMemCount=membs\.length;/.test(app),
   "cardMemCount is the length of the list that renders", "not a parallel derivation");
ok(/\{membs\.length>5\?<span/.test(app), "and the overflow chip is counted off that same list");
ok(!/cl\.memberIds\.length>5\?<span/.test(app), "the UNFILTERED chip is gone");
ok(/const grpCardProfilesQ=useProfilesByIds\(_grpCardIds\)/.test(app), "the card list has a profiles query");
ok(/setCreatedGroups\(myGroupsQ\.data\)/.test(app) && /var list=createdGroups\.concat\(GROUPS\)/.test(app),
   "DB groups really do reach this card", "setCreatedGroups(myGroupsQ.data) -> createdGroups.concat(GROUPS)");
ok(/memberIds: active\.map\(\(m\) => m\.user_id\)/.test(db),
   "and useMyGroups fills memberIds with user_id -- a uuid");

// ---------------------------------------------------------------- 5. the organiser
// A rule that only ever resolves MORE is satisfied by naming the wrong person, and that is the
// regression this fix would otherwise have introduced: `_orgName` fell back to membs[0], the
// first MEMBER, reachable only because membs was empty on a DB group. Resolving the roster
// arms it.
console.log("\n5. THE ORGANISER MUST NOT BE NAMED FROM AN ARBITRARY MEMBER");
ok(!/membs\[0\]\?membs\[0\]\.name\.split/.test(app),
   "the membs[0] fallback is gone from _orgName");
ok(/_cardProf\[cl\.ownerId\]/.test(app),
   "the owner is resolved from the same profile map instead");
ok(/:null\)\);var meet=/.test(app),
   "and NULL still means 'we cannot name them' -- the chip is dropped, never guessed");

console.log(`\n${fail ? "FAIL" : "ok"} - ${ran} assertions, ${fail} failed`);
process.exit(fail ? 1 : 0);
