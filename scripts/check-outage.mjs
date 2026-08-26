// check:outage — when the database is down, does any screen quietly tell a signed-in climber
// that they have nothing?
//
// THE ASSERTION: if an outage changes what a screen renders, that screen must SAY something
// went wrong. Stated in the positive on purpose. The tempting form -- "no screen may claim to
// be empty" -- needs a list of every phrasing of nothing, and such a list has already missed
// two real defects found by this very script: the Home tiles read "0 routes" and "0 crews",
// which no pattern of "no X yet" will ever match. Asking whether the screen ACKNOWLEDGES the
// fault needs no vocabulary of absence at all.
//
// WHY NOTHING ELSE CAN SEE THIS. check:read-failures is the build gate for this class and its
// own comment states the limit: it proves a failed read THROWS, and does not ask whether
// anything downstream concludes absence from the resulting emptiness. Something does -- the
// caller catches and no-ops, state stays [], and every render tests !x.length, so
// loaded-and-empty and never-loaded are the same screen. Nothing lies; the truth never
// arrives. Every other browser guard walks a HEALTHY database, where the distinction does not
// exist.
//
// WHY IT IS A GUARD RATHER THAN THE PROBE IT USED TO BE. As scripts/oneoff/ it found twelve
// false statements across five PRs (#1124 crews, #1147 lists, #1155 objectives+logs, #1164
// Partners, #1172 Home) and ran only when somebody remembered. This repo has the receipts for
// what that costs: check:overlay-scroll had gone red on main and nobody knew, and
// check:signed-in went ~40 merged commits without running. On a loaded machine "hand-run"
// means "not run".
//
// ONLY=<table> still fails exactly one PostgREST table for hand use, which is how a verdict is
// attributed to ONE query rather than to a blanket outage. The guard itself runs without it.
//
// scripts/oneoff/probe-db-failure-screens.mjs established that the cheap walks cannot answer
// this: under DEMO_AUTOLOGIN the six tabs are seed-backed and render byte-identical with every
// read failing, and logged out you get the sign-in gate. The DB-backed surfaces — area
// browser, route lists, crews, logbook — exist only for a real signed-in account.
//
// So this layers PostgREST interception under check:signed-in's fixture. It runs the SAME walk
// twice, healthy then failing, and diffs the two. A screen that is identical either way is
// seed-backed and tells us nothing; a screen that CHANGES is where the outage is visible, and
// the question is whether it says something broke or quietly says you have nothing.
//
// The control run is not optional. Without it a "no difference" result is indistinguishable
// from a probe that never reached a DB surface, which is exactly how the previous probe
// reported six identical screens while measuring one.
//
// Creates and destroys two real accounts, like check:signed-in. Reads only; nothing is written
// through the failing path because every write would fail too.
//
// WHAT IT FOUND, 2026-08-19 (81 reads blocked, app confirmed on screen, control run first):
//
//   Crew   healthy 3565ch -> failing 530ch, and the ENTIRE content is the sub-tab bar:
//          ["Crews","Friends","Groups"]. The fixture OWNS a crew with two confirmed members
//          and a private group. During an outage the climber sees an apparently empty crew
//          list and NOTHING says anything went wrong.
//
//   None of the six screens used broken/error/retry language. Four read as empty.
//
// That is the class [[a-failed-read-must-not-read-as-empty]] records — fixed for the three
// chat reads, still live here. The repair precedent is the same: let the read THROW instead of
// resolving to [], so the caller's existing catch can say "Couldn't load…" rather than the
// list rendering its empty state.
//
// STILL BROKEN, MEASURED 2026-08-19 AFTER the crew fix (#1124) — the same class, more
// surfaces. Run with DUMP=Logbook to see it. During an outage the Logbook tells an account
// that HAS an objective, a log and a custom list:
//
//   "0 climbs to go"
//   "Nothing here yet — find a route in the Climbs tab and tap the bookmark to save it"
//   "No custom lists yet — tap + Create to build one."
//   "No recent condition reports"
//
// Four false statements on one screen. This is systemic rather than a second one-off: every
// list that hydrates from a query renders its EMPTY state when the read fails, because the
// render tests `!x.length` and nothing distinguishes "loaded, none" from "never loaded".
//
// The crew repair is the template and it is small — derive `xUnavailable` from that query's
// `isError`, swap the empty copy, suppress onboarding that assumes emptiness. What makes this
// more than one more edit is that the Logbook draws on at least two further queries
// (`useMyLists`, plus whatever feeds objectives/wishlist), so each needs its own flag AND its
// own healthy-vs-failing run. Do them one query at a time; a blanket flag would claim the
// database is down on a screen whose data merely has not arrived yet.
//
// THE "Me" TAB WAS NEVER WALKED, and this header said so for months as a LIMITATION rather than
// a bug: "Logbook and Me returned identical text, so the Me click did not land". Identical text
// is not a quirk of two similar screens -- `NAV` has SEVEN entries and the last two are labelled
// "Ranks" and "Profile". There is no control anywhere named "Me", so that click matched nothing,
// the previous screen stayed up, and the Logbook was measured twice under two names while two
// real tabs were never opened at all.
//
// The tell was sitting in the guard's own output the whole time: the per-screen preview filters
// out every name in TABS, and "Ranks" and "Profile" kept appearing in it -- they survived the
// filter precisely because the guard did not know they were tabs.
//
// So nav is clicked BY ACCESSIBLE NAME like the sub-tabs, and a click that does not land is
// fail-closed rather than noted. A tab that is never opened has no findings for the same reason
// an empty query has no rows, and "no findings" is what this guard prints when it is working.
//
// NOTHING HAS YET ASKED about the Profile tab's own sections, and that phrasing is deliberate --
// write a coverage limit as "nothing has asked X", never as "X is out of scope", because the
// first invites the next session to go and ask and the second reads as a decision already made.
// The paragraph above is what happened when somebody finally read one of these as a worklist.
//
// Concretely: MyFiledReports (useMyFiledReports) and CatchLedger (useBelajCatches) are DB-backed
// and carry no xUnavailable flag. This run reports Profile as says-empty=YES and rule 2 stays
// quiet, because those sections are empty in BOTH runs -- the fixture has no filed reports and
// no catches. An absence the fixture happens to share is UNMEASURABLE, not absent; the same
// reason a zero-row column is unguarded by construction in check:field-renders. The crew-invites
// HEADING is in that same position and its injection case records it.
//
// It is reachable, though, and the friend-requests fix is the proof of method: the flag keys on
// isError, NOT on whether any row exists, so gating the copy changes the screen under an outage
// whether or not the fixture has data. One query at a time, as the note above already insists.
//
// THE ROUTE DETAIL screen is walked now, and the paragraph that used to sit here explaining why
// it could not be is kept in outline because its REASON was removed rather than worked around.
// It said the guard spawns PLAIN vite, so the overlay scaffold's opener is absent and `?zr=1` is
// unavailable; the spawn below now passes scripts/signed-in.config.mjs, which calls buildOpener
// and routeDetailTransform. Both are inert without a `?z=`/`?zr=` parameter, so every screen
// walked before the route page is measured exactly as it was before that changed.
//
// WHAT THE STOP ACTUALLY REACHES, stated narrowly because `?zr=1` opens ROUTES[0] -- a SEED
// route, not one from the catalog -- and lands on the OVERVIEW sub-tab. That is enough for
// `reportsUnavailable`, and it was checked before the first CI run rather than hoped for: two of
// its six render sites are inside the `tab==="overview"` branch, and the caption above the
// consensus flips whether or not the seed route's own `activity` fills the panel below it. The
// flag keys on isError, not on whether rows exist, which is the same property that made the
// friend-requests flag measurable against a fixture holding no data.
//
// NOTHING HAS YET ASKED about `toposUnavailable` or `useProfilesByIds`. Topos render on the
// PHOTOS sub-tab and this stop does not click it, so that flag is honest copy no walk has ever
// exercised -- #1220 proved its branch by rendering ConsensusPanel directly in
// scripts/oneoff/probe-consensus-outage-copy.mjs, which is a component test and not a walk. The
// route page has six sub-tabs; walking them is six more settles in each of two runs, so it is a
// cost question rather than a reachability one now. Click one when a flag lands on it.
//
// A MISS ON A LOADED BOX IS NOT EVIDENCE. The ranks injection reported MISSED at a load average
// of ~450 and CAUGHT at ~260, same commit: under heavy load a screen can fail to settle, compare
// equal to its healthy twin, and be skipped rather than judged. Re-run a miss on a quiet machine
// before believing it, and read the per-screen table the harness now prints on a miss.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import { createFixture, sessionForStorage, STORAGE_KEY } from "./lib/ui-fixture.mjs";
import { durableFixture, durableCredsPresent } from "./lib/durable-fixture.mjs";
import { assertDbReachable } from "./lib/db-preflight.mjs";
import { SPINNER_RE } from "./lib/render-settle.mjs";
import { tapByName } from "./lib/tap-by-name.mjs";

