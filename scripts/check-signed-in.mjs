#!/usr/bin/env node
// Walks the app as a REAL, SIGNED-IN account that already owns things.
//
// Why this exists. The two checks either side of it cannot reach this state:
//
//   check:ui    walks the SEEDED demo, logged out, with VITE_DEMO_AUTOLOGIN forced on.
//               Every id it ever resolves is a seed integer.
//   check:zero  walks a brand-new account with every count zero. Nothing to resolve.
//
// The gap between them is an account whose data is real and whose id is a uuid, and
// that gap has shipped bugs twice, both times with every other guard green:
//
//   #569  the crew roster resolved members against the seed CLIMBERS array, so a real
//         member matched nothing and was dropped by filter(Boolean) -- a crew with
//         people in it rendered "You + 0 climbers", and since the name chips are what
//         open a profile, there was no way to reach a crew-mate at all.
//   #680  group management compared ownerId against the seed id 0, so the owner of a
//         DB-backed group saw no controls at all, and uuid members rendered an empty
//         roster underneath.
//
// Same shape both times: seed-id logic meeting a uuid. It is invisible to a walk whose
// ids are all seeds, and invisible to a walk whose lists are all empty.
//
// #569 also carried a TDZ crash -- a useMemo calling isDbId, declared further down the
// component -- that blanked the crew chat with "Cannot access before initialization".
// check:refs and check:hooks both stayed green: the identifier IS bound, just not yet.
// Only rendering the screen catches it, and only an account with a populated crew
// renders that screen.
//
// It then opens EVERY overlay the app declares with that account signed in. check:zero
// opens the same set at zero, where the failure is a dangling label or a dead end; here
// they have real people behind them, which is where a seed id meeting a uuid surfaces.
// The list is discovered from the source (scripts/lib/overlay-scaffold.mjs), so a modal
// added tomorrow is walked without anyone registering it.
//
// Opening by name reaches some overlays the UI would not currently offer. Before treating
// one as a bug, check the setter's call sites -- an overlay no user can reach is a
// different finding from one that renders wrong.
//
//   npm run check:signed-in
//   npm run check:signed-in -- --dump out.json   # per-screen text, for A/B diffing
//   npm run check:signed-in -- --keep            # leave the fixture accounts behind
//
// Requires the service key (it creates and destroys two real accounts) and USE_DB env.
// Not wired into `npm run build` or CI, for the reasons check:ui and check:zero are not,
// plus one of its own: CI has no service key, and it should not have one.
//
// NOTE ON WHAT THIS DOES NOT PROVE. Setup runs with the service key, which BYPASSES RLS.
// So a row existing here is not evidence any policy would have allowed a user to create
// it. This check answers "does the screen render correctly for a real account", never
// "is the policy right" -- that needs real-JWT probes, which live separately.

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "./lib/ui-fixture.mjs";
import { durableFixture, durableCredsPresent } from "./lib/durable-fixture.mjs";
import { NEEDS_EXTRA_STATE, assertKnownOverlays } from "./lib/overlay-scaffold.mjs";
import { settledText, looksLikeSpinner } from "./lib/render-settle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const argOf = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const DUMP = argOf("--dump");
const KEEP = argv.includes("--keep");
const PORT = 5270;

const envFile = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } };
const envText = envFile(".env") + "\n" + envFile(".env.local");
const envVal = (k) => process.env[k] ?? (envText.match(new RegExp("^\\s*" + k + "\\s*=\\s*(\\S+)", "m")) || [])[1];

// Without DB env the app serves seed data and there is no such thing as a real session,
// so every assertion below would be meaningless. Say so instead of walking a seed app
// and reporting green -- a check that passes when it could not possibly have run is
// worse than no check.
if (!(envVal("VITE_USE_DB") === "true" && envVal("VITE_SUPABASE_URL") && envVal("VITE_SUPABASE_ANON_KEY"))) {
  console.error("check:signed-in needs VITE_USE_DB=true plus Supabase url/anon key — without them there is no signed-in path to walk.");
  process.exit(1);
}

