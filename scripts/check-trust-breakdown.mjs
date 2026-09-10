// Do the factors under WHAT FEEDS YOUR SCORE add up to the score they claim to feed?
//
// THIS GUARD WAS CLAIMED IN A COMMENT AND DID NOT EXIST. `trustContributions` in
// ClimbMatchCore.jsx says, in as many words, "check:trust-breakdown asserts it over a spread of
// accounts" — and there was no such script and no such npm entry. That is worse than an unguarded
// invariant: a reader looking for coverage finds a sentence saying it is covered and stops. It is
// also invisible to check:guard-wiring, which asks whether a guard ON DISK actually runs; a guard
// named only in prose has no file for it to find.
//
// THE DEFECT IT PINS. trustFactors returns points on its own scale — `max` is conditional per
// factor, so the denominator differs per account — while vScore renders a PERCENTAGE,
// Math.round(sum/max*99). The breakdown used to print the raw `pts`, so an account with only its
// email verified showed one factor at "+20" above a headline of "17 / 90 goal": a single
// contributor apparently larger than the whole score, on a panel headed WHAT FEEDS YOUR SCORE.
//
// TWO SECTIONS, AND THE SECOND IS THE ONE A MERGE TAKES. Section 1 executes the real
// trustContributions and checks the arithmetic. Section 2 RENDERS the panel, because a stale-base
// squash that restored `{"+"+f.pts}` changes no identifier trustContributions exports: every
// arithmetic assertion in section 1 would still pass while the panel went back to printing the
// wrong scale. Same split as check:topo-outage-copy — executing the function proves the number,
// not that the screen uses it.
//
// Section 2 renders rather than matching source deliberately. A text match on TrustBreakdown's
// body would also fire on a comment inside it naming the old expression, which is a guard
// forbidding the code from explaining itself — the trade check:access-checked-line's case 4 exists
// to refuse. The render is immune to prose in either direction.
//
// Static: bundles ClimbMatchCore.jsx and executes the real exported functions. No browser, no
// database, no network.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { reachableVerificationTypes, partnerlessCeiling, dayOneScore, earnableCeiling } from "./lib/verification-reach.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(ROOT, `.trustbreakdown-${process.pid}.mjs`);
const clean = () => fs.rmSync(out, { force: true });

let failures = 0, cases = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const dead = (what) => {
  console.error(`\ncheck:trust-breakdown FAILED — ${what}.`);
  console.error("Nothing below was checked. Every assertion here passes against an account whose");
  console.error("score is zero and whose factors are all zero, so a broken scan must never read clean.\n");
  clean();
  process.exit(1);
};

try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { dead("esbuild could not bundle ClimbMatchCore.jsx"); }

const mod = await import(out + "?t=" + Date.now());
const { vScore, trustContributions, trustFactors, CLIMBERS } = mod;
if (typeof vScore !== "function") dead("ClimbMatchCore.jsx does not export vScore — ANCHOR LOST");
if (typeof trustContributions !== "function") dead("ClimbMatchCore.jsx does not export trustContributions — ANCHOR LOST");
if (typeof trustFactors !== "function") dead("ClimbMatchCore.jsx does not export trustFactors — ANCHOR LOST");

// A SPREAD, not one account, because `max` is conditional per factor: an account with nothing
// tracked has a different denominator from one with everything, and largest-remainder
// apportionment is exactly the kind of arithmetic that is right in the middle and wrong at an end.
const ACCOUNTS = [
  ["a brand-new account", { id: 0 }],
  ["email verified and nothing else", { id: 0, verified: true }],
  ["email plus one vouch", { id: 0, verified: true, communityVouches: 1 }],
  ["a few climbs logged", { id: 0, routesLogged: 7 }],
  ["a partial mix", { id: 0, verified: true, reliability: 73, responseRate: 41, routesLogged: 23, years: 4 }],
  ["every factor tracked", { id: 0, verified: true, communityVouches: 6, routesLogged: 60, reliability: 100, responseRate: 100, partnerCount: 40, conditionsReported: 30, floatPlans: 9, years: 20, certifications: ["a", "b", "c", "d"], catchLedger: { totalCatches: 20, highFactorCatches: 8, lastCatch: "2026-08-01" } }],
];
for (const c of (CLIMBERS || []).slice(0, 6)) ACCOUNTS.push(["seed climber " + (c && c.name), c]);

