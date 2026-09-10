#!/usr/bin/env node
// A CLIMBER WHO HAS NOT ONBOARDED IS OFFERED ONBOARDING, AND ONE WHO HAS IS LEFT ALONE.
//
// Both halves matter and they fail in opposite directions. Before this, the effect written to
// onboard a new climber could never fire for a real account -- it keyed on `authed`, which is set
// true in exactly ONE place, LoginScreen's !realAuthGate DEMO branch -- while the "Set up your
// climbing profile" card was gated on `!onboarded`, which is `useState(DEMO_AUTOLOGIN)` and so is
// false on EVERY load for a real account. So the app managed to ask nobody and everybody at once:
// the sheet never opened for the climber who needed it, and the card was offered forever to
// climbers whose profile had been complete for months.
//
// WHY THIS IS A GATE RATHER THAN A PROBE. `check:new-climber-journey` walks this for real and is
// the stronger test -- but it is HAND-RUN (it creates a real account, so it needs the service key,
// which CI must never hold). What CI can see is the wiring, and the wiring is exactly the half a
// stale-base squash takes: re-keying the effect back to `authed`, or reverting the card's gate to
// `!onboarded`, moves NO identifier, and `audit:silent-reverts` says in its own closing caveat
// that it cannot see a change of that shape. Both would leave every render assertion green.
//
// Static -- one Babel parse (for comment masking, below) plus two executions, no browser and no
// database -- so it sits in `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

// ROOT-ANCHORED, never cwd: this repo records a script that pinned another worktree's tree and
// silently measured a different branch's code for weeks.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let fails = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { console.log("  FAIL  " + m); fails++; };
const dead = (m) => { console.error("FAIL-CLOSED: " + m); process.exit(1); };

const raw = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
if (raw.length < 100000) dead(`ClimbMatch.jsx read as ${raw.length} chars — too short to be the app.`);

/* COMMENTS ARE MASKED BEFORE ANYTHING IS MATCHED, and this guard would fail on its own
   documentation without it. Section 1's whole job is to assert that two OLD code shapes are gone —
   and those shapes are exactly what somebody explaining the fix writes in a comment beside it. This
   file records that trap firing on `check:fire`, a float-plan probe, `check:correction-readers` and
   `check:ci-cancel`; the sibling guard next door already quotes the old effect verbatim in its own
   header, which is how naturally it happens.
   NOT a regex strip: this repo has had one eat real code at a URL's `//`, and a hand-rolled scanner
   that tracks quotes desynchronises on an apostrophe in JSX text. Babel reports exact comment
   RANGES, and masking them IN PLACE preserves every offset — which the placement check below
   depends on, since it compares positions. */
let ast;
try { ast = parse(raw, { sourceType: "module", plugins: ["jsx"], errorRecovery: false }); }
catch (e) { dead("could not parse ClimbMatch.jsx: " + e.message); }
const comments = ast.comments || [];
// Fail closed: zero comments in a file of this repo's prose density means the parse returned
// something unusable, and masking nothing would silently restore the raw-source behaviour.
if (comments.length < 50) dead(`ClimbMatch.jsx reported only ${comments.length} comments — a broken parse, not a terse file.`);
const buf = raw.split("");
for (const c of comments) for (let i = c.start; i < c.end; i++) if (buf[i] !== "\n") buf[i] = " ";
const app = buf.join("");

// ---- SECTION 1: THE WIRING, AS SOURCE ---------------------------------------------------------
// Executing the predicate below proves the BRANCH; it cannot prove that anything still consults it.
console.log("SECTION 1 — the sheet and the card both consult the predicate (source)");

const once = (needle, why) => {
  const n = app.split(needle).length - 1;
  if (n === 1) ok(why);
  else bad(`${why} — matched ${n}, expected 1`);
};

once("useEffect(()=>{if(!accountNeedsOnboarding||onboardPrompted())return;markOnboardPrompted();setOnboardOpen(true);},[accountNeedsOnboarding]);",
     "the sheet opens off accountNeedsOnboarding, once per device");
once('(accountNeedsOnboarding&&!homeDismiss.includes("climbsetup"))',
     "the Home card is gated on the same predicate, so the prompt and the sheet cannot disagree");

// THE OLD FORMS MUST BE GONE, not merely outnumbered. This is the anti-revert half.
if (app.includes("if(authed&&!onboarded)setOnboardOpen(true)"))
  bad("the sheet is keyed on `authed` again — that is set true only in LoginScreen's DEMO branch, so it can never fire for a real account");
else ok("no `authed`-keyed auto-open remains");
if (app.includes('(!onboarded&&!homeDismiss.includes("climbsetup"))'))
  bad("the card is gated on `!onboarded` again — false on every load for a real account, so it is offered to every established climber forever");
else ok("no `!onboarded`-gated card remains");

// ON HOME, NOT ON CLIMBS. Asserted as ORDER between two anchors rather than by a character window:
// this file packs a whole screen onto one physical line, so "near" is not a scope.
const greet = app.indexOf('{greet+", "+ME.name.split(" ")[0]}');
const card = app.indexOf('(accountNeedsOnboarding&&!homeDismiss.includes("climbsetup"))');
const gaps = app.indexOf('{(()=>{const noGrades=(!ME.sportGrade||ME.sportGrade==="N/A")');
if (greet < 0 || gaps < 0) dead("ANCHOR LOST: Home's greeting or its setup checklist moved — this run proved nothing about placement.");
if (greet < card && card < gaps) ok("the card renders on HOME, between the greeting and the setup checklist");
else bad(`the card is not in Home's own region (greeting @${greet}, card @${card}, checklist @${gaps})`);