const FORBIDDEN = [
  [/\bNaN\b/, "NaN leaked into copy"],
  [/\[object Object\]/, "an object was used where a string was expected"],
  [/\bundefined\b/, "the literal 'undefined' rendered as text"],
  [/(^|[\s·:>(])null([\s·:<),.]|$)/, "the literal 'null' rendered as text"],
  [/\bInfinity\b/, "Infinity leaked into copy"],
  // The #569 signature, kept verbatim: a populated crew reporting an empty roster.
  [/You \+ 0 climbers/, "a crew with real members rendered an empty roster (the #569 shape)"],
  // Every member of the fixture's crew is a real account, so this caveat is false here by
  // construction. It was shown to any signed-in climber with a crew, describing their
  // actual partners as simulated and pointing at an "Invited" chip that is not on screen.
  [/The demo profiles here are simulated/, "a real account's real crew-mates were described as simulated demo profiles"],
];

const log = (...a) => console.log(...a);
const fails = [];
const fail = (screen, msg) => fails.push(`${screen}: ${msg}`);
// Counts assertions that actually executed. A run that walks nothing must not be able to
// print a clean result -- the failure mode that made an earlier helper script report
// "all checks passed" having run zero of them.
let asserted = 0;

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

function claimPort(start, span = 40) {
  return new Promise((resolve, reject) => {
    let p = start;
    const tryOne = () => {
      if (p >= start + span) return reject(new Error("no free port"));
      const s = net.createServer();
      s.once("error", () => { p++; tryOne(); });
      s.once("listening", () => s.close(() => resolve(p)));
      s.listen(p, "127.0.0.1");
    };
    tryOne();
  });
}

let fixture = null;
let server = null;
let browser = null;

