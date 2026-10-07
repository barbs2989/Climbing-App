#!/usr/bin/env node
// check:conditions-score — the crag CONDITIONS SCORE says only what it measured, and adds up.
//
// The score (lib/conditionsScore.js) turns a forecast into stars. A number like that is the easiest
// thing in the app to make dishonest without anyone noticing: a missing input silently scored as 0
// (every crag with no aspect on file would read a star worse) or as a pass (it would read a star
// better), a headline that is not the sum of the rows printed under it, or a score shown on an ice
// route whose conditions it cannot judge. So this asserts, against FIXTURES with known answers:
//
//   1. ARITHMETIC — every hour's points are exactly the sum of its factor rows, and its stars are
//      exactly 5 × points / measured points. The card prints both, so they must agree.
//   2. NOT MEASURED — with no wall direction, sun/shade is LEFT OUT (listed in `missing`, the max
//      drops to 85), never scored 0 and never scored full.
//   3. DIRECTION — a dry, mild, still day beats the same day just after rain; sandstone 30 h after
//      rain is wetter than granite 30 h after rain (DRY_HOURS 48 vs 24); a south wall is lit at
//      solar noon and a north wall is not.
//   4. REACH — RouteDetail gives ConditionsScoreCard its OWN tab (sub-tab `forecast`, labelled
//      "Conditions"; Send Reports stays separate — owner decision 2026-10-07), the card renders a row
//      for EVERY factor in WEIGHTS, says "not measured" for a missing one, refuses to show stars
//      when the fetch failed, and is gated to crag disciplines only — never alpine, scrambling,
//      mountaineering, ice or mixed (a user decision, 2026-10-07).
//   5. ROCK — a MAPPED rock type says "(mapped)" wherever it renders.
//
// Needs no network and no credentials.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreForecast, WEIGHTS, CRAG_SCORE_DISCIPLINES, aspectBearing, sunPosition } from "../lib/conditionsScore.js";
import { routeRock, DRY_HOURS } from "../lib/rockType.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { failed++; console.log("  FAIL  " + m); };

// A forecast fixture: 3 past days + 7 ahead, hourly, local time = UTC (offset 0) at 37°N 0°E so
// solar noon is ~12:00 local. `rainAt` lists the hour indexes that rain.
const NOW = Date.parse("2026-06-10T08:00:00Z");
function fixture({ temp = 60, rh = 35, wind = 4, gust = 6, cloud = 0, pop = 0, rainAt = [], noHumidity = false } = {}) {
  const time = [], T = [], RH = [], P = [], POP = [], CL = [], W = [], G = [];
  const start = Date.parse("2026-06-07T00:00:00Z");
  for (let i = 0; i < 240; i++) {
    time.push(new Date(start + i * 3600e3).toISOString().slice(0, 16));
    T.push(temp); RH.push(noHumidity ? null : rh); P.push(rainAt.includes(i) ? 0.2 : 0); POP.push(pop); CL.push(cloud); W.push(wind); G.push(gust);
  }
  return { utc_offset_seconds: 0, hourly: { time, temperature_2m: T, relative_humidity_2m: RH, precipitation: P, precipitation_probability: POP, cloud_cover: CL, wind_speed_10m: W, wind_gusts_10m: G } };
}
const WALL = { lat: 37, lng: 0, aspect: "South", family: "granite", discipline: "sport" };
const today = (s) => s.days[0];
const at = (s, hr) => today(s).hours.find((h) => h.hr === hr);

console.log("check:conditions-score");

// 1. ARITHMETIC
{
  const s = scoreForecast(fixture({ rainAt: [60] }), WALL, null, NOW);
  let bad = 0, n = 0;
  for (const d of s.days) for (const h of d.hours) {
    n++;
    const sum = Object.keys(WEIGHTS).reduce((a, k) => a + (h.factors[k] ? h.factors[k].pts : 0), 0);
    const max = Object.keys(WEIGHTS).reduce((a, k) => a + (h.factors[k] ? WEIGHTS[k] : 0), 0);
    if (sum !== h.pts || max !== h.max || Math.abs(h.stars - 5 * h.pts / h.max) > 1e-9) bad++;
    for (const k of Object.keys(WEIGHTS)) if (h.factors[k] && !Number.isInteger(h.factors[k].pts)) bad++;
  }
  if (n && !bad) ok(`${n} hours: every headline is exactly the sum of its whole-point rows, stars = 5 × points / measured`);
  else fail(`${bad} of ${n} hours print a total their own rows do not add up to`);
  const W = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  if (W === 100) ok("the five weights total 100, so 'x of 100 points' is literal");
  else fail(`the weights total ${W}, not 100`);
}

