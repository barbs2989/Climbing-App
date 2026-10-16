#!/usr/bin/env node
// A RECORDED NEGATIVE RESULT: SSR cannot verify the climb-length fallback, and the two renders are
// BYTE-IDENTICAL.
//
// `RouteDetail` computes `climbLenRaw = route.routeFt || (sum of pitchDetail lengths)`, so nulling
// an impossible `length_m` should make the page fall through to the route's own pitch table — and
// `usePitchSumForLen` should flip the unit from `uElev` (feet) to `uLen` (metres). The obvious way
// to prove that is to render the real component both ways and diff.
//
// IT PROVES NOTHING. The TECH STATS tile renders through <CountUp/>, which is `useState(0)` reaching
// its target only inside a `useEffect`, and effects do not run under `renderToStaticMarkup`. So the
// number is 0 in both renders AND the unit never reaches the markup either: 17,654 characters,
// identical, whether routeFt is 200 or null. CLAUDE.md already warns never to assert on those
// numbers; what is worth recording is that you cannot assert on the surrounding markup either.
//
// So do not reach for SSR here. `scripts/oneoff/null-impossible-route-lengths.mjs` is justified by
// the impossibility in the row (a 4-pitch route cannot be 200 ft), not by the fallback; the
// fallback is a bonus, and confirming it needs a real browser.
import { build } from "esbuild";
import path from "path"; import os from "os"; import fs from "fs";
import { createRequire } from "module";
const ROOT="/Users/nathanbarber/dev/Climbing-App";
const require_=createRequire(import.meta.url);
const ENTRY=`
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT,"RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}`;
const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"cm-len-")),"b.cjs");
await build({stdin:{contents:ENTRY,resolveDir:ROOT,loader:"js"},bundle:true,format:"cjs",platform:"node",jsx:"automatic",loader:{".jsx":"jsx"},define:{"import.meta.env":"{}"},outfile:out,logLevel:"error"});
const {render}=require_(out);

// wa_liberty_bell_overexposure, as the mapper delivers it: routeFt derived from length_m 61.
const base={id:"probe",name:"Overexposure",grade:"5.9",gradeSystem:"yds",discipline:"alpine",pitches:4,
  mountainId:"probe_area",_dbArea:{id:"probe_area",name:"Liberty Bell",areaType:"peak",region:"Washington"},
  pitchDetail:[{pitch:1,lengthM:30},{pitch:2,lengthM:30},{pitch:3,lengthM:40},{pitch:4,lengthM:40}]};
const strip=h=>h.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&#x27;/g,"'").replace(/\s+/g," ");
// The tile renders through <CountUp/>, which is useState(0) reaching its target only inside a
// useEffect — and effects do not run under renderToStaticMarkup. So the NUMBER is always 0 here and
// must never be asserted on; what CAN be asserted is that the two renders differ, and how.
const a=render({...base,routeFt:200},"overview");
const b=render({...base,routeFt:null},"overview");
console.log("markup identical?", a===b, " lengths:", a.length, b.length);
const unit=h=>{const m=strip(h).match(/Climb length[^A-Za-z]{0,12}([A-Za-z]+)/);return m?m[1]:"(none)";};
console.log("BEFORE (length_m 61 -> routeFt 200) unit:", unit(a));
console.log("AFTER  (length_m null -> routeFt null) unit:", unit(b));
// And the pure expression the page computes, which SSR cannot animate but we can evaluate.
const sum=base.pitchDetail.reduce((x,p)=>x+p.lengthM,0);
console.log("routeFt present -> climbLenRaw =", 200, "(feet, uElev)");
console.log("routeFt null    -> climbLenRaw =", sum, "(metres, uLen) =", Math.round(sum*3.28084), "ft");
