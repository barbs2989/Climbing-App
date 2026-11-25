// The published version of the Terms and Privacy Policy, and the one thing that makes
// "by creating an account you agree to these Terms" mean anything: a record of WHICH text
// an account agreed to.
//
// Bump this whenever either document changes materially. It is a DATE rather than a counter
// so the value is legible in a database row without a lookup table, and it is the same string
// the documents display as their "Last updated", so the version a user sees and the version
// recorded against their account cannot drift.
// 2026-10-08: Community Guidelines added (zero tolerance), account deletion became immediate, and the
// Privacy Policy now discloses automatic screening and how reports and moderation work (0263-0266).
// 2026-10-23: the Privacy Policy discloses the optional gender (0359) and the onboarding location lookup.
// 2026-10-24: the Privacy Policy says partner search can be filtered to climbers of the searcher's own gender.
// 2026-11-04: the Privacy Policy discloses error reports sent from a climber's device (0399).
// 2026-11-18: the Privacy Policy discloses optional pronouns (0475), and that any signed-in climber can filter
// partner search to one or more genders (it was: only to the searcher's own).
// 2026-11-23: the Privacy Policy says a crew's organizer can save where the crew will meet — a name and, if they
// add one, a point on the map (0484) — and who can read it. Same day: it also says a climber can list themselves
// as a partner for one climb (0489), and what signed-in climbers then see.
// Same day again: the list of what a report kept to friends, a crew or Just me shares anonymously now names
// everything it does share -- the nights out and listed camps (0358), the rappels (0508) and the sun vote.
// And once more: crewmates' reports after a crew's day (on time, late, cancelled, didn't show, or called off), who sees
// them and when, the reply, and that other climbers see only counts, which feed the match % (0519, reliability).
// 2026-11-24: the bump those amendments needed. "2026-11-23" was set at 08:39 that morning (#3671), and the Privacy
// Policy then changed four more times under it (#3698, #3700, #3822, #3838 — the last adding crewmates' trip reports),
// so an account that accepted on the 23rd's morning recorded the same version as one that read the reliability text.
// Same shape as the 2026-09-24 F16 finding. Bumped so every account is asked once to accept the text it now governs.
// 2026-11-25: the Privacy Policy says the app no longer asks for or uses an emergency contact (owner, 2026-11-25), and that
// one saved before then is still held, visible only to its owner, until the table is dropped.
export const POLICY_VERSION = "2026-11-25";

// How the documents render it. Kept here beside the version so a bump changes both at once —
// they were separate before, which is how the text came to say "June 2026" indefinitely.
export function policyVersionLabel(v) {
  const s = String(v || POLICY_VERSION);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  const MONTHS = ["January", "February", "March", "April", "May", "June",
                  "July", "August", "September", "October", "November", "December"];
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}
