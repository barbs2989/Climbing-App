// A row must not print a level or a trust score for someone who has neither.
//
// Seed climbers carry `level` and enough history for vScore() to mean something. A REAL
// profile carries neither: `level` is undefined and vScore() invents a number from an object
// with no vouches. Concatenated into a subtitle that renders as:
//
//     @quinnfixture
//     undefined · 0
//
// #715 fixed ONE row of this (the friends list) and left the rest. They survived for months
// and were found only by driving a real account through the friend-request screen — which is
// how the same text reappeared in the row that asks you to accept a stranger.
//
// So: any expression that concatenates `vScore(x)` or `x.level` into rendered text must go
// through climberLine(), or be gated on a real-profile check, or be exempt with a measured
// reason. climberLine() is the single honest answer — location · @handle, falling back to
// "On ClimbMatch" rather than to fabricated numbers.
//
//   node scripts/check-real-profile-rows.mjs
//
// Static, so it sits in `npm run build`. It cannot flake and needs no browser.
import fs from "node:fs";
import path from "node:path";
import { appSources } from "./lib/guard-sources.mjs";

const GUARD = "check:real-profile-rows";
const ROOT = process.cwd();
const all = appSources(ROOT, GUARD);
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx"];
for (const f of FILES) {
  if (!all.some((p) => path.basename(p) === f)) {
    console.error(`${GUARD} FAILED — ${f} was not among the app sources, so nothing was scanned.`);
    process.exit(1);
  }
}

// Comments stripped first: the rows fixed by #715 and #868 explain this rule in prose that
// names climberLine, and a scan that read comments would pass on the explanation rather than
// the fix. Offsets preserved so line numbers stay true.
// A comment marker only counts in COMMENT POSITION — preceded by whitespace, a separator, or
// start of file. Without that test this stripper deleted 8% of the app from its own scan, and
// the deletion was silent.
//
// The case that proved it: `accept="image/*"` on the profile editor's photo input. That `/*`
// is a MIME wildcard inside an HTML attribute, and the old stripper read it as a block-comment
// opener and blanked 15,575 characters up to the next `*/` — a region containing the profile
// editor itself. So this guard could not see `"📍 "+(draft.location…)+" · "+draft.level`, which
// rendered "Location · undefined" to every brand-new account until #1031 found it by RENDERING
// the screen instead. Measured: 20 concatenation sites in the app, 19 visible before, 20 now.
//
// Same family as the `//`-in-a-URL trap check:dead-flag-gates records ("a regex strip ate real
// code there"), but a different mechanism — `/*` inside a string, not `//`. Both fail the same
// way: the guard reports a clean sweep over source it never read.
const COMMENT_POS = new Set(["\n", " ", "\t", ";", "{", "}", "(", ")", ",", "="]);
function stripComments(src) {
  let out = "", i = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
    const prev = i === 0 ? "\n" : src[i - 1];
    if (c === "/" && (d === "/" || d === "*") && !COMMENT_POS.has(prev)) { out += c; i++; continue; }
    if (c === "/" && d === "/") { while (i < src.length && src[i] !== "\n") { out += " "; i++; } continue; }
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); const end = e < 0 ? src.length : e + 2; for (let k = i; k < end; k++) out += src[k] === "\n" ? "\n" : " "; i = end; continue; }
    out += c; i++;
  }
  return out;
}

// The defect is TEXT: a level or a trust score concatenated into a string that renders.
// vScore() used for sorting, filtering, or handed to <TrustBadge score={...}> is a different
// question (a badge component can gate on _real, and FullProfile already does) and is not
// what produced "undefined · 0".
const CONCAT = [
  /[A-Za-z_$][\w$]*\.level\s*\+/g,          // c.level + " · " …
  /\+\s*[A-Za-z_$][\w$]*\.level\b/g,        // … + " · " + c.level
  /"\s*\+\s*vScore\(/g,                     // " · " + vScore(c)
  /vScore\([A-Za-z_$][\w$]*\)\s*\+/g,       // vScore(c) + " · " …
];
// A site is fine when the same expression is gated on the object being real, which is what
// #715's fix does — that is a correct answer, not an exemption.
const GATED = /_conn|_real|_profile|climberLine/;

// A value TESTED BEFORE USE is honest by construction and needs no gate on the climber's
// provenance: `draft.level ? " · "+draft.level : ""` cannot render "undefined" whoever the
// object is. Requiring the SAME identifier keeps this tight — an unrelated `other.level?`
// elsewhere in the window must not clear this site.
//
// Without it the guard flags its own fix. #1031 changed a dangling `+" · "+draft.level` into
// exactly this shape, and the first run afterwards reported the corrected line as a defect —
// a guard that flags correct work teaches people to ignore it, which is the one outcome this
// suite cannot afford.
function selfGated(around, obj) {
  const o = obj.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(o + "\\.level\\s*(\\?|&&|\\|\\|)").test(around);
}

