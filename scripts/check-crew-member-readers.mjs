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
function stripComments(src) {
  let out = "", i = 0, n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
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
  { key: "x.id===n.climberId", why: "a notification's climberId, and the result is guarded by `if(c)` — a miss opens nothing rather than showing the wrong person" },
];
const used = new Set();

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
}

// FAIL CLOSED. Zero sites means the walk broke or the vocabulary moved — never that the app
// is clean. This guard's realistic failure mode is a green verdict about code it never read.
if (!sites) {
  console.error(`${GUARD} FAILED — scanned ${scanned} file(s) and found NO member-id lookups at all.`);
  console.error("That cannot be right: the crew screens resolve member ids everywhere. The walk broke.");
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

console.log(`${GUARD}: ok — ${sites} member-id lookup(s) across ${scanned} file(s), none resolved against seed data alone (${ALLOW.length} exempt, each with a reason).`);

// Injection cases (each must FAIL):
//   1. revert safetyMembers to  members.map(m=>CLIMBERS.find(x=>x.id===m.climberId)).filter(Boolean)
//   2. revert the trip recap to CLIMBERS.find(...)||{name:"Member"}
//   3. revert renderPastCrew's `mates` to the seed lookup
//   4. delete an ALLOW entry whose site still exists  -> reported as a finding
//   5. add an ALLOW entry that matches nothing        -> reported as stale
//   6. break the scan (rename CLIMBERS.find)          -> "found NO member-id lookups at all"
