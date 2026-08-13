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
function stripComments(src) {
  let out = "", i = 0;
  while (i < src.length) {
    const c = src[i], d = src[i + 1];
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

const ALLOW = [
  // Each reason MEASURED, not assumed — the collection feeding the row was read before the
  // entry was written. A stale entry fails, so this cannot rot into a description of code
  // that has moved on.
  { key: 'who?" · "+who.level', why: "the seed crew-invite card; `who` comes from cById(rq.climberId) and crewReqIn is seeded — real invites render from myCrewInvitesQ (#734)" },
  { key: '+c.years+"yr · "', why: "PartnerSearch's example card, fed by ALL_CLIMBERS — seed climbers only; real profiles render through RealClimberRow" },
  { key: '" trust · "+cl.level', why: "GuideDashboard is the SEED dashboard; DbGuideDashboard is the DB-backed one and resolves its own profiles" },
  { key: 'cl.years+" yrs · "+cl.level', why: "the same seed GuideDashboard, its inquiry stat grid — same cl, same seed source" },
  { key: '{"Trust "+vScore(c)}', why: "OPEN_CREWS organiser chip — OPEN_CREWS is seed data and its organiser is always a seed climber" },
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