// 2. NOT MEASURED
{
  const s = scoreForecast(fixture(), { ...WALL, aspect: null }, null, NOW);
  const h = at(s, 12);
  if (h && !h.factors.sun && h.missing.includes("sun") && h.max === 100 - WEIGHTS.sun) ok("no wall direction: sun/shade is LEFT OUT (max 85), not scored 0 or full");
  else fail(`no wall direction should leave sun/shade out; got factor=${JSON.stringify(h && h.factors.sun)} max=${h && h.max}`);
  const s2 = scoreForecast(fixture({ noHumidity: true }), WALL, null, NOW);
  const h2 = at(s2, 12);
  if (h2 && !h2.factors.humidity && h2.missing.includes("humidity")) ok("no humidity value: humidity is LEFT OUT and listed as missing");
  else fail("a missing humidity value was scored instead of left out");
  if (aspectBearing("N and S faces") === null && aspectBearing("Various") === null) ok("several or no wall directions read as unknown, not as the first one named");
  else fail("an ambiguous aspect was read as one direction");
}

// 3. DIRECTION
{
  const dry = at(scoreForecast(fixture(), WALL, null, NOW), 12);
  const wet = at(scoreForecast(fixture({ rainAt: [78] }), WALL, null, NOW), 12); // rained 06:00 today
  if (dry && wet && dry.stars > wet.stars && wet.factors.dry.pts < dry.factors.dry.pts) ok(`a dry day (${dry.stars.toFixed(2)}) beats the same day six hours after rain (${wet.stars.toFixed(2)})`);
  else fail("rain six hours ago did not lower the score");
  // 30 h after rain: granite (24 h) is dry, sandstone (48 h) is not.
  const fx = fixture({ rainAt: [54] }); // 06:00 yesterday -> 30 h before 12:00 today
  const gr = at(scoreForecast(fx, WALL, null, NOW), 12), ss = at(scoreForecast(fx, { ...WALL, family: "sandstone" }, null, NOW), 12);
  if (DRY_HOURS.sandstone > DRY_HOURS.granite && gr.factors.dry.pts === WEIGHTS.dry && ss.factors.dry.pts < WEIGHTS.dry) ok(`30 h after rain: granite is dry (${gr.factors.dry.pts}/${WEIGHTS.dry}), sandstone is not yet (${ss.factors.dry.pts}/${WEIGHTS.dry})`);
  else fail(`rock family did not change drying: granite ${gr.factors.dry.pts}, sandstone ${ss.factors.dry.pts}`);
  const noon = Date.parse("2026-06-10T12:00:00Z");
  const sun = sunPosition(37, 0, noon);
  if (sun.alt > 60 && Math.abs(sun.az - 180) < 10) ok(`solar noon at 37°N in June: sun ${sun.alt.toFixed(0)}° up, azimuth ${sun.az.toFixed(0)}°`);
  else fail(`solar position is off: alt ${sun.alt.toFixed(1)} az ${sun.az.toFixed(1)}`);
  const south = at(scoreForecast(fixture(), WALL, null, NOW), 12), north = at(scoreForecast(fixture(), { ...WALL, aspect: "North" }, null, NOW), 12);
  if (south.lit === true && north.lit === false) ok("at noon a south wall is lit and a north wall is in shade");
  else fail(`wall lighting is wrong at noon: south lit=${south.lit}, north lit=${north.lit}`);
}