const claim = (start) => new Promise((res, rej) => {
  let p = start;
  const go = () => {
    if (p >= start + 40) return rej(new Error("no free port"));
    const s = net.createServer();
    s.once("error", () => { p++; go(); });
    s.once("listening", () => s.close(() => res(p)));
    s.listen(p, "127.0.0.1");
  };
  go();
});

// The labels are `NAV[].label` verbatim, which are also the buttons' aria-labels.
const TABS = ["Home", "Climbs", "Partners", "Crew", "Logbook", "Ranks", "Profile"];
const ONLY = (process.env.ONLY || "").trim();
const SUBTAB = "Logbook:Completed";
// `isError` is FALSE while react-query is still retrying -- the property that makes an
// xUnavailable flag safe (a slow read reads as loading, not as broken). It also means
// WHICHEVER TAB IS WALKED FIRST is measured before any read has settled into an error, so
// it reports says-broken=no however well it is wired. Observed on Home with ONLY=objectives:
// Home said "0 routes" while Partners and Logbook, later in the SAME run, both said broken.
// A first-tab verdict is therefore evidence of nothing. Re-walk it once the rest has settled.
const REVISIT = "Home:revisited";
// The Crew tab has FOUR sub-views and this walk was only ever measuring one of them. `crewView`
// defaults to "crews", so the Crew screen captured above IS the Crews sub-view -- and the other
// three are each fed by their own query, each of which asserts absence in its own words:
//   Friends  <- useMyConnections   -> connections
//   Groups   <- useMyGroups        -> joinedGroups
//   Requests <- useMyCrewInvites   -> "No crew invites"
// None of those three carries an xUnavailable flag, and all three are React state hydrated from
// the query by an effect, so a failed read simply leaves the initial value -- loaded-and-empty
// and never-loaded are the same screen. This is the shape #734 already shipped once on the
// Requests view for a different root cause: a real invite under the words "No crew invites".
const CREW_SUBS = ["Friends", "Groups", "Requests"];
const ROUTE = "RouteDetail";
// REPORT is the SOLE enumerator for both the per-screen table and the two rules, so a screen
// captured into `out` and left out of this list is measured and never judged -- the guard walks
// it, prints nothing about it, and passes. The first version of the route-page stop did exactly
// that: RouteDetail was absent here, the table showed the same twelve screens as before, and the
// run went green having asked nothing. Caught by reading the table for the row that should have
// been added rather than by the exit code. ADD A NEW STOP HERE, not just to the walk.
const REPORT = [...TABS, SUBTAB, ...CREW_SUBS.map((s) => "Crew:" + s), REVISIT, ROUTE];
// The two verdicts. Hoisted because the WAIT below tests the same question the verdict does,
// and a wait that asked a different question would let the walk start before the thing it is
// waiting for is measurable.
//
// BROKEN carries a curly apostrophe as well as a straight one. Every string in this app uses
// the curly form, so the straight-quote alternative had never matched once and every
// says-broken=YES this printed for months came from "try again" or "unavailable" instead.
const BROKEN_RE = /couldn[\u2019']t|could not|failed|error|try again|retry|unavailable|problem|went wrong|offline/i;
// EMPTY is REPORTED, never asserted on, and that is deliberate: it is a keyword list and it
// demonstrably missed the last two defects found here -- the Home tiles said "0 routes" and
// "0 crews", which no phrasing in this pattern matches. Enumerating the ways a screen can
// claim emptiness is the losing half of this problem.
const EMPTY_RE = /no .* yet|nothing here|none yet|get started|add your first|no results|no climbs|no crews|no routes/i;
// RULE 2's vocabulary, and it is a different question from EMPTY_RE above. That one asks
// whether a whole screen reads as empty and is only ever reported. This one is applied to a
// single LINE that the outage introduced, which is a far narrower thing to be wrong about.
//
// It carries the zero-count forms as well as the "no X yet" ones, because the two defects most
// recently found here were counts: "0 routes" and "0 crews" on the Home tiles, and "0 climbs to
// go" in the Logbook. A vocabulary of absence that cannot spell zero misses the commonest way
// this app claims to have nothing.
// THIS LIST HAS NOW BEEN SHORT FOUR TIMES, and every miss was one more way of saying nothing
// rather than a different idea: "0 routes"/"0 crews" (the Home tiles), "0 climbs to go"/"0 logged"
// (the Logbook), "0 joined" (Crew:Groups), and "No crew invites" (Crew:Requests) -- the last two
// found by injections that MISSED, not by reading.
//
// The fourth is the instructive one, because the fix for the third did not prevent it. The "no X"
// branch demanded the noun IMMEDIATELY after "no", so it matched "no crews" and could not match
// "no CREW INVITES": one intervening word defeated it. That is the deny-list shape exactly -- it
// fails as a SHORTER WORKLIST, silently, and nothing about a quiet run looks wrong.
//
// So the branch now allows up to two words between "no" and the noun, and the nouns are singular
// or plural. It is still a deny-list and it will still be short one day; when a screen is added,
// check what its emptiness is CALLED before trusting a quiet run.
//
// A FIFTH way it was short, and this one was found by asking the question the paragraph above
// tells you to ask rather than by an injection missing. The pattern was written as one literal
// with the two branches spelled out separately, and they had DRIFTED: `lists`, `reports`,
// `catches` and `vouches` were spellable after "no" and NOT after "0". Nothing proves any of
// those four renders as a zero count today -- `c.reportCount` only reaches the screen when a
// consensus exists, so "0 reports" is not currently reachable -- so this is not a defect being
// fixed, it is the DENY-LIST DISEASE one level up: the vocabulary disagreed with itself about
// which nouns exist, and a hand-maintained second copy is how the next omission arrives.
//
// So the nouns are declared once and both branches are BUILT from them. That is the difference
// between an invariant and a promise: the halves can no longer drift, whatever anyone adds.
const ABSENCE_NOUNS = ["climb", "crew", "route", "area", "objective", "friend", "group", "invite",
  "list", "report", "catch", "vouch", "photo", "topo", "partner", "message"];
// A count can be followed by a VERB instead of a noun -- "0 logged", "0 joined" -- and both of
// those are real misses this guard has already paid for.
const ABSENCE_VERBS = ["logged", "joined", "confirmed"];
const _plural = (n) => n + (/(?:ch|sh|s|x)$/.test(n) ? "(?:es)?" : "s?");
const _NOUNS = ABSENCE_NOUNS.map(_plural).join("|");
const CLAIMS_NONE_RE = new RegExp(
  "no .* yet|nothing here|none yet|no results" +
  `|\\bno(?: \\w+){0,2} (?:${_NOUNS})\\b` +
  `|\\b0 (?:${_NOUNS}|${ABSENCE_VERBS.join("|")})\\b`, "i");
// EVERY PHRASING THIS GUARD HAS EVER MISSED, as an executable assertion rather than as the
// paragraph above. Four of these were real defects that shipped, and each was found only when
// somebody widened the pattern by hand; a comment recording them rots, and this repo has the
// scar to prove it. A rewrite that drops one fails here, before a browser is started.
for (const phrase of ["0 routes", "0 crews", "0 climbs to go", "0 logged", "0 joined",
                      "No crew invites", "No custom lists", "no friends yet", "No groups yet"]) {
  if (!CLAIMS_NONE_RE.test(phrase)) {
    console.error(`check:outage: rule 2's vocabulary can no longer spell ${JSON.stringify(phrase)},`
      + " which is a phrasing it was widened to catch. Widen it back before walking anything.");
    process.exit(1);
  }
}
// ...and the mirror, so a vocabulary widened until it matches ordinary copy fails too. A rule
// that fires on every screen is the same as a rule that fires on none.
for (const phrase of ["Recent condition reports", "Your crews", "Log a climb", "3 climbs to go"]) {
  if (CLAIMS_NONE_RE.test(phrase)) {
    console.error(`check:outage: rule 2's vocabulary now matches ${JSON.stringify(phrase)}, which`
      + " is ordinary copy. It would report a healthy screen as claiming emptiness.");
    process.exit(1);
  }
}

const settle = async (page) => {
  let last = "", same = 0;
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 700));
    const t = (await page.evaluate(() => document.body.innerText || "")).replace(/\d+/g, "#");
    if (t === last) { if (++same >= 3) break; } else { same = 0; last = t; }
  }
  return page.evaluate(() => document.body.innerText || "");
};

