#!/usr/bin/env node
// Injection suite for check-units.mjs, the `weather` section (run with --only=weather).
//
// THIS SECTION HAD NO SUITE AT ALL. It was the one of the five promoted probes whose assertions
// had never been shown to fail on anything -- and its healthy output is a column of "ok", which is
// exactly what a section asserting nothing prints. Four of the five had suites; this is the fifth.
//
// Each case reverts ONE half of the fix, proves the edit landed BY CHECKSUM, restores the file
// byte-identically, and is judged on the section's OWN failure text rather than on an exit code.
//
// TWO CASES MUST STAY SILENT, and they are the ones worth having: a comment naming both forbidden
// shapes is documentation, and a guard that fired on it would forbid its own explanation -- the
// trap check:ci-cancel records. They also pin the asymmetry the section is built around: the
// colour test walks the AST and cannot see a comment at all, while the fetch and bare-unit tests
// are textual and read a MASKED copy whose line-comment pattern protects `://`, because the
// forecast URL is an https one.
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const RD = path.join(ROOT, "RouteDetail.jsx");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 12);

const CASES = [
  {
    name: "delta-uses-the-offset",
    why: "THE REAL HISTORICAL DEFECT — a temperature DIFFERENCE converted with the 32-degree " +
         "offset, so a 4 degree disagreement between two forecasts reads as -16",
    file: CORE,
    find: "const uTempDelta=d=>{const n=_uNum(d);return n===null?null:(uImp()?Math.round(n):Math.round(n*5/9));};",
    repl: "const uTempDelta=d=>{const n=_uNum(d);return n===null?null:(uImp()?Math.round(n):Math.round((n-32)*5/9));};",
    expect: "fail",
    must: /a DIFFERENCE converts by scale only/,
  },
  {
    name: "helper-ignores-the-setting",
    why: "uTempN stops converting, so every temperature on the panel reads Fahrenheit whatever the " +
         "climber chose — the defect the whole section exists for",
    file: CORE,
    find: "const uTempN=f=>{const n=_uNum(f);return n===null?null:(uImp()?Math.round(n):Math.round((n-32)*5/9));};",
    repl: "const uTempN=f=>{const n=_uNum(f);return n===null?null:Math.round(n);};",
    expect: "fail",
    must: /uTemp\(50\)|uTemp\(32\)|uTemp\(85\)/,
  },
  {
    name: "colour-threshold-gets-a-converted-value",
    why: "wxTempColor is handed a CONVERTED temperature. Its cut-offs are 85/70/50/32 in " +
         "Fahrenheit, so 10°C scores as below freezing and every reading is mis-coloured — and " +
         "nothing about the screen looks broken",
    file: RD,
    find: "color:wxTempColor(t),flexShrink:0",
    repl: "color:wxTempColor(uTempN(t)),flexShrink:0",
    expect: "fail",
    must: /is handed a CONVERTED value/,
  },
  {
    name: "colour-scan-blinded",
    why: "the colour helper is renamed consistently, so the app still works and the SCAN finds " +
         "almost nothing — it must report a broken scan rather than a clean file",
    file: RD,
    all: true,
    find: "wxTempColor",
    repl: "wxTColour",
    expect: "fail",
    must: /a broken scan, not a clean file/,
  },
  {
    name: "fetch-converts-at-the-source",
    why: "the forecast is re-fetched in the climber's own units. That looks tidier and is wrong " +
         "twice: the colour thresholds are calibrated in Fahrenheit, and the response is cached " +
         "per coordinate, so the setting would leak into the cache key",
    file: RD,
    find: "temperature_unit=fahrenheit",
    repl: "temperature_unit=celsius",
    expect: "fail",
    must: /no longer pins temperature_unit=fahrenheit/,
  },
  {
    name: "bare-mph-returns",
    why: "a display site goes back to appending the imperial unit itself, so that one reading " +
         "stays in mph while every other one on the panel converts",
    file: RD,
    find: 'uWind(wm)+" "+',
    repl: 'wm+" mph"+" "+',
    expect: "fail",
    must: /still append " mph" directly/,
  },
  {
    name: "comment-naming-the-forbidden-shapes",
    why: "MUST STAY SILENT — a comment explaining the rule names both strings it forbids, and a " +
         "guard that failed on it would forbid its own documentation",
    file: RD,
    append: '\n// Explanatory comment, not code: wxTempColor(uTempN(t)) is forbidden because the thresholds\n' +
            '// are imperial, and a display site must never write +" mph" itself. Neither may fire here.\n',
    expect: "pass",
  },
  {
    name: "https-url-survives-the-mask",
    why: "MUST STAY SILENT — the line-comment mask must protect `://`, or it would delete the " +
         "https fetch line and report the canonical-units check as broken on a correct file",
    file: RD,
    append: '\n// https://example.invalid/v1/forecast?temperature_unit=celsius — a URL inside a comment.\n',
    expect: "pass",
  },

  // ------------------------------------------------------------------------------------------
  // THE WIND TILE COMPARED TWO HEIGHTS. Sustained is `wind_speed_80m` (a ridge-level proxy) and
  // the only gust Open-Meteo publishes is `wind_gusts_10m` (surface), so `gustMax > windMax`
  // suppressed the gust on 51% of hours against 8% on the honest same-height test.
  {
    name: "gust-compared-across-heights",
    why: "THE REAL HISTORICAL DEFECT — the gust gated on the 80 m sustained, so a 22 mph gust on " +
         "a 22 mph AMBER day rendered no gust line at all",
    file: RD,
    find: "{gustWorthShowing(dy)?<div style={{fontSize:9.5,color:C.textMuted,marginTop:1}}>",
    repl: "{dy.gustMax>dy.windMax?<div style={{fontSize:9.5,color:C.textMuted,marginTop:1}}>",
    expect: "fail",
    must: /compared against dy\.windMax again/,
  },
  {
    name: "headline-moves-to-10m",
    why: "THE OVER-REACH, and the load-bearing case: standardising on 10 m satisfies every gust " +
         "assertion AND takes a 27 mph AMBER day to GREEN with a 29 mph gust standing. A rule " +
         "that only ever demands the gust appear is satisfied by the change that under-warns",
    file: RD,
    find: "dd.winds.push(h.wind_speed_80m[i]);",
    repl: "dd.winds.push(h.wind_speed_10m[i]);",
    expect: "fail",
    must: /under-warning direction|de-escalates gusty days/,
  },
  {
    name: "fetch-drops-the-10m-series",
    why: "the gate keeps its shape and loses its input — wind10Max is null every day, so the " +
         "gust shows unconditionally and the same-height comparison is not happening at all",
    file: RD,
    find: "weather_code,wind_speed_10m,wind_speed_80m,",
    repl: "weather_code,wind_speed_80m,",
    expect: "fail",
    must: /no longer asks for wind_speed_10m/,
  },
  {
    name: "bucket-stops-filling",
    why: "the field is fetched and reaches nothing — the silent half, where every execution " +
         "assertion still passes because the rule itself is untouched",
    file: RD,
    find: "\n          if(h.wind_speed_10m)dd.winds10.push(h.wind_speed_10m[i]);",
    repl: "",
    expect: "fail",
    must: /no longer buckets wind_speed_10m/,
  },
  {
    name: "wind10max-can-be-minus-infinity",
    why: "dropping the empty-bucket guard makes wind10Max -Infinity rather than null. The gate " +
         "still fails OPEN there, so this is caught by the wiring rule and not by behaviour",
    file: RD,
    find: "wind10Max:d.winds10.length?Math.round(Math.max.apply(null,d.winds10)):null,",
    repl: "wind10Max:Math.round(Math.max.apply(null,d.winds10)),",
    expect: "fail",
    must: /no longer derived from winds10 with a null on empty/,
  },
  {
    name: "gate-hides-on-a-missing-series",
    why: "inverts the fail-open: with no 10 m series it now HIDES the gust. Withholding a gust " +
         "figure is the dangerous way for this to fail, so the direction is asserted, not assumed",
    file: RD,
    find: 'function gustWorthShowing(dy){const surf=dy.wind10Max;return !(typeof surf==="number"&&isFinite(surf))||dy.gustMax>surf;}',
    repl: 'function gustWorthShowing(dy){const surf=dy.wind10Max;return typeof surf==="number"&&isFinite(surf)&&dy.gustMax>surf;}',
    expect: "fail",
    must: /withholding a gust is the dangerous failure|10m null/,
  },
  {
    name: "comment-quotes-the-forbidden-gate",
    why: "MUST STAY SILENT — a comment naming the cross-height comparison is this fix's own " +
         "documentation, and a guard failing on it would forbid explaining itself",
    file: RD,
    find: "function gustWorthShowing(dy){",
    repl: "// the gate used to read dy.gustMax>dy.windMax, which spanned 70 m of altitude\nfunction gustWorthShowing(dy){",
    expect: "pass",
  },
  {
    name: "caption-reworded",
    why: "MUST STAY SILENT — the caption must NAME the two heights, not use one phrasing. A " +
         "guard pinned to a sentence forbids improving the copy",
    file: RD,
    find: "gusts, and the NWS and MET winds beside each day, are surface (10 m) figures — so they are not measured at the same height.",
    repl: "the gust, and the NWS and MET winds beside each day, are surface (10 m) readings taken at a different height.",
    expect: "pass",
  },
];

