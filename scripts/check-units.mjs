#!/usr/bin/env node
// A UNIT-AWARE SURFACE MUST RENDER IN THE CLIMBER'S CHOSEN UNITS, AND A CONTROL THAT WRITES MUST
// CANONICALISE BEFORE STORING.
//
// This is SIX probes promoted into one guard. Every one of them ran NOWHERE -- they lived in
// scripts/oneoff/, which nothing invokes -- and each proved a fix that changes STRINGS AND NO
// IDENTIFIER: a label, a unit word, a conversion at a call site. `audit:silent-reverts` says in
// its own closing caveat that it cannot see that shape, so a stale-base squash could restore
// every one of these defects with each existing gate green. That is the same argument that
// promoted check:topo-outage-copy, check:policy-claims, check:profile-claims and
// check:offline-claims.
//
// PROMOTING ONE WOULD HAVE LEFT FIVE STILL RUNNING NOWHERE -- an instance fixed by hand is not a
// class closed -- so all six are here, sharing ONE esbuild bundle instead of building the same
// 400kB file six times. Two of them bundled RouteDetail separately. That merge is the
// check:outage-copy precedent, which folded two probes together for exactly this reason.
//
// IT WAS FIVE UNTIL THE SIXTH LANDED MID-BUILD. #1671 merged while this was being written and
// added a sixth unit probe running nowhere (the `variants` section below is that probe, folded in
// and its own file removed), so a guard shipping as "the five" would have been stale on arrival.
// Re-check `git log origin/main` for new members before quoting the count.
//
// THE CLASS IS ONE CLASS, and the write half is the serious end of it. A display defect
// misinforms one reader; a form that stores what was typed corrupts the record for every reader
// -- a metric climber typing 10 meaning 10C had 10 written into `climb_logs.temp_f`, so their
// own report told everyone else the route was at -12C. FOUR writes are covered here: the trip
// report temperature, the itinerary builder, the bail form's distance, and the approach-variants
// editor -- whose two numbers `sameEditValue` compares with a TOLERANCE, so a stored kilometre
// does not merely display wrong, it lands 1.6x away and the 3-agree merge gate can never be met.
//
// THE COLUMN STAYS CANONICAL AND THE CONVERSION HAPPENS AT THE EDGES. That rule is asserted, not
// assumed: re-fetching or re-storing in the climber's own units looks tidier and is wrong twice
// over -- wxTempColor's 85/70/50/32 thresholds are calibrated in Fahrenheit, and the forecast
// response is cached per coordinate, so the unit setting would leak into the cache key.
//
// SECTIONS, and what each can see that the others cannot:
//   persist    the preference survives a reload at all, and cannot take a screen down
//   weather    the forecast helpers convert, the colour thresholds still get RAW imperial, and
//              -- APP-WIDE -- no new hard-coded imperial unit is welded on with `+`
//   reports    a climber's OWN temperature, on screen and on the way into the column
//   itinerary  the plan builder, the downloaded .txt, and the bail form's second writer
//   variants   the approach-variants editor: both boundaries, and its two labels
//   filters    the filter chips, and whether a length LABEL agrees with the predicate it labels
//
// `--only=<section>` runs one of them. It is for the injection harness and it PRINTS A PARTIAL
// BANNER AND CAN NEVER READ AS A PASS -- the contract check:a11y-badges' `--only=route` already
// sets, because a flag that let a partial run look complete would be the false pass this whole
// file is built to refuse.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(import.meta.url);

const SECTIONS = ["persist", "weather", "reports", "itinerary", "variants", "filters", "profile", "pitches", "keyed"];
// FLOORS ARE PER SECTION, because ONE total cannot see a section that quietly stopped asking:
// five healthy sections carry the number while the sixth contributes nothing, and the run prints
// the same `ok`. That is the per-file floor lesson check:control-names paid for, where a PARTIAL
// restyle left the guard checking 1 file of 2 and reporting `ok`.
//
// Each sits two below what a clean tree produces (15/22/17/18/15/40/14/10/15 today) -- close enough that a
// section losing a meaningful part of its work trips, loose enough that a conditional branch
// taking a `continue` does not. Raise one when you add an assertion; never lower one to make a
// run pass.
// `filters` went 30 -> 40 when the LIVE filter (lib/DbAreaBrowser.jsx) gained sections 5 and 6, so
// its floor rises with it: a floor left at the old count cannot see the new half stop asking.
const FLOOR = { persist: 13, weather: 37, reports: 15, itinerary: 16, variants: 13, filters: 38, profile: 12, pitches: 9, keyed: 13 };

const argOnly = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
if (argOnly && !SECTIONS.includes(argOnly)) {
  console.error(`FAIL: --only=${argOnly} names no section. Known: ${SECTIONS.join(", ")}`);
  process.exit(1);
}
const RUN = argOnly ? [argOnly] : SECTIONS.slice();

const problems = [];
const counts = Object.fromEntries(SECTIONS.map((s) => [s, 0]));
let section = "persist";
const ok = (m) => { counts[section]++; console.log("  ok    " + m); };
const fail = (m) => { counts[section]++; console.log("  FAIL  " + m); problems.push(m); };
// `process.exit()` SKIPS `finally`, which would leak the bundle directory -- the trap
// check:block-guarantees records, and one this session's own filter probe leaked nine times
// before it was fixed. Set the problem and throw a sentinel the runner swallows; the cleanup in
// `finally` is what actually ends the run.
const STOP = "__units_guard_stop__";
const dead = (m) => { problems.push("BROKEN: " + m); throw new Error(STOP); };

const CORE_PATH = path.join(ROOT, "ClimbMatchCore.jsx");
const RD_PATH = path.join(ROOT, "RouteDetail.jsx");
const APP_PATH = path.join(ROOT, "ClimbMatch.jsx");

// ===== HARD-CODED IMPERIAL UNITS, APP-WIDE =============================================
// A unit word welded to a number with `+` can never convert. The weather section's own check
// was `+" mph"` and nothing else, and the profile section records why the wider needle misses
// this shape: it wants a bare unit AFTER a brace, so `x + " ft"` is invisible to it.
//
// The six that remain are unreachable or reported, NOT overlooked -- lowering this number
// without saying which one went is how a ratchet rots:
//   1  App's area search  -- renders the SEED `MOUNTAINS` tree, so its distance is a different
//      defect entirely (the AddRoute area-picker class) and converting it would polish a
//      surface that is showing the wrong data.
//   2  rapStr (core) and fmtRappels (RouteDetail) -- the object branch of the rappels column.
//      Measured: 733 of 733 rows are STRINGS, so neither branch can be reached. The unit there
//      is chosen by WHICH COLUMN the value came from rather than by the climber, which is why
//      it is recorded as a tripwire: the day something writes an object, this arms itself.
//   3  OverviewMap and QuickMatch -- declared seed-only, asserted as such by the profile
//      section below, so their " mi away" renders for nobody.
//   4  GettingThere -- one of the three Climbs-tab components gated on `selArea`, which is
//      written only on the seed path. Dead in production by a closed decision.
const RAW_IMPERIAL_OK = 6;
const RAW_FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "lib/DbAreaBrowser.jsx", "lib/FireMap.jsx", "lib/FireNearRoute.jsx"];
// " in" is EXCLUDED: it is the English preposition far more often than inches, and including it
// reported `"APPROACHES · "+n+" way"+(s)+" in"` as a defect on the first run. A count is only as
// good as its tokeniser.
const RAW_UNIT = /^\s*(ft|mi|mph|lb)\b/;
// A unit is legitimate when the expression CHOSE it -- a `uImp()` ternary, or the defensive
// `uElev ? uElev(x) : <fallback>+" ft"` a lib component uses when a caller omits the helper.
const RAW_GUARD = /\b(uImp|uElev|uDistMi|uDist|uMass|uLen)\b/;
function rawImperialUnits() {
  const out = [];
  let total = 0;
  for (const f of RAW_FILES) {
    const src = fs.readFileSync(path.join(ROOT, f), "utf8");
    let ast;
    try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
    catch (e) { dead(`${f} did not parse while scanning for hard-coded units: ` + (e && e.message)); }
    traverse(ast, {
      StringLiteral(p) {
        if (!RAW_UNIT.test(p.node.value)) return;
        if (!p.parentPath.isBinaryExpression() || p.parentPath.node.operator !== "+") return;
        // A REACT KEY IS NOT A UNIT: `key={"lb"+i}` on the long-beta rows read as pounds.
        if (p.findParent((a) => a.isJSXAttribute() && a.node.name && a.node.name.name === "key")) return;
        // A DEFAULT PARAMETER IS THE DEFENSIVE FALLBACK, chosen by the ABSENCE of the helper.
        if (p.findParent((a) => a.isObjectPattern() && a.parentPath && a.parentPath.isFunction())) return;
        total++;
        // Did anything up the chain actually choose this unit?
        let cur = p;
        for (let i = 0; i < 14 && cur; i++) {
          const parent = cur.parentPath;
          if (!parent) break;
          if (parent.isConditionalExpression() && RAW_GUARD.test(JSON.stringify(parent.node.test))) return;
          cur = parent;
        }
        let fn = p.getFunctionParent(); let owner = null;
        while (fn) {
          let nm = fn.node.id && fn.node.id.name;
          if (!nm && fn.parentPath && fn.parentPath.isVariableDeclarator() && fn.parentPath.node.id.type === "Identifier") nm = fn.parentPath.node.id.name;
          if (nm && /^[A-Z]/.test(nm)) { owner = nm; break; }
          fn = fn.getFunctionParent();
        }
        out.push({ f, owner: owner || "(module scope)", ctx: src.slice(Math.max(0, p.node.start - 70), p.node.end).replace(/\s+/g, " ").slice(-85) });
      },
    });
  }
  return { raw: out, total };
}

let tmpdir = null;
let M = null;

