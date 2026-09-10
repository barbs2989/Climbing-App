// WHICH VERIFICATIONS CAN A REAL CLIMBER ACTUALLY EARN?
//
// `compute_trust_score` (0038) scores four verification types — email 5, ID 10, and club/guide
// credentials 5 each to a cap of 10 — off `verification_records where status = 'verified'`. Half of
// that, 20 of the model's 104 points, is unreachable: 0085 pinned the INSERT and UPDATE policies so
// a client can only ever write 'pending', and the single definer function that writes 'verified'
// hardcodes one verification_type. `addVerification` in lib/db.js still writes 'pending' and is
// imported by both app files and called by neither.
//
// DERIVED RATHER THAN DECLARED, because a list of unreachable types written down anywhere is a
// claim about the database that goes stale the day somebody ships an ID-verification RPC — and it
// goes stale SILENTLY, in the direction that makes a trust threshold look more attainable than it
// is. Parsing it means that RPC widens the reachable set by itself.
//
// Shared by check:trust-breakdown (which bounds the group-join threshold against what is earnable)
// and scripts/oneoff/measure-group-trust-threshold-candidates.mjs. A second copy of this rule is
// how the guard and the measurement it rests on end up disagreeing.
import fs from "node:fs";
import path from "node:path";

// Statuses are not verification types; a VALUES list holds both as bare literals.
const NOT_A_TYPE = new Set(["verified", "pending", "expired"]);

/**
 * Reads every migration and returns the verification types some definer function can set to
 * 'verified'. Returns { types, scanned } so a caller can fail closed on either being empty —
 * an unreadable directory and a database nobody can verify anything in print the same result.
 */
export function reachableVerificationTypes(migrationsDir) {
  let files = [];
  try {
    files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  } catch {
    return { types: new Set(), scanned: 0 };
  }
  const types = new Set();
  for (const f of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, f), "utf8");
    // The VALUES list is taken to the end of its LINE, never to the first ")": `auth.uid()` closes
    // a paren inside it, so a non-greedy match to ")" captures nine characters and finds nothing.
    // That is a broken scan reading as "no verification is reachable", which would collapse every
    // ceiling computed from this — so it is worth the note rather than the tidier regex.
    const re = /insert\s+into\s+verification_records[\s\S]{0,400}?values\s*\(([^\n]*)\)/gi;
    let m;
    while ((m = re.exec(sql))) {
      if (!/'verified'/.test(m[1])) continue;
      for (const lit of m[1].match(/'([a-z_]+)'/g) || []) {
        const v = lit.slice(1, -1);
        if (!NOT_A_TYPE.has(v)) types.add(v);
      }
    }
  }
  return { types, scanned: files.length };
}

/**
 * The highest score a climber could reach if they never partnered with anybody — no vouch, no
 * belay catch — with every earnable component at full stretch. It is the bound that matters for a
 * threshold labelled "trust": above it, the policy is not measuring trustworthiness but whether
 * somebody else has spoken for you, which is the state every new climber starts in.
 *
 * `scoreOf` is the app's own `serverTrustScore`, passed in rather than re-implemented.
 */
export function partnerlessCeiling(scoreOf, reachable) {
  return scoreOf({
    emailVerified: reachable.has("email"),
    idVerified: reachable.has("id"),
    certCount: (reachable.has("member_club") || reachable.has("guide_certified")) ? 2 : 0,
    tenureDays: 40 * 30,   // past the 20-month cap
    vouches: 0,
    catches: 0,
    logs: 10000,
    reports: 10000,
  });
}

/** What a climber scores on the day they sign up and confirm their email. */
export function dayOneScore(scoreOf, reachable) {
  return scoreOf({ emailVerified: reachable.has("email") });
}

/**
 * The highest score ANY climber can reach, with every earnable component at full stretch and no
 * limit on partners. This is the bound that matters for a NAMED TIER or a stated goal: a tier above
 * it is shown to nobody ever, and a goal above it can never read "goal met" — which is what 90 was
 * against a reachable 84, on a card whose whole purpose is telling a climber how to raise a number.
 *
 * Distinct from `partnerlessCeiling`, which asks a different question (what can you reach ALONE)
 * and is the right bound for a gate that calls itself trust. Both exist; they are not
 * interchangeable, and using the partnerless one here would forbid a tier that is legitimately
 * reachable by a well-vouched climber.
 */
export function earnableCeiling(scoreOf, reachable, cap) {
  const s = scoreOf({
    emailVerified: reachable.has("email"),
    idVerified: reachable.has("id"),
    certCount: (reachable.has("member_club") || reachable.has("guide_certified")) ? 2 : 0,
    tenureDays: 40 * 30,
    vouches: 10000,
    catches: 10000,
    logs: 10000,
    reports: 10000,
  });
  return cap == null ? s : Math.min(s, cap);
}