const factorCount = trustFactors({ id: 0 }).length;
if (factorCount < 6) dead(`trustFactors returned only ${factorCount} factor(s) — the scan broke`);
if (ACCOUNTS.length < 8) dead(`only ${ACCOUNTS.length} account(s) to test — the seed climbers did not load`);

// ---- 1. the listed factors must sum to the headline ----
let nonZero = 0;
for (const [label, c] of ACCOUNTS) {
  const head = vScore(c);
  const rows = trustContributions(c);
  cases++;
  if (!Array.isArray(rows) || rows.length !== factorCount) {
    fail(`${label}: trustContributions returned ${Array.isArray(rows) ? rows.length : "not an array"}, expected ${factorCount} factor(s)`);
    continue;
  }
  if (rows.some((f) => typeof f.share !== "number")) {
    fail(`${label}: a factor carries no numeric \`share\` — the breakdown has nothing to render`);
    continue;
  }
  const sum = rows.reduce((s, f) => s + f.share, 0);
  if (head > 0) nonZero++;
  if (sum !== head) {
    fail(`${label}: factors sum to ${sum} but the headline says ${head} — the panel does not add up`);
    continue;
  }
  // The ORIGINAL SYMPTOM, asserted separately: equal is fine (one factor can be the whole score),
  // larger is the defect a reader actually noticed.
  const over = rows.filter((f) => f.share > head);
  if (over.length) {
    fail(`${label}: ${over.map((f) => `"${f.label}" +${f.share}`).join(", ")} exceed(s) the headline of ${head}`);
    continue;
  }
  ok(`${label}: ${rows.length} factors sum to ${sum}, headline ${head}`);
}

// NON-VACUITY. Every assertion above is satisfied by a scoring function that returns 0 for
// everything and shares of 0, so a spread that is entirely zero proves nothing at all.
if (nonZero < 4) dead(`only ${nonZero} account(s) scored above zero — the spread cannot exercise the apportionment`);

// ---- 2. the RENDERER must show the apportioned share, not the raw points ----
// RENDERED, NOT MATCHED AS SOURCE. A merge that restores `{"+"+f.pts}` changes no identifier
// trustContributions exports, so section 1 stays green while the panel goes back to printing the
// wrong scale — section 2 has to exist. But a TEXT match on the function body would also fire on a
// comment inside it that names the old expression, i.e. it would forbid the code explaining
// itself, which this repo has already recorded as the wrong trade. Rendering asks what the panel
// actually shows and cannot be fooled by prose either way.
//
// The fixture is chosen so the two scales DISAGREE: with only the email verified the raw points
// are 20 and the apportioned share is 23. A fixture where they coincide proves nothing.
const { renderToStaticMarkup } = await import("react-dom/server");
const probe = { id: 0, verified: true };
const rawPts = trustFactors(probe).find((f) => f.label === "Email verified");
const shareRow = trustContributions(probe).find((f) => f.label === "Email verified");
if (!rawPts || !shareRow) dead("the Email verified factor is gone — ANCHOR LOST, the fixture cannot separate the two scales");
if (rawPts.pts === shareRow.share) dead(`the fixture no longer separates the scales (pts and share are both ${rawPts.pts}) — pick an account where they differ`);

let markup = "";
try { markup = renderToStaticMarkup(mod.TrustBreakdown({ climber: probe })); }
catch (e) { dead("TrustBreakdown threw while rendering: " + (e && e.message)); }
if (markup.length < 200) dead(`TrustBreakdown rendered ${markup.length} characters — too thin to assert on, so every check below would pass vacuously`);

cases++;
if (!markup.includes("+" + shareRow.share)) {
  fail(`the panel does not show "+${shareRow.share}" for Email verified — the apportioned share reaches no screen`);
} else ok(`the panel shows the apportioned share ("+${shareRow.share}")`);

cases++;
if (markup.includes("+" + rawPts.pts)) {
  fail(`the panel shows "+${rawPts.pts}" — raw points under a headline of ${vScore(probe)}, the defect this guard exists for`);
} else ok(`the panel does not show the raw points ("+${rawPts.pts}")`);

