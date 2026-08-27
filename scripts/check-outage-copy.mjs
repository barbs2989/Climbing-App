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

  if (ran < 7) dead(`only ${ran} assertion(s) ran; expected at least 7`);

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
