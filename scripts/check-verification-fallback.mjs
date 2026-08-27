// Does email verification survive a failed `verification_records` read?
//
// PROMOTED FROM scripts/oneoff/ AFTER THE FIX IT GUARDS WAS SILENTLY REVERTED. #1256 shipped
// it; #1267 -- a switch-accessibility PR whose subject and body never mention any of this --
// merged from a stale base and put the effect back to its defective form. #1277 restored the
// four outage FLAGS that same squash dropped and missed this, because this revert changed no
// NAME: `myVerificationQ` still exists, the effect still exists, and only its guard clause and
// dependency array went back. `audit:silent-reverts` reports 0 on it and says so in its own
// closing caveat -- it tracks named definitions and whole files, not function bodies.
//
// WHAT ACTUALLY CAUGHT IT WAS THE `ANCHOR LOST` BELOW, run by hand. That is the mechanism that
// works for a BEHAVIOUR revert, and it is worth nothing sitting in scripts/oneoff/ where
// nothing runs it. Hence the promotion: it is static, needs no browser and no database, and
// costs milliseconds, so it belongs in the build chain rather than in a directory of probes
// somebody has to remember.
//
// The defect: App's verification hydration opened `if(!uid||verifHydratedRef.current||
// myVerificationQ.data==null)return;`. That guard is about the DATABASE, and the branch it
// guards is not -- `session.user.email_confirmed_at` comes off the SESSION and needs no query
// at all. So a `verification_records` read that failed for its own reasons left a verified
// climber reading as unverified: Home told them to "Verify to boost your trust", and their own
// resume showed an amber "Unverified" chip. It also blocked `verifyMyEmail()`, the one call that
// would have written the missing record, so the state could not recover for that session.
//
// WHY THE RECORD READ IS REDUNDANT, PROVEN RATHER THAN ASSUMED. 0085's `verify_my_email()` reads
// auth.users itself and raises 'email is not confirmed' unless `email_confirmed_at` is set. So an
// email record with status 'verified' CANNOT exist for an account whose email is unconfirmed. The
// record is derivable from the session; the session is not derivable from the record. That makes
// the session the authority and the record a fallback -- not the other way round.
//
// This needs NO browser and NO database, which is the point: the four cases below include ones
// live data cannot produce on demand (an unconfirmed session, a stale session). The browser guard
// `check:outage ONLY=verification_records` measures the same fix end to end and is the slower,
// broader companion to this.
//
// THE EFFECT IS EXTRACTED FROM `ClimbMatch.jsx`, NEVER COPIED. A copy would agree with the app
// the day it was written and measure a fossil afterwards -- and the whole question here is what
// the shipped code does. `ANCHOR LOST` if either anchor moves.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// scripts/, not scripts/oneoff/ -- one level up since the promotion.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "ClimbMatch.jsx");

const OPEN = "useEffect(function(){if(!uid||verifHydratedRef.current)return;";
const CLOSE = "},[uid,myVerificationQ.data,myVerificationQ.status,session]);";

const src = fs.readFileSync(SRC, "utf8");
const i = src.indexOf(OPEN);
if (i < 0) {
  console.error("ANCHOR LOST: the verification effect's opening no longer reads\n  " + OPEN);
  console.error("");
  console.error("Nothing was measured. Two very different things produce this, and they need");
  console.error("opposite responses:");
  console.error("  * the effect was deliberately refactored -> re-anchor this guard;");
  console.error("  * the effect was REVERTED by a stale-base squash -> restore it. #1267 did");
  console.error("    exactly that to #1256, and audit:silent-reverts cannot see it because no");
  console.error("    NAME changed. Check `git log -S \"myVerificationQ.status\" -- ClimbMatch.jsx`.");
  process.exit(1);
}
const j = src.indexOf(CLOSE, i);
if (j < 0) {
  console.error("ANCHOR LOST: no `" + CLOSE + "` after the effect opened.");
  process.exit(1);
}
const body = src.slice(i + OPEN.length, j);

// Fail closed: an empty or trivially short body means the slice broke, not that the effect is
// simple. Every case below would "pass" against a body that does nothing.
if (body.replace(/\/\*[\s\S]*?\*\//g, "").trim().length < 120) {
  console.error("BROKEN SLICE: extracted only " + body.length + " characters of effect body.");
  process.exit(1);
}

// The free variables the effect closes over, supplied per case. `uid` and `verifHydratedRef` are
// consumed by the anchor itself, so the body sees only these.
const run = new Function("session", "myVerificationQ", "verifHydratedRef", "setVerified",
  "verifyMyEmail", body);

function decide({ confirmed, records }) {
  let verified = false;
  let repairCalled = false;
  const ref = { current: false };
  run(
    confirmed ? { user: { email_confirmed_at: "2026-01-01T00:00:00Z" } } : { user: {} },
    { data: records },
    ref,
    (v) => { verified = v; },
    () => { repairCalled = true; return Promise.resolve(); },
  );
  return { verified, repairCalled };
}

const VERIFIED_ROW = [{ verification_type: "email", status: "verified" }];

const CASES = [
  {
    name: "healthy — session confirmed, record present",
    input: { confirmed: true, records: VERIFIED_ROW },
    verified: true, repair: false,
    why: "Nothing to repair; the record already agrees with the session.",
  },
  {
    name: "OUTAGE — session confirmed, record read FAILED",
    input: { confirmed: true, records: undefined },
    verified: true, repair: true,
    why: "THE DEFECT. `data` is undefined because the query threw. The session alone settles it, "
       + "and the repair write fires -- idempotent by construction, since verify_my_email() is an "
       + "`on conflict do update` upsert sourcing every column from auth.users.",
  },
  {
    name: "stale session — not confirmed, but a verified record exists",
    input: { confirmed: false, records: VERIFIED_ROW },
    verified: true, repair: false,
    why: "The record read stays as a fallback, so this direction is unchanged. A session issued "
       + "before confirmation must not un-verify an account.",
  },
  {
    name: "genuinely unknown — not confirmed, read FAILED",
    input: { confirmed: false, records: undefined },
    verified: false, repair: false,
    why: "Neither source has anything to say, so nothing is claimed. This is the case a flag "
       + "would cover, and it is unreachable while every account's email is confirmed.",
  },
  {
    name: "genuinely unverified — not confirmed, read returned []",
    input: { confirmed: false, records: [] },
    verified: false, repair: false,
    why: "An honest negative: the read succeeded and found nothing.",
  },
];

let bad = 0;
console.log("verification hydration, extracted from ClimbMatch.jsx (" + body.length + " chars)\n");
for (const c of CASES) {
  const got = decide(c.input);
  const ok = got.verified === c.verified && got.repairCalled === c.repair;
  if (!ok) bad++;
  console.log((ok ? "  ok   " : "  FAIL ") + c.name);
  console.log("         verified=" + got.verified + " (want " + c.verified + ")"
    + "  repairCalled=" + got.repairCalled + " (want " + c.repair + ")");
  console.log("         " + c.why + "\n");
}

if (bad) {
  console.error(bad + " case(s) failed.");
  process.exit(1);
}
console.log("ok — a failed verification_records read no longer un-verifies a confirmed account,\n"
  + "     and neither the stale-session fallback nor the honest-negative case moved.");