// 4. REACH
{
  const src = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
  const mask = src.replace(/\/\*[\s\S]*?\*\//g, "");
  if (/tab==="forecast"&&showScore\?<div><ConditionsScoreCard route=\{route\} mtn=\{mtn\}\/>/.test(mask) && /\["forecast","Conditions"\]/.test(mask)) ok("ConditionsScoreCard has its own Conditions tab (sub-tab `forecast`)");
  else fail("ConditionsScoreCard is no longer the body of its own Conditions tab (sub-tab `forecast`)");
  if (/x\[0\]==="forecast"\?showScore/.test(mask) && /const showScore=CRAG_SCORE_DISCIPLINES\.includes\(catOf\(route\)\)/.test(mask)) ok("the Conditions tab is offered only where the score is");
  else fail("the Conditions tab is no longer gated to scored crag disciplines");
  const card = (mask.match(/function ConditionsScoreCard\([\s\S]*?\n}\n/) || [""])[0];
  if (!card) fail("ANCHOR LOST: function ConditionsScoreCard not found");
  else {
    const keys = (card.match(/const facKeys=\[([^\]]*)\]/) || [, ""])[1].match(/"(\w+)"/g) || [];
    const have = keys.map((k) => k.replace(/"/g, ""));
    const lost = Object.keys(WEIGHTS).filter((k) => !have.includes(k));
    if (!lost.length) ok(`the card has a row for every factor (${have.join(", ")})`);
    else fail(`the card has no row for: ${lost.join(", ")} — those points would be counted and never shown`);
    if (/Not measured, so left out of the score/.test(card)) ok("the card names what was not measured");
    else fail("the card no longer says what was left out of the score");
    if (/wx&&wx\.error\)return[\s\S]{0,300}not a rating/.test(card)) ok("a failed forecast shows no stars and says it is not a rating");
    else fail("a failed forecast no longer says it is not a rating");
    if (/if\(!on\)return null/.test(card) && /CRAG_SCORE_DISCIPLINES\.includes\(disc\)/.test(card)) ok("the card is gated to crag disciplines");
    else fail("the card's crag-only gate is gone");
  }
  const banned = ["alpine", "scrambling", "mountaineering", "ice", "mixed"].filter((d) => CRAG_SCORE_DISCIPLINES.includes(d));
  if (!banned.length) ok(`scored disciplines: ${CRAG_SCORE_DISCIPLINES.join(", ")} — no alpine, scrambling, mountaineering, ice or mixed`);
  else fail(`the score is offered on ${banned.join(", ")}, which it cannot judge`);
}

// 5. ROCK
{
  const r = routeRock({ _dbArea: { rock: "granodiorite", rockBasis: "mapped" } });
  const own = routeRock({ rock: "Granite", _dbArea: { rock: "gneiss", rockBasis: "mapped" } });
  if (r && r.basis === "mapped" && own && own.basis === "route" && own.label === "Granite") ok("a route's own rock outranks its crag's; a crag's mapped rock is marked mapped");
  else fail(`routeRock precedence is wrong: ${JSON.stringify(r)} / ${JSON.stringify(own)}`);
  const src = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
  const sites = src.match(/routeRock\(route\)/g) || [];
  const marked = (src.match(/basis==="mapped"\?/g) || []).length;
  if (sites.length && marked >= sites.length) ok(`${sites.length} place(s) render a rock type, and each marks a mapped one`);
  else fail(`${sites.length} place(s) render routeRock but only ${marked} say "(mapped)"`);
}

// 6. HOME — the "Best day to climb" tile (lib/BestDayTile.jsx) is the SAME score over the saved crag
//    climbs, so its number and the Conditions tab's must come from one function, under one gate.
{
  const tile = fs.readFileSync(path.join(ROOT, "lib/BestDayTile.jsx"), "utf8");
  const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
  const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
  if (/<BestDayTile ids=\{wishlist\} routeById=\{routeById\} onOpen=/.test(app) && /<BestDayTile[\s\S]{0,200}<div><div style=\{hd\}>\{"Jump back in"\}/.test(app)) ok("the Best day tile is mounted on Home, over the saved climbs");
  else fail("the Best day tile is no longer mounted on Home over the saved climbs");
  if (/scoreForecast\(/.test(tile) && /CRAG_SCORE_DISCIPLINES\.includes\(catOf\(r\)\)/.test(tile) && /if \(!crag\.length\) return null/.test(tile)) ok("the tile scores with scoreForecast, crag climbs only, and renders nothing with none saved");
  else fail("the tile no longer shares the score, its crag-only gate, or its empty-means-nothing rule");
  if (/not a rating/.test(tile) && /No score: /.test(tile)) ok("a failed forecast or an unlocated climb is SAID, never scored or dropped");
  else fail("the tile no longer says when a climb could not be scored");
  // A wall direction researched for the crag (areas.aspect) reaches BOTH readers.
  const fallback = /aspect: ?(?:x\.)?r(?:oute)?\.aspect ?\|\| ?(?:x\.)?r(?:oute)?\.face ?\|\| ?\((?:x\.)?r(?:oute)?\._dbArea ?&& ?(?:x\.)?r(?:oute)?\._dbArea\.aspect\)/;
  if (fallback.test(rd.replace(/\s/g, "")) && fallback.test(tile.replace(/\s/g, ""))) ok("the card and the tile both fall back to the crag's researched wall direction");
  else fail("a reader of the score no longer falls back to areas.aspect");
}

console.log(failed ? `\ncheck:conditions-score: ${failed} FAILED` : "\ncheck:conditions-score: all passed");
process.exit(failed ? 1 : 0);