// ONE BUNDLE FOR EVERY EXECUTED SECTION. Built lazily, so `--only=persist` pays nothing for it.
// react and react-query are bundled IN rather than externalised, because the entry creates the
// provider itself -- one copy throughout, so no hook sees a second React and no render throws
// "Invalid hook call". That is also what lets the bundle live in the OS temp dir: with nothing
// external, node has nothing to resolve from a neighbouring node_modules, which is the trap that
// forces other probes here to build inside the project.
async function loadBundle() {
  if (M) return M;
  const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ReactDOM from "react-dom";
import RouteDetail from ${JSON.stringify(RD_PATH)};
import { ItineraryEditor, BailoutForm, FullProfile } from ${JSON.stringify(CORE_PATH)};
export { distMiles, ME } from ${JSON.stringify(CORE_PATH)};
export {
  uTemp, uTempN, uTempDelta, uWind, uWindN, uPrecip, uSnowfall,
  uTempU, uTempIn, buildConsensus,
  itinDaysToDraft, itinDraftToStructured, itinToText, uDistMiIn,
  itinDraftVal, itinStoreVal, uElev, uLenN, uLenIn, uLenUnit,
  ROUTE_LENGTHS, routeLengthLabel, uDistMi, uDistMiUnitLong, passesFilters,
  uElevN, uElevUnit,
  __set_UNITS,
} from ${JSON.stringify(CORE_PATH)};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function renderRoute(route, tab) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
export function renderEditor(itin) {
  return renderToStaticMarkup(React.createElement(ItineraryEditor, { itin, onChange: noop }));
}
export function renderBailout() {
  return renderToStaticMarkup(React.createElement(BailoutForm, { onSubmit: noop, onCancel: noop, peakCoord: null }));
}
// FullProfile ends in createPortal(..., document.body), which the server renderer refuses --
// portals are PLACEMENT and check:overlays owns that. The patch is SCOPED TO THIS CALL and
// restored in a finally, deliberately: flattening createPortal for the whole bundle would change
// what the sections above render (RouteDetail portals its lightbox), so a shared patch could
// quietly move assertions that have nothing to do with units. core does
// \`import { createPortal } from "react-dom"\`, which esbuild emits as a property access at CALL
// time, which is what makes the scoping possible. \`document.body\` is stubbed with it, because the
// container ARGUMENT is evaluated before createPortal is ever called.
export function renderProfile(climber) {
  const orig = ReactDOM.createPortal;
  const hadDoc = "document" in globalThis;
  ReactDOM.createPortal = (children) => children;
  if (!hadDoc) globalThis.document = { body: {} };
  try {
    return renderToStaticMarkup(
      React.createElement(QueryClientProvider, { client: qc },
        React.createElement(FullProfile, {
          climber, onClose: noop, onResume: noop, catchCredits: [], myCrews: [],
          myFriendIds: [], vouched: false, mySpeedFtHr: 0, routeById: () => null,
        })));
  } finally { ReactDOM.createPortal = orig; if (!hadDoc) delete globalThis.document; }
}
`;
  tmpdir = fs.mkdtempSync(path.join(os.tmpdir(), "cm-units-"));
  const out = path.join(tmpdir, "bundle.cjs");
  try {
    await build({
      stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
      bundle: true, format: "cjs", platform: "node", jsx: "automatic",
      loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
      outfile: out, logLevel: "error",
    });
  } catch (e) {
    dead("the app did not bundle, so no section below could execute: " + (e && e.message));
  }
  M = require_(out);
  const NEED = ["uTemp", "uTempN", "uTempDelta", "uWind", "uPrecip", "uSnowfall", "uTempU",
    "uTempIn", "buildConsensus", "itinDaysToDraft", "itinDraftToStructured", "itinToText",
    "uDistMiIn", "itinDraftVal", "itinStoreVal", "uElev", "ROUTE_LENGTHS",
    "routeLengthLabel", "uDistMi", "uDistMiUnitLong", "uElevN", "uElevUnit",
    "passesFilters", "__set_UNITS", "renderRoute", "renderEditor", "renderBailout",
    "renderProfile", "distMiles", "ME"];
  for (const n of NEED) if (M[n] === undefined) dead(`${n} is not exported — nothing below was checked.`);
  return M;
}

const both = (fn, v) => {
  M.__set_UNITS("imperial"); const a = M[fn](v);
  M.__set_UNITS("metric"); const b = M[fn](v);
  M.__set_UNITS("imperial"); return [a, b];
};
const strip = (h) => h.replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");

// =======================================================================================
// PERSIST -- `units` was `useState("imperial")` with no storage anywhere, so a metric climber
// re-picked metric on every load, for every elevation, distance, pace and pack weight. A setting
// that resets is worse than no setting: it looks like it works.
async function runPersist() {
  section = "persist";
  console.log("\n== persist — the preference survives a reload, and cannot take a screen down\n");
  const mod = await import("file://" + path.join(ROOT, "lib/units-pref.js"));
  const { loadUnits, saveUnits, DEFAULT_UNITS, VALID_UNITS } = mod;
  if (typeof loadUnits !== "function" || typeof saveUnits !== "function") dead("lib/units-pref.js does not export loadUnits/saveUnits — ANCHOR LOST");

  // The interesting cases -- private mode throwing, no localStorage at all -- are states a real
  // browser will not produce on demand, so storage is faked rather than driven.
  if (typeof globalThis.localStorage !== "undefined") dead("something already defined localStorage; the no-storage case cannot be measured");
  if (loadUnits() !== DEFAULT_UNITS) fail(`with no localStorage, loadUnits() returned ${loadUnits()} instead of the default`);
  else ok(`no localStorage at all → "${DEFAULT_UNITS}" rather than a throw (this is the SSR path the guards take)`);
  try { saveUnits("metric"); ok("saveUnits with no localStorage does not throw"); }
  catch { fail("saveUnits threw when localStorage does not exist"); }

  const fake = (impl) => { globalThis.localStorage = impl; };
  const store = new Map();
  fake({ getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); } });

  if (loadUnits() !== DEFAULT_UNITS) fail("an empty store did not return the default");
  else ok("an empty store → the default");

  saveUnits("metric");
  if (loadUnits() !== "metric") fail(`round trip failed: stored metric, read back ${loadUnits()}`);
  else ok("metric survives a reload — the whole point");

  saveUnits("imperial");
  if (loadUnits() !== "imperial") fail("switching back to imperial did not persist");
  else ok("...and switching back persists too, so the toggle is not one-way");

  // A user-writable key that survives deploys: shape-check on READ, not only on write.
  store.set("climbmatch-units", "furlongs");
  if (loadUnits() !== DEFAULT_UNITS) fail(`a tampered value ("furlongs") was returned as a preference`);
  else ok("a tampered stored value falls back to the default rather than propagating");

  store.clear();
  saveUnits("furlongs");
  if (store.size) fail(`saveUnits wrote an invalid value: ${[...store.entries()]}`);
  else ok("saveUnits refuses to write a value the app cannot read back");

  // Safari private mode and a full profile THROW rather than returning null.
  fake({ getItem: () => { throw new Error("private mode"); }, setItem: () => { throw new Error("quota exceeded"); } });
  if (loadUnits() !== DEFAULT_UNITS) fail("a throwing localStorage did not fall back to the default");
  else ok("a throwing localStorage (private mode) → the default, not an exception");
  try { saveUnits("metric"); ok("a throwing setItem (quota) is swallowed — a preference cannot take a screen down"); }
  catch { fail("saveUnits let a quota error escape"); }
  delete globalThis.localStorage;

  // THE WIRING. Restoring happens in a useState initializer and persisting in an onClick --
  // neither of which a render can reach, so both are read from source.
  const app = fs.readFileSync(APP_PATH, "utf8");
  if (!/from "\.\/lib\/units-pref"/.test(app)) fail("ClimbMatch.jsx does not import the units preference");
  else ok("ClimbMatch.jsx imports it");

  // The LAZY form matters: `useState(loadUnits())` would read storage on every render, and
  // `useState("imperial")` would not read it at all.
  if (/\[units,setUnits\]=useState\(loadUnits\)/.test(app)) ok("units restores from storage via a lazy initializer (read once, on mount)");
  else if (/\[units,setUnits\]=useState\(loadUnits\(\)\)/.test(app)) fail("useState(loadUnits()) calls storage on EVERY render — pass the function, not its result");
  else fail("units does not initialise from loadUnits — the preference is not restored");

  if (/setUnits\(u\[0\]\);saveUnits\(u\[0\]\)/.test(app)) ok("the toggle writes the choice beside setting it");
  else fail("the units toggle does not call saveUnits — the choice is not persisted");

  // An effect on `units` would ALSO fire on the restore, writing back what it just read. Harmless
  // here, but it makes a load indistinguishable from a choice, so the write stays at the control.
  if (/useEffect\([^)]*saveUnits/.test(app)) fail("saveUnits is called from an effect — it will fire on the restore too");
  else ok("...and not from an effect, so a load is never mistaken for a choice");

  // Balance the array rather than matching a fixed shape. A pattern requiring EXACTLY two options
  // would die with ANCHOR LOST the moment a third unit was added -- which is precisely the case
  // this section exists to report. The anchor has to survive the change it is watching for.
  const at = app.indexOf(`[["imperial","`);
  if (at < 0) dead("the units toggle's option list is not where it was — ANCHOR LOST, so this check proved nothing");
  let depth = 0, end = -1;
  for (let k = at; k < app.length; k++) {
    if (app[k] === "[") depth++;
    else if (app[k] === "]" && --depth === 0) { end = k + 1; break; }
  }
  if (end < 0) dead("the units toggle's option list does not close");
  const offered = [...app.slice(at, end).matchAll(/\["(\w+)","/g)].map((m) => m[1]);
  if (offered.length < 2) dead(`parsed only ${offered.length} toggle option(s)`);
  const missing = offered.filter((o) => VALID_UNITS.indexOf(o) < 0);
  if (missing.length) fail(`the toggle offers ${missing.join(", ")}, which VALID_UNITS does not accept — those would persist as nothing`);
  else ok(`all ${offered.length} offered units (${offered.join(", ")}) are storable`);
  const extra = VALID_UNITS.filter((v) => offered.indexOf(v) < 0);
  if (extra.length) fail(`VALID_UNITS accepts ${extra.join(", ")}, which the toggle no longer offers — stale bookkeeping`);
  else ok("...and VALID_UNITS accepts nothing the toggle has stopped offering");
}

// =======================================================================================
// WEATHER -- the panel was fetched as temperature_unit=fahrenheit&wind_speed_unit=mph, NWS values
// were converted to F and mph unconditionally, and every one of 13 display sites printed the
// imperial number. No uTemp/uWind existed at all.
async function runWeather() {
  section = "weather";
  console.log("\n== weather — the forecast converts at DISPLAY, and the colour thresholds still see imperial\n");
  await loadBundle();

  const CASES = [
    ["uTemp", 50, "50°", "10°"],
    ["uTemp", 32, "32°", "0°"],
    ["uTemp", 85, "85°", "29°"],
    ["uTemp", -10, "-10°", "-23°"],
    ["uWind", 12, "12 mph", "19 km/h"],
    ["uWind", 30, "30 mph", "48 km/h"],
    // 0.25in is 6.35mm, which is 6.3499999... in binary, so toFixed(1) gives 6.3 rather than 6.4.
    // That is the code being right and the first expectation being wrong; pinned as-is, with a
    // non-boundary case beside it so the suite is not only testing a rounding tie.
    ["uPrecip", 0.25, '0.25"', "6.3 mm"],
    ["uPrecip", 0.5, '0.50"', "12.7 mm"],
    ["uSnowfall", 6, '6.0"', "15.2 cm"],
  ];
  for (const [fn, input, imp, met] of CASES) {
    const [a, b] = both(fn, input);
    if (a === imp && b === met) ok(`${fn}(${input})  imperial ${JSON.stringify(a)}  metric ${JSON.stringify(b)}`);
    else fail(`${fn}(${input}): got ${JSON.stringify(a)}/${JSON.stringify(b)}, expected ${JSON.stringify(imp)}/${JSON.stringify(met)}`);
  }
  // A DIFFERENCE IS NOT A TEMPERATURE. The panel prints two of them, comparing Open-Meteo against
  // NWS and MET. Converting one uses the SCALE and never the 32-degree offset: a 4 degree
  // disagreement is 2 degrees C, not -16.
  const [dImp, dMet] = both("uTempDelta", 4);
  if (dImp === 4 && dMet === 2) ok(`uTempDelta(4)  imperial ${dImp}  metric ${dMet}   (an offset conversion gives -16)`);
  else fail(`uTempDelta(4): got ${dImp}/${dMet}, expected 4/2 — a DIFFERENCE converts by scale only`);

  // THE COLOUR THRESHOLDS STILL RECEIVE RAW IMPERIAL VALUES. wxTempColor(f) and wxWindColor(mph)
  // carry hard-coded imperial cut-offs; handing them a converted value would compile, render, and
  // mis-colour every reading -- 10°C would score as "below freezing" against a 32 threshold.
  // Nothing about the screen would look broken.
  const src = fs.readFileSync(RD_PATH, "utf8");
  let ast;
  try { ast = parse(src, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { dead("RouteDetail.jsx did not parse: " + (e && e.message)); }
  let colourCalls = 0, helperCalls = 0;
  traverse(ast, {
    CallExpression(p) {
      const n = p.node.callee.name;
      if (n === "wxTempColor" || n === "wxWindColor") {
        colourCalls++;
        const arg = p.node.arguments[0];
        if (arg && arg.type === "CallExpression" && /^u(Temp|Wind)/.test(arg.callee.name || "")) {
          fail(`${n} @${p.node.start} is handed a CONVERTED value — its thresholds are imperial, so this mis-colours every reading`);
        }
      }
      if (/^u(Temp|Wind|Precip|Snowfall)/.test(n || "")) helperCalls++;
    },
  });
  if (colourCalls < 6) fail(`only ${colourCalls} colour calls found — a broken scan, not a clean file`);
  else ok(`${colourCalls} colour-threshold calls, all on raw imperial values`);
  if (helperCalls < 13) fail(`only ${helperCalls} helper calls — display sites were converted one by one, so a drop means one went back to raw`);
  else ok(`${helperCalls} unit-helper calls in RouteDetail`);

  // The two TEXTUAL checks below read a MASKED copy, because a comment explaining either rule
  // names the very string it forbids -- a guard failing on its own documentation, the trap
  // check:ci-cancel records from the other side. The line-comment pattern protects `://` on
  // purpose: the forecast URL is an https one, and a naive `//` strip would delete the exact
  // line the first check is looking for. The colour test above needs no mask at all, because it
  // walks the AST and an AST does not see comments.
  const mask = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  // The fetch must stay canonical: converting at the source would leak the setting into the cache
  // key, and the colour thresholds above are calibrated in Fahrenheit and mph.
  for (const need of ["temperature_unit=fahrenheit", "wind_speed_unit=mph", "precipitation_unit=inch"]) {
    if (!mask.includes(need)) fail(`the forecast fetch no longer pins ${need} — the data must stay canonical and convert at display`);
    else ok(`the forecast fetch still pins ${need}`);
  }
  // And no display site may hard-code the imperial unit again.
  const bare = (mask.match(/\+" mph"/g) || []).length;
  if (bare) fail(`${bare} display site(s) still append " mph" directly — use uWind()`);
  else ok('no display site appends " mph" directly');

  // -- THE FREEZING LEVEL WAS THE ONE TILE IN THIS PANEL THAT DID NOT CONVERT, and its seven
  //    siblings are what make that a MISS rather than a missing convention: uTemp x4, uWind,
  //    uPrecip and uSnowfall all go through a helper, while the eighth rendered
  //    `dy.freezeMax.toLocaleString()+" ft"`. So a metric climber read the freezing level in
  //    FEET on the one panel that decides whether an ice route is frozen.
  //    uElev() is the CONVERSION here, not a re-conversion: `precipitation_unit=inch` makes
  //    Open-Meteo return freezing_level_height in feet, so the value arrives canonical and the
  //    fetch comment beside it warns only against scaling it by 3.28 a second time.
  for (const [input, imp, met] of [[11000, "11,000 ft", "3,353 m"], [5000, "5,000 ft", "1,524 m"]]) {
    const [a, b] = both("uElev", input);
    if (a === imp && b === met) ok(`uElev(${input})  imperial ${JSON.stringify(a)}  metric ${JSON.stringify(b)}`);
    else fail(`uElev(${input}): got ${JSON.stringify(a)}/${JSON.stringify(b)}, expected ${JSON.stringify(imp)}/${JSON.stringify(met)}`);
  }
  if (/uElev\(dy\.freezeMax\)/.test(mask)) ok("the forecast Freezing level tile converts through uElev()");
  else fail('the forecast Freezing level tile no longer calls uElev(dy.freezeMax) — it is back to hard-coded feet');

  // -- THE SAME COLUMN IS HYDRATED TWICE, and CLAUDE.md records that this pair DRIFTS whenever
  //    only one half is touched, so both are asserted. `climb_logs.freezing_level_ft` is a
  //    number and both hydrations rendered it as `+" ft"`, which is another climber's report
  //    read in the wrong unit. check:log guards which COLUMNS each hydration carries and is
  //    blind to what unit one of them is rendered in.
  const appMask = fs.readFileSync(APP_PATH, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  for (const [label, m] of [["RouteDetail", mask], ["ClimbMatch", appMask]]) {
    if (/uElev\((?:r|row)\.freezing_level_ft\)/.test(m)) ok(`${label}'s climb_logs hydration converts the freezing level through uElev()`);
    else fail(`${label}'s climb_logs hydration no longer converts freezing_level_ft — a metric climber reads another climber's report in feet`);
  }

  // -- AND THE GENERAL RULE, APP-WIDE, BECAUSE THE CHECK ABOVE COULD ONLY SEE ` mph`. This
  //    guard's own profile section records the gap in as many words: its needle "wants a bare
  //    unit AFTER a brace", so a CONCATENATION is invisible to it -- and a concatenation is
  //    exactly where the freezing level and the Near-me distance both sat. A stated limitation
  //    is a worklist, so this walks the AST and asks whether anything CHOSE the unit.
  const { raw: RAW, total: RAW_TOTAL } = rawImperialUnits();
  if (RAW.length === RAW_IMPERIAL_OK) ok(`${RAW_TOTAL} imperial-unit concatenations, ${RAW.length} of them raw — all in unreachable or declared code`);
  else fail(`${RAW.length} hard-coded imperial concatenation(s) of ${RAW_TOTAL}, expected ${RAW_IMPERIAL_OK}:\n` +
    RAW.map((r) => `      ${r.f}  owner=${r.owner}  ...${r.ctx}`).join("\n") +
    `\n      A NEW one renders a raw imperial figure to a metric climber — convert it with uElev/uDistMi/uMass.` +
    `\n      One FEWER means a declared-dead site was fixed or removed: lower RAW_IMPERIAL_OK and say which.`);

  // -- AND THE SAME FAMILY ONE STEP OUT: TWO QUANTITIES THAT LOOK COMPARABLE AND ARE MEASURED AT
  //    DIFFERENT HEIGHTS. The wind tile's sustained figure is `wind_speed_80m` -- a ridge-level
  //    proxy -- while the only gust Open-Meteo publishes is `wind_gusts_10m`, a SURFACE figure.
  //    The gust line was gated on `gustMax > windMax`, i.e. across 70 m of altitude, and an 80 m
  //    sustained routinely exceeds a 10 m gust: measured against the live API over 168 hours,
  //    51% of hours suppressed the gust against 8% on the honest same-height comparison. So the
  //    gust vanished on the windy days, which is the one time a climber needs it.
  //    THE HEADLINE MUST STAY AT 80 m and that is asserted as hard as the gate: moving it to
  //    10 m satisfies every gust assertion below AND takes a 27 mph AMBER day to GREEN while a
  //    29 mph gust stands. A rule that only ever demands the gust appear is satisfied by the
  //    change that under-warns.
  const gwSrc = /function gustWorthShowing\(dy\)\{.*?\}\n/.exec(src);
  if (!gwSrc) dead("ANCHOR LOST: gustWorthShowing is gone from RouteDetail.jsx — the gust gate cannot be executed, so nothing below would be proved");
  let gustWorthShowing;
  try { gustWorthShowing = new Function(gwSrc[0] + ";return gustWorthShowing;")(); }
  catch (e) { dead("gustWorthShowing did not lift cleanly: " + (e && e.message)); }

  // Every case is a real day off the live API on 2026-09-10, except the two fail-open ones.
  const GUST = [
    [{ gustMax: 29, windMax: 27, wind10Max: 13 }, true,  "gust well over the surface sustained"],
    [{ gustMax: 22, windMax: 22, wind10Max: 12 }, true,  "THE DEFECT: an 80 m sustained equal to the gust hid a 22 mph gust on an AMBER day"],
    [{ gustMax: 5,  windMax: 5,  wind10Max: 4  }, true,  "the same shape on a calm day"],
    [{ gustMax: 6,  windMax: 8,  wind10Max: 7  }, false, "GENUINE: the gust really is below the surface sustained"],
    [{ gustMax: 12, windMax: 9,  wind10Max: 12 }, false, "a gust equal to the surface sustained adds nothing"],
    [{ gustMax: 20, windMax: 36, wind10Max: null }, true, "no 10 m series: SHOW it — withholding a gust is the dangerous failure"],
    [{ gustMax: 20, windMax: 36, wind10Max: undefined }, true, "same, undefined"],
    [{ gustMax: 20, windMax: 36, wind10Max: -Infinity }, true, "same, Math.max over an empty bucket"],
  ];
  for (const [dy, want, why] of GUST) {
    const got = !!gustWorthShowing(dy);
    if (got === want) ok(`gust gate ${want ? "SHOWS" : "hides"} (gust ${dy.gustMax}, 80m ${dy.windMax}, 10m ${dy.wind10Max}) — ${why}`);
    else fail(`gust gate returned ${got} for gust ${dy.gustMax} / 80m ${dy.windMax} / 10m ${dy.wind10Max}, expected ${want} — ${why}`);
  }

  // The WIRING, as source: executing the rule proves the rule and says nothing about whether the
  // tile still calls it, or whether the 10 m series it reads is still fetched and bucketed. A
  // stale-base squash takes exactly that half and moves NO identifier, which audit:silent-reverts
  // says in its own closing caveat it cannot see.
  if (mask.includes("wind_speed_10m,")) ok("the forecast fetch asks for wind_speed_10m — the gate has a same-height figure to compare against");
  else fail("the forecast fetch no longer asks for wind_speed_10m — wind10Max is null on every day and the gate degrades to always-show");
  if (/if\(h\.wind_speed_10m\)dd\.winds10\.push\(h\.wind_speed_10m\[i\]\);/.test(mask)) ok("the hourly loop buckets the 10 m series");
  else fail("the hourly loop no longer buckets wind_speed_10m into winds10 — the fetched field reaches nothing");
  if (/wind10Max:d\.winds10\.length\?Math\.round\(Math\.max\.apply\(null,d\.winds10\)\):null/.test(mask)) ok("wind10Max is null on an absent series, never -Infinity");
  else fail("wind10Max is no longer derived from winds10 with a null on empty");
  if (/\{gustWorthShowing\(dy\)\?/.test(mask)) ok("the gust line is gated on gustWorthShowing(dy)");
  else fail("the wind tile no longer calls gustWorthShowing — the gust gate is back inline");
  if (/dy\.gustMax\s*>\s*dy\.windMax/.test(mask)) fail("the gust is compared against dy.windMax again — that is the 80 m figure, so this is the cross-height comparison restored");
  else ok("nothing compares the gust against the 80 m sustained");

  // THE HEADLINE STAYS AT 80 m. This is the over-reach direction, and it is the load-bearing half.
  if (/dd\.winds\.push\(h\.wind_speed_80m\[i\]\);/.test(mask)) ok("the sustained figure is still the 80 m wind — the ridge-level proxy that keeps a gusty day AMBER");
  else fail("the sustained figure is no longer wind_speed_80m — a 10 m headline takes a 27 mph AMBER day to GREEN with a 29 mph gust standing, which is the #641 under-warning direction");
  if (/dd\.winds\.push\(h\.wind_speed_10m/.test(mask)) fail("winds is being filled from the 10 m series — see above, this de-escalates gusty days");
  else ok("the 10 m series feeds the gust gate only, never the headline or its colour");
  if (/wxWindColor\(dy\.windMax\)/.test(mask)) ok("the colour threshold still reads the 80 m sustained");
  else fail("wxWindColor no longer reads dy.windMax — the amber/red banding has moved off the ridge-level figure");

  // AND THE PANEL SAYS SO. A tile can now legitimately read "22 mph" above "gusts to 22", and the
  // NWS/MET winds beside each day are surface figures against an 80 m headline -- on the seeded
  // capture that is 36 mph against NWS's 10. Without a sentence naming the heights the reader
  // sees a 3.6x disagreement between forecasters that is not one.
  const capt = /Elevation-aware via Open-Meteo[\s\S]{0,900}?<\/div>/.exec(mask);
  if (!capt) fail("ANCHOR LOST: the forecast panel caption moved — the height caveat cannot be checked");
  else {
    const c = capt[0];
    if (/80\s*m/.test(c) && /10\s*m/.test(c)) ok("the panel caption names BOTH heights");
    else fail("the forecast caption no longer names the two wind heights — the tile shows a gust equal to its sustained, and NWS's wind beside it, with nothing saying why");
  }
}

// =======================================================================================
// REPORTS -- #1567 converted the FORECAST, a provider reading. It did not touch the other
// temperature on the route page, the one a climber TYPED: the trip report's `cond.tempF`. The
// form labelled itself "TEMP degF" and STORED WHAT WAS TYPED, so a metric climber writing 10
// meaning 10C had 10 written into a Fahrenheit column and told every other reader -12C.
async function runReports() {
  section = "reports";
  console.log("\n== reports — a climber's OWN temperature, on screen and on the way into the column\n");
  await loadBundle();

  // The scale letter is KEPT here, unlike the forecast's bare degree sign: this chip is labelled
  // only "Temp", so dropping it would take something the imperial reader has today.
  for (const [inF, imp, met] of [[58, "58\u00b0F", "14\u00b0C"], [32, "32\u00b0F", "0\u00b0C"], [14, "14\u00b0F", "-10\u00b0C"]]) {
    const [a, b] = both("uTempU", inF);
    if (a === imp && b === met) ok(`uTempU(${inF}) -> ${a} / ${b}`);
    else fail(`uTempU(${inF}): got ${a}/${b}, expected ${imp}/${met}`);
  }

  // uTempIn is the inverse and the only one that runs on a WRITE.
  for (const [typed, impStored, metStored] of [[58, 58, 136], [10, 10, 50], [0, 0, 32], [-10, -10, 14]]) {
    const [a, b] = both("uTempIn", typed);
    if (a === impStored && b === metStored) ok(`uTempIn(${typed}) stores ${a}F / ${b}F`);
    else fail(`uTempIn(${typed}): got ${a}/${b}, expected ${impStored}/${metStored}`);
  }
  // An imperial user typing a decimal must not be silently rounded -- that is today's behaviour.
  if (both("uTempIn", 58.5)[0] === 58.5) ok("an imperial decimal is stored unchanged (58.5)");
  else fail("uTempIn rounds an imperial value — that is a behaviour change, not a conversion");

  // THE ROUND TRIP IS WHAT MAKES THE WRITE SAFE: type it, store it, reopen it, get it back.
  M.__set_UNITS("metric");
  const drift = [];
  for (let c = -40; c <= 60; c++) { if (M.uTempN(M.uTempIn(c)) !== c) drift.push(c); }
  M.__set_UNITS("imperial");
  if (drift.length) fail(`${drift.length} Celsius values do not survive the round trip (e.g. ${drift.slice(0, 5).join(", ")})`);
  else ok("every whole Celsius value -40..60 round-trips through the Fahrenheit column exactly");

  // buildConsensus hands back a NUMBER, so the chip can choose the unit. That value is
  // `useMemo(..., [activityAll, voteFor])` -- memoised on the reports alone, so a unit baked in
  // there would not be recomputed when the toggle moves and the chip would keep the old unit
  // until somebody filed a new report. The chip re-renders; the memo does not.
  const act = (tempF, date) => ({ user: "A", date, tickType: "Summit", stars: 5, condTags: [], cond: { tempF } });
  const cons = M.buildConsensus([act(50, "2026-08-01"), act(60, "2026-08-02")]);
  const cv = cons && cons.conditions && cons.conditions.tempF && cons.conditions.tempF.value;
  if (typeof cv === "number") ok(`buildConsensus stores the tempF consensus as a number (${cv})`);
  else fail(`buildConsensus stores tempF as ${typeof cv} (${JSON.stringify(cv)}) — a baked unit cannot follow the toggle, because that value is useMemo'd on the reports alone`);

  // ON SCREEN. The chip is on the Conditions sub-tab, over a route carrying reports.
  const route = {
    id: "probe_temp", name: "Probe", grade: "5.9", gradeSystem: "yds", discipline: "trad",
    pitches: 4, mountainId: "probe_area",
    _dbArea: { id: "probe_area", name: "Probe Area", areaType: "crag", region: "Colorado" },
    activity: [act(50, "2026-08-01"), act(60, "2026-08-02")],
  };
  const shot = (u) => { M.__set_UNITS(u); const h = M.renderRoute(route, "conditions"); M.__set_UNITS("imperial"); return h; };
  const impT = strip(shot("imperial")), metT = strip(shot("metric"));

  // Fails CLOSED: with no chip on screen every assertion below passes vacuously.
  if (!impT.includes("CONDITIONS NOW") || !/\ud83c\udf21 Temp/.test(impT)) fail("ANCHOR LOST: no CONDITIONS NOW thermometer chip on the Conditions tab — this run proved nothing");
  else if (impT.length < 400 || metT.length < 400) fail(`thin render (${impT.length}/${metT.length} chars) — NOT MEASURED`);
  else {
    const grab = (t) => (t.match(/\ud83c\udf21 Temp (-?\d+)\u00b0([FC])/) || []).slice(1);
    const gi = grab(impT), gm = grab(metT);
    if (!gi.length || !gm.length) fail(`could not read the Temp chip (imperial ${JSON.stringify(gi)}, metric ${JSON.stringify(gm)})`);
    else {
      const wantC = Math.round((Number(gi[0]) - 32) * 5 / 9);
      if (gi[1] !== "F") fail(`the imperial chip reads ${gi[0]}\u00b0${gi[1]}, expected F`);
      else if (gm[1] !== "C") fail(`the metric chip reads ${gm[0]}\u00b0${gm[1]}, expected C — the consensus chip ignores the setting`);
      else if (Number(gm[0]) !== wantC) fail(`the chip says ${gi[0]}\u00b0F imperial but ${gm[0]}\u00b0C metric, expected ${wantC}\u00b0C`);
      else ok(`CONDITIONS NOW chip: ${gi[0]}\u00b0F -> ${gm[0]}\u00b0C on screen`);
    }
    // ReportStats is a SECOND surface, one report's own figure rather than the consensus, and it
    // is fed by different code. Assert it apart from the chip or one can hide the other.
    const rs = (t) => (t.match(/Summit Temp (-?\d+)\u00b0([FC])/g) || []);
    const rsI = rs(impT), rsM = rs(metT);
    if (rsI.length !== 2 || rsM.length !== 2) fail(`expected 2 ReportStats temperatures per run, saw ${rsI.length}/${rsM.length} — NOT MEASURED`);
    else if (!rsI.every((x) => x.endsWith("F")) || !rsM.every((x) => x.endsWith("C"))) fail(`ReportStats reads ${rsI.join(",")} imperial and ${rsM.join(",")} metric`);
    else ok(`ReportStats rows: ${rsI.join(", ")} -> ${rsM.join(", ")}`);

    if (/\d\u00b0F/.test(metT)) fail("a Fahrenheit figure survives on the metric Conditions tab: " + (metT.match(/.{0,40}\d\u00b0F.{0,20}/) || [""])[0]);
    else ok("no Fahrenheit figure survives anywhere on the metric Conditions tab");
  }

  // THE FORM cannot be rendered here (LogAscent needs App state), so its three links are asserted
  // as SOURCE. This is the half a stale-base squash takes: the helpers would still convert
  // perfectly while the form went back to storing whatever was typed.
  const CORE = fs.readFileSync(CORE_PATH, "utf8");
  let ast;
  try { ast = parse(CORE, { sourceType: "module", plugins: ["jsx"] }); }
  catch (e) { dead("ClimbMatchCore.jsx did not parse: " + (e && e.message)); }
  let sawIn = false, sawSeed = false;
  traverse(ast, {
    CallExpression(p) {
      if (p.node.callee.name === "uTempIn") sawIn = true;
      if (p.node.callee.name === "uTempN" && String(CORE.slice(p.node.start - 60, p.node.start)).includes("x.cond.tempF")) sawSeed = true;
    },
  });
  if (sawIn) ok("the form canonicalises on save (uTempIn)");
  else fail("nothing calls uTempIn — the form stores the typed number, so a metric climber writes Celsius into a Fahrenheit column");
  if (sawSeed) ok("the form seeds an existing report in the climber's own unit");
  else fail("the editor seeds from raw tempF — a metric climber reopening their report sees Fahrenheit in the box");
  if (/TEMP "\+\(uImp\(\)\?/.test(CORE)) ok("the field LABEL names the unit being asked for");
  else fail('the label is fixed text — it must say which scale it wants, or a metric climber types Celsius under a "degF" heading');
  // ...and no display site may hard-code the scale again.
  const baked = (CORE.match(/tempF\s*\+\s*"\\u00b0F"|tempF\+"\u00b0F"/g) || []).length;
  if (baked) fail(`${baked} site(s) still append a fixed degF to a reported temperature`);
  else ok("no site appends a fixed degF to a reported temperature");
}

// =======================================================================================
// ITINERARY -- the READER was already unit-aware; the BUILDER was not. Its four numeric fields
// were labelled GAIN (FT) / LOSS (FT) / MILES / PACK (LB) and stored what was typed, so a metric
// climber typing 152 meaning metres wrote 152 FEET into a plan other climbers read.
async function runItinerary() {
  section = "itinerary";
  console.log("\n== itinerary — the plan builder, the downloaded file, and the bail form's second writer\n");
  await loadBundle();

  // One stored day, in the canonical units the column holds.
  const STORED = [{ n: 1, title: "Approach to camp", objective: "", gainFt: 500, lossFt: 120, hours: "4", miles: 3, packLb: 30, note: "", schedule: [] }];
  const roundTrip = () => M.itinDraftToStructured({ days: M.itinDaysToDraft(STORED) }).days[0];

  // 1. THE ROUND TRIP IS LOSSLESS IN BOTH SETTINGS -- this is about the FIX's own risk rather than
  //    the defect. Converting on both edges makes an UNTOUCHED field lossy (500 ft shows as 152 m
  //    and comes back as 499 ft), so editing one day's note would silently move every figure on
  //    the plan. The draft carries the original numbers and an untouched field is written back
  //    unchanged.
  for (const u of ["imperial", "metric"]) {
    M.__set_UNITS(u);
    const back = roundTrip();
    const bad = ["gainFt", "lossFt", "miles", "packLb"].filter((k) => back[k] !== STORED[0][k]);
    if (!bad.length) ok(`${u}: an untouched day round-trips unchanged (gain ${back.gainFt} ft, ${back.miles} mi, ${back.packLb} lb)`);
    else fail(`${u}: an untouched day was rewritten — ${bad.map((k) => `${k} ${STORED[0][k]} -> ${back[k]}`).join(", ")}`);
  }

  // 2. WHAT THE CLIMBER TYPES IS READ IN THEIR OWN UNITS. THE VALUES MUST DIFFER FROM WHAT SEEDING
  //    PRODUCES, or the assertion is vacuous: 500 ft seeds the box with 152, so "typing" 152 takes
  //    the untouched-field branch and returns the original number with no conversion run at all.
  //    The first version of this section did exactly that and passed against code that converted
  //    nothing.
  M.__set_UNITS("metric");
  const seeded = M.itinDaysToDraft(STORED)[0];
  const typed = [Object.assign({}, seeded, { gainFt: "300", miles: "8", packLb: "20" })];
  for (const [k, was] of [["gainFt", seeded.gainFt], ["miles", seeded.miles], ["packLb", seeded.packLb]])
    if (String(typed[0][k]) === String(was)) fail(`the ${k} case types the seeded value — it cannot exercise a conversion`);
  const stored = M.itinDraftToStructured({ days: typed }).days[0];
  const near = (a, b, tol) => a != null && Math.abs(a - b) <= tol;
  if (near(stored.gainFt, 984, 2)) ok(`metric: 300 typed as metres stores ${stored.gainFt} ft`);
  else fail(`metric: 300 typed as metres stored ${stored.gainFt} — the column is feet, so the plan claims a third of the climb`);
  if (near(stored.miles, 4.97, 0.02)) ok(`metric: 8 typed as km stores ${stored.miles} mi`);
  else fail(`metric: 8 typed as km stored ${stored.miles} — the column is miles`);
  if (near(stored.packLb, 44, 1)) ok(`metric: 20 typed as kg stores ${stored.packLb} lb`);
  else fail(`metric: 20 typed as kg stored ${stored.packLb} — the column is pounds`);

  // 3. THE IMPERIAL SIDE IS UNTOUCHED. A fix that converted unconditionally would be worse than
  //    the defect, so this is asserted rather than assumed.
  M.__set_UNITS("imperial");
  const impTyped = M.itinDaysToDraft(STORED).map((d) => Object.assign({}, d, { gainFt: "900", miles: "5", packLb: "40" }));
  const impStored = M.itinDraftToStructured({ days: impTyped }).days[0];
  if (impStored.gainFt === 900 && impStored.miles === 5 && impStored.packLb === 40)
    ok("imperial: what is typed is what is stored, unchanged");
  else fail(`imperial: a typed value was converted — ${impStored.gainFt}/${impStored.miles}/${impStored.packLb}`);

  // 4. THE SCREEN. The box must show the number the card showed, under a label naming that unit.
  //    Asserted on the RENDER rather than on the helpers, because the label and the value are two
  //    separate expressions and a fix that moved one and not the other reads as finished.
  for (const [u, wantVal, wantLab, wrongLab] of [
    ["imperial", "500", "GAIN (FT)", "GAIN (M)"],
    ["metric", "152", "GAIN (M)", "GAIN (FT)"],
  ]) {
    M.__set_UNITS(u);
    const html = M.renderEditor({ days: M.itinDaysToDraft(STORED) });
    if (html.length < 900) { fail(`${u}: the editor rendered ${html.length} chars — too thin to assert against`); continue; }
    const unit = u === "metric" ? "m" : "ft";
    const hasVal = new RegExp(`aria-label="Gain \\(${unit}\\)"[^>]*value="${wantVal}"`).test(html)
      || new RegExp(`value="${wantVal}"[^>]*aria-label="Gain \\(${unit}\\)"`).test(html);
    if (hasVal) ok(`${u}: the gain box shows ${wantVal}, the same number the plan card shows`);
    else fail(`${u}: the gain box does not show ${wantVal} under a "${unit}" label — it seeds the raw stored value`);
    if (html.includes(wantLab) && !html.includes(wrongLab)) ok(`${u}: the field is labelled ${wantLab}`);
    else fail(`${u}: the field is not labelled ${wantLab} — it declares a unit the climber does not use`);
  }

  // 5. THE DOWNLOADED PLAN. `itinToText` writes the .txt a climber carries into the field, and that
  //    file is the one place they cannot go back and re-read the screen -- the rule
  //    check:gpx-caveats already records for the GPX. It emitted feet, miles and pounds whatever
  //    the setting, so a metric climber read metres on the card and carried a file in feet. It
  //    goes through the SAME formatters the card uses, so the two cannot drift.
  for (const [u, want, wrong] of [
    ["imperial", ["Gain 500 ft", "3 mi", "30 lb pack"], ["152 m", "4.8 km", "14 kg"]],
    ["metric", ["Gain 152 m", "4.8 km", "14 kg pack"], ["500 ft", "3 mi", "30 lb"]],
  ]) {
    M.__set_UNITS(u);
    const txt = M.itinToText({ days: STORED }, "Test Route");
    const missing = want.filter((w) => !txt.includes(w));
    const leaked = wrong.filter((w) => txt.includes(w));
    if (!missing.length && !leaked.length) ok(`${u}: the downloaded plan reads ${want.join(" · ")}`);
    else fail(`${u}: the downloaded plan is in the wrong units — missing [${missing}], still says [${leaked}]`);
  }
  M.__set_UNITS("imperial");

  // 6. THE SECOND WRITER OF THE SAME COLUMN. A bail point becomes a Bailout WAYPOINT, and the
  //    waypoint editor already converts `distMi` on the way in -- so one store had two writers and
  //    one ignored the setting, while the reader (`uDistMi(nearBail.distMi)` on the commitment
  //    line) converted. A metric climber typed kilometres and read the number back as miles.
  for (const [u, lab, wrong] of [["imperial", "DIST. TO SAFETY (MI)", "(KM)"], ["metric", "DIST. TO SAFETY (KM)", "(MI)"]]) {
    M.__set_UNITS(u);
    const html = M.renderBailout();
    if (html.length < 600) { fail(`${u}: the bail form rendered ${html.length} chars — too thin to assert against`); continue; }
    if (html.includes(lab) && !html.includes("DIST. TO SAFETY " + wrong)) ok(`${u}: the bail distance is labelled ${lab}`);
    else fail(`${u}: the bail distance is not labelled ${lab} — it declares a unit the climber does not use`);
  }
  // THE SUBMIT PATH IS ASSERTED AS SOURCE, and the first version of this got it wrong in a way only
  // the injection showed: it exercised uDistMiIn directly, so reverting the FORM to Number(distMi)
  // left it green -- it was proving the helper works, not that the form calls it. SSR cannot click
  // a button, so the wiring is read from the file, exactly as check:topo-outage-copy reads its prop
  // chain. Matched on the EXPRESSION rather than the helper's name, so the comment beside the fix
  // (which names uDistMiIn while explaining it) cannot satisfy it.
  const core = fs.readFileSync(CORE_PATH, "utf8");
  if (core.includes("distMi:distMi?uDistMiIn(distMi):undefined")) ok("the bail form submits through uDistMiIn, so km typed by a metric climber is stored as miles");
  else fail("the bail form stores what was typed — the waypoint column is miles, and its reader converts");
  if (!core.includes("distMi:distMi?Number(distMi):undefined")) ok("the raw submit expression is gone");
  else fail("the raw submit expression is still there — the waypoint column is miles");
  // The helper's own arithmetic, which the expression above depends on.
  M.__set_UNITS("metric");
  if (Math.abs(M.uDistMiIn("2") - 1.24) <= 0.02) ok("metric: 2 km converts to 1.24 mi");
  else fail(`metric: 2 km converted to ${M.uDistMiIn("2")}`);
  M.__set_UNITS("imperial");
  if (M.uDistMiIn("2") === 2) ok("imperial: 2 miles is stored unchanged");
  else fail(`imperial: 2 miles became ${M.uDistMiIn("2")}`);
}

// =======================================================================================
// FILTERS -- the chips were the last controls reading imperial to a metric climber, and the length
// labels also disagreed with the filter they label. `passesFilters` tests `ft>=600` for the third
// bucket, so a 600 ft route is in IT -- while the second bucket was labelled "201-600 ft". A label
// that claims a route its own filter puts elsewhere is the defect; the units were the reason to be
// in the file.
async function runFilters() {
  section = "filters";
  console.log("\n== filters — the chips convert, and a length LABEL agrees with the predicate it labels\n");
  await loadBundle();

  const BUCKETS = M.ROUTE_LENGTHS.filter((b) => b[0] !== "any");
  if (BUCKETS.length < 4) dead("fewer than 4 length buckets — the map moved.");

  // 1. the labels render in the climber's units
  M.__set_UNITS("imperial");
  const impLabels = BUCKETS.map((b) => M.routeLengthLabel(b[0]));
  if (impLabels.every((s) => / ft\b/.test(s))) ok("every imperial length label carries ft");
  else fail("every imperial length label carries ft");
  if (M.uDistMi(50) === "50 mi") ok('imperial distance chip reads "Within 50 mi"');
  else fail('imperial distance chip reads "Within 50 mi"  (got "' + M.uDistMi(50) + '")');

  M.__set_UNITS("metric");
  const metLabels = BUCKETS.map((b) => M.routeLengthLabel(b[0]));
  if (metLabels.every((s) => / m\b/.test(s))) ok("every metric length label carries m");
  else fail("every metric length label carries m");
  if (!metLabels.some((s) => /\bft\b/.test(s))) ok("no metric length label still says ft");
  else fail("no metric length label still says ft");
  if (/km$/.test(M.uDistMi(50))) ok("metric distance chip converts");
  else fail('metric distance chip converts  (got "Within ' + M.uDistMi(50) + '")');
  if (M.uDistMiUnitLong() === "kilometres") ok("the aria-label unit word converts too");
  else fail("the aria-label unit word converts too");

  // The two must actually DIFFER, or a helper that ignored the setting would satisfy both above.
  if (impLabels.join() !== metLabels.join()) ok("the two unit modes produce DIFFERENT labels");
  else fail("the two unit modes produce DIFFERENT labels");

  // 2. every label agrees with the predicate it labels. This is the half that was wrong: read each
  //    bucket's stated bounds back out of its own label and confirm passesFilters agrees about
  //    both ends AND about the value just outside them.
  M.__set_UNITS("imperial");
  const route = (ft) => ({ id: "x", routeFt: ft, discipline: "trad", grade: "5.9", pitches: 4 });
  const inBucket = (ft, k) => M.passesFilters(route(ft), { length: k });
  for (const [k, lo, hi] of BUCKETS) {
    if (lo != null) {
      if (inBucket(lo, k)) ok(k + ": the filter accepts its own low bound " + lo + " ft");
      else fail(k + ": the filter accepts its own low bound " + lo + " ft");
      if (!inBucket(lo - 1, k)) ok(k + ": the filter rejects " + (lo - 1) + " ft, one below it");
      else fail(k + ": the filter rejects " + (lo - 1) + " ft, one below it");
    }
    if (hi != null) {
      if (inBucket(hi, k)) ok(k + ": the filter accepts its own high bound " + hi + " ft");
      else fail(k + ": the filter accepts its own high bound " + hi + " ft");
      if (!inBucket(hi + 1, k)) ok(k + ": the filter rejects " + (hi + 1) + " ft, one above it");
      else fail(k + ": the filter rejects " + (hi + 1) + " ft, one above it");
    }
  }
  // The historical defect, pinned by value: 600 ft belongs to the THIRD bucket, and the second
  // bucket's label used to claim it.
  if (inBucket(600, "600") && !inBucket(600, "200")) ok("600 ft is in the 600 bucket, not the 201- one");
  else fail("600 ft is in the 600 bucket, not the 201- one");
  if (!/600/.test(M.routeLengthLabel("200"))) ok("the 201- label no longer claims 600");
  else fail('the 201- label no longer claims 600  (reads "' + M.routeLengthLabel("200") + '")');
  if (!/1500/.test(M.routeLengthLabel("600"))) ok("the 600 label no longer claims 1500");
  else fail('the 600 label no longer claims 1500  (reads "' + M.routeLengthLabel("600") + '")');

  // 3. every bucket is reachable
  if (BUCKETS.every(([k]) => M.routeLengthLabel(k) !== "Length")) ok("no bucket falls through to the placeholder");
  else fail("no bucket falls through to the placeholder");
  if (M.routeLengthLabel("nonsense") === "Length") ok("an unknown key falls back rather than throwing");
  else fail("an unknown key falls back rather than throwing");

  // 4. the CALL SITES use them, read from SOURCE. Executing the helpers proves they convert; it
  //    says nothing about whether the chips call them. The `hardcoded-length-map` case MISSED
  //    against a version that stopped at section 3 -- the trap the bail form already recorded:
  //    assert the HELPER and a reverted call site stays green. Matched on the EXPRESSION rather
  //    than the helper's name, so the comment beside the fix cannot satisfy it.
  const src = fs.readFileSync(CORE_PATH, "utf8");
  const mask = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  if (/ROUTE_LENGTHS\.map\(\s*b\s*=>\s*\[\s*b\[0\]\s*,\s*routeLengthLabel\(/.test(mask))
    ok("the length chips are BUILT from ROUTE_LENGTHS, not a second literal map");
  else fail("the length chips are BUILT from ROUTE_LENGTHS, not a second literal map");
  if (/label:\s*routeLengthLabel\(/.test(mask)) ok("the applied-filter chip goes through routeLengthLabel too");
  else fail("the applied-filter chip goes through routeLengthLabel too");
  if (!/"20[01]\s*[–-]\s*600 ft"/.test(mask)) ok("no hand-copied length literal survives anywhere");
  else fail("no hand-copied length literal survives anywhere");
  if (/"Within "\+uDistMi\(\s*50\s*\)/.test(mask)) ok("the distance chip calls uDistMi rather than naming a unit");
  else fail("the distance chip calls uDistMi rather than naming a unit");
  if (!/aria-label="[^"]*\bin miles\b/.test(mask)) ok("no aria-label still hardcodes miles");
  else fail("no aria-label still hardcodes miles");
  if ((mask.match(/uDistMiUnitLong\(\)/g) || []).length >= 5) ok("every distance aria-label takes the unit word from the setting");
  else fail("every distance aria-label takes the unit word from the setting");

  // 5. THE *LIVE* LENGTH FILTER, WHICH EVERY ASSERTION ABOVE IS BLIND TO. Sections 1-4 are about
  //    `ROUTE_LENGTHS`/`routeLengthLabel` in core -- and every one of those call sites is in
  //    `RouteFinder`, which is SEED-ONLY and reaches nobody. `lib/DbAreaBrowser.jsx` owns the
  //    filter a real DB-catalog climber uses, carries its OWN bucket vocabulary, and its labels
  //    were imperial whatever the setting. So this guard could report the units class green while
  //    the only length filter anybody can reach said "600–1500 ft" to a metric climber.
  //
  //    Lifted from source rather than bundled: DbAreaBrowser pulls in supabase and the whole DB
  //    layer, and the question here needs neither -- only the bucket table and its formatter.
  const dbSrc = fs.readFileSync(path.join(ROOT, "lib/DbAreaBrowser.jsx"), "utf8");
  const dbMask = dbSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  const bm = dbMask.match(/const LEN_BUCKETS = (\[[^\n]*\]);/);
  if (!bm) dead("ANCHOR LOST: LEN_BUCKETS in lib/DbAreaBrowser.jsx — the live filter went unchecked.");
  const li = dbMask.indexOf("const lenLabel = (");
  if (li < 0) dead("ANCHOR LOST: lenLabel in lib/DbAreaBrowser.jsx — the live filter went unchecked.");
  // It takes (bucket, uElevN, uElevUnit) — the helpers are PARAMETERS, because the app passes them
  // as props. Injecting them as a closure instead lets the arrow's own params shadow them to
  // undefined, which is how the first version of this died.
  const lenLabel = new Function("return " + dbMask.slice(li + "const lenLabel = ".length).split("\n};")[0] + "\n};")();
  const lbl = (b) => lenLabel(b, M.uElevN, M.uElevUnit);
  const LB = JSON.parse(bm[1].replace(/'/g, '"'));
  if (LB.length < 4) dead("fewer than 4 live length buckets — the table moved.");
  const real = LB.filter((b) => b[0] !== "any");

  // The imperial rendering must not move. This is a units fix, not a copy change, and a climber on
  // the default setting should see exactly what they saw before.
  M.__set_UNITS("imperial");
  const liveImp = real.map(lbl);
  if (JSON.stringify(liveImp) === JSON.stringify(["< 200 ft", "200–600 ft", "600–1500 ft", "1500+ ft"]))
    ok("the live filter's imperial labels are unchanged");
  else fail("the live filter's imperial labels are unchanged  (got " + JSON.stringify(liveImp) + ")");

  M.__set_UNITS("metric");
  const liveMet = real.map(lbl);
  if (liveMet.every((s) => / m\b/.test(s))) ok("every live metric length label carries m");
  else fail("every live metric length label carries m  (got " + JSON.stringify(liveMet) + ")");
  if (!liveMet.some((s) => /\bft\b/.test(s))) ok("no live metric length label still says ft");
  else fail("no live metric length label still says ft  (got " + JSON.stringify(liveMet) + ")");

  // THE LOAD-BEARING ONE: the metric label must state the filter's ACTUAL cut points. The stored
  // column is metric and the query bounds are half-open metres, so a label re-rounded from feet
  // would name a boundary the filter does not use -- the off-by-one this deliberately did NOT
  // inherit by consolidating onto routeLengthLabel, whose bounds are inclusive FEET.
  const boundsAgree = real.every((b) => {
    const lo = b[3], hi = b[4], s = lbl(b);
    const nums = (s.match(/\d+/g) || []).map(Number);
    if (lo == null) return nums.length === 1 && nums[0] === hi;
    if (hi == null) return nums.length === 1 && nums[0] === lo;
    return nums.length === 2 && nums[0] === lo && nums[1] === hi;
  });
  if (boundsAgree) ok("every metric label states the filter's own half-open metre bounds");
  else fail("every metric label states the filter's own half-open metre bounds  (got " + JSON.stringify(liveMet) + ")");

  // Anti-revert: the table must carry NUMBERS, not baked strings. A squash restoring the literal
  // labels changes no identifier, which audit:silent-reverts says it cannot see.
  if (!/"\s*<?\s*\d+[^"]*\bft\b[^"]*"/.test(bm[1])) ok("the live bucket table bakes in no imperial label");
  else fail("the live bucket table bakes in no imperial label");
  // TWO, not three: the definition reads `const lenLabel = (`, which this pattern does not match.
  // The count is of CALL sites — the bucket chips and the applied-filter chip — and it is 2 because
  // both must go through the formatter or the filter bar and the chip saying what you filtered by
  // disagree about units.
  if ((dbMask.match(/lenLabel\(/g) || []).length >= 2) ok("both live label sites go through lenLabel");
  else fail("both live label sites go through lenLabel (the chips and the applied-filter chip)");

  // 6. THE PROP CHAIN, because executing the formatter proves it CONVERTS and says nothing about
  //    whether the helpers reach it. They are props — `lenLabel` calls `uElevUnit()`, so a merge
  //    that drops them from any link leaves that call undefined and takes the whole panel down.
  //    NEITHER DIRECTION OF check:dead-props SEES THIS: the component references the prop, and the
  //    call site passes nothing unread — the exact hole this file records for the float plan. Four
  //    links, asserted as source, the way check:topo-outage-copy pins its own.
  const appMask = fs.readFileSync(APP_PATH, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
  // A JSX tag here cannot be sliced with [^>]*: these props hold ARROW FUNCTIONS, so `=>` puts a
  // `>` inside the tag and the match stops in the middle of it. That is not hypothetical — it
  // failed on a correct app first. Slice to the `/>` that closes the tag at brace depth 0, never a
  // fixed window, which this file records as encoding a guess about the size of the thing sought.
  const tagOf = (src, name) => {
    const i = src.indexOf("<" + name);
    if (i < 0) return "";
    let d = 0;
    for (let k = i; k < src.length; k++) {
      const c = src[k];
      if (c === "{") d++;
      else if (c === "}") d--;
      else if (c === "/" && src[k + 1] === ">" && d === 0) return src.slice(i, k + 2);
    }
    return "";
  };
  const dbTag = tagOf(appMask, "DbAreaBrowser"), rfTag = tagOf(dbMask, "RouteFinderPanel");
  if (!dbTag) dead("ANCHOR LOST: the <DbAreaBrowser> tag — the live filter's wiring went unchecked.");
  if (!rfTag) dead("ANCHOR LOST: the <RouteFinderPanel> tag — the live filter's wiring went unchecked.");
  if (/uElevN=\{uElevN\}/.test(dbTag) && /uElevUnit=\{uElevUnit\}/.test(dbTag))
    ok("App hands the live filter its unit helpers");
  else fail("App hands the live filter its unit helpers  (link 1: <DbAreaBrowser uElevN= uElevUnit=)");
  if (/function DbAreaBrowser\(\{[^}]*\buElevN\b[^}]*\buElevUnit\b/.test(dbMask))
    ok("DbAreaBrowser destructures them");
  else fail("DbAreaBrowser destructures them  (link 2)");
  if (/uElevN=\{uElevN\}/.test(rfTag) && /uElevUnit=\{uElevUnit\}/.test(rfTag))
    ok("...and passes them down to the finder panel");
  else fail("...and passes them down to the finder panel  (link 3 — the panel would throw on undefined)");
  if (/function RouteFinderPanel\(\{[^}]*\buElevN\b[^}]*\buElevUnit\b/.test(dbMask))
    ok("RouteFinderPanel destructures them");
  else fail("RouteFinderPanel destructures them  (link 4)");
  M.__set_UNITS("imperial");
}

// =======================================================================================
// VARIANTS -- the approach-variants editor, the last member of the wrong-units WRITE class, closed
// one instance at a time by #1578, #1654 and #1671. Its two numeric boxes were labelled "distance
// in miles" / "gain in feet" whatever the setting, were SEEDED with the raw stored number, and
// STORED WHAT WAS TYPED. So both halves were wrong in opposite directions: the APPROACHES panel
// renders the same two numbers through `uDistMi`/`uElev`, so a metric climber read "4.8 km" on the
// card, tapped the pencil, and the box under it said 3.
//
// THE WRITE HALF IS WORSE HERE THAN IN THE ITINERARY. These two fields are the ones `sameEditValue`
// compares NUMERICALLY WITH A TOLERANCE (0.1/0.2 on distMi, 0.1/50 on gainFt) so two climbers who
// measure 4.8 and 4.9 miles count as agreeing. A stored kilometre does not merely display wrong: it
// lands 1.6x away from the same measurement taken on the other setting, so the two never cluster
// and the 3-agree gate the merge needs can NEVER be reached -- the correction sits pending forever.
//
// BOTH BOUNDARY EXPRESSIONS ARE LIFTED FROM SOURCE AND EXECUTED, never re-typed: a copy would agree
// with itself whatever the app did, which is the whole question.
async function runVariants() {
  section = "variants";
  console.log("\n== variants — the approach-variants editor, on both boundaries and in its labels\n");
  await loadBundle();
  const src = fs.readFileSync(RD_PATH, "utf8");

  const seedKey = "const routeVars=(Array.isArray(route.approachVariants)";
  const seedAt = src.indexOf(seedKey);
  if (seedAt < 0) dead("the routeVars seed is not where this section reads it — re-read RouteDetail.jsx");
  const seedEnd = src.indexOf(":[blankVar()];", seedAt);
  if (seedEnd < 0) dead("could not bound the routeVars seed");
  const seedExpr = src.slice(seedAt + "const routeVars=".length, seedEnd + ":[blankVar()]".length);
  // A SHAPE TEST, NOT A CONTENT ONE. The first version of this demanded the slice mention
  // `itinDraftVal` -- i.e. it was written from the FIX -- so any other seeding, INCLUDING A
  // DELIBERATELY WRONG ONE, reported ANCHOR LOST rather than being measured. An anchor written
  // from the fix refuses every change instead of judging it.
  if (!/\.map\(/.test(seedExpr) || !/distMi:/.test(seedExpr) || !/gainFt:/.test(seedExpr))
    dead("the seed is not the map-over-approachVariants shape this section reads");
  const seed = new Function("route", "itinDraftVal", "blankVar", "return " + seedExpr + ";");

  const storeKey = 'if(f.type==="variants")return (vals.approachVariants||[])';
  const storeAt = src.indexOf(storeKey);
  if (storeAt < 0) dead("the variants submit branch is not where this section reads it");
  const storeEnd = src.indexOf('if(f.type==="sections")', storeAt);
  if (storeEnd < 0) dead("could not bound the variants submit branch");
  const storeExpr = src.slice(storeAt + 'if(f.type==="variants")return '.length, storeEnd).replace(/;\s*$/, "");
  if (!/\.map\(/.test(storeExpr) || !/\.filter\(/.test(storeExpr)) dead("the variants branch is not the map/filter shape this section reads");
  const store = new Function("vals", "itinStoreVal", "return " + storeExpr + ";");

  const blankVar = () => ({ name: "", season: "", distMi: "", gainFt: "", hours: "", notes: "", hazards: "" });
  // THE TWO NUMBERS ARE CHOSEN TO BE LOSSY, and the first version of this probe chose two that were
  // not -- which made section 1 pass with the `_orig` guard deleted, i.e. vacuous on the one
  // assertion that is about the fix's own risk. Measured: a bare convert-out/convert-in loses 70%
  // of integer foot values between 100 and 8,000 and 90% of three-decimal mile values under 20.
  // 3.456 mi and 4,401 ft are two that it loses; 3 mi and 4,400 ft are two that survive.
  const STORED = { name: "Snow Creek trail", season: "Jul-Sep", distMi: 3.456, gainFt: 4401, hours: "4-5", notes: "Long but easy", hazards: ["Log crossing"] };
  const draft = () => seed({ approachVariants: [STORED] }, M.itinDraftVal, blankVar);
  const roundTrip = () => store({ approachVariants: draft() }, M.itinStoreVal)[0];

  // 1. THE ROUND TRIP IS LOSSLESS IN BOTH SETTINGS. Editing a note must not move the distance.
  for (const u of ["imperial", "metric"]) {
    M.__set_UNITS(u);
    const back = roundTrip();
    const bad = ["distMi", "gainFt"].filter((k) => back[k] !== STORED[k]);
    if (!bad.length) ok(`${u}: an untouched variant round-trips unchanged (${back.distMi} mi, ${back.gainFt} ft)`);
    else fail(`${u}: an untouched variant was rewritten — ${bad.map((k) => `${k} ${STORED[k]} -> ${back[k]}`).join(", ")}`);
  }

  // 2. THE BOX HOLDS THE MEASUREMENT THE CARD SHOWS. ASSERTED TO WITHIN THE CARD'S OWN ROUNDING
  //    STEP, not for equality: the card rounds for reading while the box carries the conversion's
  //    own precision, so demanding equality would push the box down to the card's precision and a
  //    climber saving an untouched form would write 4.8 km back as 2.98 mi. The first version did
  //    demand it and reported a correct app as broken.
  const cardNum = (s) => parseFloat(String(s).replace(/,/g, ""));
  for (const u of ["imperial", "metric"]) {
    M.__set_UNITS(u);
    const d = draft()[0];
    for (const [what, box, shown, step] of [
      ["distance", d.distMi, M.uDistMi(STORED.distMi), 0.05],
      ["gain", d.gainFt, M.uElev(STORED.gainFt), 0.5],
    ]) {
      const c = cardNum(shown);
      if (box !== "" && isFinite(c) && Math.abs(parseFloat(box) - c) <= step + 1e-9)
        ok(`${u}: the ${what} box holds ${box}, the measurement the card reads "${shown}"`);
      else
        fail(`${u}: the ${what} box holds ${JSON.stringify(box)} while the card beside it reads "${shown}" — one walk, two numbers, one screen`);
    }
  }

  // 3. WHAT THE CLIMBER TYPES IS READ IN THEIR OWN UNITS. THE TYPED VALUES MUST DIFFER FROM WHAT
  //    SEEDING PRODUCES, or the assertion is vacuous -- that is exactly how the itinerary probe
  //    once passed against code that converted nothing.
  M.__set_UNITS("metric");
  const seeded = draft()[0];
  const typed = [Object.assign({}, seeded, { distMi: "8", gainFt: "1500" })];
  for (const [k, was] of [["distMi", seeded.distMi], ["gainFt", seeded.gainFt]])
    if (String(typed[0][k]) === String(was)) fail(`the ${k} case types the seeded value — it cannot exercise a conversion`);
  const stored = store({ approachVariants: typed }, M.itinStoreVal)[0];
  const near = (a, b, tol) => a != null && Math.abs(a - b) <= tol;
  if (near(stored.distMi, 4.97, 0.02)) ok(`metric: 8 typed as km stores ${stored.distMi} mi`);
  else fail(`metric: 8 typed as km stored ${stored.distMi} — the column is miles, so the walk is recorded 1.6x too long`);
  if (near(stored.gainFt, 4921, 3)) ok(`metric: 1500 typed as metres stores ${stored.gainFt} ft`);
  else fail(`metric: 1500 typed as metres stored ${stored.gainFt} — the column is feet, so the approach claims a third of the gain`);

  // 4. THE IMPERIAL SIDE IS UNTOUCHED. A fix that converted unconditionally would be worse than the
  //    defect it replaces, so this is asserted rather than assumed.
  M.__set_UNITS("imperial");
  const impTyped = draft().map((d) => Object.assign({}, d, { distMi: "5.5", gainFt: "2200" }));
  const impStored = store({ approachVariants: impTyped }, M.itinStoreVal)[0];
  if (impStored.distMi === 5.5 && impStored.gainFt === 2200) ok("imperial: what is typed is what is stored, unchanged");
  else fail(`imperial: a typed value was converted — ${impStored.distMi}/${impStored.gainFt}`);

  // 5. A BLANK BOX STORES NOTHING. Both keys are optional on the stored shape, and a variant with an
  //    empty box must not gain a 0 that reads as a measured flat walk-in.
  M.__set_UNITS("metric");
  const blanked = store({ approachVariants: [Object.assign({}, blankVar(), { name: "Unmeasured way in" })] }, M.itinStoreVal)[0];
  if (!("distMi" in blanked) && !("gainFt" in blanked)) ok("an empty box stores no key at all, rather than a measured zero");
  else fail(`an empty box stored ${JSON.stringify({ distMi: blanked.distMi, gainFt: blanked.gainFt })} — a blank is not a measurement of zero`);

  // 6. THE LABELS, AS SOURCE. The boxes live inside SuggestFix, which no SSR harness stands up, and
  //    they are separate expressions from the values above -- so a fix that converted the numbers
  //    under a label still naming the other unit reads as finished.
  //
  //    ASSERTED AS A PROPERTY, NEVER AS A WORDING: each attribute must be an EXPRESSION consulting a
  //    unit helper rather than a fixed string. Pinning the phrasing would make this argue with
  //    ordinary editorial work -- "e.g. 4 km" is a better placeholder than "km" and must stay silent
  //    -- while still failing every revert, because a revert is precisely the change from an
  //    expression to a literal.
  const braced = (tag, attr) => {
    const at = tag.indexOf(attr + "={");
    if (at < 0) return null;
    let d = 0;
    for (let k = at + attr.length + 1; k < tag.length; k++) {
      if (tag[k] === "{") d++;
      else if (tag[k] === "}" && --d === 0) return tag.slice(at + attr.length + 2, k);
    }
    return null;
  };
  const UNIT_FN = /\buImp\(\)|\buDistMiUnit\(\)|\buElevUnit\(\)/;
  for (const [what, marker] of [["distance", " distance in"], ["gain", " gain in"]]) {
    const at = src.indexOf('aria-label={"Approach "+(idx+1)+"' + marker);
    if (at < 0) { fail(`the ${what} box's aria-label is not where this section reads it — it may have been reverted to a fixed string, or moved`); continue; }
    const close = src.indexOf("/>", at);
    const tag = src.slice(at, close < 0 ? at + 600 : close);
    for (const attr of ["aria-label", "placeholder"]) {
      const expr = braced(tag, attr);
      if (expr == null) fail(`the ${what} box's ${attr} is a fixed string — it names the wrong unit on one of the two settings`);
      else if (UNIT_FN.test(expr)) ok(`the ${what} box's ${attr} names the climber's own unit`);
      else fail(`the ${what} box's ${attr} is an expression that consults no unit helper: ${expr}`);
    }
  }
  if (/parseFloat\(x\.distMi\)|parseInt\(x\.gainFt,10\)/.test(src))
    fail("the raw submit expression is still in the file — the branch stores what was typed");
  else ok("no raw parse of the typed variant numbers survives in the submit branch");
  M.__set_UNITS("imperial");
}

// =======================================================================================
// =======================================================================================
// PITCHES — THE LAST BOX IN THE CONTRIBUTE FORM THAT ASKED FOR A FIXED UNIT.
//
// AN EIGHTH MEMBER, and it is the `variants` story one row up the same form. `PitchTable` renders
// a stored pitch length through `uLen`, so an imperial climber READS "148 ft" on the route page —
// and the editor asked for `Length (m)` whatever the setting. Typing the number they had just
// read stored 148 m, and the route then claimed 486 ft.
//
// CENSUSED, NOT SPOTTED: of the six unit-bearing inputs in SuggestFix, five were already
// unit-aware and this was the only hardcoded one — a class of ONE with the convention two lines
// BELOW it, because #1671 fixed the approach-variant boxes and left the pitch box above them.
// That is this guard's own header again: an instance fixed by hand is not a class closed.
//
// FOUR EDGES, AND REVERTING ANY ONE IS SILENT — the value still flows, in the wrong unit, under a
// success toast. Prefill, the box's label, the store, and the two SUMMARY strings. The summary is
// the subtle one: `pitchStr` is fed the DRAFT by pendStr/filledStr and CANONICAL rows by
// curRefStr, so converting only the draft would compare 55m against "180m".
async function runPitches() {
  section = "pitches";
  console.log("\n== pitches — the pitch-length box, on both boundaries and in its labels\n");
  await loadBundle();
  const src = fs.readFileSync(RD_PATH, "utf8");

  // ── Lift the two boundaries. SHAPE TESTS, never content ones: an anchor written from the FIX
  //    refuses every change instead of judging it, which is the trap the variants section records.
  const seedKey = "const routePitches=(route.pitchDetail&&route.pitchDetail.length)";
  const seedAt = src.indexOf(seedKey);
  if (seedAt < 0) dead("the routePitches seed is not where this section reads it — re-read RouteDetail.jsx");
  const seedEnd = src.indexOf(":[blankPitch(1)];", seedAt);
  if (seedEnd < 0) dead("could not bound the routePitches seed");
  const seedExpr = src.slice(seedAt + "const routePitches=".length, seedEnd + ":[blankPitch(1)]".length);
  if (!/\.map\(/.test(seedExpr) || !/lengthM:/.test(seedExpr)) dead("the seed is not the map-over-pitchDetail shape this section reads");
  const seed = new Function("route", "uLenN", "blankPitch", "return " + seedExpr + ";");

  const storeKey = 'if(f.type==="pitches")return (vals.pitchDetail||[])';
  const storeAt = src.indexOf(storeKey);
  if (storeAt < 0) dead("the pitches submit branch is not where this section reads it");
  const storeEnd = src.indexOf('if(f.type==="waypoints")', storeAt);
  if (storeEnd < 0) dead("could not bound the pitches submit branch");
  const storeExpr = src.slice(storeAt + 'if(f.type==="pitches")return '.length, storeEnd).replace(/;\s*$/, "");
  if (!/\.map\(/.test(storeExpr) || !/\.filter\(/.test(storeExpr)) dead("the pitches branch is not the map/filter shape this section reads");
  const store = new Function("vals", "uLenIn", "return " + storeExpr + ";");

  const blankPitch = (n) => ({ pitch: n, grade: "", lengthM: "", gear: "", notes: "", anchor: "", bolts: "", crux: false });
  const STORED = { pitch: 1, n: 1, grade: "5.10a", lengthM: 45, gear: "Yellow C4", note: "Sustained hands", anchor: "2 bolts", bolts: 4, crux: true };
  const draft = () => seed({ pitchDetail: [STORED] }, M.uLenN, blankPitch);
  const roundTrip = () => store({ pitchDetail: draft() }, M.uLenIn)[0];

  // 1. THE ROUND TRIP IS LOSSLESS IN BOTH SETTINGS. Correcting an anchor must not move the length.
  //    This is the edge that matters most: without the prefill conversion an imperial climber
  //    opens a 45 m pitch, sees "45" under a FEET label, changes nothing, saves, and it becomes 14 m.
  for (const u of ["imperial", "metric"]) {
    M.__set_UNITS(u);
    const back = roundTrip();
    if (back.lengthM === STORED.lengthM) ok(`${u}: an untouched pitch round-trips unchanged (${back.lengthM} m)`);
    else fail(`${u}: an untouched pitch was rewritten — lengthM ${STORED.lengthM} -> ${back.lengthM}`);
  }

  // 2. THE BOX HOLDS WHAT THE ROUTE PAGE SHOWS. PitchTable renders uLen(lengthM), so the number in
  //    the box must be the number the climber just read, or the editor contradicts the page.
  for (const u of ["imperial", "metric"]) {
    M.__set_UNITS(u);
    const shown = String(M.uLenN(STORED.lengthM));
    if (String(draft()[0].lengthM) === shown) ok(`${u}: the box is seeded with the length the route page shows (${shown} ${M.uLenUnit()})`);
    else fail(`${u}: the box shows ${JSON.stringify(draft()[0].lengthM)} where the page shows ${shown} ${M.uLenUnit()}`);
  }

  // 3. WHAT WAS TYPED IS CANONICALISED. The column holds METRES whatever the climber set.
  M.__set_UNITS("imperial");
  const typedImp = store({ pitchDetail: [Object.assign(blankPitch(1), { lengthM: "148" })] }, M.uLenIn)[0];
  M.__set_UNITS("metric");
  const typedMet = store({ pitchDetail: [Object.assign(blankPitch(1), { lengthM: "148" })] }, M.uLenIn)[0];
  if (typedImp && typedImp.lengthM === 45) ok("imperial: 148 typed in the box is stored as 45 m");
  else fail(`imperial: 148 typed was stored as ${JSON.stringify(typedImp && typedImp.lengthM)} — the column holds metres`);
  // NON-VACUITY: the two settings must DISAGREE on the same keystrokes, or nothing is converting.
  if (typedMet && typedMet.lengthM === 148 && typedImp && typedImp.lengthM !== 148)
    ok("the same keystrokes store different values on the two settings — the conversion is real");
  else fail(`metric stored ${JSON.stringify(typedMet && typedMet.lengthM)} and imperial ${JSON.stringify(typedImp && typedImp.lengthM)} — one of them is not converting`);

  // 4. THE LABELS AND THE SUMMARY, asserted as SOURCE. A render probe cannot see them, and each is
  //    exactly what a stale-base squash takes: a string, and no identifier for audit:silent-reverts.
  for (const [label, re, why] of [
    ["the box asks in the climber's own units", /length in "\+\(uImp\(\)\?"feet":"metres"\)/,
     "the label is what tells the climber which unit to type"],
    // A SHAPE TEST, NOT THE EXACT STRING. The first version pinned the literal placeholder and the
    // injection suite caught it flagging a REWORDED one — ordinary editorial work. What matters is
    // that the expression consults the unit helper at all.
    ["the placeholder follows the setting too", /placeholder=\{[^}]*uLenUnit\(\)/,
     "a placeholder reading (m) over a feet box is the same lie in smaller type"],
    ["the editor summary labels the unit it is showing", /pp\.lengthM\+uLenUnit\(\)/,
     'a hardcoded "m" over a converted draft prints feet labelled metres'],
    ["the current-value summary is fed the same convention as the draft", /pitchStr\(routePitches\)/,
     "fed route.pitchDetail it would compare canonical metres against a display-unit draft"],
  ]) {
    if (re.test(src)) ok(label);
    else fail(`${label} — NOT FOUND. ${why}`);
  }
}

// =======================================================================================
// PROFILE — A DISTANCE BETWEEN TWO PEOPLE, AND A WILDFIRE RADIUS.
//
// A SEVENTH MEMBER, found the day the other six were promoted. This guard's own header says an
// instance fixed by hand is not a class closed and to re-check for new members; this is that.
// Three sites rendered a raw number beside a hardcoded imperial unit:
//
//   FullProfile header             {dist.toFixed(1)} mi away
//   FullProfile compatibility card {dist.toFixed(1)} miles away
//   FireNearRoute overflow line    and N more within {radiusMi} miles
//
// EACH HAD A CORRECT SIBLING BESIDE IT, which is what makes them misses rather than a missing
// convention: the partner card has always written `uDistMi(+dist.toFixed(1))+" away"`, and
// FireNearRoute converts every individual fire's distance two lines above the one it did not.
// Two spellings of one unit inside FullProfile alone.
//
// IT WAS SOURCE-ONLY, AND THE STATED REASON TURNED OUT TO BE WRONG — recorded rather than
// quietly deleted, because it is the useful half. It read: FullProfile ends in
// `createPortal(..., document.body)`, which the server renderer refuses, and this guard bundles
// react-dom IN, "so the portal cannot be flattened from outside the bundle the way a standalone
// probe does it". The first clause is right and the conclusion does not follow: it can be
// flattened from INSIDE the generated entry, where `renderProfile` patches the module object and
// restores it in a `finally`. core does `import { createPortal } from "react-dom"`, which esbuild
// emits as a property access at CALL time, which is what makes the patch possible and scopable.
// A STATED BLOCKER THAT HAS NOT BEEN TRIED IS A HYPOTHESIS.
//
// That matters because source-only left a real gap, MEASURED rather than argued: swapping
// `uDistMi(+dist.toFixed(1))` for `uDistMi(dist)` at BOTH readouts produced 0 FAIL lines on
// main's own tree, while moving every imperial reader from "756.7 mi away" to "756.72 mi away".
// The static half cannot see it — `uDistMi(` is still there, and no bare unit follows a brace.
// The render half below pins it, and injection case 5 flips from MUST PASS to MUST FAIL.
//
// What the SOURCE half asserts is still exactly right and is kept whole: the half a stale-base
// squash takes, a STRING and no identifier, which audit:silent-reverts cannot see. The render
// half is additive — it proves what the screen SAYS, which no source read can.
async function runProfile() {
  section = "profile";

  // ── the general rule, which is what makes this more than three hand-picked sites. A NUMBER
  //    rendered immediately before a literal distance unit cannot convert, whatever the setting
  //    says. Measured across every app + lib source: exactly these three, and zero today.
  const files = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"]
    .concat(fs.readdirSync(path.join(ROOT, "lib")).filter((f) => /\.jsx$/.test(f)).map((f) => "lib/" + f))
    .filter((f) => fs.existsSync(path.join(ROOT, f)));
  if (files.length >= 10) ok(`${files.length} source files walked for hardcoded units`);
  else fail(`only ${files.length} source file(s) found — the sweep below would be vacuous`);

  let raw = [];
  for (const rel of files) {
    const s = fs.readFileSync(path.join(ROOT, rel), "utf8");
    for (const m of s.matchAll(/\{[^{}]{0,80}\}\s*(?:mi|miles|ft|feet|lb)\b/g)) {
      if (/u(DistMi|Elev|Mass)\s*\(/.test(m[0])) continue;   // already converted
      raw.push(`${rel}: ${JSON.stringify(m[0].replace(/\s+/g, " "))}`);
    }
  }
  if (!raw.length) ok("no rendered value sits beside a hardcoded mi/ft/lb");
  else fail(`${raw.length} rendered value(s) print a hardcoded unit and cannot convert: ${raw.join("; ")}`);

  // ── FullProfile: both readouts. Matched on the HELPER, never on one spelling of its argument —
  //    `uDistMi(dist)` is a different rounding, not a units defect, and pinning the expression
  //    would forbid improving it (the `disclaimer-reworded` lesson).
  const core = fs.readFileSync(CORE_PATH, "utf8");
  const a = core.indexOf("function FullProfile");
  const b = core.indexOf("\nfunction ", a + 10);
  const fp = a < 0 ? "" : core.slice(a, b < 0 ? core.length : b);
  if (fp.length > 4000) ok(`FullProfile lifted (${fp.length} chars)`);
  else fail(`ANCHOR LOST: FullProfile lifted ${fp.length} chars — the assertions below would be vacuous`);

  const nHelper = (fp.match(/uDistMi\(/g) || []).length;
  if (nHelper >= 2) ok(`FullProfile routes ${nHelper} distance readouts through uDistMi`);
  else fail(`FullProfile calls uDistMi ${nHelper} time(s) — the header and the compatibility card both render one`);

  // A rule that only ever demands ABSENCE is satisfied by deleting the feature, so both sites
  // must still be REACHABLE.
  if (/dist!=null&&isFinite\(dist\)/.test(fp)) ok("the header still renders a distance when one resolves");
  else fail("FullProfile's header distance gate is gone — the readout may have been deleted rather than converted");
  if (/COMPATIBILITY WITH YOU/.test(fp)) ok("the compatibility card is still on the profile");
  else fail("the compatibility card is gone — its distance readout cannot be checked");

  // ── FireNearRoute: the overflow line, whose sibling two lines up was always correct.
  const fire = fs.readFileSync(path.join(ROOT, "lib", "FireNearRoute.jsx"), "utf8");
  if (/more within \{uDistMi\(/.test(fire)) ok("the fire panel's radius converts");
  else fail('the fire panel prints its radius unconverted ("and N more within X miles") while converting every fire beside it');

  // -- THE STATIC HALF ABOVE PROVES THE HELPER IS CALLED; IT CANNOT PROVE WHAT THE SCREEN SAYS,
  //    AND THE GAP IS MEASURED RATHER THAN ASSERTED. Injecting `uDistMi(dist)` in place of
  //    `uDistMi(+dist.toFixed(1))` at BOTH readouts leaves every assertion above green -- verified
  //    on main's own tree, 0 FAIL lines before and after -- because `uDistMi(` is still there and
  //    no bare unit follows a brace. That regression is silent, and it moves EVERY imperial
  //    reader from 1dp to 2dp.
  //
  //    The comment above is right that pinning the EXPRESSION would forbid improving it. This
  //    pins the PROPERTY instead: rounding to 1dp in MILES first is what keeps the imperial
  //    string byte-identical to what the line printed before it was converted, and that is the
  //    whole reason the conversion was safe to ship. A rewrite that keeps imperial unchanged
  //    passes; one that moves it fails. Same distinction as `disclaimer-reworded` -- assert the
  //    fact, never the phrasing.
  await loadBundle();

  // `dist` IS NOT A PROP -- it is `climber._real ? null : distMiles(ME, climber)` -- so the
  // fixture has to be a SEED-shaped climber carrying coordinates and a `vouches` array, which the
  // component reads unconditionally. A `_real` climber renders no distance at all, so a
  // plausible-looking fixture makes every assertion below pass VACUOUSLY.
  const CLIMBER = {
    id: 7, name: "Robin Belay", username: "robinbelay", location: "Bellingham, WA",
    lat: 48.7519, lng: -122.4787, level: "Intermediate", avatar: null,
    disciplines: ["sport"], vouches: [], photos: [], objectiveIds: [],
  };
  const D = M.distMiles(M.ME, CLIMBER);
  if (!isFinite(D) || D <= 0) dead(`the profile fixture produced no distance (${D}) -- the render assertions would be vacuous`);
  ok(`the profile fixture is ${D.toFixed(1)} mi from ME, so the distance line is reachable at all`);

  M.__set_UNITS("imperial");
  let imp = "";
  try { imp = M.renderProfile(CLIMBER); } catch (e) { dead("the imperial profile render threw: " + (e && e.message)); }
  if (imp.length < 400) dead(`the profile rendered ${imp.length} chars -- too thin to assert against`);
  // COUNTED, NEVER `includes`, and their own case 5 is what proved that necessary: the header
  // and the compatibility card print the SAME string, so a whole-markup `includes` is satisfied
  // by whichever readout was left alone -- a change to one of the two reads as clean. That is
  // the "count inside the panel, never across the tab" trap, and the first draft of this
  // assertion walked straight into it. Measured on a clean render: exactly 2.
  const WAS = D.toFixed(1) + " mi away"; // exactly what the line emitted before it was converted
  const nImp = imp.split(WAS).length - 1;
  if (nImp === 2) ok(`both imperial readouts still say "${WAS}", byte-identical to the pre-conversion line`);
  else fail(`${nImp} of 2 imperial readouts say "${WAS}" -- a units fix must not move what the default setting shows`);

  M.__set_UNITS("metric");
  let met = "";
  try { met = M.renderProfile(CLIMBER); } catch (e) { dead("the metric profile render threw: " + (e && e.message)); }
  if (met.length < 400) dead(`the metric profile rendered ${met.length} chars -- too thin to assert against`);
  const want = M.uDistMi(+D.toFixed(1)) + " away";
  if (want === WAS) dead("the metric and imperial strings are identical -- __set_UNITS did not take, so this proves nothing");
  const nMet = met.split(want).length - 1;
  if (nMet === 2) ok(`both metric readouts read "${want}" on the rendered profile`);
  else fail(`${nMet} of 2 metric readouts read "${want}" -- one of them is not converting`);
  if (!/\d\s*mi away/.test(met)) ok("no raw mile figure survives anywhere on the metric profile");
  else fail('the metric profile still prints a number followed by "mi away"');
  M.__set_UNITS("imperial");

  // -- THE TWO REMAINING " mi away" STRINGS ARE LEFT ON PURPOSE, and this asserts the DECLARATION
  //    rather than a note: OverviewMap and QuickMatch are declared SEED-ONLY, so they render for
  //    nobody (deploy.yml sets VITE_USE_DB=true). The sweep above cannot see them either way --
  //    its needle wants a bare unit AFTER a brace and these are `{... + " mi away"}` -- so
  //    reviving one would put a raw mile figure on a live screen with nothing saying so.
  const seedGuard = fs.readFileSync(path.join(ROOT, "scripts", "check-seed-only-surfaces.mjs"), "utf8");
  for (const name of ["OverviewMap", "QuickMatch"]) {
    if (new RegExp("^\\s*" + name + ':\\s*"', "m").test(seedGuard))
      ok(`${name} is still declared seed-only, so its " mi away" renders for nobody`);
    else fail(`${name} is NO LONGER declared seed-only -- its raw " mi away" is on a live screen now, so convert it and drop this case`);
  }
  const rawAway = (core.match(/ mi away/g) || []).length;
  if (rawAway === 2) ok('exactly 2 raw " mi away" strings remain in core, both in declared-dead components');
  else fail(`${rawAway} raw " mi away" strings in core -- expected the 2 dead ones; a live one may have been added, or a comment now quotes it`);
}

// =======================================================================================

// ---------------------------------------------------------------------------------------------
// keyed -- THE ELEVEN KEYED-OBJECT EDITORS, THE ONE CONTRIBUTE PATH WITH NO CONVERSION AT ALL.
//
// Sections `itinerary`, `variants` and `pitches` cover the ARRAY editors, which convert at the
// edges through itinStoreVal. The KEYED editors (road, access, timing, crowds, ...) do not go
// through structuredVal at all: `submit` coerces them with a bare `parseFloat(v)` for
// `k[3]==="num"`, and CANON/UNCANON cannot reach them because those maps are keyed by the
// TOP-LEVEL `f.k` while these keys sit one level down inside the object.
//
// THAT MISSING CONVERSION IS HARMLESS TODAY, AND THE REASON IS A FACT ABOUT THE VOCABULARY RATHER
// THAN ABOUT THE CODE: every key on that path that stores a NUMBER is unit-invariant -- four are
// hours, and an hour is an hour on both settings, and the rest are unitless rating scales. So
// there is no unit-bearing number there to get wrong.
//
// A PARAGRAPH SAYING THAT WOULD ROT, WHICH IS WHY IT IS A SECTION. It is a claim about
// `lib/objKeys.js`, so the day somebody adds a distance or an elevation key it arms itself --
// stored raw in whatever the climber typed, into a canonical column, exactly the shape #1654 and
// #1671 fixed on the array editors.
//
// AN UNDECLARED NUMERIC KEY IS A QUESTION, NOT AUTOMATICALLY A DEFECT, and the failure says so:
// a new unit-invariant number is declared here in one line, while a real measurement needs
// conversion at the edges. A guard that called every new number a defect would flag correct work.
//
// SCOPED TO KEYS THAT STORE A NUMBER, and that scoping was MEASURED rather than chosen. The
// tempting wider rule -- flag any entry whose label or placeholder names a unit -- fires on FOUR
// entries and all four are free-text PROSE, where the unit only appears in an example
// ("e.g. last 4 mi rough, high clearance helps"). The app cannot convert a sentence, so that rule
// would argue with correct work.
const UNIT_INVARIANT = {
  totalHrs: "hours — an hour is an hour on both settings, so there is nothing to convert",
  approachTimeHrs: "hours",
  summitTimeHrs: "hours",
  descentTimeHrs: "hours",
  solitudeRating: "a unitless 1-5 rating scale, not a measurement",
  physical: "a unitless grade scale",
  technical: "a unitless grade scale",
  exposure: "a unitless grade scale",
  commitment: "a unitless grade scale",
  routefinding: "a unitless grade scale",
};

async function runKeyed() {
  section = "keyed";
  // The registry is READ from the app, never restated here: a twelfth keyed editor added to
  // OBJ_KEYS must come into frame by itself, or this section silently stops covering it.
  const rd = fs.readFileSync(RD_PATH, "utf8");
  const m = rd.match(/const OBJ_KEYS\s*=\s*\{([^}]*)\}/);
  if (!m) dead("ANCHOR LOST: `const OBJ_KEYS={` is gone from RouteDetail.jsx — the keyed editors could not be enumerated, so this section proved nothing");
  const registered = [...m[1].matchAll(/([A-Za-z]+)\s*:\s*([A-Z_]+)/g)].map((x) => [x[1], x[2]]);
  if (registered.length < 8) dead(`only ${registered.length} keyed editor(s) parsed out of OBJ_KEYS — with none, every assertion below passes vacuously`);
  ok(`${registered.length} keyed-object editor(s) read from the app's own OBJ_KEYS registry`);

  const KEYS = await import(pathToFileURL(path.join(ROOT, "lib", "objKeys.js")).href);

  // Fail closed on a vocabulary the registry names but the module does not export: reading that
  // as "no numeric keys here" is the false-pass direction.
  const missing = registered.filter(([, c]) => !Array.isArray(KEYS[c]));
  if (missing.length) dead(`OBJ_KEYS names ${missing.map(([t, c]) => `${t}:${c}`).join(", ")}, which lib/objKeys.js does not export as an array`);
  ok("every vocabulary the registry names is exported by lib/objKeys.js");

  // An entry stores a NUMBER when it is `num`, or an `enum` whose options are numeric — which is
  // exactly what `submit`'s own coercion tests, so this mirrors the store path rather than
  // guessing at it.
  const numeric = [];
  let entries = 0;
  for (const [type, constName] of registered) {
    for (const e of KEYS[constName]) {
      entries++;
      const isNum = e[3] === "num";
      const isNumEnum = e[3] === "enum" && (e[4] || []).some((o) => typeof o[0] === "number");
      if (isNum || isNumEnum) numeric.push({ type, key: String(e[0]), label: String(e[1] || ""), kind: isNum ? "num" : "enum" });
    }
  }
  if (entries < 30) dead(`only ${entries} keyed entries walked — the vocabularies parsed short, so a numeric key could be out of frame`);
  ok(`${entries} keyed entries walked across ${registered.length} vocabularies`);
  if (!numeric.length) dead("no numeric keyed entry found at all — the store path coerces `num` and numeric `enum`, so matching none means this scan cannot fire");
  ok(`${numeric.length} keyed entr(ies) store a number and are in scope`);

  for (const n of numeric) {
    if (UNIT_INVARIANT[n.key]) ok(`${n.type}.${n.key} (${n.kind}) is declared unit-invariant — ${UNIT_INVARIANT[n.key]}`);
    else fail(`${n.type}.${n.key} (${n.kind}, "${n.label}") stores a NUMBER on the keyed path, which does NOT convert units — CANON/UNCANON are keyed by the top-level f.k and cannot reach a nested key. If it is unit-invariant (hours, a count, a rating) declare it in UNIT_INVARIANT with the reason. If it is a MEASUREMENT it has to convert at the edges the way itinStoreVal does for the array editors, or it stores raw miles from one climber and raw km from the next into one column.`);
  }

  // A declaration that no longer describes a live key fails, so the list cannot rot into a
  // description of a vocabulary that has moved on — the standard KNOWN and PARTIAL_ON_PURPOSE
  // are already held to.
  const live = new Set(numeric.map((n) => n.key));
  const stale = Object.keys(UNIT_INVARIANT).filter((k) => !live.has(k));
  if (stale.length) for (const k of stale) fail(`UNIT_INVARIANT declares "${k}", which no longer stores a number in any keyed editor — stale bookkeeping; drop the entry`);
  else ok(`no stale declaration (${Object.keys(UNIT_INVARIANT).length} declared, all still live)`);
}

const RUNNERS = { persist: runPersist, weather: runWeather, reports: runReports, itinerary: runItinerary, variants: runVariants, filters: runFilters, profile: runProfile, pitches: runPitches, keyed: runKeyed };

try {
  for (const s of RUN) await RUNNERS[s]();
  // A FLOOR THAT COUNTS WORK DONE IS NOT EVIDENCE THE WORK WAS CORRECT -- it asks whether the
  // section RAN, which is the one thing a merged guard can lose silently. check:dup-attrs records
  // the same distinction for its element counter.
  for (const s of RUN) {
    if (counts[s] < FLOOR[s]) problems.push(`BROKEN: section ${s} made only ${counts[s]} assertion(s), floor ${FLOOR[s]} — it stopped asking, so this run proved less than it claims`);
  }
} catch (e) {
  if (!e || e.message !== STOP) throw e;
} finally {
  if (tmpdir) fs.rmSync(tmpdir, { recursive: true, force: true });
}

console.log("");
for (const s of SECTIONS) console.log(`  ${RUN.includes(s) ? String(counts[s]).padStart(3) : "  -"}  ${s}${RUN.includes(s) ? "" : "   (not run)"}`);
if (problems.length) {
  console.error("\nFAIL:");
  problems.forEach((p) => console.error("  - " + p));
  process.exit(1);
}
if (argOnly) {
  console.log(`\nPARTIAL RUN — only the "${argOnly}" section ran; ${SECTIONS.length - 1} other section(s) were SKIPPED.`);
  console.log("This is NOT a pass. It exists for the injection harness; run without --only to gate anything.");
  process.exit(0);
}
console.log("\nok — every unit-aware surface honours the setting, and every control that writes canonicalises first.");
