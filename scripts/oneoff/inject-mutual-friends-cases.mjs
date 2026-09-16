// Injection cases for check:mutual-friends.
//
// The healthy output is a column of "ok", which is also what a guard asserting nothing prints.
// Each case reverts ONE property, proves the edit landed BY CHECKSUM, restores the file
// byte-identically, and is judged on the guard's OWN FAILURE TEXT — several cases perturb more
// than one assertion, so an exit status cannot tell them apart.
//
// EVERY `must` MATCHES A FAILURE MESSAGE, NEVER THE TEXT AN ASSERTION PRINTS WHEN IT PASSES.
// The harness refuses any expectation that appears in the CLEAN run, which is the structural
// form of a mistake CLAUDE.md records three times.
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";

const NL = String.fromCharCode(10);
const sum = (s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);
const run = () => {
  try { return { out: execSync("npm run check:mutual-friends 2>&1", { encoding: "utf8" }), code: 0 }; }
  catch (e) { return { out: String(e.stdout || "") + String(e.stderr || ""), code: e.status || 1 }; }
};

const MIG = "supabase/migrations/0182_mutual_friends_needs_a_definer.sql";

const CASES = [
  {
    file: "ClimbMatchCore.jsx", name: "stub-restored",
    why: "the historical defect: mutualIds returns [] whatever it is asked, so every consumer's " +
         "`count ? control : null` draws nothing and the sheet has no reachable entry point",
    edit: (s) => s.replace(
      "function mutualsFor(id,mutuals){return (mutuals&&mutuals[id])||[];}",
      "function mutualsFor(id,mutuals){return [];}"),
    expect: "fail", must: /the count is the length of the list that renders/,
  },
  {
    file: "ClimbMatchCore.jsx", name: "seed-name-resolution",
    why: "names resolved against the seed CLIMBERS array again — an integer-keyed lookup that " +
         "returns nothing for a uuid, so every mutual friend would silently lose their name",
    edit: (s) => s.replace(
      "function mutualFirstNames(id,mutuals){return mutualsFor(id,mutuals).map(pubFirst).filter(Boolean);}",
      "function mutualFirstNames(id,mutuals){return mutualsFor(id,mutuals).map(function(c){var f=CLIMBERS.find(function(x){return x.id===c.id;});return f?f.name.split(\" \")[0]:null;}).filter(Boolean);}"),
    expect: "fail", must: /resolved against the seed CLIMBERS array|names rendered are that same list/,
  },
  {
    file: "ClimbMatchCore.jsx", name: "bare-name-not-pubFirst",
    why: "the real name is published whatever the climber set show_name to — the 'named the way " +
         "they asked' defect that has already caught four mappings",
    edit: (s) => s.replace(
      "function mutualFirstNames(id,mutuals){return mutualsFor(id,mutuals).map(pubFirst).filter(Boolean);}",
      "function mutualFirstNames(id,mutuals){return mutualsFor(id,mutuals).map(function(c){return (c.name||\"\").split(\" \")[0];}).filter(Boolean);}"),
    expect: "fail", must: /handle, not their real name|real name absent entirely|through pubFirst/,
  },
  {
    file: "ClimbMatch.jsx", name: "ask-set-unfiltered",
    why: "seed INTEGER ids reach a uuid[] RPC, which PostgREST answers with a 400 — so this does " +
         "not degrade for the seed rows, it takes mutual friends down for every real account too",
    edit: (s) => s.replace('if(typeof c.id==="string")s[c.id]=1;', "s[c.id]=1;"),
    expect: "fail", must: /asks only about uuids/,
  },
  {
    file: "ClimbMatch.jsx", name: "prop-dropped-at-one-call-site",
    why: "App stops handing FullProfile the map, so that ONE screen quietly reports nobody while " +
         "every other screen is fine. Neither direction of check:dead-props sees it",
    edit: (s) => s.replace("vouched={!!givenVouches.some(v=>v._targetId===profileModal.id)} mutuals={mutuals}",
      "vouched={!!givenVouches.some(v=>v._targetId===profileModal.id)}"),
    expect: "fail", must: /App hands FullProfile the map/,
  },
  {
    file: MIG, name: "block-clause-dropped",
    why: "a climber who blocked you becomes readable through this side door — 0095 closed that on " +
         "the profile read and this would re-open it one function over",
    edit: (s) => s.replace("    and not profile_owner_blocked_me(t.oid)", "    and true"),
    expect: "fail", must: /blocked you is not readable/,
  },
  {
    file: MIG, name: "search-path-public-only",
    why: "`set search_path = public` READS AS PINNED AND IS NOT: Postgres searches pg_temp first " +
         "unless pg_temp is named, so a caller can shadow `connections` with a temp table",
    // split/join rather than replace: the FIRST occurrence is in the migration's own header,
    // so a string replace moved the checksum and left the function untouched -- the case
    // reported MISSED against a guard that was right.
    edit: (s) => s.split("set search_path = public, pg_temp").join("set search_path = public"),
    expect: "fail", must: /pg_temp named in search_path/,
  },
  {
    file: MIG, name: "anon-grant-restored",
    why: "execute left with anon. Harmless today because auth.uid() is null for a signed-out " +
         "caller, but 'it happens to return nothing' is the wrong footing for a definer",
    edit: (s) => s.replace("revoke all on function mutual_connections(uuid[]) from anon;", ""),
    expect: "fail", must: /revoked from anon/,
  },
  {
    file: "ClimbMatch.jsx", name: "SILENT-comment-quoting-the-old-shape",
    why: "MUST STAY SILENT, and this is the case that pays for parsing rather than stripping: a " +
         "comment naming CLIMBERS.find and connections.map(x=>x.id) is documentation. The first " +
         "version of this guard blanked comments with a regex, ate 23.7% of this file, and " +
         "reported a correctly-wired call site as missing",
    // Anchored on the bare statement, NOT on a line with leading whitespace: the indentation
    // moved under a rebase and check:injection-anchors reported this ROTTED. An anchor that
    // matches nothing proves nothing -- the guard still prints ok with the rule unexercised.
    edit: (s) => s.replace("const myConnQ=useMyConnections(uid);",
      "/* NOT: mutualCount(c.id,connections.map(x=>x.id)), and NOT CLIMBERS.find — see 0182. */" + NL +
      "const myConnQ=useMyConnections(uid);"),
    expect: "pass",
  },
  {
    file: "ClimbMatch.jsx", name: "SILENT-renamed-local",
    why: "MUST STAY SILENT — renaming a local inside the memo is ordinary work, and a guard that " +
         "fired on it would pin an implementation detail rather than the promise",
    edit: (s) => s.replace("var res=raw[k].map(", "var resolved=raw[k].map(")
                  .replace("if(res.length)out[k]=res;", "if(resolved.length)out[k]=resolved;"),
    expect: "pass",
  },
];