const ALLOW = [
  // Each reason MEASURED, not assumed — the collection feeding the row was read before the
  // entry was written. A stale entry fails, so this cannot rot into a description of code
  // that has moved on.
  { key: 'who?" · "+who.level', why: "the seed crew-invite card; `who` comes from cById(rq.climberId) and crewReqIn is seeded — real invites render from myCrewInvitesQ (#734)" },
  { key: '+c.years+"yr · "', why: "PartnerSearch's example card, fed by ALL_CLIMBERS — seed climbers only; real profiles render through RealClimberRow" },
  { key: '" trust · "+cl.level', why: "GuideDashboard is the SEED dashboard; DbGuideDashboard is the DB-backed one and resolves its own profiles" },
  { key: 'cl.years+" yrs · "+cl.level', why: "the same seed GuideDashboard, its inquiry stat grid — same cl, same seed source" },
  // REMOVED, and the removal is worth the note: this exemption read "OPEN_CREWS is seed data and
  // its organiser is always a seed climber", and merging real crews from crew_listings into that
  // same list made the claim false. The site is gated now -- `c._profile ? climberLine(c) :
  // ("Trust "+vScore(c))` -- so it needs no exemption at all. THE GUARD CAUGHT THIS ITSELF, as a
  // STALE entry rather than as a new finding, which is exactly what a reason-carrying exemption is
  // for: it fails when the claim behind it stops being true.
];
const used = new Set();

const findings = [];
let sites = 0;
for (const rel of FILES) {
  const src = stripComments(fs.readFileSync(path.join(ROOT, rel), "utf8"));
  for (const re of CONCAT) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src))) {
      sites++;
      // Read the surrounding expression, not a fixed window either side: the gate and the
      // concatenation can sit a long way apart on these dense lines.
      const from = Math.max(0, m.index - 260), to = Math.min(src.length, m.index + 260);
      const around = src.slice(from, to);
      if (GATED.test(around)) continue;
      const objM = /([A-Za-z_$][\w$]*)\.level\b/.exec(m[0]);
      if (objM && selfGated(around, objM[1])) continue;
      const hit = ALLOW.find((a) => around.includes(a.key));
      if (hit) { used.add(hit.key); continue; }
      const line = src.slice(0, m.index).split("\n").length;
      const key = `${rel}:${line}`;
      if (!findings.some((f) => f.key === key)) findings.push({ key, snippet: around.slice(200, 320).replace(/\s+/g, " ") });
    }
  }
}

// FAIL CLOSED: zero sites means the vocabulary moved or the walk broke, never that the app
// is clean — this app renders trust scores on a dozen screens.
if (!sites) {
  console.error(`${GUARD} FAILED — found NO level/trust concatenations at all across ${FILES.length} file(s).`);
  console.error("That cannot be right; the scan broke.");
  process.exit(1);
}

const stale = ALLOW.filter((a) => !used.has(a.key));
if (stale.length) {
  console.error(`${GUARD} FAILED — ${stale.length} exemption(s) match nothing any more:`);
  stale.forEach((a) => console.error(`    ${a.key}\n        (${a.why})`));
  process.exit(1);
}

if (findings.length) {
  console.error(`${GUARD} FAILED — ${findings.length} row(s) print a level or trust score without checking the climber is a seed one:\n`);
  for (const f of findings) console.error(`  ${f.key}\n      …${f.snippet}\n`);
  console.error('A real profile has no `level` and no vouches, so this renders "undefined · 0".');
  console.error("Use climberLine(c), or gate the expression on _conn/_real/_profile the way the");
  console.error("friends list does. If the object is provably a seed climber, add an exemption");
  console.error("with a measured reason to ALLOW at the top of this script.");
  process.exit(1);
}

console.log(`${GUARD}: ok — ${sites} level/trust concatenation(s), all gated or honest (${ALLOW.length} exempt, each with a reason).`);

// Injection cases (each must FAIL):
//   1. revert any climberLine(c) call to c.level+" · "+vScore(c)   -> named with file:line
//   2. drop the _conn gate from the friends list row                -> named
//   3. delete a live ALLOW entry                                    -> reported as a finding
//   4. add an ALLOW entry matching nothing                          -> reported as stale
//   5. rename vScore / .level in the CONCAT patterns                -> "found NO ... at all"
