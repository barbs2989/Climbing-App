// A crew member's id must never be resolved against the seed CLIMBERS array.
//
// Seed climbers carry integer ids; a DB crew's other members carry uuids, and CLIMBERS.find
// matches a uuid never. The failure does not throw and does not blank the screen — it
// renders a placeholder that reads like a person, or silently drops them:
//
//   #569  a populated crew read "You + 0 climbers"
//   #680  a DB group's own owner got no management controls
//   #715  the friends list rendered "undefined · 0" for a real connection
//   #734  a real crew invite sat under the words "No crew invites"
//   #756  the day-agreement row called a real partner "Climber"
//   #778  the FLOAT PLAN dropped real partners entirely — the screen that records who is
//         on the mountain listed one person out of two — and the trip recap said "Member"
//   #826  a past crew card listed no partners, so "reconnect" could never suggest the
//         person you actually climbed with
//
// Seven rounds, each found by walking one more surface. This asks the question statically,
// across every surface at once.
//
// WHY A SCRIPT AND NOT A COMMENT. #778 shipped the resolver and three fixes; #776 then
// merged from a branch based on pre-#778 main and its squash silently REVERTED all of it —
// clean merge, no conflict, every check green, and main went back to shipping the bugs. The
// only thing that would have noticed was a step in a one-off script nobody runs. This is a
// build gate, so the next such revert fails the build instead of reaching production.
// Same reasoning as check:rappel-readers, which exists for exactly this.
//
//   node scripts/check-crew-member-readers.mjs
import fs from "node:fs";
import path from "node:path";
import { appSources } from "./lib/guard-sources.mjs";

const GUARD = "check:crew-member-readers";
const ROOT = process.cwd();
// Only the two files that render crews. appSources() proves the app was actually read.
const all = appSources(ROOT, GUARD);
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx"];
for (const f of FILES) {
  if (!all.some((p) => path.basename(p) === f)) {
    console.error(`${GUARD} FAILED — ${f} was not among the app sources, so nothing was scanned.`);
    process.exit(1);
  }
}

// Comments are stripped before any test. Two of these call sites explain this very rule in a
// comment that NAMES crewMemberById, so leaving comments in would let a site pass on the
// strength of prose about the fix rather than the fix — the false pass check:rappel-readers
// records. Offsets are preserved so line numbers stay true.
// A comment marker only counts in COMMENT POSITION — preceded by whitespace, a separator, or
// start of file. Without that test a `/*` inside a STRING opens a phantom block comment. The
// case that proved it is `accept="image/*"` on the profile editor's photo input: that MIME
// wildcard blanked 15,575 characters of ClimbMatchCore from check:real-profile-rows and hid a
// live "Location · undefined" bug from it (#1039).
//
// This guard loses NOTHING to it today — measured, 50 CLIMBERS lookups visible either way —
// so this is insurance against the next `/*` in a string, not a repair. The three sibling
// guards that scrub source (check-fire, check-seed-history, check-dead-flag-gates) are already
// immune because they consume string literals BEFORE testing for comment markers; this one
// tested for comments first, which is the whole difference.
const COMMENT_POS = new Set(["\n", " ", "\t", ";", "{", "}", "(", ")", ",", "="]);
function stripComments(src) {
  let out = "", i = 0, n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    const prev = i === 0 ? "\n" : src[i - 1];
    if (c === "/" && (d === "/" || d === "*") && !COMMENT_POS.has(prev)) { out += c; i++; continue; }
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") { out += " "; i++; } continue; }
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); const end = e < 0 ? n : e + 2; for (let k = i; k < end; k++) out += src[k] === "\n" ? "\n" : " "; i = end; continue; }
    out += c; i++;
  }
  return out;
}
const balance = (s, i) => { let d = 0; for (let j = i; j < s.length; j++) { if (s[j] === "(") d++; else if (s[j] === ")") { d--; if (!d) return j; } } return -1; };

// A site is sanctioned when the SAME expression also consults real profiles — that is what
// CrewCard's own `mem` does (the #569 fix), and it is a correct answer, not an exemption.
const FALLBACK = /ProfilesQ|profs\.find|memberProfilesQ|crewMemberById/;

