// CAN A REAL CLIMBER'S CREW BE FOUND BY ANOTHER REAL CLIMBER?
//
// "Join a crew" (CrewFinder) read the seed OPEN_CREWS array and nothing else, so the answer was no
// -- on the screen whose entire purpose is finding one. `crew_listings` is a view 0036 built
// deliberately for this and `useCrewListings()` had read it since, with NOTHING calling the hook.
//
// This renders the REAL component over a synthetic DB crew and asserts four things a merge could
// each break separately: the crew appears at all, its route is NAMED (not "undefined"), its
// ORGANISER is named from the real profile rather than resolved against seed CLIMBERS, and a
// failed read says so instead of rendering an empty list.
//
// No browser, no database: CrewFinder is a pure component once its props are supplied, and the one
// query it issues (useRouteSearch) is disabled on an empty string.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const OUT = path.join(process.cwd(), ".probe-crewfinder.mjs");
execFileSync("npx", ["esbuild", "ClimbMatchCore.jsx", "--bundle", "--format=esm",
  "--jsx=automatic", "--loader:.jsx=jsx", "--platform=node",
  // external, or esbuild inlines its OWN react-query and the provider below is a different
  // module instance with a different context -- "No QueryClient set" with a provider in place.
  "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--define:import.meta.env={}", "--outfile=" + OUT], { stdio: ["ignore", "ignore", "inherit"] });
const core = await import(OUT + "?t=" + Date.now());
fs.unlinkSync(OUT);

const { CrewFinder, ROUTES } = core;
if (typeof CrewFinder !== "function" || !Array.isArray(ROUTES) || !ROUTES.length) {
  console.error("FAIL-CLOSED: CrewFinder/ROUTES not exported — nothing below was checked.");
  process.exit(1);
}

let fails = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { console.log("  FAIL  " + m); fails++; };

// A crew a real climber opened. `routeId` is one of ME.objectiveIds so the DEFAULT mode
// ("My Objectives") shows it -- SSR renders initial state and cannot click the mode buttons.
const REAL = {
  id: "3f9a1c2e-0000-4000-8000-000000000001", _db: true,
  routeId: "kings_hf",
  _route: { id: "kings_hf", name: "Henry’s Fork", grade: "5.9", areas: { name: "Kings Peak", lat: 40.7764, lng: -110.3729 } },
  organizer: "9c1d7b44-0000-4000-8000-0000000000aa",
  _org: { id: "9c1d7b44-0000-4000-8000-0000000000aa", name: "Robin Vasquez", avatar: "", location: "Bend, OR", username: "robinv", _profile: true },
  have: 1, spots: 2, date: "", pace: "", note: "",
  members: ["9c1d7b44-0000-4000-8000-0000000000aa"],
};
const render = (props) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(CrewFinder, Object.assign({
        onRequestJoin: () => {}, requested: [], onViewProfile: () => {},
        connections: [], onOpenRoute: () => {}, routeById: (id) => (id === REAL.routeId ? REAL._route : (ROUTES.find((r) => r.id === id) || null)),
      }, props))));
};

const seedOnly = render({ dbCrews: [] });
if (seedOnly.length < 800) { console.error(`FAIL-CLOSED: seed render is ${seedOnly.length} chars — too thin, every assertion below would pass vacuously.`); process.exit(1); }
ok(`the screen renders (${seedOnly.length} chars with seed crews only)`);

const withReal = render({ dbCrews: [REAL] });

// 1. IT APPEARS. Compared against the seed-only render, so this cannot pass on seed content.
if (withReal.length > seedOnly.length) ok(`a real crew adds to the listing (${seedOnly.length} -> ${withReal.length} chars)`);
else bad(`a real crew added nothing (${seedOnly.length} -> ${withReal.length}) — it is filtered out or never merged`);

// 2. ITS ROUTE IS NAMED. `undefined` here is the #1 symptom of a row resolved against the wrong store.
if (withReal.includes("Henry’s Fork")) ok("the real crew's route is named");
else bad("the real crew's route name is missing — routeById did not resolve it");
if (/undefined/.test(withReal)) bad("the markup contains the word `undefined`");
else ok("no `undefined` anywhere in the markup");

// 3. ITS ORGANISER COMES FROM THE REAL PROFILE. A uuid resolved against seed CLIMBERS matches
//    never, which is the #569/#680/#734/#778/#826 defect; the tell is the name simply missing.
// The chip shows a FIRST name by design (`c.name.split(" ")[0]`), so asserting the full name
// tests the component's copy rather than the fix. climberLine's output is the durable proof: a
// seed climber renders "Trust NN" in that slot, and only a real profile renders location · handle.
if (withReal.includes("Robin")) ok("the organiser's name renders");
else bad("the organiser is not named — a uuid was resolved against seed CLIMBERS");
if (withReal.includes("Bend, OR · @robinv")) ok("...from the REAL profile (climberLine, not an invented trust score)");
else bad("...but not from the real profile — climberLine did not run for it");
if (/Trust \d+<\/span><\/span><\/button>[^]{0,40}Request to join crew/.test(withReal.slice(withReal.indexOf("Henry")))) bad("the real crew's chip prints an invented trust score");
else ok("no invented trust score on the real crew's chip");

// 4. A FAILED READ IS NOT AN EMPTY LIST. Asserted with NO crews, which is the only state in which
//    the empty copy renders at all.
const outage = render({ dbCrews: [], dbCrewsUnavailable: true });
if (outage.includes("Couldn’t load open crews")) ok("a failed read says so");
else bad("a failed read does not say so");
if (outage.includes("not everything that is out there")) ok("...and says the list is incomplete");
else bad("...but does not say the list is incomplete");
const healthy = render({ dbCrews: [] });
if (healthy.includes("Couldn’t load open crews")) bad("the healthy screen claims the read failed");
else ok("the healthy screen makes no outage claim");

console.log(fails ? `\n${fails} FAILURE(S)` : "\nok — a real climber's crew is findable, named, and a failed read says so");
process.exit(fails ? 1 : 0);