// A SPINNER IS STABLE TEXT, so settle() -- which decides a screen is done when its text stops
// changing -- calls a still-fetching screen finished. That is normally harmless because a
// healthy read arrives in well under the settle window. Under an outage it is not: the query
// RETRIES, and a screen whose query only STARTS when its tab is opened (the area browser's
// country list is the case) begins that retry cycle fresh, mid-walk, long after the boot-time
// wait has passed.
//
// It produced a false accusation on the first real run: check:outage failed the Climbs tab
// showing "Loading countries…", while DbAreaBrowser has carried an `ec ? "Couldn’t load
// countries"` branch all along. The app was right and the guard was early -- the direction that
// teaches people to ignore a guard.
//
// SPINNER_RE is imported from render-settle.mjs rather than written again here: this repo has
// already paid for the same vocabulary existing in four places and drifting.
async function waitOutFetch(page, fail) {
  let t = await settle(page);
  if (!fail) return t;
  for (let i = 0; i < 12 && SPINNER_RE.test(t); i++) {
    await new Promise((r) => setTimeout(r, 1000));
    t = await settle(page);
  }
  return t;
}

async function walk(browser, base, session, fail) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(
    ({ key, value }) => { try { window.localStorage.setItem(key, value); } catch {} },
    { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(session)) },
  );
  let blocked = 0, passed = 0;
  if (fail) {
    // Only the DATA path. Auth must keep working or the app would simply sign us out, which
    // is a different screen from "signed in, data unavailable" and not the one being studied.
    //
    // ONLY=<table> fails exactly ONE PostgREST table and lets the rest through. That is what
    // makes a per-flag verdict possible: with everything blocked, three flags on one screen go
    // true together and the run cannot tell you which of them produced which sentence -- nor
    // whether one is a blanket flag firing on data that merely had not arrived. #1140 asked for
    // a per-query healthy-vs-failing run, and this is the mechanism for it.
    //
    // Matched on the path segment after /rest/v1/, never as a substring: PostgREST names
    // EMBEDDED tables in the query string (select=*,crew_members(*)), so a substring test would
    // also fail requests aimed at a different table entirely.
    const only = (process.env.ONLY || "").trim();
    await page.route("**/rest/v1/**", async (route) => {
      if (only) {
        const m = /\/rest\/v1\/([^?/]+)/.exec(route.request().url());
        if (!m || m[1] !== only) { passed++; return route.continue(); }
      }
      blocked++;
      return route.fulfill({ status: 500, contentType: "application/json",
        body: JSON.stringify({ code: "57014", message: "canceling statement due to statement timeout" }) });
    });
  }
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
  const out = {};
  let first = await settle(page);
  // react-query RETRIES with backoff, so `isError` -- the signal every xUnavailable flag is
  // derived from -- is false for the first several seconds of an outage. That is the property
  // that makes the flag safe (a slow read reads as loading, not as broken) and it means a walk
  // starting immediately measures every screen BEFORE any read has given up, reporting a
  // correctly-wired app as clean.
  //
  // Observed, and it very nearly cost a session: with ONLY=objectives, Home said "0 routes"
  // while Partners and Logbook, LATER IN THE SAME RUN, both said broken. The wiring was right
  // and the measurement was not.
  //
  // So wait for the outage to become OBSERVABLE rather than for a fixed number of seconds. If
  // it never becomes observable the walk proceeds anyway and reports what it saw -- a guard
  // that waited forever for the app to admit a fault would never report the app that does not.
  if (fail) {
    for (let i = 0; i < 25 && !BROKEN_RE.test(first); i++) {
      await new Promise((r) => setTimeout(r, 1000));
      first = await page.evaluate(() => document.body.innerText || "");
    }
  }
  out.__booted = /Climbs|Partners|Logbook/.test(first) && first.length > 300;
  for (const t of TABS) {
    if (await tapByName(page, t)) out[t] = await waitOutFetch(page, fail);
    else {
      out.__navFail = (out.__navFail || []).concat(t);
      out[t] = "";
    }
  }
  // The Logbook's sub-tabs are a screen each, and the four false statements #1140 found were
  // all on the DEFAULT one. "Completed" is fed by a different query (climb_logs) and asserts
  // emptiness just as loudly -- "0 logged", "Log your completed climbs here" -- so a walk that
  // stops at the default view reports half of this screen and reads as though it covered it.
  if (!(await tapByName(page, "Logbook"))) out.__navFail = (out.__navFail || []).concat("Logbook (for Completed)");
  await settle(page);
  const comp = page.locator(`text="Completed"`).last();
  if (await comp.count()) await comp.click({ timeout: 5000 }).catch(() => {});
  const compText = await waitOutFetch(page, fail);
  // A sub-tab click that does not land leaves the DEFAULT view on screen, which reads as a
  // clean result rather than as a miss. Say which it was.
  out[SUBTAB] = /My Ascents|Log your completed climbs|Couldn\u2019t load your climbs/.test(compText)
    ? compText : "SUBTAB CLICK DID NOT LAND -- this is the default Logbook view, not Completed\n" + compText;
  // The three Crew sub-views. Reached by ACCESSIBLE NAME, never by text: the badge count renders
  // inside the button, so textContent is "Friends2". The count is in the aria-label too, and an
  // outage empties it back to a bare "Friends" -- so the selector has to accept both, which is
  // what tapByName's ^label(,|$) anchoring is for. A selector demanding the count could not find
  // the control in precisely the state this guard creates.
  // tapByName anchors at ^label(,|$), so "Crew" cannot select the "Crews" sub-tab beside it.
  if (!(await tapByName(page, "Crew"))) out.__navFail = (out.__navFail || []).concat("Crew (for sub-views)");
  await settle(page);
  for (const sub of CREW_SUBS) {
    if (await tapByName(page, sub)) out["Crew:" + sub] = await waitOutFetch(page, fail);
    else {
      // A sub-tab click that does not land leaves the PREVIOUS view on screen, and that reads
      // as a clean twin of the healthy run rather than as a miss -- a false pass on a screen
      // nobody looked at. Record it and fail the run instead of comparing whatever is there.
      out.__navFail = (out.__navFail || []).concat("Crew:" + sub);
      out["Crew:" + sub] = "";
    }
  }
  if (!(await tapByName(page, "Home"))) out.__navFail = (out.__navFail || []).concat("Home (revisit)");
  out[REVISIT] = await waitOutFetch(page, fail);
  // The route page, and it is NAVIGATED rather than driven. Climbs -> area -> row is three UI
  // steps that check:ui already reports as intermittent, and importing that flake into a guard
  // whose whole value is a clean healthy-vs-failing diff would be worse than not walking it.
  // `?zr=1` calls the app's own openRoute() from inside the opener, which no slow list or moved
  // control can defeat -- the same mechanism check:overflow uses.
  //
  // WHAT THIS DOES AND DOES NOT REACH, stated because the opener's own line is `openRoute(ROUTES[0])`
  // -- a SEED route, not one from the catalog. That does not make the stop vacuous: RouteDetail
  // calls useRouteTripReports(USE_DB ? route.id : null), so the query runs for whatever id is open
  // and errors under an outage whether or not any row would have come back. `reportsUnavailable` is
  // keyed on isError, not on whether rows exist, which is the same property that made the
  // friend-requests flag measurable against a fixture with no data.
  //
  // But a seed route also arrives with its OWN `activity`, so the consensus is not empty in either
  // run and only the caption above it can move. If this screen compares identical in both runs the
  // guard will say so in its normal seed-backed wording -- read that as "this stop measured
  // nothing", not as "the route page is fine", and open a CATALOG route instead. First CI run
  // decides it; do not assume from here.
  await page.goto(base + "?zr=1", { waitUntil: "domcontentloaded", timeout: 120000 });
  const opened = await page.waitForFunction(() => window.__routeOpen === true, null, { timeout: 30000 })
    .then(() => true).catch(() => false);
  if (!opened) {
    // Fail closed. Without the route open this is the Home tab, which would compare equal to its
    // healthy twin and read as a clean result for a screen nobody looked at.
    out.__navFail = (out.__navFail || []).concat(ROUTE + " (?zr=1 never set window.__routeOpen)");
    out[ROUTE] = "";
  } else {
    // THE RELOAD RESETS REACT-QUERY'S RETRY CLOCK, so the outage has to be waited out again here.
    // Measuring straight after the navigation reports a correctly-wired page as clean, which is
    // the same mistake the boot wait above exists to prevent -- one navigation later.
    let rt = await waitOutFetch(page, fail);
    if (fail) {
      for (let i = 0; i < 25 && !BROKEN_RE.test(rt); i++) {
        await new Promise((r) => setTimeout(r, 1000));
        rt = await waitOutFetch(page, fail);
      }
    }
    out[ROUTE] = rt;
  }
  out.__blocked = blocked;
  out.__passed = passed;
  await page.close();
  return out;
}

