// The published version of the Terms and Privacy Policy, and the one thing that makes
// "by creating an account you agree to these Terms" mean anything: a record of WHICH text
// an account agreed to.
//
// Bump this whenever either document changes materially. It is a DATE rather than a counter
// so the value is legible in a database row without a lookup table, and it is the same string
// the documents display as their "Last updated", so the version a user sees and the version
// recorded against their account cannot drift.
export const POLICY_VERSION = "2026-09-03";

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
