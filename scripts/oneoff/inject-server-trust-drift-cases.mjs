// DOES check:trust-breakdown SECTION 3 ACTUALLY SEE A DRIFTING TRANSCRIPTION?
//
// Section 3 exists because `serverTrustFactors` is a JS copy of `compute_trust_score`'s plpgsql,
// and this repo has been burned four times by a second implementation of one formula drifting from
// the first. Its healthy output is "everything matches", which is also exactly what a broken
// comparison prints — so it is worth nothing until it has been shown to fail.
//
// Each case proves its edit LANDED BY CHECKSUM before judging the guard, and restores the file
// byte-identically afterwards. An injection that produces a different failure is not a catch, so
// every case asserts the failure text names SECTION 3 rather than an assertion above it.
//
// The cases drift the two sides in BOTH directions on purpose: a comparison that only ever reads
// the JS would pass when the MIGRATION moves, which is the case that actually happens — somebody
// re-weights the model in SQL and nothing tells them the panel now lies.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const SQL = path.join(ROOT, "supabase", "migrations", "0038_trust_vouches.sql");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");

const CASES = [
  { name: "js-cap-drift", file: CORE, expect: "fail",
    why: "the JS vouch cap moves to 25 while 0038 still says 20", says: /FAIL\s+SERVER MODEL: Peer vouches/,
    from: 'pts:Math.min(v,20),max:20', to: 'pts:Math.min(v,25),max:25' },
  { name: "js-rate-drift", file: CORE, expect: "fail",
    why: "the JS pays 3 points a belay catch where 0038 pays 2", says: /FAIL\s+SERVER MODEL: Verified belay catches/,
    from: 'pts:Math.min(ct*2,10)', to: 'pts:Math.min(ct*3,10)' },
  { name: "js-divisor-drift", file: CORE, expect: "fail",
    why: "the JS pays a point per 4 logged climbs where 0038 pays one per 5", says: /FAIL\s+SERVER MODEL: Logged climbs/,
    from: 'pts:Math.min(Math.floor(lg/5),15)', to: 'pts:Math.min(Math.floor(lg/4),15)' },
  { name: "sql-reweight", file: SQL, expect: "fail",
    why: "the MIGRATION re-weights vouches to 30 and the JS is not told — the case that actually happens", says: /FAIL\s+SERVER MODEL: Peer vouches/,
    from: "base_score := base_score + least(vouch_count, 20);", to: "base_score := base_score + least(vouch_count, 30);" },
  { name: "sql-cap-reweight", file: SQL, expect: "fail",
    why: "the MIGRATION raises the overall cap and the JS still says 99", says: /FAIL\s+SERVER MODEL: the cap is/,
    from: "return least(base_score, 99);", to: "return least(base_score, 95);" },
  { name: "rows-prop-dropped", file: CORE, expect: "fail",
    why: "TrustBreakdown ignores `rows` and falls back to the client model — a silent revert that changes no number", says: /FAIL\s+the panel does not render the supplied server rows/,
    from: "return <div>{(rows||trustContributions(climber)).map(",
    to:   "return <div>{trustContributions(climber).map(" },
  { name: "gate-derives-its-own-score", file: path.join(ROOT, "ClimbMatch.jsx"), expect: "fail",
    why: "the join gate goes back to deriving vScore — a group's policy enforced on a number the app never shows",
    says: /FAIL\s+groupTrustShortfall derives its own score/,
    from: "  const mine=Number(score);", to: "  const mine=vScore(score);" },

  { name: "one-handler-left-behind", file: path.join(ROOT, "ClimbMatch.jsx"), expect: "fail",
    why: "one of the two byte-identical join handlers keeps the old score, so half the app gates on something else",
    says: /FAIL\s+the join gate reads the displayed score in 1 handler/,
    from: "var _tShort=groupTrustShortfall(cl,myTrustScore);", to: "var _tShort=groupTrustShortfall(cl,vScore(meLive));",
    once: true },

  // MUST STAY SILENT. A comment in the migration that names a different number is documentation:
  // 0038's own header lists component RANGES ("verification (0-20)") that are not the weights, and a
  // guard reading those would fail on the file explaining itself.
  { name: "sql-comment-only", file: SQL, expect: "pass",
    why: "a comment naming other numbers is prose, not a weight",
    from: "-- Vouches: 1 point per unique vouch, capped at 20",
    to: "-- Vouches: 1 point per unique vouch, capped at 20 (was 44 before, and 77 in an older draft)" },

  // ---- SECTION 6: is the bar one a real climber can walk up to? ----
  // Its healthy output is two `ok` lines, which is also what a section that never computed a bound
  // would print, so neither bound is worth anything until it has been made to fire.
  { name: "threshold-above-partnerless-ceiling", file: path.join(ROOT, "ClimbMatch.jsx"), expect: "fail",
    why: "55 restored verbatim — the real historical value, one point above what a climber with no vouches and no catches can reach",
    says: /FAIL\s+GROUP_TRUST_MIN is 55, above the 54/,
    from: "const GROUP_TRUST_MIN=20;", to: "const GROUP_TRUST_MIN=55;" },
  { name: "threshold-at-day-one", file: path.join(ROOT, "ClimbMatch.jsx"), expect: "fail",
    why: "a bar of 5 admits anyone who confirmed an email, so the group promises an exclusivity it does not have",
    says: /FAIL\s+GROUP_TRUST_MIN is 5, which a day-old account scores/,
    from: "const GROUP_TRUST_MIN=20;", to: "const GROUP_TRUST_MIN=5;" },

  // THE BOUND IS DERIVED, AND THIS IS WHAT PROVES IT RATHER THAN 54 BEING TYPED SOMEWHERE. Give the
  // database a definer that can attest a government ID and the 10 points it is already scored at
  // become earnable, the partnerless ceiling rises to 64, and 55 stops being a finding. A guard
  // holding a hardcoded ceiling would still fail here and would be wrong to.
  { name: "id-verification-becomes-earnable", file: SQL, expect: "pass",
    why: "an ID-verification definer lifts the ceiling by itself, so a threshold that was unreachable becomes reachable",
    from: "grant execute on function compute_trust_score(uuid) to authenticated;",
    to: `grant execute on function compute_trust_score(uuid) to authenticated;
create or replace function verify_my_id() returns verification_records
language plpgsql security definer set search_path = public as $$
declare rec verification_records;
begin
  insert into verification_records (user_id, verification_type, status, verified_at)
       values (auth.uid(), 'id', 'verified', now())
  on conflict (user_id, verification_type) do update set status = 'verified' returning * into rec;
  return rec;
end; $$;` },

  // MUST STAY SILENT. The comment above the declaration explains where the number came from and
  // names the one it replaced; a section reading the first match rather than the line-anchored,
  // unique one would take 55 out of that prose and report on a threshold the app does not have.
  { name: "threshold-quoted-in-prose", file: path.join(ROOT, "ClimbMatch.jsx"), expect: "pass",
    why: "a comment quoting the old declaration is documentation, not the declaration",
    from: "const GROUP_TRUST_MIN=20;",
    to: "/* it read `const GROUP_TRUST_MIN=55;` until the scale under it changed */\nconst GROUP_TRUST_MIN=20;" },

  // ---- SECTION 7: can a climber ever be shown the tier the badge names? ----
  // Its healthy output is four `ok` lines, which is also what a section that never read the ladder
  // would print, so none of the four is worth anything until it has been made to fire.
  { name: "tier-above-the-ceiling", file: CORE, expect: "fail",
    why: "90 restored verbatim — the real historical top tier, six points above what ANY climber can reach",
    says: /FAIL\s+"Highly Trusted" needs 90, above the 84/,
    from: "export var TRUST_TIERS={high:70,trusted:45,building:15};",
    to: "export var TRUST_TIERS={high:90,trusted:70,building:50};" },
  { name: "ladder-not-descending", file: CORE, expect: "fail",
    why: '"Trusted" set above "Highly Trusted", so a score between them is called both and neither',
    says: /FAIL\s+the trust ladder is not descending/,
    from: "export var TRUST_TIERS={high:70,trusted:45,building:15};",
    to: "export var TRUST_TIERS={high:40,trusted:45,building:15};" },
  { name: "goal-typed-as-a-literal", file: CORE, expect: "fail",
    why: "the card's goal becomes a fifth number that can drift from the tier it is meant to name — which is how \"goal met\" and \"Highly Trusted\" came to disagree",
    says: /FAIL\s+TRUST_GOAL is 70 rather than TRUST_TIERS\.high/,
    from: "export var TRUST_GOAL=TRUST_TIERS.high;",
    to: "export var TRUST_GOAL=70;" },
  { name: "building-at-day-one", file: CORE, expect: "fail",
    why: 'a rule that only demands the bars come DOWN is satisfied by zeroing them — here "New" stops meaning new',
    says: /FAIL\s+"Building Trust" starts at 5, which a day-old account scores/,
    from: "export var TRUST_TIERS={high:70,trusted:45,building:15};",
    to: "export var TRUST_TIERS={high:70,trusted:45,building:5};" },

  // MUST STAY SILENT. Where the bars sit between the bounds is a product decision, and a guard
  // pinned to today's 70/45/15 would argue with the next re-balance — which is how a guard gets
  // ignored. This one is legitimate: descending, top tier under the ceiling, bottom above day one.
  { name: "legitimate-rebalance", file: CORE, expect: "pass",
    why: "80/50/20 sits inside every bound the section asserts, so a re-balance must not read as a defect",
    from: "export var TRUST_TIERS={high:70,trusted:45,building:15};",
    to: "export var TRUST_TIERS={high:80,trusted:50,building:20};" },

  // MUST STAY SILENT. The comment above the declaration explains where these numbers came from and
  // names the ladder they replaced; a section reading the FIRST match rather than the line-anchored,
  // unique one would take 90/70/50 out of that prose and report on a ladder the app does not have —
  // the same hole section 6 already closed for GROUP_TRUST_MIN.
  { name: "ladder-quoted-in-prose", file: CORE, expect: "pass",
    why: "a comment quoting the old declaration is documentation, not the declaration",
    from: "export var TRUST_TIERS={high:70,trusted:45,building:15};",
    to: "/* it read `TRUST_TIERS={high:90,trusted:70,building:50}` until the scale under it was measured */\nexport var TRUST_TIERS={high:70,trusted:45,building:15};" },

  // MUST STAY SILENT, AND IT IS WHAT PROVES THE CEILING IS DERIVED RATHER THAN 84 BEING TYPED. Ship
  // a definer that can attest a government ID and the 10 points the model already scores it at
  // become earnable, the ceiling rises to 94, and a top tier of 90 stops being a finding. A guard
  // holding a hardcoded ceiling would still fail here and would be WRONG to.
  { name: "id-verification-makes-a-90-tier-legitimate", expect: "pass",
    why: "an ID-verification definer lifts the ceiling by itself, so a tier that was unreachable becomes reachable",
    edits: [
      { file: CORE,
        from: "export var TRUST_TIERS={high:70,trusted:45,building:15};",
        to: "export var TRUST_TIERS={high:90,trusted:70,building:15};" },
      { file: SQL,
        from: "grant execute on function compute_trust_score(uuid) to authenticated;",
        to: `grant execute on function compute_trust_score(uuid) to authenticated;
create or replace function verify_my_id() returns verification_records
language plpgsql security definer set search_path = public as $$
declare rec verification_records;
begin
  insert into verification_records (user_id, verification_type, status, verified_at)
       values (auth.uid(), 'id', 'verified', now())
  on conflict (user_id, verification_type) do update set status = 'verified' returning * into rec;
  return rec;
end; $$;` },
    ] },
];

