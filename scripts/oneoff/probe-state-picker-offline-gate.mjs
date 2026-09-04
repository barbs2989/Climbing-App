#!/usr/bin/env node
/* Does the state picker still reach a DOWNLOADED catalog when the network is down?
 *
 * `useStates` has an offline fallback (orOffline -> offlineStates) and `useCountries` has NONE.
 * So offline, with a state downloaded, `states` resolves from IndexedDB while `countries` is
 * undefined -- and the state <select> carried `!country` in its `disabled`, where
 * `country = countryId || only || ""` and `only` comes from `countries`. The whole catalog was on
 * the device behind a greyed-out control.
 *
 * EXECUTED, NOT RENDERED, for two reasons. StatePicker is not exported; and "countries failed while
 * states succeeded" is not a state live data produces on demand -- the same argument
 * check:topo-outage-copy makes for turning a decision into a pure function.
 *
 * THE EXPRESSIONS ARE LIFTED FROM SOURCE WITH `ANCHOR LOST`, never retyped. A copy agrees with the
 * source on the day it is written and measures a fossil afterwards, which this repo has recorded
 * costing a probe its meaning more than once.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(ROOT, "lib/DbAreaBrowser.jsx"), "utf8");

function lift(re, what) {
  const m = src.match(re);
  if (!m) {
    console.error("ANCHOR LOST: could not lift " + what + " from lib/DbAreaBrowser.jsx.\n"
      + "  Nothing below was checked, so this run proves less than it claims. Re-anchor it — or, if\n"
      + "  a merge dropped the fix, restore it: the state select must not be gated on a country\n"
      + "  step that cannot load.");
    process.exit(1);
  }
  return m[1].trim();
}

const onlyExpr    = lift(/const only = ([^;]+);/, "the `only` expression");
const noStepExpr  = lift(/const noCountryStep = ([^;]+);/, "the `noCountryStep` expression");
const countryExpr = lift(/const country = ([^;]+);/, "the `country` expression");
const disabledRaw = lift(/<select aria-label=\{`Select a \$\{noun\}`\} value="" disabled=\{([^}]+(?:\}[^}]*)*?)\}\s*\n?\s*onChange/, "the state select's `disabled`");
const inCountry   = lift(/const inCountry = ([^;]+);/, "the `inCountry` filter");

/* Evaluate the lifted expressions under a scenario. `disabled` is the app's own text. */
function evaluate(sc) {
  const { countries, states, lc, ec, isLoading, countryId } = sc;
  const only = eval(onlyExpr);
  const noCountryStep = eval(noStepExpr);
  const country = eval(countryExpr);
  const disabled = !!eval(disabledRaw);
  const listed = eval(inCountry).length;
  return { disabled, listed, country, noCountryStep };
}

const WA = { id: "washington", name: "Washington", path: "usa.washington" };
const OR = { id: "oregon", name: "Oregon", path: "usa.oregon" };
const BC = { id: "bc", name: "British Columbia", path: "canada.bc" };

const CASES = [
  { n: "offline, one state downloaded",
    why: "THE FIX — countries cannot load, states came from IndexedDB, so the picker must open",
    sc: { countries: undefined, states: [WA], lc: false, ec: new Error("offline"), isLoading: false, countryId: "" },
    want: { disabled: false, listed: 1 } },

  { n: "offline, two states downloaded",
    why: "every downloaded state must be listed, not just the first",
    sc: { countries: undefined, states: [WA, OR], lc: false, ec: new Error("offline"), isLoading: false, countryId: "" },
    want: { disabled: false, listed: 2 } },

  { n: "healthy, two countries, none picked",
    why: "MUST STAY GATED — with a real choice on offer the step is not optional",
    sc: { countries: [{ id: "usa" }, { id: "canada" }], states: [WA, BC], lc: false, ec: null, isLoading: false, countryId: "" },
    want: { disabled: true } },

  { n: "healthy, two countries, one picked",
    why: "picking a country opens the step and scopes the list",
    sc: { countries: [{ id: "usa" }, { id: "canada" }], states: [WA, BC], lc: false, ec: null, isLoading: false, countryId: "usa" },
    want: { disabled: false, listed: 1 } },

  { n: "healthy, one country",
    why: "the pre-existing `only` shortcut must be unchanged",
    sc: { countries: [{ id: "usa" }], states: [WA, OR], lc: false, ec: null, isLoading: false, countryId: "" },
    want: { disabled: false, listed: 2 } },

  { n: "offline, nothing downloaded",
    why: "no states means nothing to open — must stay disabled rather than offer an empty list",
    sc: { countries: undefined, states: undefined, lc: false, ec: new Error("offline"), isLoading: false, countryId: "" },
    want: { disabled: true } },

  { n: "still loading",
    why: "a load in flight is not a failure",
    sc: { countries: undefined, states: undefined, lc: true, ec: null, isLoading: true, countryId: "" },
    want: { disabled: true } },
];

let bad = 0;
for (const c of CASES) {
  const got = evaluate(c.sc);
  const miss = Object.entries(c.want).filter(([k, v]) => got[k] !== v);
  console.log("  " + (miss.length ? "FAIL " : "ok   ") + c.n.padEnd(34)
    + "disabled=" + String(got.disabled).padEnd(6) + "listed=" + got.listed);
  if (miss.length) {
    console.log("       " + c.why);
    for (const [k, v] of miss) console.log("       expected " + k + "=" + v + ", got " + got[k]);
    bad++;
  }
}

if (bad) {
  console.error("\n" + bad + " case(s) failed — a downloaded catalog is not reachable from the picker.");
  process.exit(1);
}
console.log("\nok — " + CASES.length + " cases: the picker opens when states resolved offline, and stays\n"
  + "gated when a real country choice is on offer or there is nothing to show.");