try {
  // Order matters. The dev server and the browser are the two steps that actually fail
  // here (port contention, and a Chrome launch that timed out at 180s under load from
  // parallel jobs). Do both BEFORE creating any accounts, so a failure at either one
  // cannot leave real rows in a production project waiting on a teardown that never runs.
  const port = await claimPort(PORT);
  if (port !== PORT) log(`port ${PORT} is in use — using ${port} instead`);
  const base = `http://127.0.0.1:${port}/Climbing-App/`;
  log(`starting dev server on ${port}...`);
  // Deliberately NOT setting VITE_DEMO_AUTOLOGIN. check:ui forces it on to get past the
  // gate; leaving it off means realAuthGate (USE_DB && !DEMO_AUTOLOGIN) is live, so the
  // injected session has to satisfy the same gate a production user does. If the session
  // were not accepted, the walk would find a login form and fail rather than quietly
  // walking a demo.
  // The signed-in config adds ONLY a ?z=<overlayName> opener. It does not touch identity —
  // that is the whole difference from zero-state.config.mjs, which rewrites three anchors to
  // force a brand-new account. Here the session is real and uid comes from it, which is the
  // point: an overlay rendering real crew-mates is what nothing has ever walked.
  server = spawn("npx", ["vite", "--config", "scripts/signed-in.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  let died = false;
  server.on("exit", () => { died = true; });
  if (!(await waitForServer(base)) || died) {
    console.error(died ? "the dev server exited during startup — port taken, or vite failed to boot" : "dev server never came up");
    process.exit(1);
  }
  await fetch(base + "ClimbMatch.jsx").catch(() => {});

  // One retry: this repo routinely runs several browser-driving checks at once, and a
  // cold launch under that load has exceeded the default timeout.
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 120000 });
  } catch {
    log("chrome did not start within 120s (parallel jobs?) — retrying once");
    browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });

  // Two ways to get a signed-in account, and which one is available says where we are.
  //
  // LOCALLY: create a pair per run with the service key and destroy them after, so nothing
  // is left in the production project.
  //
  // IN CI: sign in to two DURABLE accounts with the anon key. CI must never hold the service
  // key, and that is why this guard sat outside CI for so long — ~40 merged commits with no
  // run, because "hand-run" means "not run" on a loaded machine. The privileged work happened
  // once, locally (scripts/oneoff/create-ci-test-accounts.mjs and seed-ci-test-fixture.mjs);
  // all CI does is exchange a password for a session, which is what a browser does.
  //
  // The durable pair is marked discoverable=false so it cannot appear in partner browse, and
  // durable-fixture re-checks that on every run rather than trusting the day it was set.
  if (durableCredsPresent()) {
    log("signing in to the durable CI accounts...");
    fixture = await durableFixture(log);
  } else {
    log("creating fixture accounts...");
    fixture = await createFixture(log);
  }
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 200)));

  // Hand supabase-js a live session before the app's first script runs. addInitScript
  // re-applies on every navigation, so a reload mid-walk stays signed in.
  await page.addInitScript(
    ({ key, value }) => { try { window.localStorage.setItem(key, value); } catch {} },
    { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) },
  );

  const screens = {};
  const tap = async (text, i = 0) => {
    const hit = await page.evaluate(({ t, idx }) => {
      const els = [...document.querySelectorAll('button,[role="button"],a,select,summary')]
        .filter((e) => (e.textContent || "").trim() === t);
      if (!els[idx]) return false;
      els[idx].click();
      return true;
    }, { t: text, idx: i });
    if (hit) { await page.waitForTimeout(1600); return true; }
    const els = await page.$$(`text="${text}"`);
    if (!els[i]) return false;
    await els[i].click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1600);
    return true;
  };

  // Click the most specific element whose visible text is this label, optionally followed
  // by a count badge ("Groups1" is one sub-tab, not a leaf reading "Groups").
  //
  // Deliberately NOT leaf-only. A leaf-only matcher missed both controls this check exists
  // to reach: the Groups sub-tab wraps a badge, and "Crew chat" sits beside a "▸" sibling.
  // Smallest matching text wins, which is the innermost element that still contains the
  // whole label -- clicking an outer wrapper is what makes a live control read as dead.
  //
  // Coordinate clicks are wrong here regardless: most of these sit below the fold on a
  // 390x900 viewport, so a coordinate click lands on whatever happens to be there.
  const clickText = (text) => page.evaluate((t) => {
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^${esc}\\s*\\d*$`);
    const cands = [...document.querySelectorAll('button,[role="button"],a,summary,div,span,b')]
      .filter((e) => re.test((e.textContent || "").trim()));
    if (!cands.length) return false;
    cands.sort((a, b) => (a.textContent || "").length - (b.textContent || "").length);
    cands[0].scrollIntoView({ block: "center" });
    cands[0].click();
    return true;
  }, text);

  // Click the first leaf whose text CONTAINS this fragment. Used only for rows whose
  // label carries live data (a crew names its route and date), where an exact match
  // would be brittle for reasons that have nothing to do with the bug being hunted.
  const clickContaining = (frag) => page.evaluate((f) => {
    const el = [...document.querySelectorAll("div,span,button,b,a")]
      .find((e) => e.children.length === 0 && (e.textContent || "").includes(f));
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  }, frag);

  async function capture(name, opts = {}) {
    pageErrors.length = 0;
    // Read the screen once it stops changing. The literal spinner list this used to poll
    // covered 2 of the app's 13 spinners, and nothing at all waited for a screen that was
    // merely slow — which is how `inboxOpen` was captured at 48 chars on one run and 117
    // on the next, passing both. See scripts/lib/render-settle.mjs.
    const text = await settledText(page, { min: 30, timeout: 60000 });
    screens[name] = text;
    asserted++;
    const min = opts.min ?? 400;
    // Distinguish "still fetching" from "rendered nothing". Both end up short, but only
    // one of them is a bug, and reporting a slow query as a blank screen sends the reader
    // looking for a render fault that is not there.
    if (looksLikeSpinner(text)) {
      fail(name, "still showing a loading state after 60s — the signed-in query never resolved");
    } else if (text.length < min) {
      fail(name, `rendered only ${text.length} chars (min ${min}) — blank or broken screen`);
    }
    for (const [re, why] of FORBIDDEN) { const m = text.match(re); if (m) fail(name, `${why} — found ${JSON.stringify(m[0])}`); }
    for (const e of pageErrors) fail(name, `uncaught page error: ${e}`);
    log(`  ${name}: ${text.length} chars${opts.tab ? " (on " + opts.tab + ")" : ""}`);
    return text;
  }

  async function waitForApp(timeoutMs) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const up = await page.evaluate(() =>
        [...document.querySelectorAll('button,[role="button"]')].some((e) => (e.textContent || "").trim() === "Home")
      ).catch(() => false);
      if (up) return true;
      await page.waitForTimeout(1000);
    }
    return false;
  }

  const reset = async () => {
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
    if (!(await waitForApp(90000))) return false;
    await page.waitForTimeout(2500);
    return true;
  };

  if (!(await reset())) {
    console.error("the app never rendered its nav bar — the injected session was not accepted, so nothing below ran");
    process.exit(1);
  }

  // Prove we are actually signed in AS THE FIXTURE before asserting anything else. If the
  // session were ignored the app would fall back to the login form or a demo identity, and
  // every screen below would be a green result about the wrong account.
  const whoami = await page.evaluate((k) => {
    try { return JSON.parse(window.localStorage.getItem(k) || "null")?.user?.id ?? null; } catch { return null; }
  }, STORAGE_KEY);
  asserted++;
  if (whoami !== fixture.owner.id) {
    console.error(`signed in as ${whoami ?? "nobody"}, expected the fixture owner ${fixture.owner.id} — aborting rather than reporting on the wrong account`);
    process.exit(1);
  }
  log(`signed in as the fixture owner (${fixture.owner.id.slice(0, 8)}), real auth gate live`);

  log("main tabs:");
  for (const tab of ["Home", "Climbs", "Partners", "Crew", "Logbook", "Ranks", "Profile"]) {
    if (!(await tap(tab))) { fail(tab, "tab is not reachable"); continue; }
    await capture(tab);
  }

  // --- The crew roster: #569's ground. ------------------------------------------------
  // The fixture crew has a second CONFIRMED member whose id is a uuid. If member
  // resolution regresses to seed-only, that member vanishes and the roster reports
  // itself empty -- caught by the FORBIDDEN entry above, and by naming the mate here.
  log("crew with a real second member:");
  await reset();
  await tap("Crew");
  // The crew card renders expanded inline on this tab -- there is no separate detail
  // screen to open. Clicking the route name here does NOT drill into the crew, it
  // navigates to the ROUTE, which is how the first draft of this check "failed" on a
  // perfectly good roster.
  const crewText = await capture("Crew:detail");
  asserted++;
  if (!crewText.includes("North Ridge")) {
    fail("Crew:detail", "the fixture's crew is not listed — the signed-in crew query returned nothing");
  }
  asserted++;
  // First name only, deliberately: the app renders members through pubFirst/pubName, so
  // asserting the full name would fail on correct output. What matters is that the uuid
  // member resolves to a PERSON at all -- in #569 it resolved to nothing and the card
  // said "You + 0 climbers".
  const mateFirst = fixture.mate.name.split(" ")[0];
  if (!crewText.toLowerCase().includes(mateFirst.toLowerCase())) {
    fail("Crew:detail", `the crew's other member ${JSON.stringify(mateFirst)} is not named on the roster — uuid members are being dropped (the #569 shape)`);
  }
  // The chat is where #569's TDZ crash fired. Opening it is the assertion: capture()
  // fails on any uncaught page error, and a component that throws during render leaves a
  // near-empty screen, which the floor above catches.
  let chatOpened = false;
  for (const label of ["Crew chat", "Chat", "Messages"]) {
    if (await clickText(label)) { chatOpened = true; await capture("Crew:chat", { min: 200 }); break; }
  }
  asserted++;
  if (!chatOpened) fail("Crew:chat", "could not open the crew chat — the screen that blanked in #569 went unwalked");

  // --- Group management: #680's ground. -----------------------------------------------
  // The fixture OWNS this group, so the owner controls must render, and the uuid member
  // must appear on the roster. Before #680 both were false and the screen looked fine.
  log("a group the signed-in account owns:");
  await reset();
  await tap("Crew");
  // Groups are a sub-tab of Crew, not of Partners. Its label carries a count ("Groups1"),
  // which clickText's trailing-digits allowance handles.
  const toGroups = await clickText("Groups");
  asserted++;
  if (!toGroups) fail("Group:detail", "could not find the Groups sub-tab on the Crew screen");
  await page.waitForTimeout(2000);
  // THIS run's group, by name, not a constant. In CI the accounts are durable and shared, so
  // a hardcoded name meant every concurrent run opened the same group and asserted on state
  // the others were mutating — the #969 red that passed on re-run of the same SHA. The
  // fixture now names its group per run; matching that name is what makes the assertion about
  // this run's data. Falls back to the literal only if a fixture predates the field.
  const groupName = fixture.group?.name || "Fixture Alpine Club";
  if (await clickContaining(groupName)) {
    const g = await capture("Group:detail");
    asserted++;
    // Case-insensitive: the crew card renders a first name ("Robin") while the group
    // roster renders a handle ("@robinbelay"). What matters is that a uuid member resolves
    // to a person at all -- in #680 it resolved to nothing and the roster was empty.
    if (!g.toLowerCase().includes(mateFirst.toLowerCase())) {
      fail("Group:detail", `the group's other member ${JSON.stringify(mateFirst)} is not on the roster — uuid members are being dropped (the #680 shape)`);
    }
    asserted++;
    // The fixture group has exactly two members. Every count on this screen must agree
    // with the roster under it: the header count added 1 for "me" whenever it could not
    // find the seed id 0 in the list, so a DB group always over-counted by one.
    for (const m of g.matchAll(/(\d+) members|MEMBERS · (\d+)|Members · (\d+)/gi)) {
      const n = Number(m[1] ?? m[2] ?? m[3]);
      if (n !== 2) fail("Group:detail", `a member count reads ${n} for a 2-member group (${JSON.stringify(m[0])}) — it disagrees with the roster below it`);
    }
    asserted++;
    // The account that created this group is its owner, and must be told so. modIds
    // contains the owner, so a moderator-first test labelled the creator "Moderator".
    if (!/\bOwner\b/.test(g)) {
      fail("Group:detail", "the creator of this group is not labelled Owner anywhere on its roster");
    }
    asserted++;
    // The two management affordances #680 turned on, asserted SEPARATELY because they are
    // gated differently -- and conflating them made this check useless. A first draft
    // tested /Mod\b|Remove|Visibility|Public|Private/, which matches the words "Public
    // group" in the visibility *label*; that label renders for everyone, so reverting the
    // isCreator fix left the assertion green. Injection testing is the only reason that
    // was found: a guard that cannot fail is not a guard.
    //
    // "+ Mod" / "− Mod" is gated on isCreator -- owner only.
    if (!/[+−-]\s?Mod\b/.test(g)) {
      fail("Group:detail", "the per-member '+ Mod' control is absent for the group's OWNER — the isCreator check is not uuid-aware (the #680 shape)");
    }
    asserted++;
    // The visibility toggle is gated on isMod, a different question. Its LABEL ("Public
    // group") renders regardless, so match the button verb instead.
    if (!/Make (private|public)/.test(g)) {
      fail("Group:detail", "the visibility toggle is absent for a manager of this group — the isMod check is not uuid-aware");
    }
  } else {
    fail("Group:detail", "could not open the group the fixture owns — it is not listed for its own owner");
  }

  // --- Every overlay, as an account that owns things. --------------------------------
  //
  // check:zero opens all of these at zero, where the bug is a dangling label or a dead end
  // (#674 put the word "undefined" into a text message that way). This walks the same set
  // with REAL people behind them, which nothing has done: the overlays that render other
  // climbers -- share cards, rosters, invites, vouches -- are exactly where a seed id
  // meeting a uuid shows up, and that is the family behind #569, #680 and #701.
  log("\noverlays, signed in and populated:");
  const overlays = await page.evaluate(() => window.__overlays || []);
  asserted++;
  if (!overlays.length) {
    fail("scaffold", "no overlay states were discovered — the opener did not run, so NONE of the overlays below were actually checked");
  } else {
    log(`  ${overlays.length} overlay states discovered`);
  }
  // A baseline of the same tab with NO overlay. Several of these are full-screen
  // takeovers that REPLACE the nav, so "did the nav appear" is not a usable readiness
  // test -- it reported guideAppOpen and inboxOpen as "never rendered" when they had
  // rendered fine. Comparing against this baseline asks the question that actually
  // matters: did opening the overlay change the screen at all?
  // No single tab hosts every overlay. Several are rendered inside one tab's subtree and
  // simply do not exist elsewhere: alertsOpen and unfinishedOpen live on Home, crewListOpen
  // on Crew, areaTreeOpen on Climbs. Opening those from the Profile tab leaves the screen
  // untouched, which reads as "the overlay is dead" when the truth is it was never mounted.
  //
  // So try each tab and take the first where opening the overlay actually CHANGES the
  // screen. Failing only when no tab works is what makes "changed nothing" mean something.
  // Compare lines with their DIGITS MASKED, and that is what turned a permanent failure into
  // a 1-in-3 flake for a month. The test is "did opening this add a line the tab did not
  // already have", so any line that moves on its own answers YES without an overlay being
  // involved -- a relative timestamp rolling from "In 2 days" to "In 1 day", an unread badge,
  // the ASPECT & SUN clock. `inboxOpen` was reported OPENED at "1610 chars (on me)" on runs
  // where the Inbox could not render at all: 1610 is the plain Profile tab, credited to the
  // overlay because one number had changed since the baseline. So two runs of the same commit
  // disagreed, the failures read as flaky, and the REAL defect underneath (#890 left the
  // Calendar's JSX fragment unclosed, so the Inbox early return became fragment TEXT and the
  // screen was unreachable) was dismissed twice as CI noise.
  // The cost is a line that differs ONLY by a number no longer proving a mount. A false pass
  // certifies a modal nobody looked at, which is strictly worse than asking for a second
  // distinguishing line -- and `render-settle` already masks digits for exactly this reason.
  const lineKey = (l) => l.trim().replace(/\d+/g, "#");
  const TABS = ["me", "today", "crew", "routes", "logbook", "discover"];
  const baselines = {};
  for (const t of TABS) {
    await page.goto(`${base}?zt=${t}`, { waitUntil: "domcontentloaded", timeout: 180000 });
    await page.waitForFunction(() => window.__overlaysReady === true, null, { timeout: 60000 }).catch(() => {});
    // Same settle as the overlay pass below, and it has to be: a baseline captured while
    // the tab was still filling in is missing lines, so the diff below would credit the
    // overlay with content that was always going to arrive.
    const baseText = await settledText(page, { min: 30, timeout: 45000 });
    baselines[t] = new Set(baseText.split("\n").map(lineKey));
  }

  assertKnownOverlays(overlays, fail);
  for (const name of overlays) {
    if (NEEDS_EXTRA_STATE[name]) {
      log(`  ${name}: skipped — ${NEEDS_EXTRA_STATE[name]}`);
      continue;
    }
    let opened = null, empty = null, threw = null, sawText = "";
    for (const t of TABS) {
      await page.goto(`${base}?zt=${t}&z=${name}`, { waitUntil: "domcontentloaded", timeout: 180000 });
      await page.waitForFunction(() => window.__overlaysReady === true, null, { timeout: 60000 }).catch(() => {});
      // Settle on the text no longer changing. The old gate broke out of its wait the
      // moment the body passed 40 characters, which on an overlay that renders a header
      // first means it stopped waiting before the body arrived.
      const openedText = await settledText(page, { min: 30, timeout: 45000 });
      // Ask the opener what it did — and ask AFTER settling, not before. `__overlaysReady`
      // is set synchronously by the effect, but the opener itself fires on a 1200ms timer,
      // so reading straight after waitForFunction sees the state before any payload has been
      // evaluated. That reported eventInvite (whose payload is empty here, because `events`
      // is not DB-backed and sits behind DEMO_FILLERS) as a modal that mounted nothing.
      // check:zero and check:overlay-scroll settle 3400ms and 2200ms first, which is why
      // only this guard tripped on it.
      const d = await page.evaluate((n) => ({
        np: (window.__overlayNoPayload || {})[n], er: (window.__overlayOpenErrors || {})[n],
      }), name);
      if (d.er) { threw = d.er; break; }
      if (d.np) { empty = d.np; break; }
      // "Did it ADD a line", not "is the whole screen different". Whole-screen equality
      // trips on anything that moves on its own -- a clock, a relative timestamp -- and
      // would report an overlay as opened when nothing opened at all.
      const lines = openedText.split("\n").map(lineKey);
      if (lines.some((l) => l && !baselines[t].has(l))) { opened = { tab: t }; break; }
      // Keep the closest look at the screen, for the failure message below. "It added
      // nothing" is only actionable if it also says what WAS there.
      if (!sawText || openedText.length > sawText.length) sawText = openedText;
    }
    if (threw) {
      asserted++;
      fail(`modal:${name}`, `the opener threw while building its payload: ${threw}`);
      continue;
    }
    if (empty) {
      // Not asserted: this account has nothing to open it about, which is a fact about the
      // fixture, not about the modal. Counting it would overstate what was verified.
      log(`  ${name}: skipped — payload resolved empty for this account: ${empty}`);
      continue;
    }
    asserted++;
    if (!opened) {
      // Print what WAS on screen. Without it this message cannot distinguish "the opener
      // never ran", "the app never mounted" (the boot shell mirrors the nav, so a blank app
      // reads as nav-present) and "the state flipped but the screen ignores it" — three
      // faults needing three different repairs, and the third is what #890 actually was.
      const head = sawText.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6).join(" | ");
      fail(`modal:${name}`,
        `added nothing on any of ${TABS.length} tabs — it never rendered, so it is unverified. ` +
        `The screen it settled on was ${sawText.trim().length} chars: ${JSON.stringify(head)}. ` +
        `If that is the ordinary tab, the state flipped and nothing reads it; if it is the nav alone, the app never mounted.`);
      continue;
    }
    // The floor is deliberately low: a takeover like the guide dashboard legitimately
    // renders two honest lines ("You haven't applied to guide yet."). The real signal is
    // the forbidden-text and page-error checks inside capture(), which is what caught
    // #674's "undefined" and the friends row here.
    await capture(`modal:${name}`, { min: 30, tab: opened.tab });
  }

  if (DUMP) {
    fs.writeFileSync(DUMP, JSON.stringify(screens, null, 2));
    log(`\nwrote ${DUMP} (${Object.keys(screens).length} screens)`);
  }

  // A walk that asserted almost nothing must not read as a pass. Every count below is a
  // floor for work that definitely happened above, so this trips on a silent early exit.
  const MIN_ASSERTS = 40;
  // Print the findings whatever else is true. An earlier version returned early on
  // INCONCLUSIVE and swallowed the failure list, so a run that knew exactly what was wrong
  // ("no overlay states were discovered") reported only that too few assertions ran --
  // technically a failure, but it told the reader nothing about the cause.
  if (fails.length) {
    console.error(`\ncheck:signed-in FAILED (${fails.length}):`);
    for (const f of fails) console.error("  - " + f);
    process.exitCode = 1;
  }
  if (asserted < MIN_ASSERTS) {
    console.error(`\nINCONCLUSIVE: only ${asserted} assertions ran (expected at least ${MIN_ASSERTS}). The walk exited early; treat this as a failure, not a pass.`);
    process.exitCode = 1;
  } else if (!fails.length) {
    log(`\nAll ${Object.keys(screens).length} screens OK, ${asserted} assertions.`);
  }
} catch (e) {
  // An exception here means the walk did not finish, which is a failure. Reporting it as
  // anything else is how a harness comes to certify a run it never made.
  console.error("\ncheck:signed-in ERRORED — the walk did not complete, so nothing is verified:");
  console.error(e?.stack || String(e));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
  if (fixture) {
    if (KEEP) {
      log(`\n--keep: fixture left behind — owner ${fixture.owner.email}, mate ${fixture.mate.email}`);
    } else {
      const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e.message}`]);
      if (leaked.length) {
        console.error(`\nFIXTURE NOT FULLY REMOVED: ${leaked.join(", ")} — delete these by hand; a leftover profile shows up in partner search for real users.`);
        process.exitCode = 1;
      } else {
        // Say which thing actually happened. In durable mode nothing was created, so
        // "accounts removed" would be a small lie about the one property that makes a
        // permanent pair acceptable — and the next person reading a CI log would believe
        // teardown ran when there was nothing to tear down.
        // Say what actually happened. In durable mode the ACCOUNTS persist but this run's
        // GROUP does not, and claiming "nothing was created" would be false the moment the
        // fixture started making one — the kind of small lie that makes a log untrustworthy.
        log(durableCredsPresent()
          ? "durable CI accounts kept; this run's own group removed."
          : "fixture accounts removed.");
      }
    }
  }
}
