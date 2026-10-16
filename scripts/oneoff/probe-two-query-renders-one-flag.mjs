#!/usr/bin/env node
// AN OUTAGE FLAG KEYED ON ONE QUERY, WHERE THE RENDER DEPENDS ON TWO.
//
// The belay ledger is hydrated from `myCatchesQ` (the rows) AND `catchFriendProfilesQ` (the names).
// Its effect opens:
//
//     if (!uid || !myCatchesQ.data || catchesHydratedRef.current) return;
//     if (catchFriendIds.length && !catchFriendProfilesQ.data) return;
//
// A failed query's `.data` stays undefined, so if the ROWS load and the PROFILES fail, that second
// line returns forever, `catchesHydratedRef` is never set, and the ledger stays empty. Meanwhile
//
//     catchesUnavailable = !!(uid && myCatchesQ && myCatchesQ.isError)
//
// keys on the FIRST query only, so it is FALSE. `CatchLedger` renders `unavailable ? "—" : v`, so
// the card shows 0 catches as a measurement and invites the climber to go log one — which is
// word for word what that component's own comment says the flag exists to prevent:
//
//     "without it this card tells a climber who has caught falls that they have caught none,
//      and invites them to go log one"
//
// reached here through a DIFFERENT query failing.
//
// NO BROWSER AND NO DATABASE: the input (one query up, one query down) is not something live data
// produces on demand. The predicates are LIFTED FROM SOURCE with ANCHOR LOST rather than retyped —
// a copy would agree with itself whatever the app did.
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
// A guard clause is a complete statement, so it is matched EXACTLY and confirmed unique rather
// than sliced to the next `return;` — the anchor already ends in one, so slicing ran on to the
// next statement's and swallowed hundreds of lines. Exact-match is not a "copy that drifts": if
// the source changes by one character this fails closed with ANCHOR LOST.
function exact(stmt) {
  const n = SRC.split(stmt).length - 1;
  if (n !== 1) lost(`${stmt}  (found ${n} times, expected 1)`);
  return stmt;
}
function lift(anchor, endAt) {
  const i = SRC.indexOf(anchor);
  if (i < 0) lost(anchor);
  const j = SRC.indexOf(endAt, i + anchor.length);
  if (j < 0) lost(`end of ${anchor}`);
  return SRC.slice(i, j + endAt.length);
}

// The two guard clauses that decide whether the ledger hydrates at all.
const GUARD_A = exact("if(!uid||!myCatchesQ.data||catchesHydratedRef.current)return;");
const GUARD_B = exact("if(catchFriendIds.length&&!catchFriendProfilesQ.data)return;");
// The flag, exactly as declared.
const FLAG = lift("catchesUnavailable=", ";");

console.log("lifted from ClimbMatch.jsx:");
console.log("  guard A: " + GUARD_A);
console.log("  guard B: " + GUARD_B);
console.log("  flag   : " + FLAG + "\n");

// Does the effect reach its body, and what does the flag say, for a given pair of query states?
function evaluate({ rowsError, profilesError, friendIds }) {
  const q = (err, data) => ({ isError: err, data: err ? undefined : data });
  const myCatchesQ = q(rowsError, [{ id: "c1" }]);
  // MODEL THE QUERY'S OWN `enabled`, or the fixture manufactures a state that cannot occur.
  // `useProfilesByIds` is `enabled: !!supabase && !!key` with `key = ids.join(",")`, so with no ids
  // it never runs and a disabled react-query stays pending — `isError` is false. Letting the
  // fixture set profilesError with an empty id list made a correct fix look over-eager, which is
  // the same "check the fixture before changing the app" trap as the seed-climber levels.
  const profilesEnabled = friendIds.length > 0;
  const catchFriendProfilesQ = q(profilesEnabled && profilesError, [{ id: "f1", name: "Robin" }]);
  const catchesHydratedRef = { current: false };
  const uid = "u1";
  const catchFriendIds = friendIds;
  let hydrated = false;
  // eslint-disable-next-line no-new-func
  const body = new Function("uid", "myCatchesQ", "catchFriendProfilesQ", "catchesHydratedRef", "catchFriendIds",
    `${GUARD_A} ${GUARD_B} return true;`);
  hydrated = !!body(uid, myCatchesQ, catchFriendProfilesQ, catchesHydratedRef, catchFriendIds);
  // eslint-disable-next-line no-new-func
  const flag = new Function("uid", "myCatchesQ", "catchFriendProfilesQ",
    `var ${FLAG}; return catchesUnavailable;`)(uid, myCatchesQ, catchFriendProfilesQ);
  return { hydrated, flag };
}

const CASES = [
  { name: "both queries healthy", rowsError: false, profilesError: false, friendIds: ["f1"], wantHydrated: true, wantFlag: false },
  { name: "ROWS read failed — the case the flag was written for", rowsError: true, profilesError: false, friendIds: ["f1"], wantHydrated: false, wantFlag: true },
  { name: "PROFILES read failed, rows fine — was the gap", rowsError: false, profilesError: true, friendIds: ["f1"], wantHydrated: false, wantFlag: true },
  { name: "profiles failed but no friend ids to resolve", rowsError: false, profilesError: true, friendIds: [], wantHydrated: true, wantFlag: false },
];

console.log("case                                                    hydrates  flag says broken  verdict");
for (const c of CASES) {
  const r = evaluate(c);
  // The screen is HONEST when it either hydrates, or admits the failure.
  const honest = r.hydrated || r.flag;
  const ok = r.hydrated === c.wantHydrated && r.flag === c.wantFlag;
  if (!ok) bad++;
  console.log("  " + c.name.padEnd(54) + String(r.hydrated).padEnd(10) + String(r.flag).padEnd(18) +
    (ok ? "ok" : "** WRONG"));
  if (!honest) console.log("        ** the ledger stays empty AND the flag says nothing is wrong — it renders 0 catches as a measurement");
}

console.log("");
if (bad) {
  console.log(`${bad} case(s) not as specified.`);
  process.exit(1);
}
console.log("ok — the flag is true whenever the ledger cannot hydrate, so it can never present a");
console.log("     failed read as a count of zero.");
