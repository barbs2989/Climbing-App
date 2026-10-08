#!/usr/bin/env node
// check:sun-times — THE CALENDAR'S SUNRISE AND SUNSET MATCH AN EPHEMERIS TO THE MINUTE.
//
// The Calendar's Daylight line prints a route's sunrise and sunset for the day of the climb, and
// an alpine party sets its start around them. Until 2026-10-07 the number came from "solar noon ±
// half the day length": no longitude, no equation of time, no daylight saving, no disc or
// refraction. Measured against Open-Meteo's ephemeris for four Washington points, it was 44–70
// minutes early at sunrise and 60–89 minutes early at sunset through the daylight-saving months,
// and the day was 11–19 minutes short all year. Nothing on screen said so: the line looked exactly
// like a correct one. The replacement, sunRiseSet() in lib/conditionsScore.js, walks the solar
// position that the crag conditions score already trusts.
//
// This guard holds it there. It is the only gate that EXECUTES the function: every other guard
// reads source, and a plausible-looking rewrite of the solver — dropping the refraction term,
// reading the longitude wrong, scanning the UTC day instead of the local one — is valid JS that
// renders a confident number. So the check is numeric: sixteen reference instants, four points by
// four dates, and the function's answer must land within TOLERANCE_S of each.
//
// THE REFERENCE IS ABSOLUTE INSTANTS, NOT CLOCK TIMES, on purpose. The first capture asked
// Open-Meteo for local times and got a December sunrise of 08:54 for Seattle — an hour late —
// because the API stamped the response with the offset of the day it was asked, not the day it
// described. Unix seconds have no offset to get wrong. Re-fetch with
// scripts/oneoff/probe-sun-times-vs-open-meteo.mjs, which prints the table in this shape.
//
// The solver lays out the DEVICE's local day, as the Calendar does, so this runs with TZ pinned
// to the zone of the points below: on a box in another zone the "local day" would be a different
// span of hours and a crossing could belong to a neighbouring date. Set before any Date is made.
//
// Static — no browser, no database, one import — so it sits in `npm run build`.
process.env.TZ = "America/Los_Angeles";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sunRiseSet } from "../lib/conditionsScore.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOLERANCE_S = 180;

// [place, lat, lng, local date, sunrise unix s, sunset unix s] — Open-Meteo archive, daily
// sunrise/sunset, timeformat=unixtime, fetched 2026-10-07.
const REF = [
  ["Seattle", 47.61, -122.33, "2026-06-21", 1782043889, 1782101450],
  ["Seattle", 47.61, -122.33, "2026-09-28", 1790604270, 1790646858],
  ["Seattle", 47.61, -122.33, "2025-12-21", 1766332491, 1766362822],
  ["Seattle", 47.61, -122.33, "2026-03-08", 1772980556, 1773021889],
  ["Leavenworth", 47.6, -120.66, "2026-06-21", 1782043504, 1782101028],
  ["Leavenworth", 47.6, -120.66, "2026-09-28", 1790603865, 1790646456],
  ["Leavenworth", 47.6, -120.66, "2025-12-21", 1766332069, 1766362436],
  ["Leavenworth", 47.6, -120.66, "2026-03-08", 1772980150, 1773021488],
  ["Mount Rainier", 46.85, -121.76, "2026-06-21", 1782043957, 1782101106],
  ["Mount Rainier", 46.85, -121.76, "2026-09-28", 1790604121, 1790646733],
  ["Mount Rainier", 46.85, -121.76, "2025-12-21", 1766332163, 1766362874],
  ["Mount Rainier", 46.85, -121.76, "2026-03-08", 1772980389, 1773021779],
  ["Mount Shuksan", 48.83, -121.6, "2026-06-21", 1782043375, 1782101605],
  ["Mount Shuksan", 48.83, -121.6, "2026-09-28", 1790604108, 1790646660],
  ["Mount Shuksan", 48.83, -121.6, "2025-12-21", 1766332618, 1766362336],
  ["Mount Shuksan", 48.83, -121.6, "2026-03-08", 1772980424, 1773021665],
];

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const dead = (m) => { console.log("  DEAD  " + m + " — refusing to report a clean result"); process.exit(1); };

