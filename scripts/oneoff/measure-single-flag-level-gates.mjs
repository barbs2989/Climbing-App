// Which level/trust rows are gated on ONE flag, over a collection that can contain ME?
//
// #1355 fixed a group Members row that printed "undefined · 0" under a climber's own handle. The
// row was gated on `c._profile`, and check:real-profile-rows PASSED it — its GATED test is
// /_conn|_real|_profile|climberLine/, so any ONE of those satisfies it.
//
// That gate is sound for the case it was written for (a DB-derived friend, which carries _profile)
// and unsound for ME. Under a real session ME is the signed-in climber: id 0, no seed `level`, and
// none of the three flags. So any row that gates on a flag ME does not carry, over a collection ME
// can appear in, prints a level ME does not have.
//
// An instance fixed by hand is not a class closed. This asks how many more there are, before
// deciding whether to widen the guard — audit:area-parents' standing lesson is that a detector
// shipped before its class is sized spends its precision on noise.
//
// Static. No DB, no browser.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

/* Comments are stripped first. check:real-profile-rows records why: the code now EXPLAINS this rule
   in prose that names _profile and climberLine, and a scan reading comments would classify the
   explanation as a gate. One stateful pass, offsets preserved, so line numbers stay true. */
function blank(src) {
  let out = "", i = 0, n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") { out += " "; i++; } continue; }
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); const end = e < 0 ? n : e + 2; for (let k = i; k < end; k++) out += src[k] === "\n" ? "\n" : " "; i = end; continue; }
    out += c; i++;
  }
  return out;
}

// A rendered level/trust pair: `x.level` concatenated with vScore(x).
/* The guard's OWN four needles, not a narrower one. A first version of this measurement used a
   single pattern (`x.level + "…" + vScore(x)`) and found 2 sites where the guard finds 18 — so it
   was measuring a subset and calling it a class. Copying the guard's set is the point: the question
   is which of ITS sites are singly-gated, and a different needle cannot answer that. */
const CONCAT = [
  /[A-Za-z_$][\w$]*\.level\s*\+/g,
  /\+\s*[A-Za-z_$][\w$]*\.level\b/g,
  /"\s*\+\s*vScore\(/g,
  /vScore\([A-Za-z_$][\w$]*\)\s*\+/g,
];
const FLAGS = ["_conn", "_real", "_profile"];

let total = 0;
const rows = [];
for (const f of FILES) {
  let src;
  try { src = blank(fs.readFileSync(path.join(ROOT, f), "utf8")); } catch { continue; }
  /* DEDUPE BY SITE, NOT BY MATCH, and this is the correction that changed the answer.
     The four needles overlap: `c.level + " · " + vScore(c)` matches three of them at three
     DIFFERENT offsets, so an offset-keyed Set still counted one expression three times. The first
     run reported "3 gated on exactly ONE flag" when the truth is ONE site — a 3x inflation of the
     very class being sized. [[a-count-is-only-as-good-as-its-tokeniser]]
     Two matches within 120 characters are one expression; these files have no line structure to
     cluster on, so proximity is the only available key. */
  const hits = [];
  for (const re of CONCAT) for (const m of src.matchAll(re)) hits.push(m);
  hits.sort((a, b) => a.index - b.index);
  const kept = [];
  for (const m of hits) if (!kept.length || m.index - kept[kept.length - 1].index > 120) kept.push(m);
  for (const m of kept) {
    total++;
    const at = m.index;
    const line = src.slice(0, at).split("\n").length;
    // The gate is whatever guards this expression. These files pack thousands of characters onto one
    // line, so scope by CHARACTER WINDOW back from the match — the ternary test sits immediately
    // before it in every case, which is why a window works here and would not for a whole statement.
    const before = src.slice(Math.max(0, at - 260), at);
    const gates = FLAGS.filter(fl => before.includes(fl));
    rows.push({ file: f, line, gates, expr: m[0], before: before.slice(-150) });
  }
}

if (!total) { console.error("FAIL — no level/vScore concatenation found; the needle broke"); process.exit(1); }

console.log(`${total} rendered level·trust concatenation(s) across ${FILES.length} file(s).\n`);

const single = rows.filter(r => r.gates.length === 1);
const none = rows.filter(r => r.gates.length === 0);
const multi = rows.filter(r => r.gates.length > 1);

console.log(`   ${multi.length} gated on more than one flag`);
console.log(`   ${single.length} gated on exactly ONE flag  <- the #1355 shape`);
console.log(`   ${none.length} with no flag in range (exempt, or reached via climberLine)\n`);

for (const r of single) {
  console.log(`ONE FLAG (${r.gates[0]})  ${r.file}:${r.line}`);
  console.log(`   …${r.before.replace(/\s+/g, " ")}`);
  console.log(`   ${r.expr}\n`);
}
for (const r of none) {
  console.log(`NO FLAG            ${r.file}:${r.line}`);
  console.log(`   …${r.before.replace(/\s+/g, " ")}`);
  console.log(`   ${r.expr}\n`);
}

console.log(`VERDICT — THE CLASS IS CLOSED, AND check:real-profile-rows IS NOT WIDENED.

A single flag is not automatically wrong. It is wrong only where ME can appear in the collection
being rendered, and ME carries none of the three flags. Every site above was read:

  ONE FLAG  ClimbMatchCore.jsx  the friends list, gated on _conn — the #715 fix, and CORRECT:
                               you are not in your own friends list, so ME never reaches it.
  NO FLAG   ClimbMatch.jsx      "X wants to join", where who = cById(rq.climberId). cById resolves
                               against the seed CLIMBERS array ONLY, so who always has a level.
                               This is the guard's own documented crewReqIn exemption.
  NO FLAG   the rest           the guard's four other measured exemptions, plus sites where the
                               level is already ternary-gated (climber.level ? …).

So #1355 was the ONE live instance, and there is no second.

WIDENING THE GUARD WOULD MAKE IT WORSE. The obvious tightening — require the else-branch of a
_profile/_conn gate to go through climberLine — would have caught #1355 and would flag the friends
list, which is correct code implementing this repo's own recorded fix. That is one false positive
to catch zero remaining defects, and a guard that flags correct work is one people learn to ignore.

What cannot be decided statically, and is the real reason the guard let #1355 through: whether ME
is in the collection being rendered. That needs the data, not the source.`);
