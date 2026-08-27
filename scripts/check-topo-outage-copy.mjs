// Does the TOPO section's outage copy reach a screen, and does it stop inviting the first topo?
//
// CLAUDE.md records `toposUnavailable` as the one outage flag nothing has proven, and says why:
// `check:outage`'s rule 1 asks whether a screen ACKNOWLEDGES the fault, and Overview is already
// `says-broken=YES` from `reportsUnavailable`. So the topo copy is MASKED — rule 1 passes whether
// or not it flips, and no browser walk can tell the difference.
//
// Reading it as a worklist found the flag HALF-WIRED. The headline flipped and the explanation
// underneath it did not, so an outage read:
//
//     Couldn't load the topos
//     A topo overlays the route line and markers on a photo of the wall, face, or line.
//     Got a clear shot? Add it and draw the line so the next party can follow it.
//     [ Add a topo photo ]
//
// Honest headline, and a body still presuming there is nothing there. Every sibling flag in this
// app conditions its explanation too — `sibsUnavailable` says "this is not a claim that there are
// none", `crewInvitesUnavailable` says "do not read this as none waiting". Measured across all 17
// flags and every render site: this was the ONLY half-wired one, so no detector for the class was
// written. A detector for a class of one is the thing this repo keeps refusing to build.
//
// REACT-QUERY DOES NOT SURFACE A CACHED ERROR UNDER renderToStaticMarkup, and that is why this had
// never been proven rather than an oversight. Measured directly: with the cache in
// `status: "error"`, the hook returns `{status:"pending", isError:false, isLoading:true}`, so
// TopoSection takes its "Loading topo photos…" branch and never reaches the empty state at all.
// Neither `retry:false` nor `refetchOnMount:false` nor `staleTime:Infinity` changes it. That is
// why every provable sibling (ConsensusPanel, CatchLedger, FriendsList, Inbox) takes its flag as a
// PROP: a flag read off a hook INSIDE the component under test is unreachable to SSR. Same family
// as this repo's "effects do not run under renderToStaticMarkup".
//
// So the proof is in two halves, and each is honest about what it shows:
//   1. `topoEmptyCopy` is EXECUTED for both states — the flip itself, no rendering involved.
//   2. The healthy state is RENDERED end to end, proving that function's output actually reaches
//      the markup. SSR can reach that branch, and it is also the branch a blanket rewrite would
//      have broken: a route with genuinely no topo must still be invited to add one.
// What it does NOT prove: that the failing branch's markup appears in a real browser. Nothing
// available here can, and saying so beats implying otherwise.
//
// A BUILD GATE, and NOT folded into check:outage-copy. That guard bundles ClimbMatchCore.jsx and
// merged two probes into one specifically to stop esbuild reading the same 400,000-character file
// twice. TopoSection lives in RouteDetail.jsx, so there is no bundle to share and folding buys
// nothing while putting a second concern inside a working gate. 2.8s, static, no browser and no
// database — the same profile as its sibling at 4.5s.
//
// IT IS A GATE RATHER THAN A PROBE BECAUSE THIS EXACT FIX IS THE INVISIBLE KIND. It changes a
// string and a call, not a NAME, so `audit:silent-reverts` cannot see a stale-base squash undoing
// it — that audit says so in its own caveat, and #1267 is the recorded incident. An
// extracted-from-source guard failing closed is the only thing that catches that shape, which is
// the argument check:verification-fallback, check:outage-copy and check:overlay-absence were each
// promoted on. This is the fourth.
//
// Fails CLOSED: a missing export, a thin render, or too few cases are each reported as a broken
// probe. Every "must NOT contain" assertion passes against a component that rendered nothing.

import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
// @tanstack/react-query MUST be --external. Bundled, esbuild inlines its own copy and the provider
// created here is a different module instance with a different React context; the render then
// throws "No QueryClient set" with a provider plainly wrapped around it, which reads as the
// provider not working rather than as two copies of the library.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// scripts/, not scripts/oneoff/ — one level up since the promotion.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(ROOT, `.topo-outage-${process.pid}.mjs`);
const entry = path.join(ROOT, `.topo-entry-${process.pid}.mjs`);
const clean = () => { fs.rmSync(out, { force: true }); fs.rmSync(entry, { force: true }); };

let failures = 0, cases = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const dead = (what) => {
  console.error(`\ncheck:topo-outage-copy FAILED — ${what}.`);
  console.error("Nothing below was checked. Every negative assertion here passes against a");
  console.error("component that rendered nothing, so a broken probe must never read as clean.\n");
  clean();
  process.exit(1);
};