// Exemptions, each with a MEASURED reason. A name here that stops appearing FAILS, so the
// list cannot rot into a description of code that no longer exists.
const ALLOW = [
  { key: "x.id===ci.climberId", why: "crewReqIn is the SEED invite list; real invites render from myCrewInvitesQ (#734), so these ids are always seed integers" },
  { key: "x.id===jr.climberId", why: "crewJoinIn is seeded and never written from the DB — no join request ever carries a uuid" },
  { key: "x.id===jq.climberId", why: "same crewJoinIn list, read again for the unfinished-business dropdown" },
  { key: "cById(rq.climberId)", why: "the seed crew-invite card; the DB invite path resolves its own profiles" },
  { key: "c.id===q.climberId", why: "GuideDashboard is the seed dashboard — DbGuideDashboard is the DB-backed one and resolves separately" },
  { key: "x.id===_t.climberId", why: "a notification's climberId, reached through notifTarget() so the affordance and the click cannot disagree (#1716); the descriptor deliberately keeps the field NAMED climberId so this lookup stays visible to this guard. The result is still guarded by `if(c)`, so a miss opens nothing rather than showing the wrong person" },
];
const used = new Set();

// ---------------------------------------------------------------- SECTION 2
// A SEED RESOLVER PASSED BY REFERENCE, which section 1 cannot see for TWO reasons at once:
// it scans for the literal `cById(` -- a CALL -- and it then filters on `climberId`. The site
// that drew no faces on a real group's card is `cl.memberIds.map(cById)`: a REFERENCE, and an
// id list called memberIds. So a group's roster resolved every uuid to null, the strip
// rendered zero avatars, and the header beside it still said "7 members".
//
// The same trap CLAUDE.md records for `grep "toggleC()"`, which found one call site and
// concluded a collapsed crew card could never be expanded -- the handler was passed by name.
//
// MEASURED BEFORE WIDENING: the whole class is TWO sites across the three app files. This is
// a coverage hole in an existing guard, not a detector for a class of two -- the pattern was
// simply too narrow, and closing it costs one regex.
const BY_REF = /\.(map|filter|find|some|every|flatMap)\(\s*(cById|CLIMBERS\.find|FILLER_CLIMBERS\.find)\s*\)/g;

// NO SCOPING BY THE LIST'S NAME, and its absence is deliberate. A first version required the
// context to say memberIds/roster/climberIds -- and the floor immediately caught it, because
// the OTHER site in the class reads `mutualIds(...).map(cById)` and names none of them. That
// is the too-narrow proxy this whole section exists to close, committed inside the fix for it.
// The honest rule needs no vocabulary: `cById` and CLIMBERS.find resolve a PERSON and nothing
// else, so passing one by reference over any list is a seed resolution of people ids. A site
// that really is seed-only goes in ALLOW_REF with a measured reason.

const ALLOW_REF = [
  {
    key: "mutualIds(",
    why:
      "mutualIds() is a STUB -- it takes no arguments and returns a literal [], so the sheet " +
      "is unreachable and there is no id to resolve. Proven by execution in " +
      "scripts/oneoff/probe-mutual-friends-is-a-stub.mjs, which exits 1 the day it starts " +
      "returning something, so this entry cannot rot into a description of live code.",
  },
];
const usedRef = new Set();
const refFindings = [];
let refSites = 0;

const findings = [];
let scanned = 0, sites = 0;
for (const rel of FILES) {
  const raw = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const src = stripComments(raw);
  scanned++;
  for (const pat of ["CLIMBERS.find(", "FILLER_CLIMBERS.find(", "cById("]) {
    let i = -1;
    while ((i = src.indexOf(pat, i + 1)) >= 0) {
      const end = balance(src, i + pat.length - 1);
      if (end < 0) continue;
      const call = src.slice(i, end + 1);
      // Only calls that resolve a MEMBER id. A lookup keyed on a plain `id` (crewMemberById's
      // own seed branch, for one) is not what this is about.
      if (!/climberId/.test(call)) continue;
      sites++;
      const chain = call + src.slice(end + 1, end + 220);
      if (FALLBACK.test(chain)) continue;
      const hit = ALLOW.find((a) => call.includes(a.key));
      if (hit) { used.add(hit.key); continue; }
      const line = src.slice(0, i).split("\n").length;
      findings.push({ rel, line, call: call.replace(/\s+/g, " ").slice(0, 110) });
    }
  }
  // SECTION 2, over the same comment-stripped source.
  BY_REF.lastIndex = 0;
  let m;
  while ((m = BY_REF.exec(src))) {
    // The expression this reference belongs to: enough to see WHAT is being resolved and
    // whether anything real is consulted alongside. A window, deliberately -- the receiver of
    // a `.map` sits immediately to its left, so there is nothing to resolve through scope.
    const ctx = src.slice(Math.max(0, m.index - 160), m.index + m[0].length + 220);
    refSites++;
    if (FALLBACK.test(ctx)) continue;
    const hit = ALLOW_REF.find((a) => ctx.includes(a.key));
    if (hit) { usedRef.add(hit.key); continue; }
    const line = src.slice(0, m.index).split("\n").length;
    refFindings.push({ rel, line, call: ctx.slice(120).replace(/\s+/g, " ").slice(0, 130) });
  }
}