// Ask ONCE, up front, whether the database can answer at all. Without this a real outage is
// indistinguishable from a regression: every screen would fail to fill, nothing would settle,
// and the walk would burn its timeouts and then blame the author's PR.
await assertDbReachable({ label: "check:outage" });

const port = await claim(5460);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
// --config is what makes the route page reachable. scripts/signed-in.config.mjs is the right
// one of the five: it is built for a REAL signed-in account and rewrites NOTHING about state
// (unlike zero-state.config.mjs, which forces a brand-new account and would silently walk the
// wrong app here). It calls buildOpener + routeDetailTransform, and both are inert without a
// `?z=`/`?zr=` parameter, so every screen walked before the route page is measured exactly as
// it was before this changed.
const server = spawn("npx", ["vite", "--config", "scripts/signed-in.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "" } });
const up = async () => { for (let i = 0; i < 90; i++) { try { if ((await fetch(base)).ok) return true; } catch {} await new Promise(r => setTimeout(r, 1000)); } return false; };
if (!await up()) { server.kill(); throw new Error("dev server never came up"); }

let fixture = null, browser = null;
try {
  console.log("creating fixture accounts...");
  // Two fixture modes, and WHICH ONE RUNS SAYS WHERE THIS IS. Locally it creates a pair per
  // run with the SERVICE key and destroys them after. In CI it signs in to two DURABLE
  // accounts with the ANON key only -- CI must never hold the service key, and that rule is
  // exactly why this guard could not simply be lifted out of scripts/oneoff/ unchanged.
  fixture = durableCredsPresent()
    ? await durableFixture((m) => console.log("  " + m))
    : await createFixture((m) => console.log("  " + m));
  browser = await chromium.launch({ channel: "chrome" });

  console.log("\n--- control: database HEALTHY ---");
  const ok = await walk(browser, base, fixture.session, false);
  console.log(`app on screen: ${ok.__booted ? "yes" : "NO"}`);

  console.log(ONLY
    ? `\n--- database FAILING for /rest/v1/${ONLY} ONLY (57014); every other read succeeds ---`
    : "\n--- database FAILING (every read 57014) ---");
  const bad = await walk(browser, base, fixture.session, true);
  console.log(`app on screen: ${bad.__booted ? "yes" : "NO"}  (${bad.__blocked} reads blocked` +
    (ONLY ? `, ${bad.__passed} let through` : "") + `)\n`);
  // A zero here means the interception never matched, and every verdict below would then be a
  // statement about a HEALTHY app. Fail loudly rather than printing a clean-looking table.
  if (!bad.__blocked) {
    console.log(ONLY
      ? `NOTHING WAS BLOCKED. No request hit /rest/v1/${ONLY} during the walk -- check the table name.`
      : "NOTHING WAS BLOCKED. The interception never fired; nothing below was measured.");
    process.exitCode = 1;
  }

  let anyDbBacked = false, changed = 0;
  const findings = [];
  for (const t of REPORT) {
    const same = ok[t] === bad[t];
    if (!same) { anyDbBacked = true; changed++; }
    const text = bad[t] || "";
    const broken = BROKEN_RE.test(text);
    const empty = EMPTY_RE.test(text);
    // TWO RULES, because one of them alone was measurably not enough.
    //
    // RULE 1, vocabulary-free: if the outage changed what this screen renders, the screen must
    // SAY something went wrong. This is the strong form and it catches the whole-screen-silent
    // class -- the original crew defect (#1124), where the entire content was the sub-tab bar
    // and nothing anywhere said a word.
    //
    // RULE 2, line-level: no line that the OUTAGE INTRODUCED may claim there is nothing.
    //
    // Rule 2 exists because rule 1, injection-tested, MISSED the Partners defect (#1164) --
    // and the reason generalises: A SCREEN IS A MIXTURE. Under an outage the Partners page's
    // real-accounts panel honestly says "Couldn't load climbers right now", so rule 1 was
    // satisfied by one section while a different section of the same screen went on telling a
    // climber who has an objective that they have none. Vocabulary-free bought robustness
    // about WORDING at the price of being blind to SCOPE.
    //
    // Comparing against the healthy render is what keeps rule 2 quiet: a line claiming nothing
    // in BOTH runs is a true empty state, not an outage lie. That is why "Saved areas · 0
    // areas" -- client-only state with no query behind it -- is correctly never reported.
    const okLines = new Set((ok[t] || "").split("\n").map((l) => l.trim()).filter(Boolean));
    const introduced = text.split("\n").map((l) => l.trim()).filter(Boolean)
      .filter((l) => !okLines.has(l) && !TABS.includes(l));
    const lying = introduced.filter((l) => CLAIMS_NONE_RE.test(l) && !BROKEN_RE.test(l));
    if (!same && !broken) findings.push({ screen: t, why: "nothing on it says anything went wrong", text });
    else if (!same && lying.length) findings.push({ screen: t, why: `the outage introduced ${JSON.stringify(lying.slice(0, 4))}`, text });
    console.log(`${t.padEnd(9)} healthy ${String((ok[t]||"").length).padStart(5)}ch  failing ${String(text.length).padStart(5)}ch  ` +
      `${same ? "IDENTICAL (seed-backed, proves nothing)" : `CHANGED  says-broken=${broken ? "YES" : "no"}  says-empty=${empty ? "YES" : "no"}`}`);
    // Print what the climber ACTUALLY sees. The broken/empty regexes are a summary and have
    // been wrong before; the text is the evidence.
    if (!same) {
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean).filter((l) => !TABS.includes(l));
      console.log(`          -> ${JSON.stringify(lines.slice(0, 7))}`);
      if (process.env.DUMP === t) console.log(`\n          FULL ${t} (failing):\n${text}\n`);
    }
  }
  if (!anyDbBacked) {
    console.log("\nNO screen changed. Either these tabs are all seed-backed for this account, or the");
    console.log("interception never fired — check the blocked count above before reading anything into it.");
  }

  // Home is measured TWICE and judged ONCE, on the REVISIT. The two measurements are not equal
  // in weight: the first is taken before the reads have settled (see the wait in walk()) and is
  // the unreliable one; the revisit is the settled measurement of the same screen. So the
  // first-visit entry is never counted -- it is still PRINTED above as evidence, but a verdict
  // is only ever taken from the settled read.
  //
  // The symmetric rule this replaced -- "if exactly one of the pair fires, drop it" -- would
  // have discarded the RELIABLE measurement whenever the flaky one happened to pass. That is a
  // false pass on the one screen measured twice precisely because it is awkward.
  const netFindings = findings.filter((f) => f.screen !== "Home");

  // FAIL CLOSED. Every one of these means "nothing was measured", which prints identically to
  // a clean app: the whole realistic failure mode of this guard is a false pass.
  let dead = null;
  if (!ok.__booted) dead = "the app never came up on the HEALTHY run, so there is no control to compare against";
  else if (!bad.__booted) dead = "the app never came up on the FAILING run — this is a boot failure, not a data verdict";
  else if (!bad.__blocked) dead = "no request was intercepted, so every verdict above is a statement about a healthy app";
  else if (changed < 3) dead = `only ${changed} screen(s) differed between the two runs; the walk did not reach the DB-backed surfaces`;
  else if (ok.__navFail || bad.__navFail) dead = `a tab or sub-tab click did not land (${[...new Set([...(ok.__navFail || []), ...(bad.__navFail || [])])].join(", ")}), so that screen was never on the page to be judged — this is how "Me" went unwalked for months`;
  if (dead) {
    console.log(`\ncheck:outage DID NOT RUN: ${dead}.`);
    process.exitCode = 1;
  } else if (netFindings.length) {
    console.log(`\ncheck:outage FAILED — ${netFindings.length} screen(s) misreport an outage.`);
    console.log("A climber cannot tell these apart from an account that really is empty.\n");
    for (const f of netFindings) {
      console.log(`  ${f.screen} — ${f.why}`);
      const lines = f.text.split("\n").map((l) => l.trim()).filter(Boolean).filter((l) => !TABS.includes(l));
      console.log(`      on screen: ${JSON.stringify(lines.slice(0, 8))}`);
    }
    console.log("\nThe repair is an `xUnavailable` flag from that query's `isError`, one flag per query,");
    console.log("and the copy swapped where the screen asserts a count or an emptiness. Find the QUERY,");
    console.log("not the string: one read can feed surfaces on more than one tab.");
    process.exitCode = 1;
  } else {
    console.log(`\nok — all ${changed} changed screen(s) say something went wrong, and none of them started claiming to be empty.`);
  }
} finally {
  if (browser) await browser.close();
  // cleanup(), NOT teardown() — the wrong name plus a .catch() would silently leak two real
  // accounts into the production project, where a fake climber shows up in partner search.
  // Caught by reading the fixture's API before running, not after.
  if (fixture) await fixture.cleanup();
  server.kill();
}