let bad = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  let mutated;
  if (c.append) mutated = before + c.append;
  else if (c.all) mutated = before.split(c.find).join(c.repl);
  else mutated = before.replace(c.find, c.repl);

  let out = "", code = 0;
  try {
    fs.writeFileSync(c.file, mutated);
    const landedSum = sum(c.file);
    if (landedSum === beforeSum) {
      fs.writeFileSync(c.file, before);
      console.log(`  EDIT NEVER LANDED             ${c.name}`);
      console.log("      " + c.why);
      bad++;
      continue;
    }
    try {
      out = execFileSync("node", [path.join(ROOT, "scripts", "check-units.mjs"), "--only=weather"],
        { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) { code = e.status || 1; out = String(e.stdout || "") + String(e.stderr || ""); }
  } finally {
    fs.writeFileSync(c.file, before);
  }
  const restored = sum(c.file) === beforeSum;
  const failed = code !== 0;
  const wanted = c.expect === "fail";
  let verdict;
  if (!restored) verdict = "BROKEN CASE — not restored";
  else if (failed !== wanted) verdict = wanted ? "MISSED" : "FIRED WHEN IT SHOULD BE SILENT";
  else if (wanted && c.must && !c.must.test(out)) verdict = "WRONG FAILURE";
  else verdict = "ok";
  if (verdict !== "ok") bad++;
  console.log(`  ${verdict.padEnd(30)} ${c.name.padEnd(36)} restored=${restored} guard=${failed ? "fail" : "pass"} (want ${c.expect})`);
  console.log("      " + c.why);
}

console.log(`\n${CASES.length - bad}/${CASES.length} cases behaved as specified.`);
for (const f of [CORE, RD]) {
  // Nothing here may leave the tree edited, and a suite that says so only for the file it happened
  // to touch last is not saying it.
  if (!fs.readFileSync(f, "utf8").length) { console.error("BROKEN: " + f + " is empty."); process.exit(1); }
}
if (bad) process.exit(1);