// ---- 3. the SERVER model transcribed into JS must still match migration 0038 ----
// SECTION 3. `serverTrustFactors` is a JS copy of `compute_trust_score`'s plpgsql, because the RPC
// returns one number and no breakdown, and the Profile has to itemise the score a real climber
// actually carries. A second implementation of one formula is the defect this repo has recorded
// four times (four grade parsers), so the copy is not trusted: the WEIGHTS ARE READ OUT OF THE
// MIGRATION and asserted against what the JS actually computes.
//
// PROBED, NOT PATTERN-MATCHED ON THE JS. Reading constants out of both sides and comparing them
// compares two transcriptions; driving the function with inputs asks what it does. Each factor is
// probed twice — one unit, and far past its cap — so a wrong RATE and a wrong CAP are separate
// failures rather than one.
//
// The runtime half of this defence lives in the app: the Profile compares its local total against
// the number the server returned and withholds the itemisation unless they agree. This section is
// the build-time half, and it is the one that fires when a migration re-weights the model.
const sqlPath = path.join(ROOT, "supabase", "migrations", "0038_trust_vouches.sql");
if (!fs.existsSync(sqlPath)) dead("supabase/migrations/0038_trust_vouches.sql is gone — ANCHOR LOST, the server weights cannot be read");
const sqlAll = fs.readFileSync(sqlPath, "utf8");
const fnStart = sqlAll.indexOf("function compute_trust_score");
if (fnStart < 0) dead("0038 no longer defines compute_trust_score — ANCHOR LOST");
const sql = sqlAll.slice(fnStart, sqlAll.indexOf("$$ language plpgsql", fnStart));
// Comments are stripped: 0038's own header lists the component ranges in prose ("verification
// (0-20), tenure (0-20) …"), and those numbers are NOT the weights. Reading them would assert the
// documentation rather than the code.
const sqlCode = sql.split("\n").map((l) => l.replace(/--.*$/, "")).join("\n");

const { serverTrustFactors, serverTrustRaw, serverTrustScore, SERVER_TRUST_CAP } = mod;
if (typeof serverTrustFactors !== "function") dead("ClimbMatchCore.jsx does not export serverTrustFactors — ANCHOR LOST");
if (typeof serverTrustScore !== "function") dead("ClimbMatchCore.jsx does not export serverTrustScore — ANCHOR LOST");

