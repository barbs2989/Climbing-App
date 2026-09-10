/* Does check:profile-claims actually see a trust surface naming a step nobody can take?
 *
 * Sections 3 and 4 both rest on the SAME derived fact -- which verification types some definer can
 * set to 'verified' -- so both halves have to be exercised in both directions: a row that must be
 * gated while a credential is unverifiable, and the SAME row that must come back the day one can.
 * A suite proving only that the guard can fail is satisfied by a guard that fails on everything,
 * which is why three of these must stay SILENT.
 *
 * Every case proves its edit landed BY CHECKSUM, restores the file byte-identically, and is judged
 * on the guard's own FAIL lines -- never on an exit code, and never on text that also appears when
 * an assertion PASSES. The clean run is captured first and any expectation already present in it
 * is refused outright: a case written against the wording of a passing assertion reports MISSED
 * against a guard that is firing correctly, which this repo has done twice.
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APP = path.join(ROOT, "ClimbMatch.jsx");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const SQL = path.join(ROOT, "supabase", "migrations", "0038_trust_vouches.sql");
const GUARD = path.join(ROOT, "scripts", "check-profile-claims.mjs");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");

const TIP_NOW = 'title="Trust score: built from a verified email, time on ClimbMatch, partner vouches, belay catches logged, and climbs and conditions logged. Higher means more proven."';

const CASES = [
  /* THE REAL DEFECT, restored verbatim. Under "Raise it with:" this told a signed-in climber to do
     something that cannot move the number above it -- and the guard used to DEMAND this shape. */
  { name: "cert-row-ungated", file: APP, expect: "fail",
    why: 'the row goes back to unconditional while nothing can verify a credential',
    says: /UNCONDITIONAL while nothing in the app can verify a credential/,
    from: '["Add a cert",openEdit,!uid]]', to: '["Add a cert",openEdit]]' },

  /* Gated, but on the wrong thing. `!verified` hides the row from a climber who confirmed an email
     and shows it to everyone else -- which has nothing to do with which trust model is on screen. */
  { name: "cert-row-gated-on-the-wrong-thing", file: APP, expect: "fail",
    why: "the row is gated on email verification rather than on which model the card is showing",
    says: /does not turn on the signed-in model/,
    from: '["Add a cert",openEdit,!uid]]', to: '["Add a cert",openEdit,!verified]]' },

  /* THE CASE THAT PROVES THE RULE IS DERIVED RATHER THAN TYPED, and it is the mirror of the silent
     one in inject-server-trust-drift-cases. Give the database a definer that can attest a guide
     credential and "Add a cert" becomes true advice again -- so the guard must now object to the
     GATE. A rule holding a hardcoded "certs are impossible" would stay quiet here and be wrong. */
  { name: "credential-becomes-verifiable", file: SQL, expect: "fail",
    why: "a definer can now attest a credential, so gating the row hides advice that would work",
    says: /a credential CAN now be verified/,
    from: "grant execute on function compute_trust_score(uuid) to authenticated;",
    to: `grant execute on function compute_trust_score(uuid) to authenticated;
create or replace function verify_my_guide_cert() returns verification_records
language plpgsql security definer set search_path = public as $$
declare rec verification_records;
begin
  insert into verification_records (user_id, verification_type, status, verified_at)
       values (auth.uid(), 'guide_certified', 'verified', now())
  on conflict (user_id, verification_type) do update set status = 'verified' returning * into rec;
  return rec;
end; $$;` },

  /* Over-reach in the other direction: logging a climb raises the score whatever else is true, so
     a guard that only ever demanded MORE gating would drive exactly this. */
  { name: "log-a-route-gated", file: APP, expect: "fail",
    why: "gating the one row that always works removes advice that is never wrong",
    says: /"Log a route" gained a condition/,
    from: '[["Log a route",()=>setLogPickOpen(true)]', to: '[["Log a route",()=>setLogPickOpen(true),!verified]' },

  /* The badge tooltip's own half of the same defect, restored. */
  { name: "tooltip-names-certifications", file: CORE, expect: "fail",
    why: "the tooltip names certifications as what builds the score, and nothing can verify one",
    says: /names certifications as what builds the score/,
    from: TIP_NOW,
    to: 'title="Trust score: built from partner vouches, belay catches logged, climbs logged and certifications. Higher means more proven."' },

  /* NON-VACUITY. Every "must not name" assertion above is satisfied by an empty tooltip, so a
     rewrite that stops over-claiming by saying nothing has to fail too. */
  { name: "tooltip-emptied", file: CORE, expect: "fail",
    why: "the tooltip stops naming anything a climber can move — corrected by deletion",
    says: /emptied rather than corrected/,
    from: TIP_NOW, to: 'title="Trust score. Higher means more proven."' },

  /* A hand-typed scale bound is a hand-copy: the model caps at 99 and only 84 of its 104 points can
     be earned, so any literal range here is a number nobody re-derives. */
  { name: "tooltip-hardcoded-range", file: CORE, expect: "fail",
    why: "the tooltip states a literal range again",
    says: /states a hardcoded range/,
    from: 'title="Trust score: built from', to: 'title="Trust score (0-99): built from' },

  /* MUST STAY SILENT. Section 4 asks whether the tooltip names an unreachable input and whether it
     still names reachable ones — not whether it is phrased one particular way. A guard pinned to
     today's sentence would forbid improving it. */
  { name: "tooltip-reworded", file: CORE, expect: "pass",
    why: "a differently-worded tooltip naming the same earnable inputs is ordinary editorial work",
    from: TIP_NOW,
    to: 'title="Your trust score grows with vouches from partners, belay catches you log, the climbs and conditions you record, and a confirmed email."' },

  /* MUST STAY SILENT. Section 3 reads the list through Babel, so a comment quoting the old
     unconditional entry is invisible to it. Three checkers in this repo have been fooled by the
     comment written to explain the very fix they were checking. */
  { name: "comment-quoting-the-old-row", file: APP, expect: "pass",
    why: "a comment quoting the pre-fix entry is documentation, not the entry",
    from: '["Add a cert",openEdit,!uid]]',
    to: '["Add a cert",openEdit,!uid]/* it read ["Add a cert",openEdit] until the card changed model */]' },

  /* MUST STAY SILENT. Adding an unrelated row is ordinary work; only the two the rule names are
     constrained. */
  { name: "unrelated-row-added", file: APP, expect: "pass",
    why: "a new row nothing in the rule names is ordinary work",
    from: '["Add a cert",openEdit,!uid]]',
    to: '["Add a cert",openEdit,!uid],["Add a photo",openEdit]]' },
];