const clean = run();
if (clean.code !== 0) { console.error("REFUSING: the guard is not green on an unmodified tree." + NL + clean.out); process.exit(1); }
// THE USUAL "REFUSE AN EXPECTATION THAT MATCHES THE CLEAN RUN" GUARD IS INVERTED HERE, AND
// THE REASON IS A PROPERTY OF check:mutual-friends RATHER THAN A WEAKENING.
//
// That guard prints the SAME LABEL on its ok line and its FAIL line ("  ok   X" / "  FAIL X"),
// so every legitimate expectation appears in a green run and the blanket refusal rejects all
// of them -- it fired on the first case here and would have rejected the whole suite.
// CLAUDE.md records exactly this situation and prescribes the mechanism that does work:
// MATCH FAIL LINES ONLY, which the verdict below does.
//
// So the check is turned round into one that still catches the real mistake. A typo'd or
// invented expectation matches NOTHING anywhere; a valid one names an assertion that exists
// and is normally green. Requiring it to appear among the clean run's ok lines proves the
// case is aimed at a real assertion, and requiring it in the injected run's FAIL lines proves
// that assertion is what fired.
const cleanOks = clean.out.split(NL).filter((l) => l.trim().startsWith("ok")).join(NL);
for (const c of CASES) {
  if (c.expect === "fail" && !c.must.test(cleanOks)) {
    console.error("REFUSING: " + c.name + "'s expectation " + c.must + " names no assertion this guard makes.");
    process.exit(1);
  }
}

let bad = 0;
for (const c of CASES) {
  const orig = fs.readFileSync(c.file, "utf8");
  const before = sum(orig);
  const mut = c.edit(orig);
  const landed = sum(mut) !== before;
  let r = { out: "", code: 0 };
  try { fs.writeFileSync(c.file, mut); r = run(); }
  finally { fs.writeFileSync(c.file, orig); }
  const restored = sum(fs.readFileSync(c.file, "utf8")) === before;
  const failed = r.code !== 0;
  const wanted = c.expect === "fail";
  const failLines = r.out.split(NL).filter((l) => l.includes("FAIL")).join(NL);
  let verdict;
  if (!landed) verdict = "EDIT NEVER LANDED";
  else if (failed !== wanted) verdict = wanted ? "MISSED" : "FIRED WHEN IT SHOULD BE SILENT";
  else if (wanted && !c.must.test(failLines)) verdict = "WRONG FAILURE";
  else verdict = "ok";
  if (verdict !== "ok") bad++;
  console.log("  " + verdict.padEnd(30) + " " + c.name.padEnd(34) + " landed=" + landed + " restored=" + restored + " guard=" + (failed ? "fail" : "pass") + " (want " + c.expect + ")");
  console.log("      " + c.why);
}

console.log(NL + (CASES.length - bad) + "/" + CASES.length + " cases behaved as specified.");
for (const f of [...new Set(CASES.map((c) => c.file))]) {
  if (!fs.readFileSync(f, "utf8").length) { console.error("BROKEN: " + f + " is empty"); process.exit(1); }
}
if (bad) process.exit(1);