// FAIL CLOSED. Zero sites means the walk broke or the vocabulary moved — never that the app
// is clean. This guard's realistic failure mode is a green verdict about code it never read.
if (!sites) {
  console.error(`${GUARD} FAILED — scanned ${scanned} file(s) and found NO member-id lookups at all.`);
  console.error("That cannot be right: the crew screens resolve member ids everywhere. The walk broke.");
  process.exit(1);
}

// Section 2's own floor. It is satisfied today by ONE site -- the mutualIds() stub -- and
// that is exactly what makes it a real anchor: if the by-reference scan ever matches nothing,
// the pattern has been narrowed until it cannot fire, which prints identically to a clean app.
if (!refSites) {
  console.error(`${GUARD} FAILED - the by-reference scan matched NO roster resolver at all.`);
  console.error("It should still find mutualIds(...).map(cById). The pattern or ROSTER_ID broke,");
  console.error("and a scan that cannot fire reports a clean app either way.");
  process.exit(1);
}

const staleRef = ALLOW_REF.filter((a) => !usedRef.has(a.key));
if (staleRef.length) {
  console.error(`${GUARD} FAILED - ${staleRef.length} by-reference exemption(s) match nothing:`);
  staleRef.forEach((a) => console.error(`    ${a.key}\n        (${a.why})`));
  process.exit(1);
}

if (refFindings.length) {
  console.error(`${GUARD} FAILED - ${refFindings.length} place(s) pass a SEED resolver by reference over a roster:\n`);
  for (const f of refFindings) console.error(`  ${f.rel}:${f.line}\n      ${f.call}\n`);
  console.error("`.map(cById)` is a REFERENCE, not a call, so section 1's `cById(` pattern walks past it");
  console.error("-- which is how a real group's card came to draw zero avatars under a header saying");
  console.error("\"7 members\". A DB roster carries uuids and cById searches seed CLIMBERS by integer id.");
  console.error("Resolve through the group's profiles query (see _asCardMember), or declare it in");
  console.error("ALLOW_REF with a measured reason.");
  process.exit(1);
}

const stale = ALLOW.filter((a) => !used.has(a.key));
if (stale.length) {
  console.error(`${GUARD} FAILED — ${stale.length} exemption(s) no longer match any code:`);
  stale.forEach((a) => console.error(`    ${a.key}\n        (${a.why})`));
  console.error("\nThe list has rotted. Delete the entry if the site is gone, or update the key.");
  process.exit(1);
}

if (findings.length) {
  console.error(`${GUARD} FAILED — ${findings.length} place(s) resolve a crew member's id against seed data:\n`);
  for (const f of findings) console.error(`  ${f.rel}:${f.line}\n      ${f.call}\n`);
  console.error("A DB crew member carries a uuid, which CLIMBERS/FILLER_CLIMBERS never match, so this");
  console.error("renders a placeholder that reads like a person — or drops them entirely.");
  console.error("Use crewMemberById(id) in ClimbMatch.jsx, or fall back to the member profiles query");
  console.error("the way CrewCard's `mem` does. If the ids really are seed-only, add an exemption");
  console.error("with a measured reason to ALLOW at the top of this script.");
  process.exit(1);
}

console.log(`${GUARD}: ok — ${sites} member-id lookup(s) and ${refSites} by-reference roster resolver(s) across ${scanned} file(s), none resolved against seed data alone (${ALLOW.length} + ${ALLOW_REF.length} exempt, each with a reason).`);

// Injection cases (each must FAIL):
//   1. revert safetyMembers to  members.map(m=>CLIMBERS.find(x=>x.id===m.climberId)).filter(Boolean)
//   2. revert the trip recap to CLIMBERS.find(...)||{name:"Member"}
//   3. revert renderPastCrew's `mates` to the seed lookup
//   4. delete an ALLOW entry whose site still exists  -> reported as a finding
//   5. add an ALLOW entry that matches nothing        -> reported as stale
//   6. break the scan (rename CLIMBERS.find)          -> "found NO member-id lookups at all"
//   7. revert the card to  cl.memberIds.map(cById).filter(Boolean)  -> section 2 names it
//   8. delete ALLOW_REF's mutualIds entry                           -> reported as a finding
//   9. narrow BY_REF so it matches nothing                          -> "cannot fire" floor
//  10. a `.map(cById)` site that ALSO consults real profiles         -> must stay SILENT
