#!/usr/bin/env node
// check:waypoint-placement — a waypoint the map cannot draw must SAY SO, and must not pretend to
// be a control; and exactly one predicate decides which waypoints those are.
//
// WHY THIS EXISTS. `WaypointList` already does the right thing: an unplaced row renders "No
// coordinate on file — this point is not on the map above", and it is NOT given a tap handler,
// because a row that looks tappable and pans to nothing is worse than a row that explains itself.
// That behaviour was described only in a COMMENT, which this file records as the thing that rots —
// and the comment had already gone stale, claiming "44 pins across 17 WA alpine routes" against a
// measured 39 across 16. Nothing rendered it, so nothing would have noticed it disappearing.
// 39 pins on 16 routes is not a rounding error on a navigation screen.
//
// THE SECOND HALF IS THE PREDICATE. "Is this waypoint on the map?" was answered NINE ways:
// `GPXMap` tested `w.lat != null` in eight places — none checking `lng`, none checking finiteness —
// while `WaypointList` tested both coordinates for a finite Number. Measured across all 4,230 live
// WA waypoints the two AGREE, so this fixed no visible bug; it closes a split only a contributed
// value can open, and contributed rows store lat/lng as STRINGS (one numeric string is already in
// the catalog). The empty string is the case that bites: `"" == null` is false so the map draws the
// pin, `Number("")` is 0 which IS finite so the list calls it placed, and it lands at latitude 0 in
// the Gulf of Guinea — the same `Number(null) === 0` trap `audit:map-pins` records from a
// 12,215 km "disagreement". All nine now call `wpPlaced()`.
//
// Static plus one renderToStaticMarkup pass — no browser, no dev server, no DB — so it sits in
// `npm run build` with the other gates.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const ROOT = new URL("..", import.meta.url).pathname;
const core = readFileSync(join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const rd = readFileSync(join(ROOT, "RouteDetail.jsx"), "utf8");
/* Resolve esbuild through NODE'S OWN resolution, never a path under ROOT and never `npx`.
   This repo is worked in git worktrees whose own `node_modules` is EMPTY — packages resolve from
   the parent checkout — so a hardcoded ROOT/node_modules/.bin path does not exist here and the
   guard would fail closed on every worktree run, which is how a correct guard gets deleted.
   `npx` is wrong for the opposite reason: it can resolve over the network or contend on a lock,
   turning a correctness guard into a flake — worse than not having it, because people learn to
   re-run it rather than read it. */
const require_ = createRequire(import.meta.url);
let esbuild = null, esbuildErr = "";
try { esbuild = require_("esbuild"); } catch (e) { esbuildErr = String(e.message || e); }
let bad = 0;
const fail = (m) => { console.error(`FAIL — ${m}`); bad++; };

/* ── 1. ONE definition, and every site uses it ─────────────────────────────────────────────── */
const defs = (core.match(/export function wpPlaced\s*\(/g) || []).length;
if (defs !== 1) fail(`expected exactly 1 \`export function wpPlaced(\` in core, found ${defs}. The whole point is one answer.`);

/* Scope to GPXMap's body rather than the file: `peakCoord.lat!=null` is a legitimate test of a
   PEAK coordinate, not a waypoint, and flagging it would be telling an author to break correct
   code — the direction that teaches people to ignore a guard. */
const gi = core.indexOf("function GPXMap({pts,waypoints");
if (gi < 0) fail("ANCHOR LOST — `function GPXMap({pts,waypoints` is gone; nothing below was checked.");
else {
  const body = core.slice(gi, gi + 12000);
  /* A bare lat-null test on a variable named like a waypoint is the shape that was swept. */
  const stragglers = [...body.matchAll(/\bw[a-z]{0,2}\s*\.\s*lat\s*[!=]==?\s*null/g)].map((m) => m[0]);
  if (stragglers.length) fail(`GPXMap still decides placement with a bare lat-null test (${stragglers.length}): ${[...new Set(stragglers)].join(", ")}. Use wpPlaced().`);
  if (!/wpPlaced\(/.test(body)) fail("GPXMap never calls wpPlaced() — it is deciding placement some other way.");
}
if (!/wpPlaced\(/.test(rd)) fail("RouteDetail never calls wpPlaced().");

/* ── 1b. A TENTH PREDICATE, BORN OUTSIDE GPXMap ─────────────────────────────────────────────────
   Section 1 is scoped to GPXMap's body for a good reason — `peakCoord.lat!=null` is a legitimate
   test of a PEAK coordinate and flagging it would tell an author to break correct code. The cost
   of that scoping is that a placement test written ANYWHERE ELSE is invisible by construction, and
   one duly appeared one PR after the sweep: `trailheadPoint()` decided placement with
   `w.lat!=null&&w.lng!=null`, and with `w.lat!=null` alone — no lng at all — in its fallback. It
   was flagged in review and merged anyway, which is the argument for a guard over a comment.

   THE RULE IS STRUCTURAL AND SCOPED BY THE DATA SOURCE, NOT BY THE VARIABLE NAME: a coordinate
   test inside a callback that is ITERATING WAYPOINTS is a placement test whatever the parameter is
   called, and a test on a peak, a user position or an area cannot reach it. The receiver is
   resolved through Babel scope, so `const wps=route.waypoints||[]` counts — naming alone would
   miss exactly the shape that got through. */
{
  /* The CJS interop dance the sibling guards already do — `.default` is a function under some
     resolutions and the namespace object under others, and the wrong one throws at the call. */
  const _t = (await import("@babel/traverse")).default;
  const traverse = _t.default || _t;
  const { parse } = await import("@babel/parser");
  const ARRAY_METHODS = new Set(["find", "filter", "some", "every", "findIndex", "findLast", "flatMap"]);
  const WAYPOINTY = /waypoints|\bwps\b/i;

  for (const [label, src] of [["ClimbMatchCore.jsx", core], ["RouteDetail.jsx", rd]]) {
    let ast;
    try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
    catch (e) { fail(`could not parse ${label} to look for placement tests (${String(e.message).slice(0, 80)})`); continue; }

    const found = [];
    traverse(ast, {
      CallExpression(path) {
        const c = path.node.callee;
        if (c.type !== "MemberExpression" || c.computed || !ARRAY_METHODS.has(c.property.name)) return;

        // Is the thing being iterated a waypoint list? Read the receiver, and if it is a bare
        // identifier, read what it was ASSIGNED — that is what makes `wps` count.
        let recv = src.slice(c.object.start, c.object.end);
        if (c.object.type === "Identifier") {
          const b = path.scope.getBinding(c.object.name);
          const init = b && b.path.node && b.path.node.init;
          if (init) recv += " " + src.slice(init.start, init.end);
        }
        if (!WAYPOINTY.test(recv)) return;

        const cb = path.node.arguments[0];
        if (!cb || !/FunctionExpression|ArrowFunctionExpression/.test(cb.type)) return;
        const body = src.slice(cb.start, cb.end);
        // Already asking the one predicate? Then this is the fix, not the defect.
        if (/wpPlaced\s*\(/.test(body)) return;
        // A COMPARISON on .lat or .lng is a placement decision. A plain read (`[w.lat, w.lng]`)
        // is not, and flagging it would condemn every correct consumer of a placed pin.
        const cmp = body.match(/\.\s*(?:lat|lng)\s*(?:[!=]==?\s*(?:null|undefined)|\)?\s*\?)/g)
          || body.match(/Number\.isFinite\s*\(\s*Number\?\.?\s*\(?[A-Za-z_$][\w$]*\s*\.\s*(?:lat|lng)/g);
        if (cmp) found.push({ recv: recv.split(" ")[0], snippet: body.replace(/\s+/g, " ").slice(0, 96) });
      },
    });

    for (const f of found) {
      fail(`${label}: a placement test on a waypoint list (${f.recv}) that does not go through wpPlaced() — ${f.snippet}`);
    }
  }
}
/* The old inline expression must not come back alongside the helper — two answers is the defect. */
if (/Number\.isFinite\(Number\(wp\.lat\)\)/.test(rd)) fail("RouteDetail has re-inlined the finite-coordinate test; wpPlaced() is the single answer.");

/* ── 2. The predicate's own behaviour, on the cases that decide it ─────────────────────────── */
{
  const m = core.match(/export function wpPlaced\(w\)\{[\s\S]{0,400}?\n/);
  if (!m) fail("could not lift wpPlaced() to unit-test it.");
  else {
    const fn = new Function(`${m[0].replace(/^export /, "")}; return wpPlaced;`)();
    const cases = [
      ["a real pair", { lat: 47.5, lng: -121.4 }, true],
      ["numeric STRINGS — how a contribution arrives", { lat: "47.5", lng: "-121.4" }, true],
      ["both null", { lat: null, lng: null }, false],
      ["lat only — lng missing was unchecked in all 8 map sites", { lat: 47.5, lng: null }, false],
      ["undefined", {}, false],
      ['EMPTY STRING — Number("") is 0 and finite; this is the Gulf of Guinea case', { lat: "", lng: "" }, false],
      ["one empty string", { lat: 47.5, lng: "" }, false],
      ["non-numeric string", { lat: "unknown", lng: "unknown" }, false],
      ["null waypoint", null, false],
      /* 0,0 is a REAL coordinate in the Gulf of Guinea and this predicate is about whether a value
         exists, not whether it is plausible. Rejecting it here would silently hide a bad pin from
         the audits whose job is to find it. */
      ["literal 0,0 is well-formed — placement is not plausibility", { lat: 0, lng: 0 }, true],
    ];
    for (const [label, w, want] of cases) {
      const got = fn(w);
      if (got !== want) fail(`wpPlaced(${JSON.stringify(w)}) — ${label}: expected ${want}, got ${got}`);
    }
  }
}

/* ── 3. It RENDERS: the honesty line, and no phantom control ──────────────────────────────── */
/* The bundle MUST live inside the project: node resolves `react` from the nearest node_modules,
   and a bundle in the OS temp dir throws ERR_MODULE_NOT_FOUND rather than rendering anything. */
const tmp = mkdtempSync(join(ROOT, ".wpplace-"));
try {
  const entry = join(tmp, "probe.jsx");
  writeFileSync(entry, `
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(join(ROOT, "RouteDetail.jsx"))};
const base=(wps)=>({id:"probe_rt",name:"Probe Route",grade:"5.8",pitches:3,discipline:"alpine",
  mountainId:"probe_area",areaId:"probe_area",waypoints:wps,gpxPts:[],approach:"Walk in.",activity:[]});
const P={onBack(){},onSubTab(){},contribs:[],myReports:[],connections:[],comments:{},hzVotes:{},
  sunReports:{},gearEdits:{},diffRatings:{},crewsForRoute:[],myStars:{},presence:null};
const qc=new QueryClient({defaultOptions:{queries:{retry:false}}});
const R=(wps)=>renderToStaticMarkup(React.createElement(QueryClientProvider,{client:qc},
  React.createElement(RouteDetail,{route:base(wps),initialSubTab:"planner",...P})));
const MIX=[{name:"Trailhead Alpha",type:"Trailhead",lat:47.5,lng:-121.4,elev:2000,distMi:0},
           {name:"Ghost Junction",type:"Junction",lat:null,lng:null,elev:4000,distMi:2}];
const NONE=[{name:"Ghost Junction",type:"Junction",lat:null,lng:null,elev:4000,distMi:2}];
console.log("@@MIX@@"+R(MIX));
console.log("@@NONE@@"+R(NONE));
`);
  if (!esbuild) { fail(`esbuild could not be resolved (${esbuildErr}) — the render probe could not run, so NOTHING below was checked. Run npm install.`); throw new Error("no esbuild"); }
  esbuild.buildSync({
    entryPoints: [entry], bundle: true, platform: "node", format: "esm",
    loader: { ".jsx": "jsx" }, jsx: "automatic",
    external: ["react", "react-dom", "@tanstack/react-query", "leaflet"],
    /* lib/supabase.js reads `import.meta.env` at MODULE SCOPE, so without this the bundle throws
       on import before a single component renders. CLAUDE.md records the same trap for
       probe-which-area-has-activity. */
    define: { "import.meta.env": "{}" },
    outfile: join(tmp, "b.mjs"),
    /* Silent, or esbuild's duplicate-key warnings from the app's dense inline styles bury this
       guard's own verdict — and a guard nobody can read the output of is a guard nobody reads.
       A genuine build ERROR still throws and is reported by the catch below. */
    logLevel: "silent",
  });
  /* process.execPath, not "node" — the guard must run under the same runtime that launched it. */
  const res = execFileSync(process.execPath, [join(tmp, "b.mjs")], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const grab = (k) => { const i = res.indexOf(`@@${k}@@`); if (i < 0) return null; const j = res.indexOf("\n", i); return res.slice(i + k.length + 4, j < 0 ? undefined : j); };
  const mix = grab("MIX"), none = grab("NONE");
  if (!mix || !none) fail("the render probe produced no markup — a broken probe, not a clean app.");
  else {
    /* renderToStaticMarkup escapes; match the escaped form. Proving the probe CAN fire comes
       first, or every assertion below is vacuous. */
    if (!/Ghost Junction/.test(mix)) fail("ANCHOR LOST — the waypoint list did not render at all, so nothing below was checked.");
    const HONEST = /No coordinate on file/;
    if (!HONEST.test(mix)) fail("an unplaced waypoint renders NO honesty line — it is indistinguishable from a placed pin.");
    if (!HONEST.test(none)) fail("with every waypoint unplaced, still no honesty line.");
    /* The control test is what stops a dead tap target. A placed row carries the aria-label; an
       unplaced one must not. Count, do not merely test presence — one of each is the point. */
    const labels = (mix.match(/aria-label="Show [^"]*on the map"/g) || []);
    if (labels.length !== 1) fail(`expected exactly ONE "Show … on the map" control for one placed pin, found ${labels.length}: ${labels.join(" | ")}`);
    if (labels.length === 1 && /Ghost Junction/.test(labels[0])) fail("the UNPLACED waypoint is announced as a control — it would pan the map to nothing.");
    const noneLabels = (none.match(/aria-label="Show [^"]*on the map"/g) || []);
    if (noneLabels.length) fail(`with no placed waypoints, ${noneLabels.length} row(s) still announce a map control.`);
    /* And the hint that teaches the affordance must not appear when nothing can be tapped. */
    const HINT = /Tap a waypoint to find it on the map/;
    if (!HINT.test(mix)) fail("the tap hint is missing even though a placed waypoint exists.");
    if (HINT.test(none)) fail("the tap hint renders when NO waypoint is placed — it promises an interaction that cannot happen.");
  }
} catch (e) {
  /* Distinguish "the probe could not run" from "the app rendered something wrong" — they need
     opposite repairs, and a toolchain message that reads as an app defect sends the next author
     hunting through RouteDetail for a bug that is not there. */
  if (String(e.message || e) !== "no esbuild") fail(`the render probe could not complete, so the rendered assertions were NOT checked: ${String(e.message || e).slice(0, 400)}`);
} finally { rmSync(tmp, { recursive: true, force: true }); }

if (bad) { console.error(`\ncheck:waypoint-placement — ${bad} problem(s).`); process.exit(1); }
console.log("check:waypoint-placement: ok — one placement predicate, and an undrawable waypoint says so instead of offering a dead tap.");