const num = (re, what) => {
  const m = sqlCode.match(re);
  if (!m) dead(`could not read ${what} out of compute_trust_score — the migration's shape moved, so this section proved nothing`);
  return Number(m[1]);
};
// EACH FACTOR AS (how it scores, its parameter, its cap, the input key that drives it), all four
// READ OUT OF THE SQL. "flat" pays a fixed amount once, "rate" pays per unit, "div" pays one point
// per N. Every number here comes from the migration; none is written down twice.
const SPEC = [
  { label: "Email verified",         key: "emailVerified", kind: "flag", p: num(/verification_type = 'email'\)[\s\S]*?base_score \+ (\d+)/, "the email weight") },
  { label: "ID verified",            key: "idVerified",    kind: "flag", p: num(/verification_type = 'id'\)[\s\S]*?base_score \+ (\d+)/, "the ID weight") },
  { label: "Certifications",         key: "certCount",  kind: "rate", p: num(/least\(verified_count \* (\d+)/, "the cert rate"),   cap: num(/least\(verified_count \* \d+, (\d+)\)/, "the cert cap") },
  { label: "Time on ClimbMatch",     key: "tenureDays", kind: "div",  p: num(/least\(tenure_days \/ (\d+)/, "the tenure divisor"), cap: num(/least\(tenure_days \/ \d+, (\d+)\)/, "the tenure cap") },
  { label: "Peer vouches",           key: "vouches",    kind: "rate", p: 1,                                                          cap: num(/least\(vouch_count, (\d+)\)/, "the vouch cap") },
  { label: "Logged climbs",          key: "logs",       kind: "div",  p: num(/least\(log_count \/ (\d+)/, "the logs divisor"),     cap: num(/least\(log_count \/ \d+, (\d+)\)/, "the logs cap") },
  { label: "Conditions reported",    key: "reports",    kind: "div",  p: num(/least\(report_count \/ (\d+)/, "the reports divisor"), cap: num(/least\(report_count \/ \d+, (\d+)\)/, "the reports cap") },
  { label: "Verified belay catches", key: "catches",    kind: "rate", p: num(/least\(catch_count \* (\d+)/, "the catch rate"),     cap: num(/least\(catch_count \* \d+, (\d+)\)/, "the catch cap") },
];
const expected = (f, n) => f.kind === "flag" ? (n ? f.p : 0)
  : Math.min(f.kind === "rate" ? n * f.p : Math.floor(n / f.p), f.cap);
const rowFor = (label, input) => (serverTrustFactors(input) || []).find((f) => f.label === label);

const baseRows = serverTrustFactors({});
if (!Array.isArray(baseRows) || baseRows.length !== SPEC.length) dead(`serverTrustFactors returned ${Array.isArray(baseRows) ? baseRows.length : "not an array"} factor(s), expected the ${SPEC.length} compute_trust_score adds up`);
if (baseRows.some((f) => f.pts !== 0)) dead("an account with no inputs already scores — the probe cannot separate a rate from a constant");

// THE WHOLE CURVE, NOT ONE POINT. A first version asserted only that "one point's worth of input
// scores 1", and injection showed that blind to BOTH a wrong rate and a wrong divisor: at 2 points
// a catch, one catch and three points a catch both cap the same; and floor(5/4) is 1 exactly as
// floor(5/5) is. Several values per factor, spanning either side of the parameter and past the cap,
// is what separates a rate from a threshold.
const PROBES = [0, 1, 2, 3, 4, 5, 7, 8, 9, 11, 14, 16, 20, 29, 30, 31, 59, 61, 100, 400, 9999];
for (const f of SPEC) {
  cases++;
  const bad = [];
  const values = f.kind === "flag" ? [0, 1] : PROBES;
  for (const n of values) {
    const r = rowFor(f.label, { [f.key]: f.kind === "flag" ? !!n : n });
    if (!r) { bad.push(`no factor called "${f.label}"`); break; }
    const want = expected(f, n);
    if (r.pts !== want) bad.push(`${f.key}=${n} scores ${r.pts}, 0038 gives ${want}`);
  }
  if (bad.length) fail(`SERVER MODEL: ${f.label} — ${bad.slice(0, 3).join("; ")}${bad.length > 3 ? ` (+${bad.length - 3} more)` : ""}`);
  else ok(`SERVER MODEL: ${f.label} matches 0038 across ${values.length} input value(s)`);
}

const CAPS = Object.fromEntries(SPEC.map((f) => [f.label, f.kind === "flag" ? f.p : f.cap]));
// CAPS, probed far past the limit. A wrong cap is invisible to the one-unit probe above.
const BIG = { emailVerified: true, idVerified: true, certCount: 99, tenureDays: 99 * 365, vouches: 999, logs: 9999, reports: 9999, catches: 999 };
for (const [label, cap] of Object.entries(CAPS)) {
  const r = rowFor(label, BIG);
  cases++;
  if (!r) { fail(`SERVER MODEL: no factor called "${label}" at the cap probe`); continue; }
  if (r.pts !== cap) fail(`SERVER MODEL: ${label} caps at ${r.pts}, but 0038 caps it at ${cap}`);
  else if (r.max !== cap) fail(`SERVER MODEL: ${label} caps at ${cap} but advertises max ${r.max} — the bar beside it would be wrong`);
  else ok(`SERVER MODEL: ${label} caps at ${cap}, as 0038 does`);
}

// THE OVERALL CAP, and the fact the parts can legitimately EXCEED it. The eight maxima total 104
// against a cap of 99, so a panel that simply listed the factors would not add up to its own
// headline — the defect sections 1 and 2 exist for, arriving from the other side. The app states
// the cap instead; this asserts the arithmetic that makes that necessary.
const sqlCap = num(/return least\(base_score, (\d+)\)/, "the overall cap");
cases++;
if (SERVER_TRUST_CAP !== sqlCap) fail(`SERVER MODEL: the cap is ${SERVER_TRUST_CAP} in JS and ${sqlCap} in 0038`);
else ok(`SERVER MODEL: capped at ${sqlCap}, as 0038 does`);

cases++;
const rawMax = serverTrustRaw(BIG), scoreMax = serverTrustScore(BIG);
if (scoreMax !== sqlCap) fail(`SERVER MODEL: a maxed account scores ${scoreMax}, expected the ${sqlCap} cap`);
else if (rawMax <= sqlCap) fail(`SERVER MODEL: the parts total ${rawMax}, which does not exceed the cap — the panel's cap line is unreachable, so it is untested copy`);
else ok(`SERVER MODEL: the parts total ${rawMax} against a cap of ${sqlCap}, so the panel must state the cap`);

// ---- 4. the panel must RENDER the supplied server rows ----
// SECTION 4. Sections 1-3 prove numbers. This proves the Profile's rows reach the markup: the panel
// takes them through TrustBreakdown's `rows` prop, and a merge that drops that prop falls back to
// `trustContributions(climber)` SILENTLY — the client model rendering under a server headline,
// which is the exact defect this whole change exists to remove, restored without touching a number.
const serverRows = serverTrustFactors({ emailVerified: true, vouches: 3, logs: 20, catches: 2 })
  .map((f) => Object.assign({}, f, { share: f.pts }));
const serverTotal = serverRows.reduce((a, f) => a + f.pts, 0);
let sMarkup = "";
try { sMarkup = renderToStaticMarkup(mod.TrustBreakdown({ climber: { id: 0 }, rows: serverRows })); }
catch (e) { dead("TrustBreakdown threw on supplied rows: " + (e && e.message)); }
if (sMarkup.length < 200) dead(`TrustBreakdown rendered ${sMarkup.length} characters from supplied rows — too thin to assert on`);

cases++;
// "Time on ClimbMatch" is a SERVER-ONLY factor: the client model has no tenure at all, so its
// presence proves the supplied rows were used rather than trustContributions falling through.
if (!sMarkup.includes("Time on ClimbMatch")) {
  fail("the panel does not render the supplied server rows — `rows` is being ignored and the client model is showing under a server headline");
} else ok("the panel renders the supplied server rows (tenure, which the client model has no factor for)");

cases++;
const clientOnly = ["Reliability", "Response rate", "Partner network", "Float plans filed"];
const leaked = clientOnly.filter((l) => sMarkup.includes(l));
if (leaked.length) fail(`the panel shows client-model factors (${leaked.join(", ")}) beside server ones — two models in one list`);
else ok("no client-only factor leaks into the server panel");

cases++;
if (!sMarkup.includes("+" + serverRows.find((f) => f.label === "Peer vouches").pts)) {
  fail("the vouch row's points do not reach the markup");
} else ok(`the server rows' points render (they total ${serverTotal})`);


// ---- 5. ONE CLIMBER, ONE SCORE — INCLUDING WHERE IT GATES AN ACTION ----
// SECTION 5. Sections 1-4 are about what the Profile DISPLAYS. This is the other half: a group with
// a "Trust 55+ only" policy REFUSES A JOIN on that number, and `groupTrustShortfall` used to take
// the climber and call vScore itself — the CLIENT model — while the Profile and every other climber
// see the SERVER one. The app enforced a group's policy on a number that appears nowhere, and could
// tell you that you are trust 14 and then admit you to a 55+ group.
//
// ASSERTED AS SOURCE because the call sites are click handlers: standing up a group screen to drive
// a join is far more than the question is worth, and the property is structural — the function must
// take a NUMBER, so a second derivation is impossible rather than merely absent.
//
// AND AT A COUNT OF TWO. The two join handlers are byte-identical; fixing one leaves half the app
// gating on a different score, which is the split this whole change exists to remove.
{
  const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

  cases++;
  const i = app.indexOf("function groupTrustShortfall");
  const body = i < 0 ? "" : app.slice(i, app.indexOf("}", app.indexOf("return", i)) + 1);
  if (!body) dead("groupTrustShortfall not found in ClimbMatch.jsx — the assertions below are vacuous");
  if (/vScore\s*\(/.test(body)) {
    fail("groupTrustShortfall derives its own score — a group's policy would be enforced on a number the app never shows");
  } else ok("the group-join gate does not derive a second score");

  cases++;
  const n = app.split("groupTrustShortfall(cl,myTrustScore)").length - 1;
  if (n !== 2) fail(`the join gate reads the displayed score in ${n} handler(s), expected 2 — the two are byte-identical, so half the app would gate on something else`);
  else ok("both join handlers gate on the score the app displays");
}

// ---- 6. THE THRESHOLD MUST BE A BAR SOMEBODY CAN WALK UP TO ----
// SECTION 6. Section 5 pins WHICH number the gate reads. This pins that the bar set against it is
// one a real climber can reach, which is a different question and was answered wrongly the moment
// section 5's fix landed: 55 was chosen against the CLIENT model, where a vouch is worth 4 points,
// and reading it against the SERVER model left it one point above the ceiling a climber with no
// vouches and no belay catches can ever reach. Measured at the time: every real account in the
// live project scored 0, 5 or 6, and the highest earnable score is 84 rather than 99, because
// `compute_trust_score` awards 20 points for an ID and for club/guide credentials that nothing in
// the app can grant.
//
// TWO-SIDED, AND DELIBERATELY WIDE. It does NOT assert a particular threshold — where the bar sits
// between these bounds is a product decision, and a guard pinning today's number would argue with
// the next one. It asserts only that the policy still means what its label says: above the upper
// bound "trust" is really "somebody has vouched for you", which is the state every new climber
// starts in; at or below the lower bound it admits anyone who confirmed an email, so the group is
// promising an exclusivity it does not have.
//
// BOTH BOUNDS ARE DERIVED, neither typed. They move by themselves when the model is re-weighted or
// when a verification the app cannot currently grant becomes earnable — which is the direction that
// otherwise goes stale silently, since it makes the threshold look more attainable than it is.
{
  // ANCHORED TO THE START OF A LINE, and required to be unique. The comment above the declaration
  // explains this threshold and names other numbers while doing so; an unanchored `.exec` takes the
  // FIRST match, so a sentence quoting the declaration would silently hand this section a different
  // number and it would report confidently on a threshold the app does not have.
  const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
  const decls = app.match(/^const GROUP_TRUST_MIN\s*=\s*\d+/gm) || [];
  if (decls.length !== 1) dead(`ANCHOR LOST: GROUP_TRUST_MIN is declared ${decls.length} time(s) at the start of a line in ClimbMatch.jsx, expected 1`);
  const MIN = Number(/(\d+)/.exec(decls[0])[1]);

  const { serverTrustScore } = mod;
  if (typeof serverTrustScore !== "function") dead("ClimbMatchCore.jsx does not export serverTrustScore — ANCHOR LOST");

  const { types: reachable, scanned } = reachableVerificationTypes(path.join(ROOT, "supabase", "migrations"));
  if (scanned < 20) dead(`only ${scanned} migration(s) scanned — the walk broke, and an unscanned tree reports every verification as unreachable`);
  if (!reachable.size) dead("no verification type parsed as reachable at all — a broken scan, not a finding; every ceiling below would collapse");

  const dayOne = dayOneScore(serverTrustScore, reachable);
  const ceiling = partnerlessCeiling(serverTrustScore, reachable);
  if (!(ceiling > dayOne)) dead(`the partnerless ceiling (${ceiling}) is not above the day-one score (${dayOne}) — the model did not load`);

  cases++;
  if (MIN > ceiling) {
    fail(`GROUP_TRUST_MIN is ${MIN}, above the ${ceiling} a climber with no vouches and no belay catches can ever reach — a "Trust ${MIN}+" group is gating on having been vouched for, not on trust`);
  } else ok(`GROUP_TRUST_MIN (${MIN}) is reachable without a vouch or a catch (ceiling ${ceiling})`);

  cases++;
  if (MIN <= dayOne) {
    fail(`GROUP_TRUST_MIN is ${MIN}, which a day-old account scores on confirming its email (${dayOne}) — the group promises an exclusivity it does not have`);
  } else ok(`GROUP_TRUST_MIN (${MIN}) turns away a day-old verified account (${dayOne})`);

  // -------------------------------------------------------------------------
  // 7. EVERY NAMED TIER, AND THE CARD'S GOAL, MUST BE REACHABLE BY SOMEBODY.
  //
  // The ladder was 90/70/50 against the model's cap of 99, and the earnable ceiling is 84 — so
  // "Highly Trusted" and the "/ 90 goal" were shown to NOBODY, ever, on the one card whose whole
  // purpose is telling a climber how to raise the number. A climber four years in with 25 vouches,
  // 150 logs and 15 belay catches read "Trusted"; every real account read "New" in red.
  //
  // THIS ASSERTS THE PROPERTY, NEVER THE NUMBERS, for the reason section 6 gives about the group
  // gate: where the bars sit between the bounds is a product decision, and a guard pinning today's
  // 70/45/15 would argue with the next one. It is also TWO-DIRECTIONAL by construction — ship a
  // definer that can attest a government ID and the ceiling rises, so the guard follows the model
  // instead of going stale. That is the same derived-not-typed rule check:profile-claims uses for
  // the "Add a cert" row.
  const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
  if (core.length < 100000) dead(`ClimbMatchCore.jsx read back only ${core.length} characters — the read broke, and every match below would report ANCHOR LOST`);
  const full = earnableCeiling(serverTrustScore, reachable, SERVER_TRUST_CAP);
  if (!(full >= ceiling)) dead(`the full ceiling (${full}) is below the partnerless one (${ceiling}) — the model did not load`);

  // LINE-ANCHORED AND UNIQUE, the way section 6 reads GROUP_TRUST_MIN — and for a reason an
  // injection found rather than a reason anyone predicted from reading it. The comment directly
  // above this declaration explains where 70/45/15 came from and NAMES the ladder they replaced;
  // an unanchored `.exec` takes the FIRST match, so quoting `TRUST_TIERS={high:90,...}` in that
  // prose made the guard report on a ladder the app does not have — flagging correct work, which
  // is how a guard gets ignored. `ladder-quoted-in-prose` is that case and it must stay silent.
  const tds = core.match(/^export var TRUST_TIERS\s*=\s*\{\s*high:\s*\d+\s*,\s*trusted:\s*\d+\s*,\s*building:\s*\d+\s*\}/gm) || [];
  if (tds.length !== 1) dead(`ANCHOR LOST: TRUST_TIERS is declared as a literal at the start of a line ${tds.length} time(s) in ClimbMatchCore.jsx, expected 1`);
  const tm = /high:\s*(\d+)\s*,\s*trusted:\s*(\d+)\s*,\s*building:\s*(\d+)/.exec(tds[0]);
  if (!tm) dead("ANCHOR LOST: TRUST_TIERS matched but its three tiers did not parse");
  const TIERS = { high: Number(tm[1]), trusted: Number(tm[2]), building: Number(tm[3]) };

  cases++;
  if (!(TIERS.high > TIERS.trusted && TIERS.trusted > TIERS.building)) {
    fail(`the trust ladder is not descending: ${TIERS.high}/${TIERS.trusted}/${TIERS.building}`);
  } else ok(`the trust ladder descends (${TIERS.high}/${TIERS.trusted}/${TIERS.building})`);

  cases++;
  if (TIERS.high > full) {
    fail(`"Highly Trusted" needs ${TIERS.high}, above the ${full} ANY climber can reach — it can be shown to nobody, ever`);
  } else ok(`every named tier is reachable — the top one needs ${TIERS.high} against a ceiling of ${full}`);

  // The goal is DERIVED from the top tier rather than being a fifth number. "goal met" and
  // "Highly Trusted" naming different scores on one card is the disagreement this section exists
  // for, so the guard forbids them being separately typed rather than merely comparing them.
  cases++;
  // Line-anchored for the same reason as the ladder above: this file's own comments quote the
  // declaration while explaining it, and a first-match read of prose is a verdict about nothing.
  const gds = core.match(/^export var TRUST_GOAL\s*=\s*([A-Za-z_.]+|\d+)/gm) || [];
  const gm = gds.length === 1 ? /TRUST_GOAL\s*=\s*([A-Za-z_.]+|\d+)/.exec(gds[0]) : null;
  if (!gm) {
    fail(`ANCHOR LOST: TRUST_GOAL is declared at the start of a line ${gds.length} time(s) in ClimbMatchCore.jsx, expected 1`);
  } else if (!/TRUST_TIERS\.high/.test(gm[1])) {
    fail(`TRUST_GOAL is ${gm[1]} rather than TRUST_TIERS.high — the card's goal and the top tier can drift, which is how "goal met" and "Highly Trusted" came to name different scores`);
  } else ok("the card's goal is derived from the top tier, so the two cannot disagree");

  // A rule that only ever demands the bars come DOWN is satisfied by putting every tier at zero,
  // which would call a day-old account "Highly Trusted". The bottom of the ladder has to keep
  // meaning something.
  cases++;
  if (TIERS.building <= dayOne) {
    fail(`"Building Trust" starts at ${TIERS.building}, which a day-old account scores on confirming its email (${dayOne}) — nobody would ever read "New"`);
  } else ok(`"New" still means new — "Building Trust" starts at ${TIERS.building}, above the day-one ${dayOne}`);
}


clean();
if (failures) {
  console.error(`\ncheck:trust-breakdown: ${failures} failure(s) across ${cases} case(s).`);
  console.error("The panel headed WHAT FEEDS YOUR SCORE must list numbers that add up to the score");
  console.error("it sits under. If the apportionment changed on purpose, update this guard with it.\n");
  process.exit(1);
}
console.log(`\ncheck:trust-breakdown: ok — ${cases} case(s); ${ACCOUNTS.length} accounts' factors each sum to their headline, and the panel renders the apportioned share.`);