try {
  // USE_DB must be TRUE or `toposUnavailable` is dead by construction and every assertion about it
  // is vacuous — `useAreaTopos` is `enabled: !!supabase && !!areaId`. A .invalid host is safe:
  // createClient issues no request, and SSR never fetches.
  const env = JSON.stringify({
    VITE_USE_DB: "true",
    VITE_SUPABASE_URL: "https://probe.invalid",
    VITE_SUPABASE_ANON_KEY: "probe-anon-key",
  });
  // A generated entry re-exports USE_DB alongside the component: RouteDetail.jsx IMPORTS USE_DB
  // without re-exporting it, so reading it off that bundle gives `undefined`, which the check
  // below then reports as "the flag can never fire". That check caught this probe, not the app.
  fs.writeFileSync(entry, [
    `export { TopoSection, topoEmptyCopy } from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};`,
    `export { USE_DB } from ${JSON.stringify(path.join(ROOT, "lib/supabase.js"))};`,
  ].join("\n"));
  // Bundle INSIDE the project: node resolves `react` from the nearest node_modules, so a bundle in
  // the OS temp dir throws ERR_MODULE_NOT_FOUND.
  execFileSync("npx", ["esbuild", entry,
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    `--define:import.meta.env=${env}`,
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch {
  dead("esbuild could not bundle RouteDetail.jsx");
}

// supabase's createClient builds a RealtimeClient AT CONSTRUCTION, which asks for a WebSocket
// constructor and throws on node < 22 (native there, absent on 20). Nothing here subscribes to a
// channel, so satisfying that capability check is enough — and doing it explicitly keeps the probe
// runnable on both, rather than passing in CI and dying on a contributor's machine.
if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class { constructor() { throw new Error("probe: no realtime"); } };
}

const mod = await import(out + "?t=" + Date.now());
const { TopoSection, topoEmptyCopy, USE_DB } = mod;
if (typeof TopoSection !== "function") dead("RouteDetail.jsx does not export TopoSection — ANCHOR LOST");
if (typeof topoEmptyCopy !== "function") dead("RouteDetail.jsx does not export topoEmptyCopy — ANCHOR LOST");
if (USE_DB !== true) dead("USE_DB is not true in the bundle, so toposUnavailable can never fire");

const INVITE = "Got a clear shot?";
const broke = topoEmptyCopy(true), empty = topoEmptyCopy(false);
if (!broke || !empty || !broke.head || !broke.body || !empty.head || !empty.body) {
  dead("topoEmptyCopy did not return head and body for both states");
}

// ---- half 1: the flip, executed ----
cases++;
if (/couldn’t load/i.test(broke.head)) ok("failed read: the headline says the read failed");
else fail(`failed read: headline does not report a failure — "${broke.head}"`);

cases++;
if (!broke.body.includes(INVITE)) ok("failed read: does not invite you to add the first topo");
else fail(`failed read: the body still says "${INVITE}", which presumes there is no topo`);

cases++;
if (/not a claim that there is none/i.test(broke.body)) ok("failed read: says a topo may already be on file");
else fail("failed read: the body does not say the list is unknown rather than empty");

// The healthy side is what stops the fix being a blanket rewrite.
cases++;
if (/no topo yet/i.test(empty.head)) ok("empty route: still says there is no topo yet");
else fail(`empty route: lost its genuine empty state — "${empty.head}"`);

cases++;
if (empty.body.includes(INVITE)) ok("empty route: still invites the first topo");
else fail("empty route: the invitation was removed from the genuinely-empty case too");

cases++;
if (!/couldn’t load/i.test(empty.head + empty.body)) ok("empty route: claims no failure");
else fail("empty route: reports a failure that did not happen");

// ---- half 2: that copy reaches the markup ----
// A cache seeded with [] is a read that SUCCEEDED and found nothing — the state the genuine empty
// state describes, and the one SSR can actually reach.
const AREA = "probe_area";
const route = { id: "probe_route", mountainId: AREA, name: "Probe Route" };
let markup;
try {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(["area-topos", AREA], []);
  markup = renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(TopoSection, { route })));
} catch (e) {
  dead("TopoSection threw: " + (e && e.message));
}
// The loading branch is ~505 characters, so this floor also catches the probe accidentally
// measuring "Loading topo photos…" again — which is exactly what an earlier version did.
if (markup.length < 900) {
  dead(`the render produced only ${markup.length} characters — likely the loading branch, not the empty state`);
}

// renderToStaticMarkup escapes; match what the markup holds, not the source string.
const has = (t) => markup.includes(t.replace(/&/g, "&amp;"));

cases++;
if (has(empty.head)) ok("reaches the markup: headline rendered from topoEmptyCopy");
else fail("topoEmptyCopy's headline does not appear in the rendered section — it reaches no screen");

cases++;
if (has(empty.body)) ok("reaches the markup: body rendered from topoEmptyCopy");
else fail("topoEmptyCopy's body does not appear in the rendered section — it reaches no screen");

clean();
if (cases < 8) dead(`only ${cases} case(s) ran`);
console.log(`\ncheck:topo-outage-copy: ${cases} case(s), ${failures} failure(s)  [render ${markup.length}ch]`);
process.exit(failures ? 1 : 0);