let pass = 0, fail = 0;
for (const c of CASES) {
  // A CASE MAY SPAN TWO FILES. `id-verification-makes-a-90-tier-legitimate` has to move the ladder
  // AND ship the definer that lifts the ceiling under it — the one case that proves the bound is
  // derived rather than 84 being typed somewhere — and neither half means anything alone.
  const edits = c.edits || [{ file: c.file, from: c.from, to: c.to, once: c.once }];
  const originals = edits.map((e) => ({ text: fs.readFileSync(e.file, "utf8"), sum: sum(e.file) }));
  const restore = () => edits.forEach((e, i) => fs.writeFileSync(e.file, originals[i].text));

  let broken = null;
  for (const [i, e] of edits.entries()) {
    const before = originals[i].text;
    if (!before.includes(e.from)) { broken = `its anchor is not in ${path.basename(e.file)} — the case tests nothing`; break; }
    // A CASE MAY DELIBERATELY EDIT ONE OF TWO IDENTICAL SITES. `one-handler-left-behind` reproduces
    // exactly that defect — half the app gating on a different score — so uniqueness is required
    // unless the case says it means to hit only the first.
    const hits = before.split(e.from).length - 1;
    if (e.once ? hits < 2 : hits !== 1) { broken = `anchor appears ${hits} time(s) in ${path.basename(e.file)} — the edit could land anywhere`; break; }
    fs.writeFileSync(e.file, before.replace(e.from, e.to));
    if (sum(e.file) === originals[i].sum) { broken = `edit did not change ${path.basename(e.file)}`; break; }
  }
  if (broken) { console.log(`  BROKEN CASE ${c.name}: ${broken}`); restore(); fail++; continue; }

  let out = "", code = 0;
  try {
    out = execFileSync("node", [path.join(ROOT, "scripts", "check-trust-breakdown.mjs")],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }
  restore();
  for (const [i, e] of edits.entries()) {
    if (sum(e.file) !== originals[i].sum) { console.log(`  FATAL ${c.name}: restore of ${path.basename(e.file)} was not byte-identical`); process.exit(1); }
  }

  const fired = code !== 0;
  // JUDGED ON THE CASE'S OWN FAILURE TEXT. A first version tested /SERVER MODEL/ against the whole
  // output — which matches the "ok SERVER MODEL: ..." lines too, so it credited any run that merely
  // REACHED section 3, and scored a section-4 failure as a section-3 catch. An injection that
  // produces a different failure is not a catch, and a matcher that cannot tell ok from FAIL cannot
  // tell the difference.
  const saidIt = c.says ? c.says.test(out) : false;
  if (c.expect === "fail") {
    if (fired && saidIt) { console.log(`  CAUGHT  ${c.name} — ${c.why}`); pass++; }
    else if (fired) { console.log(`  WRONG FAILURE ${c.name}: the guard failed, but not with ${c.says} — it broke rather than saw this`); fail++; }
    else { console.log(`  MISSED  ${c.name} — ${c.why}`); fail++; }
  } else {
    if (!fired) { console.log(`  SILENT  ${c.name} — ${c.why}`); pass++; }
    else { console.log(`  FALSE ALARM ${c.name}: the guard flagged correct work — ${c.why}`); fail++; }
  }
}
console.log(`\n${pass}/${CASES.length} case(s) behaved; ${fail} did not.`);
process.exit(fail ? 1 : 0);