// ---- SECTION 2: THE PREDICATE, EXECUTED ------------------------------------------------------
// LIFTED FROM SOURCE, NEVER RETYPED. A hand-typed copy would agree with itself whatever the app
// did, which is the entire question.
console.log("\nSECTION 2 — who the predicate says still needs onboarding (executed)");

const DECL = "const accountNeedsOnboarding=";
const at = app.indexOf(DECL);
if (at < 0) dead("ANCHOR LOST: `const accountNeedsOnboarding=` is gone — the guard cannot report on a predicate it cannot find.");
if (app.indexOf(DECL, at + 1) >= 0) dead("`accountNeedsOnboarding` is declared twice — one of them is deciding and this guard cannot say which.");
const semi = app.indexOf(";", at + DECL.length);
const expr = app.slice(at + DECL.length, semi);
if (expr.length < 40) dead(`the lifted predicate is ${expr.length} chars — too short to be the expression.`);
for (const name of ["onboarded", "realAuthGate", "signedIn", "profileLoaded", "profileReadFailed", "profile", "authed"]) {
  if (!expr.includes(name)) dead(`the lifted predicate does not mention \`${name}\` — it is not the expression this guard was written for.`);
}

const needs = new Function("onboarded", "realAuthGate", "signedIn", "profileLoaded", "profileReadFailed", "profile", "authed",
  "return (" + expr + ");");
// A real account, mid-flight and afterwards. `disciplines` is what onboarding's finish handler
// persists, so it is the account's own record of having completed it.
const REAL = { onboarded: false, realAuthGate: true, signedIn: true, profileLoaded: true, profileReadFailed: false, profile: { disciplines: [] }, authed: false };
const call = (o) => needs(o.onboarded, o.realAuthGate, o.signedIn, o.profileLoaded, o.profileReadFailed, o.profile, o.authed);
const expect = (label, o, want) => {
  const got = !!call(o);
  if (got === want) ok(label);
  else bad(`${label} — predicate said ${got}, expected ${want}`);
};

expect("a new account with the read resolved and no disciplines NEEDS onboarding", REAL, true);
expect("...and an established account with disciplines does NOT",
       { ...REAL, profile: { disciplines: ["sport"] } }, false);
// THE FLASH. Without `profileLoaded` every established climber matches for the moments before
// their profile arrives, and the sheet opens at them on every single load.
expect("...and nobody is judged before the profile read has resolved",
       { ...REAL, profileLoaded: false }, false);
// THE WIPE CLASS. A failed read leaves exactly the empty profile a new account has.
expect("...and a FAILED profile read never opens a blank sheet over a profile we could not load",
       { ...REAL, profileLoaded: true, profileReadFailed: true }, false);
expect("...and a signed-OUT visitor is not onboarded at", { ...REAL, signedIn: false }, false);
expect("...and finishing it in this session stops it immediately", { ...REAL, onboarded: true }, false);
// The seed/demo path keeps its own signal, and must not start depending on a profile read that
// never happens there.
expect("on the seed path `authed` is still the sign-in",
       { ...REAL, realAuthGate: false, signedIn: false, profileLoaded: false, authed: true }, true);
expect("...and an un-signed-in seed visitor is left alone",
       { ...REAL, realAuthGate: false, signedIn: false, profileLoaded: false, authed: false }, false);

// ---- SECTION 3: THE DEVICE PREFERENCE, EXECUTED ----------------------------------------------
// This is what makes the sheet an invitation rather than a nag: without it the account fact alone
// reopens it on every load until the climber completes onboarding.
console.log("\nSECTION 3 — the once-per-device preference (executed)");

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
};
const pref = await import(path.join(ROOT, "lib/onboard-pref.js"));
if (typeof pref.onboardPrompted !== "function" || typeof pref.markOnboardPrompted !== "function")
  dead("lib/onboard-pref.js does not export the pair this guard exists to check.");

if (pref.onboardPrompted() === false) ok("a browser that has never been prompted reads as not prompted");
else bad("an empty store already reads as prompted — the sheet would never open for anybody");
pref.markOnboardPrompted();
if (pref.onboardPrompted() === true) ok("...and once marked it stays marked, so the sheet opens ONCE");
else bad("marking did not stick — the sheet would reopen on every load, which is the nag this exists to avoid");

// VALIDATED ON READ, the rule lib/prefs.js states: these keys are user-writable from devtools and
// survive deploys, so anything can be in there.
store.set("climbmatch-onboard-prompted", "banana");
if (pref.onboardPrompted() === false) ok("junk in the key reads as NOT prompted — one extra invitation, never a swallowed one");
else bad("junk in the key reads as prompted, which would silently suppress onboarding for that browser");

// A DISPLAY PREFERENCE MUST NEVER TAKE A SCREEN DOWN. `localStorage` is undefined entirely under
// renderToStaticMarkup, which is how a dozen guards render this app, and it THROWS rather than
// returning null in Safari private mode.
delete globalThis.localStorage;
try {
  if (pref.onboardPrompted() === false) ok("with no localStorage at all it degrades to not-prompted rather than throwing");
  else bad("with no localStorage it claims the climber was prompted");
  pref.markOnboardPrompted();
  ok("...and marking is a no-op rather than a crash");
} catch (e) { bad("the preference threw with no localStorage: " + e.message); }

if (fails) { console.log(`\ncheck:onboarding-reach FAILED — ${fails} problem(s).`); process.exit(1); }
console.log("\ncheck:onboarding-reach: ok — a new account is offered onboarding once, an established one is left alone, and a failed profile read opens nothing.");
