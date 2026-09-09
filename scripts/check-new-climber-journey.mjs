#!/usr/bin/env node
// check:new-climber-journey — does what a NEW climber enters actually survive?
//
// WHY THIS EXISTS. Four static censuses found six defects that a real account hits in its first
// hour (#1554, #1563, #1569, #1576): onboarding saved nothing, a crew could not be found, a friend
// could not be removed, a shared route was never sent, and the trust card accused you of honouring
// 0% of crews you had never joined. Every one of them shared ONE shape -- state changed on screen
// and nothing was stored -- and every one needed its own census to find. A single walk that TYPES
// SOMETHING IN AND THEN RELOADS would have found them together.
//
// WHAT MAKES IT DIFFERENT FROM check:signed-in. That guard walks screens as an account that
// ALREADY OWNS THINGS and asserts what renders. This one performs the actions a brand-new climber
// performs and then asks the DATABASE, not the screen. A screen assertion cannot see this class:
// the optimistic local state renders perfectly, which is exactly why six defects survived.
//
// WHAT IT COVERS TODAY -- THREE of the six, stated as a count so it cannot quietly stall.
//   1. onboarding (#1576): disciplines and a grade typed in, then read back out of `profiles`
//      and off the screen after a reload.
//   2. the crew (#1554): a row a real account opens, found by a DIFFERENT real account through
//      crew_listings.
//   3. remove-friend (#1563): a connection a real account removes, asked of `connections` and
//      then of the screen after a reload.
// The three still uncovered are #1569's reliability ratio and connect button and #1576's route
// share. Each needs its own two-account or reload shape; none is covered by a screen assertion.
//
//   node scripts/check-new-climber-journey.mjs
//
// HAND-RUN, and the reason is a credential rule rather than a preference. It creates a REAL
// account and MUTATES its profile, so it needs the service key -- which CI must never hold -- and
// the durable CI pair is not a substitute, because a concurrent guard signed in as that account
// would be walking a profile this rewrites mid-run. Declared in check:guard-wiring's EXCLUDED.
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { createFixture, sweepOrphans, sessionForStorage, STORAGE_KEY } from "./lib/ui-fixture.mjs";
import { SUPABASE_URL, requireServiceKey, anonKey } from "./lib/supabase-env.mjs";
import { settledText } from "./lib/render-settle.mjs";
import { tapByName } from "./lib/tap-by-name.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const log = (m) => console.log(m);
let fails = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { console.log("  FAIL  " + m); fails++; };
// process.exit() skips finally, so a failure would leak the account it just created -- the trap
// check:block-guarantees records after leaking two accounts and a crew on its first red run.
const dead = (m) => { throw new Error(m); };

const freePort = () => new Promise((res, rej) => {
  const s = net.createServer();
  s.on("error", rej);
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});
const waitForServer = async (base) => {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(base, { signal: AbortSignal.timeout(2000) }); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

// The route the phase-2 crew is opened on. A REAL catalog row, so CrewFinder can resolve its
// name -- a crew on an id the routes table lacks would render blank and read as the defect.
const JOURNEY_ROUTE = "wa_mount_baker_north_ridge";
const JOURNEY_ROUTE_NAME = "North Ridge";

const key = requireServiceKey();
const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const profileRow = async (uid) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${uid}`, { headers: H });
  if (!r.ok) dead(`could not read the profile back: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0] || null;
};

