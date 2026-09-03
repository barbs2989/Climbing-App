#!/usr/bin/env node
// THE FORECAST IGNORED THE UNIT SETTING.
//
// Elevation and distance have honoured it since the toggle existed, and the weather panel --
// the densest numbers on the route page -- did not: it was fetched as
// temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch, NWS values were
// converted to F and mph unconditionally, and every one of 13 display sites printed the
// imperial number. No uTemp/uWind existed at all.
//
// THE DATA STAYS IMPERIAL AND THE CONVERSION HAPPENS AT DISPLAY. Re-fetching in the climber's
// own units looks simpler and is wrong twice: wxTempColor's 85/70/50/32 and wxWindColor's
// 30/15 thresholds are calibrated in F and mph, and the response is cached per coordinate, so
// the unit setting would leak into the cache key. Section 2 pins that -- it is the invariant a
// well-meaning later edit is most likely to break, because passing the converted value to the
// colour function reads as tidier and silently mis-colours every reading.
//
// A DIFFERENCE IS NOT A TEMPERATURE. The panel prints two of them, where it compares the
// Open-Meteo forecast against NWS and MET. Converting one uses the SCALE and never the
// 32-degree offset: a 4 degree disagreement is 2 degrees C, not -16.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const problems = [];

// =======================================================================================
// SECTION 1 -- the helpers convert correctly, in both directions.
const entry = path.join(ROOT, "scripts", "oneoff", "_wxbundle.mjs");
fs.writeFileSync(entry,
  `export {uTemp,uTempN,uTempDelta,uWind,uWindN,uPrecip,uSnowfall,__set_UNITS} from "../../ClimbMatchCore.jsx";\n`);
const out = path.join(ROOT, "scripts", "oneoff", "_wxbundle.cjs");
execFileSync("npx", ["esbuild", entry, "--bundle", "--format=cjs", "--platform=node", "--jsx=automatic",
  "--loader:.jsx=jsx", "--define:import.meta.env={}", "--outfile=" + out, "--log-level=error"], { cwd: ROOT });
const W = await import("file://" + out);
fs.unlinkSync(entry); fs.unlinkSync(out);

const CASES = [
  // [setter, fn, input, imperial, metric]
  ["uTemp", 50, "50°", "10°"],
  ["uTemp", 32, "32°", "0°"],
  ["uTemp", 85, "85°", "29°"],
  ["uTemp", -10, "-10°", "-23°"],
  ["uWind", 12, "12 mph", "19 km/h"],
  ["uWind", 30, "30 mph", "48 km/h"],
  // 0.25in is 6.35mm, which is 6.3499999... in binary, so toFixed(1) gives 6.3 rather than
  // 6.4. That is the code being right and my first expectation being wrong; pinned as-is,
  // with a non-boundary case beside it so the suite is not only testing a rounding tie.
  ["uPrecip", 0.25, '0.25"', "6.3 mm"],
  ["uPrecip", 0.5, '0.50"', "12.7 mm"],
  ["uSnowfall", 6, '6.0"', "15.2 cm"],
];
for (const [fn, input, imp, met] of CASES) {
  W.__set_UNITS("imperial");
  const a = W[fn](input);
  W.__set_UNITS("metric");
  const b = W[fn](input);
  const ok = a === imp && b === met;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${fn}(${input})  imperial ${JSON.stringify(a)}  metric ${JSON.stringify(b)}`);
  if (!ok) problems.push(`${fn}(${input}): got ${JSON.stringify(a)}/${JSON.stringify(b)}, expected ${JSON.stringify(imp)}/${JSON.stringify(met)}`);
}
// The delta, which is the one an offset conversion gets spectacularly wrong.
W.__set_UNITS("imperial");
const dImp = W.uTempDelta(4);
W.__set_UNITS("metric");
const dMet = W.uTempDelta(4);
console.log(`  ${dImp === 4 && dMet === 2 ? "ok  " : "FAIL"} uTempDelta(4)  imperial ${dImp}  metric ${dMet}   (an offset conversion gives -16)`);
if (dImp !== 4 || dMet !== 2) problems.push(`uTempDelta(4): got ${dImp}/${dMet}, expected 4/2 — a DIFFERENCE converts by scale only`);
W.__set_UNITS("imperial");

// =======================================================================================
// SECTION 2 -- the colour thresholds still receive RAW imperial values.
//
// wxTempColor(f) and wxWindColor(mph) carry hard-coded imperial cut-offs. Handing them a
// converted value would compile, render, and mis-colour every reading -- 10°C would score as
// "below freezing" against a 32 threshold. Nothing about the screen would look broken.
const src = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
let colourCalls = 0, helperCalls = 0;
traverse(ast, {
  CallExpression(p) {
    const n = p.node.callee.name;
    if (n === "wxTempColor" || n === "wxWindColor") {
      colourCalls++;
      const arg = p.node.arguments[0];
      if (arg && arg.type === "CallExpression" && /^u(Temp|Wind)/.test(arg.callee.name || "")) {
        problems.push(`${n} @${p.node.start} is handed a CONVERTED value — its thresholds are imperial, so this mis-colours every reading`);
      }
    }
    if (/^u(Temp|Wind|Precip|Snowfall)/.test(n || "")) helperCalls++;
  },
});
console.log(`\n  ${colourCalls} colour-threshold calls, all on raw imperial values`);
console.log(`  ${helperCalls} unit-helper calls in RouteDetail`);
if (colourCalls < 6) problems.push(`only ${colourCalls} colour calls found — a broken scan, not a clean file`);
if (helperCalls < 13) problems.push(`only ${helperCalls} helper calls — display sites were converted one by one, so a drop means one went back to raw`);

// The fetch must stay canonical: converting at the source would leak the setting into the cache key.
for (const need of ["temperature_unit=fahrenheit", "wind_speed_unit=mph", "precipitation_unit=inch"]) {
  if (!src.includes(need)) problems.push(`the forecast fetch no longer pins ${need} — the data must stay canonical and convert at display`);
}
// And no display site may hard-code the imperial unit again.
const bare = (src.match(/\+" mph"/g) || []).length;
if (bare) problems.push(`${bare} display site(s) still append " mph" directly — use uWind()`);

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — the forecast honours the unit setting, and the colour thresholds still see imperial.");