// Fails closed: a table that lost its rows would pass every comparison it no longer makes.
if (REF.length < 16) dead(`only ${REF.length} reference rows — the table has been cut`);
if (typeof sunRiseSet !== "function") dead("lib/conditionsScore.js no longer exports sunRiseSet");

// ── 1. The solver lands within tolerance of every reference instant ─────────────────────────
const clock = (d) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/Los_Angeles" });
let worst = 0;
for (const [place, lat, lng, date, riseS, setS] of REF) {
  const r = sunRiseSet(lat, lng, date);
  if (!r || !r.sunrise || !r.sunset) { fail(`${place} ${date}: no sunrise/sunset returned (${JSON.stringify(r)})`); continue; }
  const dr = Math.round(r.sunrise.getTime() / 1000 - riseS), ds = Math.round(r.sunset.getTime() / 1000 - setS);
  worst = Math.max(worst, Math.abs(dr), Math.abs(ds));
  if (Math.abs(dr) > TOLERANCE_S) fail(`${place} ${date}: sunrise ${clock(r.sunrise)} is ${Math.round(dr / 60)} min off the ephemeris`);
  if (Math.abs(ds) > TOLERANCE_S) fail(`${place} ${date}: sunset ${clock(r.sunset)} is ${Math.round(ds / 60)} min off the ephemeris`);
  const dl = (r.sunset - r.sunrise) / 3600000;
  if (Math.abs(dl - r.daylight) > 1 / 60) fail(`${place} ${date}: daylight ${r.daylight.toFixed(2)} h is not sunset − sunrise (${dl.toFixed(2)} h)`);
}
if (!failures) ok(`all ${REF.length} reference sunrises and sunsets within ${Math.round(worst / 60 * 10) / 10} min (tolerance ${TOLERANCE_S / 60})`);

// ── 2. The polar shapes the Calendar renders are intact ─────────────────────────────────────
const pd = sunRiseSet(80, 0, "2026-06-21"), pn = sunRiseSet(80, 0, "2025-12-21");
if (!pd || pd.daylight !== 24 || pd.sunrise || pd.sunset) fail(`polar day should be 24 h with no crossings, got ${JSON.stringify(pd)}`);
if (!pn || pn.daylight !== 0 || pn.sunrise || pn.sunset) fail(`polar night should be 0 h with no crossings, got ${JSON.stringify(pn)}`);
if (sunRiseSet(47, null, "2026-06-21") !== null || sunRiseSet(47, -122, "not a date") !== null) fail("a missing longitude or an unparseable date must return null, not a number");
if (failures === 0) ok("polar day, polar night and bad input keep their shapes");

// ── 3. The Calendar reads THIS solver, and the old estimate has not come back under its name ──
const cal = fs.readFileSync(path.join(ROOT, "lib/Calendar.jsx"), "utf8");
if (!/import \{[^}]*\bsunRiseSet\b[^}]*\} from "\.\/conditionsScore(\.js)?"/.test(cal)) fail("lib/Calendar.jsx does not import sunRiseSet from ./conditionsScore.js — its Daylight line is reading something else");
if (!/\bsunRiseSet\(/.test(cal)) fail("lib/Calendar.jsx never calls sunRiseSet — its Daylight line is estimating again");
const APP = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "EnrichmentPanels.jsx", ...fs.readdirSync(path.join(ROOT, "lib")).filter((f) => /\.(jsx?|mjs)$/.test(f)).map((f) => "lib/" + f)];
for (const f of APP) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  // A FUNCTION named sunTimes. Not any binding: scoreForecast keeps a plain map called sunTimes
  // (the forecast's own rise/set per date), which is a value, not an estimate.
  if (/\bfunction\s+sunTimes\s*\(|\b(?:const|let|var)\s+sunTimes\s*=\s*(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>)/.test(src)) fail(`${f} declares a sunTimes function — the noon ± half-day estimate's name is back; the Calendar must read sunRiseSet`);
}
if (failures === 0) ok("the Calendar calls sunRiseSet, and no app file declares a sunTimes of its own");

if (failures) { console.log(`\ncheck:sun-times: ${failures} failure(s)`); process.exit(1); }
console.log("ok — check:sun-times");