/* The clean run, so a case cannot be written against text that is already there. */
let clean = "";
try {
  clean = execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch (e) {
  console.log("REFUSING TO RUN: the guard is not green on an unmodified tree, so no case is attributable.");
  console.log(((e.stdout || "") + (e.stderr || "")).split("\n").filter((l) => /FAIL/.test(l)).join("\n"));
  process.exit(1);
}
for (const c of CASES) {
  if (c.says && c.says.test(clean)) {
    console.log(`REFUSING TO RUN: ${c.name}'s expectation ${c.says} already matches the CLEAN run — it would pass against a broken guard.`);
    process.exit(1);
  }
}

let pass = 0, bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  const hits = before.split(c.from).length - 1;
  if (hits !== 1) {
    console.log(`  BROKEN CASE ${c.name}: anchor appears ${hits} time(s) — the edit could land anywhere`);
    bad++; continue;
  }
  fs.writeFileSync(c.file, before.replace(c.from, c.to));
  if (sum(c.file) === beforeSum) {
    console.log(`  BROKEN CASE ${c.name}: the edit did not change the file`);
    fs.writeFileSync(c.file, before); bad++; continue;
  }

  let out = "", code = 0;
  try {
    out = execFileSync("node", [GUARD], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }

  fs.writeFileSync(c.file, before);
  if (sum(c.file) !== beforeSum) { console.log(`  FATAL ${c.name}: restore was not byte-identical`); process.exit(1); }

  /* FAIL LINES ONLY. The guard prints the same nouns on its ok lines, so matching the whole output
     would credit a run that merely REACHED the section. */
  const failText = out.split("\n").filter((l) => /FAIL/.test(l)).join("\n");
  const fired = code !== 0;
  const saidIt = c.says ? c.says.test(failText) : false;

  if (c.expect === "fail") {
    if (fired && saidIt) { console.log(`  CAUGHT  ${c.name} — ${c.why}`); pass++; }
    else if (fired) { console.log(`  WRONG FAILURE ${c.name}: it failed, but not with ${c.says} — it broke rather than saw this`); bad++; }
    else { console.log(`  MISSED  ${c.name} — ${c.why}`); bad++; }
  } else {
    if (!fired) { console.log(`  SILENT  ${c.name} — ${c.why}`); pass++; }
    else { console.log(`  FALSE ALARM ${c.name}: the guard flagged correct work — ${c.why}`); console.log(failText); bad++; }
  }
}
console.log(`\n${pass}/${CASES.length} case(s) behaved; ${bad} did not.`);
process.exit(bad ? 1 : 0);
