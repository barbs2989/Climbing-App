// Do the overlays that assert absence tell a FAILED READ apart from an EMPTY ACCOUNT?
//
// Two surfaces were shipped saying the wrong thing when a read failed, and both are behind an
// OVERLAY, which `check:outage` never opens:
//
//   Inbox         "No friend chats yet"   over "Message a partner from their profile and your
//                 chats will live here." -- `fetchMyDirectMessages` throws and the caller's catch
//                 releases the retry latch, but neither told the screen. (#1276)
//   FriendsList   "No friends yet."       -- `connectionsUnavailable` had existed since #1224 and
//                 reached six places, none of them this overlay. (#1287)
//
// PROMOTED OUT OF scripts/oneoff/ FOR THE REASON check:verification-fallback RECORDS. #1267
// reverted #1256 by changing a guard clause and a dependency array -- no NAME moved, so
// `audit:silent-reverts` reported 0 and said in its own caveat that it would. What caught that was
// an extracted-from-source probe failing closed. These two guard the same kind of fix and were
// sitting where nothing runs them; a detector nobody runs is a detector you do not have.
//
// ONE BUNDLE FOR BOTH, deliberately. As separate probes they cost 4.5s and 4.2s, nearly all of it
// esbuild reading the same 400,000-character ClimbMatchCore.jsx twice. A build-chain guard is paid
// by every author on every build, so bundling once and asserting both is the difference between
// ~4.5s and ~8.7s for the same coverage.
//
// Fails CLOSED: a missing export, a render that produced almost nothing, or zero cases run are
// each reported as a broken guard rather than a clean app -- every "must NOT contain" assertion
// below passes against a component that rendered nothing.

import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
// The components reach react-query hooks, so they need a provider -- and react-query MUST be
// --external below. Bundled, esbuild inlines its own copy and the provider created here is a
// different module instance with a different React context; the render then still throws
// "No QueryClient set" with a provider plainly wrapped around it, which reads as the provider not
// working rather than as two copies of the library.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(ROOT, `.outage-copy-${process.pid}.mjs`);

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const dead = (what) => {
  console.error(`\ncheck:outage-copy FAILED — ${what}.`);
  console.error("Nothing below was checked. Every negative assertion here passes against a");
  console.error("component that rendered nothing, so a broken scan must never read as clean.\n");
  fs.rmSync(out, { force: true });
  process.exit(1);
};