let server, browser, fixture;
try {
  await sweepOrphans(log);
  const port = await freePort();
  const base = `http://127.0.0.1:${port}/`;
  server = spawn("npx", ["vite", "--config", "scripts/journey.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  let died = false;
  server.on("exit", () => { died = true; });
  if (!(await waitForServer(base)) || died) dead("dev server never came up");

  log("creating a brand-new account...");
  fixture = await createFixture(log);
  const uid = fixture.owner.id;

  // createFixture seeds disciplines/grades because it serves check:signed-in, whose account is
  // meant to own things. A NEW climber owns none, so clear exactly the fields under test -- and
  // clear them through the service key rather than by adding a mode to the shared fixture, which
  // four other guards depend on.
  {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, {
      method: "PATCH", headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify({ disciplines: [], sport_grade: null, trad_grade: null, boulder_grade: null }),
    });
    if (!r.ok) dead(`could not blank the fixture profile: ${r.status} ${await r.text()}`);
    log("  blanked the fixture's disciplines and grades — this walk is about a NEW climber");
  }

  // THE BASELINE IS LOAD-BEARING. "the columns are populated after onboarding" proves nothing
  // unless they were empty before -- a fixture that seeds a profile would make every assertion
  // below pass whatever the app did.
  const before = await profileRow(uid);
  if (!before) dead("the new account has no profiles row at all");
  const emptyBefore = !(before.disciplines && before.disciplines.length) && !before.sport_grade;
  if (emptyBefore) ok("the new account starts with no disciplines and no grades");
  else bad(`the fixture already has disciplines/grades (${JSON.stringify(before.disciplines)}, ${before.sport_grade}) — every assertion below would pass vacuously`);

  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));
  // Re-applied on every navigation, so the RELOAD below stays signed in -- which is the whole test.
  await page.addInitScript(
    ({ k, v }) => { try { window.localStorage.setItem(k, v); } catch {} },
    { k: STORAGE_KEY, v: JSON.stringify(sessionForStorage(fixture.session)) },
  );

  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
  await settledText(page);

  // READ THE FLAG BEFORE DESCRIBING ANYTHING. `onboarded` and `authed` are BOTH
  // useState(DEMO_AUTOLOGIN), so this one value decides whether onboarding auto-opens and whether
  // the Home "Set up your climbing profile" card renders. journey.config.mjs publishes it; two
  // earlier runs guessed at it and were wrong both times.
  const demoFlag = await page.evaluate(() => globalThis.__DEMO_AUTOLOGIN);
  if (demoFlag === undefined) dead("journey.config did not publish __DEMO_AUTOLOGIN — the walk would be reasoning about a flag it cannot see");
  if (demoFlag === true) bad("DEMO_AUTOLOGIN is TRUE in this walk, so a brand-new REAL account is treated as already onboarded (onboarded = useState(DEMO_AUTOLOGIN)). Nothing below is a statement about a new climber.");
  else ok("DEMO_AUTOLOGIN is false — this really is a new-climber walk");

  const clickText = async (t) => page.evaluate((txt) => {
    const el = [...document.querySelectorAll("button,a,[role=button]")]
      .find((e) => (e.innerText || "").trim() === txt);
    if (!el) return false;
    el.click(); return true;
  }, t);

  // ---- ONBOARDING ------------------------------------------------------------------------------
  // ONBOARDING DOES NOT AUTO-OPEN FOR A REAL ACCOUNT, AND THAT IS A FINDING THIS WALK MADE.
  //   useEffect(()=>{if(authed&&!onboarded)setOnboardOpen(true);},[authed])
  // `authed` is useState(DEMO_AUTOLOGIN) and setAuthed(true) is called in exactly ONE place --
  // LoginScreen's onAuth, the !realAuthGate DEMO branch. A real session renders <AuthModal
  // onAuthed={()=>{}}/> -- a NO-OP -- and the app is gated on `signedIn` instead. So `authed`
  // stays false forever on the real path and that effect can never fire: the modal written to
  // onboard a new climber never opens for one.
  //
  // Reported, NOT auto-fixed. The obvious repair (fire on `signedIn`) would nag EVERY climber on
  // EVERY load, because `onboarded` is useState(DEMO_AUTOLOGIN) and is not persisted either -- it
  // is false on every page load for everybody. A correct fix derives "has this climber onboarded"
  // from their profile having disciplines, which only became possible once #1576 gave onboarding
  // somewhere to write. That changes when a modal appears, so it is a product call.
  // IS THERE A VISIBLE WAY IN AT ALL? Asked of the page TEXT, not of my control selector -- an
  // earlier pass concluded "the card is absent" from a list of controls, which cannot tell a card
  // that did not render from one my selector did not match. Both gates are measured above:
  // DEMO_AUTOLOGIN is false so `onboarded` is false, and homeDismiss starts [], so
  // (!onboarded && !dismissed) is TRUE and the card is supposed to be here.
  const homeText = await page.evaluate(() => document.body.innerText || "");
  const cardVisible = homeText.includes("Set up your climbing profile");
  if (cardVisible) bad("STALE DECLARATION: the setup card now renders on Home. That is the fix this guard records as NOT done — drop the KNOWN below and make this an ok().");
  else {
    // NOT ON HOME. Where is it? The JSX sits immediately after the DbAreaBrowser Suspense block
    // and the area comments -- i.e. inside the CLIMBS tab region, not Home. Checked rather than
    // asserted, because an earlier brace-balance "proved" it was inside tab==="today" by finding
    // the outer SCROLL CONTAINER (349672->526500) rather than the Home-only block. Balancing to a
    // container and calling it a screen is how that went wrong.
    const onClimbs = await (async () => {
      if (!(await clickText("Climbs"))) return null;
      await settledText(page);
      const t = await page.evaluate(() => document.body.innerText || "");
      return t.includes("Set up your climbing profile");
    })();
    if (onClimbs === null) bad("could not open the Climbs tab to locate the setup card");
    else if (onClimbs) {
      // A SECOND DECLARED KNOWN, and it FAILS AS STALE the day the card appears on Home.
      // Reported rather than moved: the Home layout is a locked product decision, and this is a
      // placement change a climber sees, not polish. The evidence that Home was the intent is the
      // dismiss state's own name -- `homeDismiss`, keyed "climbsetup" -- and Home already carries
      // the sibling setup checklist ("Add your climbing grades", "Set your availability").
      console.log("  KNOWN the 'Set up your climbing profile' card renders on the CLIMBS tab, not Home.");
      console.log("        A new climber lands on Home, so the one prompt to set up their profile is on");
      console.log("        a screen they have no reason to open first. Its JSX sits immediately after the");
      console.log("        DbAreaBrowser Suspense block, inside the Climbs region. Both its gates are");
      console.log("        satisfied (!onboarded && !dismissed) -- it is placement, not a dead gate.");
    }
    else bad("'Set up your climbing profile' renders on neither Home nor Climbs, though !onboarded && !dismissed are both true");
    await clickText("Home");
    await settledText(page);
  }

  // HOW A CLIMBER REACHES ONBOARDING, established by walking rather than by reading.
  // 1. It does NOT auto-open. `useEffect(()=>{if(authed&&!onboarded)setOnboardOpen(true);},[authed])`
  //    and setAuthed(true) is called in exactly ONE place -- LoginScreen's onAuth, the !realAuthGate
  //    DEMO branch. A real session renders <AuthModal onAuthed={()=>{}}/>, a NO-OP, and the app is
  //    gated on `signedIn` instead.
  // 2. The Home "Set up your climbing profile" card is NOT on screen either, and that is UNEXPLAINED
  //    rather than diagnosed: it renders on tab==="today" gated on (!onboarded && !dismissed), and
  //    `onboarded` is useState(DEMO_AUTOLOGIN) which this config forces false. All 28 Home controls
  //    were dumped and it is absent. Recorded as a question, not a cause -- two runs were already
  //    spent on a confident wrong story about the env flag.
  // 3. Settings -> "Edit areas, disciplines & grades" DOES open it, and that is the path used here.
  let entered = "settings";
  if (await clickText("Set up my profile")) {
    entered = "auto";
    bad("STALE DECLARATION: onboarding now auto-opens for a real account. That is the fix this guard records as NOT done — drop the KNOWN block below and delete this branch.");
  } else {
    if (!(await clickText("Settings"))) dead("no Settings control on Home");
    await settledText(page);
    if (!(await clickText("Edit areas, disciplines & grades"))) {
      const seen = await page.evaluate(() => [...document.querySelectorAll("button,a,[role=button]")]
        .map((e) => (e.innerText || "").trim()).filter(Boolean).slice(0, 40));
      dead("Settings did not offer 'Edit areas, disciplines & grades'. Controls: " + JSON.stringify(seen));
    }
    await settledText(page);
    if (!(await clickText("Set up my profile"))) {
      // Already past step 0 -- the editing entry can land on step 1 directly, which is fine.
      const onStep1 = await page.evaluate(() => (document.body.innerText || "").includes("WHAT DO YOU DO?"));
      if (!onStep1) dead("Settings opened something that is not Onboarding");
    }
    // A DECLARED KNOWN STATE, not a failure -- and it FAILS AS STALE the day it is fixed, which
    // is the standard check:field-renders' KNOWN map is held to. Reported rather than repaired
    // because the obvious fix is wrong: firing on `signedIn` would nag EVERY climber on EVERY
    // load, since `onboarded` is useState(DEMO_AUTOLOGIN) and is not persisted either. A correct
    // fix derives "has this climber onboarded" from their profile carrying disciplines, which only
    // became possible once #1576 gave onboarding somewhere to write -- and it changes when a modal
    // appears, so it is a product call rather than polish.
    console.log("  KNOWN onboarding does not auto-open for a real account. authed is useState(DEMO_AUTOLOGIN)");
    console.log("        and setAuthed(true) is called in exactly ONE place -- LoginScreen's onAuth, the");
    console.log("        !realAuthGate DEMO branch. A real session renders <AuthModal onAuthed={()=>{}}/>,");
    console.log("        a no-op, so the effect that exists to onboard a new climber can never fire.");
    console.log("        Reachable only via Settings -> Edit areas, disciplines & grades.");
  }
  await settledText(page);
  ok(`onboarding is open (entered via ${entered})`);

  // The discipline chips carry aria-pressed and their own label; pick two by that shape rather
  // than by a hardcoded name, so a renamed discipline does not read as a broken walk.
  const picked = await page.evaluate(() => {
    const chips = [...document.querySelectorAll("button[aria-pressed]")]
      .filter((b) => (b.innerText || "").trim().length > 2);
    const take = chips.slice(0, 2);
    take.forEach((b) => b.click());
    return take.map((b) => (b.innerText || "").trim());
  });
  if (picked.length !== 2) dead(`found ${picked.length} discipline chips, expected at least 2 — the walk entered nothing`);
  ok(`picked disciplines: ${picked.join(", ")}`);

  const grade = await page.evaluate(() => {
    const sel = [...document.querySelectorAll("select")].find((s) => (s.getAttribute("aria-label") || "").startsWith("Sport"));
    if (!sel) return null;
    const opt = [...sel.options].map((o) => o.value).find((v) => /^5\.\d/.test(v));
    if (!opt) return null;
    sel.value = opt;
    sel.dispatchEvent(new Event("change", { bubbles: true }));
    return opt;
  });
  if (!grade) dead("no Sport grade select — the walk entered no grade");
  ok(`picked a sport grade: ${grade}`);

  await settledText(page);
  if (!(await clickText("Finish setup"))) dead("'Finish setup' was not clickable — disciplines may not have registered");
  await settledText(page);
  ok("finished onboarding");

  // ---- THE ACTUAL QUESTION: DID IT REACH THE DATABASE? -----------------------------------------
  // Asked of the DB, not the screen. The screen showed it correctly the whole time this was broken.
  await new Promise((r) => setTimeout(r, 2500));
  const after = await profileRow(uid);
  const gotDiscs = !!(after && after.disciplines && after.disciplines.length);
  if (gotDiscs) ok(`disciplines reached the database: ${JSON.stringify(after.disciplines)}`);
  else bad("onboarding's disciplines never reached the database — they are lost on reload, and compat() scores them at 16 points each");
  if (after && after.sport_grade) ok(`the sport grade reached the database: ${after.sport_grade}`);
  else bad("onboarding's sport grade never reached the database");

  // ---- AND DOES THE SCREEN SHOW IT AFTER A RELOAD? ----------------------------------------------
  // The DB write is necessary and not sufficient: the sign-in hydration has to read it back.
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
  await settledText(page);
  // ON THE PROFILE TAB, not Home. Home does not display your disciplines at all, so the first
  // version of this assertion searched a screen that never shows them and reported a false
  // failure -- against a write that had demonstrably landed one assertion earlier.
  if (!(await clickText("Profile"))) dead("no Profile tab after the reload");
  await settledText(page);
  const reloaded = await page.evaluate(() => document.body.innerText || "");
  const shown = picked.filter((d) => reloaded.toLowerCase().includes(d.toLowerCase()));
  if (shown.length) ok(`after a reload the app still shows ${shown.length} of the ${picked.length} disciplines entered`);
  else bad(`after a reload the Profile shows none of the entered disciplines (${picked.join(", ")}) — the write landed but the hydration does not read it back`);
  if (!(await clickText("Set up my profile"))) ok("onboarding does not re-open — the account is set up");
  else bad("onboarding re-opened after a reload, so nothing it collected was remembered");

  // ---- PHASE 2: A CREW ONE REAL CLIMBER OPENS, FOUND BY ANOTHER --------------------------------
  // The question that started this whole thread, and the ONLY test of it with two real accounts.
  // probe-crewfinder-shows-a-real-crew.mjs renders the component over a SYNTHETIC crew; this walks
  // a row that actually exists, read through crew_listings by a DIFFERENT signed-in account.
  //
  // The crew must contain NEITHER climber: App excludes crews you organise or are already in, so
  // reusing a fixture crew would assert on a row the finder is right to hide. It is created here,
  // owned by the OWNER, and torn down explicitly.
  let crewId = null;
  try {
    const mk = await fetch(`${SUPABASE_URL}/rest/v1/crews`, {
      method: "POST", headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify({ created_by: uid, route_id: JOURNEY_ROUTE, dates: [], cap: 4 }),
    });
    if (!mk.ok) dead(`could not create the findable crew: ${mk.status} ${await mk.text()}`);
    crewId = (await mk.json())[0].id;
    ok(`the owner opened a crew (${crewId.slice(0, 8)}) on ${JOURNEY_ROUTE}`);

    // Sign in as the MATE. Over the auth API rather than the sign-in modal, for the reason
    // ui-fixture states: deterministic, and not coupled to that modal's markup.
    const tok = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST", // anonKey(), not process.env: supabase-env loads the credentials from the DOTFILES, so the
      // environment does not carry them and the token endpoint answers 401 "Invalid API key".
      headers: { apikey: anonKey(), "Content-Type": "application/json" },
      body: JSON.stringify({ email: fixture.mate.email, password: fixture.mate.password }),
    });
    const mateBody = await tok.json();
    if (!tok.ok || !mateBody.access_token) dead(`could not sign in as the mate: ${tok.status} ${JSON.stringify(mateBody).slice(0, 200)}`);

    const mp = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
    await mp.addInitScript(({ k, v }) => { try { window.localStorage.setItem(k, v); } catch {} },
      { k: STORAGE_KEY, v: JSON.stringify(sessionForStorage(mateBody)) });
    await mp.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
    await settledText(mp);

    const mateClick = async (t) => mp.evaluate((txt) => {
      const el = [...document.querySelectorAll("button,a,[role=button]")]
        .find((e) => (e.innerText || "").trim() === txt);
      if (!el) return false; el.click(); return true;
    }, t);

    if (!(await mateClick("Partners"))) dead("the mate could not open the Partners tab");
    await settledText(mp);
    if (!(await mateClick("Join a crew"))) dead("no 'Join a crew' control on Partners");
    await settledText(mp);
    // "My Objectives" is the default mode and filters to the VIEWER's objectives; the mate has
    // none on this route, so a crew correctly absent there would read as a defect. Ask "Any Crew".
    if (!(await mateClick("Any Crew"))) dead("no 'Any Crew' mode button in CrewFinder");
    await settledText(mp);

    const seenByMate = await mp.evaluate(() => document.body.innerText || "");
    if (seenByMate.includes(JOURNEY_ROUTE_NAME)) ok(`the mate FINDS the owner's crew ("${JOURNEY_ROUTE_NAME}") in Join a crew`);
    else bad(`the mate cannot find the owner's crew — "${JOURNEY_ROUTE_NAME}" is absent from Join a crew, so a real climber's crew is invisible to another real climber`);
    if (/undefined/.test(seenByMate)) bad("the crew list contains the word undefined — a row resolved against the wrong store");
    else ok("no undefined in the mate's crew list");
    await mp.close().catch(() => {});
  } finally {
    if (crewId) await fetch(`${SUPABASE_URL}/rest/v1/crews?id=eq.${crewId}`, { method: "DELETE", headers: H }).catch(() => {});
  }

  // ---- PHASE 3: A FRIEND A REAL CLIMBER REMOVES STAYS REMOVED ----------------------------------
  // #1563. "Remove friend" filtered local state and toasted success while `removeConnection` sat
  // imported and called from NOWHERE -- so a climber tapped Remove, was told it worked, the row
  // vanished, and the connection was still there on the next load.
  //
  // NOTHING COULD SEE IT, and the near misses are why this belongs in a walk rather than a static
  // gate: check:writes forbids a success message in front of a write whose FAILURE is
  // unobservable, and check:claims one for a write that only runs signed-in -- neither can see a
  // toast in front of NO WRITE AT ALL. Every screen assertion passed throughout, because the
  // optimistic local state rendered perfectly. That is the shape all six defects shared.
  //
  // probe-remove-friend-persists.mjs is scoped to the HANDLER's source; this is the round trip --
  // a real account taps Remove in the real overlay, and then the DATABASE is asked whether the row
  // actually went, and a RELOAD asked whether the friend stays gone.
  const connFilter = `or=(and(requester.eq.${uid},addressee.eq.${fixture.mate.id}),and(requester.eq.${fixture.mate.id},addressee.eq.${uid}))`;
  const connRows = async () => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/connections?select=id,status&${connFilter}`, { headers: H });
    if (!r.ok) dead(`could not read the connections table: ${r.status} ${await r.text()}`);
    return r.json();
  };

  // THE BASELINE IS LOAD-BEARING, exactly as it is for onboarding above. "the row is gone after
  // Remove" proves nothing unless it was there first, and an account with no connection would
  // satisfy every assertion below whatever Remove did.
  const connBefore = await connRows();
  if (connBefore.length === 1) ok("the owner and the mate are connected — 1 row in `connections`");
  else bad(`expected exactly 1 connection row before removal, found ${connBefore.length} — every assertion below would be vacuous`);

  // THE CREW NAV BUTTON CARRIES A BADGE, so an exact-text click misses it. crewBadgeN renders an
  // unread/invite count INSIDE the button, and this fixture seats the owner as INVITED in a second
  // crew -- so innerText is not "Crew" for exactly the account this walk uses. The aria-label is
  // authored and does not move with the count, which is what tapByName's anchoring is for. Same
  // lesson as the Crew SUB-tab bar one line down, one level up the nav.
  if (!(await tapByName(page, "Crew"))) dead("no Crew tab");
  await settledText(page);
  // BY ACCESSIBLE NAME, never by text: the Crew sub-tab buttons render their badge count INSIDE
  // the control, so textContent is "Friends1" and every exact-text strategy misses. tapByName's
  // `^label(,|$)` anchoring is what accepts both "Friends" and "Friends, 1".
  if (!(await tapByName(page, "Friends"))) dead("no Friends sub-view on the Crew tab");
  await settledText(page);
  const friendsViewBefore = await page.evaluate(() => document.body.innerText || "");
  if (friendsViewBefore.length < 200) dead(`the Crew:Friends view rendered ${friendsViewBefore.length} chars — nothing below would mean anything`);

  // The Remove control lives in the FriendsList OVERLAY, not on the inline list, and the overlay
  // opens from "See all (N) →" -- matched by PREFIX because the count is inside the label, the
  // same reason tapByName exists.
  const openedList = await page.evaluate(() => {
    const el = [...document.querySelectorAll("button")].find((b) => /^See all\b/.test((b.innerText || "").trim()));
    if (!el) return false;
    el.click(); return true;
  });
  if (!openedList) dead("no 'See all' control on Crew:Friends — the friends overlay could not be opened");
  await settledText(page);

  // Read the friend's name AS THE APP RENDERS IT rather than deriving it. pubName() gates the
  // display name on show_name and otherwise falls back to a handle built from the name, so a
  // walk that computed the expected string would be re-implementing a rule that can move -- and
  // would then agree with itself whatever the app did.
  const rowNames = await page.evaluate(() => {
    return [...document.querySelectorAll("button")]
      .filter((b) => (b.innerText || "").trim() === "Remove")
      .map((b) => {
        const row = b.parentElement;
        const lines = ((row && row.innerText) || "").split("\n").map((s) => s.trim()).filter(Boolean);
        return lines[0] || "";
      });
  });
  // EXACTLY ONE, so the click is attributable. With two friends on screen this walk would remove
  // an arbitrary one and then assert about the pair, which is how a guard reports a pass for the
  // wrong reason.
  if (rowNames.length !== 1) {
    dead(`expected exactly 1 friend row with a Remove control, found ${rowNames.length} — the click would not be attributable`);
  }
  const friendName = rowNames[0];
  if (!friendName) dead("the friend row rendered no name — Remove would be asserted against a blank row");
  ok(`the friends list shows 1 friend (${friendName}) with a Remove control`);

  const clickedRemove = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].filter((x) => (x.innerText || "").trim() === "Remove");
    if (b.length !== 1) return false;
    b[0].click(); return true;
  });
  if (!clickedRemove) dead("the Remove control could not be clicked");
  await settledText(page);
  await new Promise((r) => setTimeout(r, 2500));

  // ---- THE ACTUAL QUESTION: DID THE REMOVAL REACH THE DATABASE? --------------------------------
  const connAfter = await connRows();
  if (connAfter.length === 0) ok("the connection row is GONE from the database");
  else bad(`"Remove" changed the screen and left the connection in the database (${connAfter.length} row(s) still there) — the climber is told it worked and the friend is back on the next load`);

  // ---- AND IS THE FRIEND STILL GONE AFTER A RELOAD? --------------------------------------------
  // The delete is necessary and not sufficient: a hydration that re-adds them would put the
  // friend back on screen with the row already gone.
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
  await settledText(page);
  if (!(await tapByName(page, "Crew"))) dead("no Crew tab after the reload");
  await settledText(page);
  if (!(await tapByName(page, "Friends"))) dead("no Friends sub-view after the reload");
  await settledText(page);
  const friendsViewAfter = await page.evaluate(() => document.body.innerText || "");
  // FAIL CLOSED: a screen that rendered nothing satisfies every "is absent" assertion below.
  if (friendsViewAfter.length < 200) dead(`the Crew:Friends view rendered ${friendsViewAfter.length} chars after the reload — its silence is not evidence`);
  if (!friendsViewAfter.includes(friendName)) ok(`after a reload ${friendName} is no longer in the friends list`);
  else bad(`after a reload ${friendName} is back in the friends list — the removal did not survive`);
  // THE OPENER IS THE FALSIFIABLE TEST HERE, AND A REMOVE-CONTROL COUNT IS NOT.
  // "See all (N)" renders only on `connections.length > 0`, so its absence is a direct
  // consequence of the removal having stuck. Counting Remove controls instead passes
  // VACUOUSLY: they live in the OVERLAY, which is not open after a reload, so that count is
  // 0 whatever the database holds. Found by reading the injected run, where it printed a
  // cheerful `ok` beside two failures — the assertion could not fail in this position.
  const openerAfter = await page.evaluate(() =>
    [...document.querySelectorAll("button")].filter((b) => /^See all\b/.test((b.innerText || "").trim())).length);
  if (openerAfter === 0) ok("Crew:Friends offers no 'See all' — the account really has no connections");
  else bad("Crew:Friends still offers 'See all' after the reload — the connection list is not empty");

  if (pageErrors.length) bad(`uncaught page errors: ${pageErrors.slice(0, 3).join(" | ")}`);
  else ok("no uncaught page errors during the journey");
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
  if (fixture && fixture.cleanup) {
    const leaked = await fixture.cleanup().catch((e) => [String(e)]);
    if (leaked && leaked.length) { console.error("LEAKED: " + leaked.join(", ")); fails++; }
  }
}

console.log(fails ? `\ncheck:new-climber-journey FAILED — ${fails} problem(s) a new climber would hit.`
                  : "\ncheck:new-climber-journey: ok — what a new climber enters survives a reload, the crew they open is found by another real climber, and a friend they remove stays removed.");
process.exit(fails ? 1 : 0);