try {
  // Bundle INSIDE the project: node resolves `react` from the nearest node_modules, so a bundle
  // in the OS temp dir throws ERR_MODULE_NOT_FOUND. `lib/supabase.js` reads import.meta.env at
  // module scope, so it must be defined or the import throws before anything renders.
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}", "--external:react", "--external:react-dom",
    "--external:@tanstack/react-query", "--external:react-dom/server",
    "--outfile=" + out], { stdio: "pipe" });

  const mod = await import(out);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const render = (Comp, props) => renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(Comp, props)));

  const SURFACES = [
    {
      name: "Inbox",
      base: {
        msgs: {}, crews: [], crewMsgs: {}, connections: [], msgFrom: {},
        crewUnread: {}, dmUnread: {}, routeById: () => null,
        onOpenDM() {}, onOpenCrew() {}, onClose() {}, onDeleteDM() {}, onDeleteCrew() {},
        onAcceptReq() {},
      },
      empty: "No friend chats yet",
      outageProps: { dmUnavailable: true },
      outage: "load your chats",
      populated: { msgs: { 5: [{ from: 5, text: "hi", ts: 1 }] }, connections: [{ id: 5, name: "Robin" }] },
      floor: 800,
    },
    {
      name: "FriendsList",
      base: {
        friends: [], myFriendIds: [], kudosGiven: {}, hasVouched: () => false,
        onClose() {}, onOpenProfile() {}, onMessage() {}, onRemove() {},
        onFormCrew() {}, onVouch() {}, onKudos() {},
      },
      empty: "No friends yet",
      outageProps: { unavailable: true },
      outage: "unread, not empty",
      populated: { friends: [{ id: "u1", name: "Robin Belay", location: "Bellingham, WA" }] },
      floor: 500,
      // FriendsList has three empty strings and only ONE is about data arriving. "None of your
      // friends share your saved objectives yet" and "No friends match" are claims about the
      // FILTER the user just set, applied to whatever did load -- true during an outage. Gating
      // them would replace correct copy with an error, so this asserts they do NOT appear when
      // friends are present and the flag is on.
      filterCase: true,
    },
  ];

  let ran = 0;
  for (const s of SURFACES) {
    const Comp = mod[s.name] || mod.default?.[s.name];
    if (typeof Comp !== "function") {
      dead(`${s.name} is not exported from ClimbMatchCore.jsx, so it could not be rendered`);
    }
    const emptyHtml = render(Comp, s.base);
    if (emptyHtml.length < s.floor) {
      dead(`${s.name} rendered only ${emptyHtml.length} characters with no data ` +
           `(floor ${s.floor}) — that is a broken render, not an honest empty state`);
    }

    // 1. A genuinely empty account keeps its honest copy. Most accounts really are empty here,
    //    so losing this sentence would be a regression in the common case.
    if (emptyHtml.includes(s.empty)) ok(`${s.name}: an empty account still reads "${s.empty}"`);
    else fail(`${s.name}: the honest empty state "${s.empty}" no longer renders`);
    ran++;

    // 2. The SAME empty state, with the read having failed, must not claim emptiness.
    const outHtml = render(Comp, { ...s.base, ...s.outageProps });
    if (outHtml.includes(s.outage) && !outHtml.includes(s.empty)) {
      ok(`${s.name}: a failed read says so instead of claiming you have none`);
    } else {
      fail(`${s.name}: a failed read still reads as an empty account ` +
           `(outage copy present: ${outHtml.includes(s.outage)}, ` +
           `empty copy present: ${outHtml.includes(s.empty)})`);
    }
    ran++;

    // 3. With data, the empty state must not render at all.
    const popHtml = render(Comp, { ...s.base, ...s.populated });
    if (!popHtml.includes(s.empty)) ok(`${s.name}: the empty state is absent when there is data`);
    else fail(`${s.name}: the empty state renders even with data present`);
    ran++;

    if (s.filterCase) {
      const filtered = render(Comp, { ...s.base, ...s.populated, ...s.outageProps });
      if (!filtered.includes(s.outage)) {
        ok(`${s.name}: the outage copy stays off the FILTER messages, which are true either way`);
      } else {
        fail(`${s.name}: the outage copy rendered while friends were present — only the ` +
             `no-data branch may be gated, or a correct sentence becomes an error`);
      }
      ran++;
    }
  }

  /* ---- A SURFACE THAT IS NOT AN OVERLAY, AND WAS OUT OF FRAME FOR EVERY GUARD ----

     "Manage areas" lists all 50 US_STATES with a line under each. That line is driven by `cnt`,
     which is `dbSt ? dbSt.route_count : (st ? areaMatchCount(st.id) : 0)` where dbSt comes from
     `useStates()`. When that read fails, dbSt is undefined for every state and the seed MOUNTAINS
     fallback holds only FOUR of them -- so 46 of 50 read "Catalog coming soon", dimmed, with the
     row's own click handler returning early so it could not even be tapped.

     Worse than the usual shape of this class in two ways. It is a false claim about the PRODUCT
     rather than about the climber's own data; and it lands on the one screen whose entire purpose
     is downloading a catalog FOR use without a signal, so it was wrong exactly when somebody
     needed it.

     NOTHING COULD HAVE SEEN IT, and the three near misses are each instructive:
       - check:outage walks seven tabs; this is not a tab.
       - check:overlay-absence walks the overlays check:overlay-discovery finds, and discovery is
         behavioural -- it wants role="dialog" as the region's first element. This screen is a
         `position:fixed; inset:0; zIndex:200` full-screen view with NO role, so it is an overlay to
         a climber and not one to any guard. (Adding the role would pull it into four separate
         walks and is a bigger change than this one; recorded rather than done.)
       - and even had it been discovered, that guard's CLAIMS vocabulary is a deny-list of
         "no X yet" / "0 X" / "nothing here" shapes. "Catalog coming soon" matches none of them --
         the a-deny-list-is-beaten-by-one-more-adjective failure CLAUDE.md already records FOUR
         times for check:outage's rule 2, arriving a fifth time in a different guard.

     Executed rather than rendered: the copy is a pure function precisely so all three branches can
     be reached without standing up App, which is where this line lives. */
  const stateCatalogLine = mod.stateCatalogLine;
  if (typeof stateCatalogLine !== "function") {
    dead("stateCatalogLine is not exported from ClimbMatchCore.jsx — ANCHOR LOST");
  }
  const SOON = "Catalog coming soon";

  ran++;
  const broke = stateCatalogLine(0, "Montana", true, "");
  if (!broke.includes(SOON) && /couldn’t load/i.test(broke)) {
    ok("stateCatalogLine: a failed states read says so instead of \"Catalog coming soon\"");
  } else {
    fail(`stateCatalogLine: a failed read still reads as a state with no catalog — "${broke}"`);
  }

  ran++;
  if (broke.includes("Montana") && /not a claim/i.test(broke)) {
    ok("stateCatalogLine: names the state and says the count is unknown rather than zero");
  } else {
    fail("stateCatalogLine: the outage line does not say the catalog is unknown rather than absent");
  }

  /* The honest branch is what stops this being a blanket rewrite. A state whose catalog genuinely
     has not been loaded yet must still say so -- that sentence is true for most of the 50. */
  ran++;
  const soon = stateCatalogLine(0, "Montana", false, "");
  if (soon === SOON) ok("stateCatalogLine: with a healthy read, an unbuilt catalog still says so");
  else fail(`stateCatalogLine: lost its genuine "coming soon" state — "${soon}"`);

  /* A state WITH a catalog must report it whatever the flag says: a failed refetch must not hide a
     count already in hand, and must not overwrite it with an error. */
  ran++;
  const populated = stateCatalogLine(8366, "Washington", true, " · 2h ago");
  if (populated.includes("8366 climbs in the catalog") && !/couldn’t load/i.test(populated)) {
    ok("stateCatalogLine: an already-loaded count still renders under the flag");
  } else {
    fail(`stateCatalogLine: the flag suppressed or overwrote a count already in hand — "${populated}"`);
  }

  ran++;
  if (stateCatalogLine(1, "Utah", false, "").includes("1 climb in the catalog")) {
    ok("stateCatalogLine: singular stays singular");
  } else {
    fail("stateCatalogLine: lost its singular form");
  }

  /* THE WIRING, not just the copy. Executing the function proves the sentence; it does not prove
     App still calls it, or still computes the flag. A stale-base squash takes exactly that half --
     the flag would arrive undefined, read as falsy, and every assertion above would still pass
     while the screen went back to claiming 46 states have no catalog. */
  const CHAIN = [
    ["ClimbMatch.jsx", "const statesUnavailable=!!(USE_DB&&dbStatesQ&&dbStatesQ.isError);",
     "App no longer computes the flag from the states query"],
    ["ClimbMatch.jsx", "stateCatalogLine(cnt,nm,statesUnavailable,",
     "the Manage areas line no longer goes through stateCatalogLine with the flag"],
  ];
  for (const [f, needle, why] of CHAIN) {
    ran++;
    if (fs.readFileSync(path.join(ROOT, f), "utf8").includes(needle)) {
      ok(`wiring: ${f} — ${why.replace("no longer ", "")}`);
    } else {
      fail(`wiring: ${why} (${f} no longer contains \`${needle}\`)`);
    }
  }

  /* ---- AN EARLY-RETURN SCREEN, WHICH IS THE OTHER HALF OF THE SAME BLIND SPOT ----

     `App` returns early for nine screens; the guide dashboard is one. So it is not a tab that
     check:outage walks, and -- being a `position:fixed; inset:0` full-screen view with no
     role="dialog" -- check:overlay-discovery does not classify it as an overlay either. Exactly
     where the Manage areas defect sat.

     `useGuideProfile(uid)` handed back `undefined` for TWO OPPOSITE STATES: a climber who has
     genuinely never applied, and a read that failed (react-query leaves `data` undefined on error).
     The screen collapsed them into one sentence, so an approved guide whose profile did not load
     was told "You haven't applied to guide yet." and pointed at the application form. A false claim
     about the user's own HISTORY, offering the wrong remedy -- worse than the usual "you have none".

     Executed rather than rendered, and here that is not a convenience: the dashboard needs a
     session, a portal and four queries, and it lives in lib/ rather than core so it is not in the
     bundle above. lib/db.js is ~164kB against core's ~1.1MB, so the second esbuild is cheap. */
  const dbOut = path.join(ROOT, `.outage-db-${process.pid}.mjs`);
  try {
    execFileSync("npx", ["esbuild", path.join(ROOT, "lib/db.js"),
      "--bundle", "--format=esm", "--platform=node",
      `--define:import.meta.env=${JSON.stringify({ VITE_USE_DB: "true", VITE_SUPABASE_URL: "https://probe.invalid", VITE_SUPABASE_ANON_KEY: "probe" })}`,
      "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
      "--log-level=error", "--outfile=" + dbOut], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
  } catch {
    fs.rmSync(dbOut, { force: true });
    dead("esbuild could not bundle lib/db.js");
  }
  if (typeof globalThis.WebSocket === "undefined") {
    globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
  }
  const dbMod = await import(dbOut + "?t=" + Date.now());
  fs.rmSync(dbOut, { force: true });
  const guideProfileMissingCopy = dbMod.guideProfileMissingCopy;
  if (typeof guideProfileMissingCopy !== "function") {
    dead("guideProfileMissingCopy is not exported from lib/db.js — ANCHOR LOST");
  }

  const gBroke = guideProfileMissingCopy(true);
  const gNever = guideProfileMissingCopy(false);
  if (!gBroke || !gNever || !gBroke.head || !gBroke.body || !gNever.head || !gNever.body) {
    dead("guideProfileMissingCopy did not return head and body for both states");
  }

  ran++;
  if (/couldn’t load/i.test(gBroke.head)) ok("guide profile, failed read: the headline says the read failed");
  else fail(`guide profile, failed read: headline does not report a failure — "${gBroke.head}"`);

  ran++;
  if (!/haven’t applied|haven't applied/i.test(gBroke.head + gBroke.body)) {
    ok("guide profile, failed read: does not deny that you applied");
  } else {
    fail("guide profile, failed read: still tells an approved guide they never applied");
  }

  ran++;
  if (/not a claim/i.test(gBroke.body)) ok("guide profile, failed read: says the state is unknown, not absent");
  else fail("guide profile, failed read: the body does not say the read failed rather than the application being absent");

  /* The honest branch is what stops this being a blanket rewrite: a climber who really has not
     applied must still be told where to. */
  ran++;
  if (/haven’t applied|haven't applied/i.test(gNever.head)) ok("guide profile, never applied: still says so");
  else fail(`guide profile, never applied: lost its genuine empty state — "${gNever.head}"`);

  ran++;
  if (/become a guide/i.test(gNever.body)) ok("guide profile, never applied: still signposts the application");
  else fail("guide profile, never applied: the signpost to the application form was removed");

  ran++;
  if (!/couldn’t load/i.test(gNever.head + gNever.body)) ok("guide profile, never applied: claims no failure");
  else fail("guide profile, never applied: reports a failure that did not happen");

  /* Wiring, for the reason stated above the states block: executing the function proves the
     sentence, not that the screen still calls it or still reads the flag. */
  const GCHAIN = [
    ["lib/DbGuideDashboard.jsx", "isError: profileError } = useGuideProfile(uid);",
     "the dashboard no longer reads isError off the guide-profile query"],
    ["lib/DbGuideDashboard.jsx", "guideProfileMissingCopy(profileError).head",
     "the no-profile headline no longer goes through the copy function with the flag"],
    ["lib/DbGuideDashboard.jsx", "guideProfileMissingCopy(profileError).body",
     "the no-profile body no longer goes through the copy function with the flag"],
  ];
  for (const [f, needle, why] of GCHAIN) {
    ran++;
    if (fs.readFileSync(path.join(ROOT, f), "utf8").includes(needle)) {
      ok(`wiring: ${f.split("/").pop()} — ${why.replace("no longer ", "")}`);
    } else {
      fail(`wiring: ${why} (${f} no longer contains \`${needle}\`)`);
    }
  }

  /* ---- THE SAME FAILED READ, ONE SCREEN OVER, WHERE IT COSTS DATA RATHER THAN TRUST ----

     DbGuideApply reads the same guide profile to decide whether an application already exists:

         if (existing && existing.status !== "draft" && existing.status !== "rejected") -> status screen
         otherwise                                                                      -> the FORM

     `existing` is undefined both when nobody has applied AND when the read failed, so a failed read
     fell through and showed an approved guide a BLANK APPLICATION. submitGuideApplication() is an
     `upsert` on guide_profiles keyed by the user's own id, so submitting it would overwrite a live
     listing back to "submitted" -- title, base location and all -- with whatever was typed in.

     That makes this a data-loss path rather than a false sentence, which is why the screen now
     REFUSES instead of guessing. Blocking a first-time applicant during a transient error costs a
     retry; letting an approved guide overwrite their own listing costs the listing.

     ORDER IS THE INVARIANT AND IT IS ASSERTED, not just presence: the refusal must come BEFORE the
     branch that tests `existing`, because `existing` is exactly the value that could not be read.
     A guard placed after it is unreachable in the case it exists for -- the same ordering trap
     check:clickable records, where a block placed after an exiting one never ran. */
  const applySrc = fs.readFileSync(path.join(ROOT, "lib/DbGuideApply.jsx"), "utf8");

  ran++;
  if (applySrc.includes("isError: existingError } = useGuideProfile(uid);")) {
    ok("guide application: the screen reads isError off the guide-profile query");
  } else {
    fail("guide application: no isError read off useGuideProfile — a failed read is indistinguishable from never having applied");
  }

  ran++;
  const iErr = applySrc.indexOf("if (existingError) {");
  if (iErr >= 0) ok("guide application: a failed read has its own branch");
  else fail("guide application: no `if (existingError)` branch — a failed read falls through to the blank form");

  ran++;
  const iStatus = applySrc.indexOf('if (existing && existing.status !== "draft"');
  if (iErr >= 0 && iStatus >= 0 && iErr < iStatus) {
    ok("guide application: the failed-read branch precedes the branch that tests `existing`");
  } else {
    fail("guide application: the failed-read branch does NOT precede the `existing` test, so it is " +
         "unreachable in exactly the case it exists for");
  }

  ran++;
  if (/not a claim that you have not applied/i.test(applySrc)) {
    ok("guide application: says the read failed rather than that you have not applied");
  } else {
    fail("guide application: the refusal does not say the state is unknown rather than absent");
  }

  if (ran < 27) dead(`only ${ran} assertion(s) ran; expected at least 27`);

  if (failures) {
    console.error(`\ncheck:outage-copy FAILED — ${failures} assertion(s).`);
    console.error("An overlay is telling a climber they have nothing when a read merely failed.");
    process.exitCode = 1;
  } else {
    console.log(`\nok — ${ran} assertions across ${SURFACES.length} overlays: each tells a failed ` +
                `read apart from an empty account.`);
  }
} finally {
  fs.rmSync(out, { force: true });
}
