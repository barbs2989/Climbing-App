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
//      rain is wetter than granite 30 h after rain (DRY_HOURS 48 vs 12); a south wall is lit at
//      solar noon and a north wall is not.
//   4. REACH — RouteDetail gives ConditionsScoreCard its OWN tab (sub-tab `forecast`, labelled
//      "Conditions"; Send Reports stays separate — owner decision 2026-10-07), the card renders a row
//      for EVERY factor in WEIGHTS, says "not measured" for a missing one, refuses to show stars
//      when the fetch failed, and is gated to crag disciplines only — never alpine, scrambling,
//      mountaineering, ice or mixed (a user decision, 2026-10-07).
//   5. ROCK — a MAPPED rock type says "(mapped)" wherever it renders.
//   6. HOME — the Best day tile is the same score, under the same gate.
//   7. CAPS AND INPUTS — rain, still-wet rock, wet sandstone, dew point and smoke CAP the stars with
//      a named reason; drizzle counts; hours already gone are not offered; drying scales with the
//      rain that fell; local time survives DST; prefs reach the score and live in ONE store that
//      Settings, the route card and Home share; the card renders every section and honesty line.
//
// Needs no network and no credentials.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreForecast, WEIGHTS, CRAG_SCORE_DISCIPLINES, aspectBearing, sunPosition, starsLabel, frictionOf, aqiCategory, seepRisk } from "../lib/conditionsScore.js";
import { routeRock, DRY_HOURS } from "../lib/rockType.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { failed++; console.log("  FAIL  " + m); };

// A forecast fixture: 3 past days + 7 ahead, hourly, local time = UTC (offset 0) at 37°N 0°E so
// solar noon is ~12:00 local. `rainAt` lists the hour indexes that rain.
const NOW = Date.parse("2026-06-10T08:00:00Z");
function fixture({ temp = 60, rh = 35, wind = 4, gust = 6, cloud = 0, pop = 0, rainAt = [], rainAmt = 0.2, noHumidity = false, dew = null } = {}) {
  const time = [], T = [], RH = [], P = [], POP = [], CL = [], W = [], G = [], D = [];
  const start = Date.parse("2026-06-07T00:00:00Z");
  for (let i = 0; i < 240; i++) {
    time.push(new Date(start + i * 3600e3).toISOString().slice(0, 16));
    T.push(temp); RH.push(noHumidity ? null : rh); P.push(rainAt.includes(i) ? rainAmt : 0); POP.push(pop); CL.push(cloud); W.push(wind); G.push(gust); D.push(dew);
  }
  return { utc_offset_seconds: 0, hourly: { time, temperature_2m: T, relative_humidity_2m: RH, dew_point_2m: D, precipitation: P, precipitation_probability: POP, cloud_cover: CL, wind_speed_10m: W, wind_gusts_10m: G } };
}
const WALL = { lat: 37, lng: 0, aspect: "South", family: "granite", discipline: "sport" };
const today = (s) => s.days[0];
const at = (s, hr) => today(s).hours.find((h) => h.hr === hr);

console.log("check:conditions-score");

// 1. ARITHMETIC
{
  const s = scoreForecast(fixture({ rainAt: [60, 80, 81] }), WALL, null, NOW);
  let bad = 0, n = 0;
  for (const d of s.days) for (const h of d.hours) {
    n++;
    const sum = Object.keys(WEIGHTS).reduce((a, k) => a + (h.factors[k] ? h.factors[k].pts : 0), 0);
    const max = Object.keys(WEIGHTS).reduce((a, k) => a + (h.factors[k] ? WEIGHTS[k] : 0), 0);
    const capAt = h.caps.length ? Math.min(...h.caps.map((c) => c.stars)) : Infinity;
    if (sum !== h.pts || max !== h.max || Math.abs(h.rawStars - 5 * h.pts / h.max) > 1e-9 || Math.abs(h.stars - Math.min(h.rawStars, capAt)) > 1e-9) bad++;
    for (const c of h.caps) if (!c.why) bad++;
    for (const k of Object.keys(WEIGHTS)) if (h.factors[k] && !Number.isInteger(h.factors[k].pts)) bad++;
  }
  if (n && !bad) ok(`${n} hours: every headline is exactly the sum of its whole-point rows, stars = min(5 × points / measured, its named cap)`);
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
  // 30 h after rain: granite (12 h) is dry, sandstone (48 h) is not.
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
  if (/tab==="forecast"&&showScore\?<div><ConditionsScoreCard route=\{route\} mtn=\{mtn\}.*?\/>/.test(mask) && /\["forecast","Conditions"\]/.test(mask)) ok("ConditionsScoreCard has its own Conditions tab (sub-tab `forecast`)");
  else fail("ConditionsScoreCard is no longer the body of its own Conditions tab (sub-tab `forecast`)");
  /* Since 2026-10-07 the tab is ALSO offered on alpine, mountaineering, scrambling, ice and mixed
     routes, with FLAGS (lib/AlpineConditionsCard.jsx, held by check:alpine-conditions) -- the owner
     wanted the tab there and no stars. What this guard keeps true is that the STARS stay off them:
     the tab's gate is the two disjoint sets, and the alpine branch never mounts the score card. */
  if (/x\[0\]==="forecast"\?\(showScore\|\|showAlpineCond\)/.test(mask) && /const showScore=CRAG_SCORE_DISCIPLINES\.includes\(catOf\(route\)\)/.test(mask) && /const showAlpineCond=!showScore&&ALPINE_COND_DISCIPLINES\.includes\(catOf\(route\)\)/.test(mask)) ok("the Conditions tab is offered where the score is, or where the alpine flags are — and the flags only where the score is not");
  else fail("the Conditions tab is no longer gated to the score's disciplines plus the alpine flags'");
  const alpBranch = (mask.match(/tab==="forecast"&&showAlpineCond\?<div>[\s\S]*?<\/div><\/div>:null\}/) || [""])[0];
  if (alpBranch && !/ConditionsScoreCard/.test(alpBranch)) ok("the alpine Conditions branch never mounts the star score");
  else fail(alpBranch ? "the alpine Conditions branch mounts ConditionsScoreCard — stars on an alpine route" : "ANCHOR LOST: the alpine Conditions branch was not found");
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
  if (/<BestDayTile ids=\{wishlist\} routeById=\{routeById\} onOpen=/.test(app) && /<BestDayTile[\s\S]{0,320}<div><div style=\{hd\}>\{"Jump back in"\}/.test(app)) ok("the Best day tile is mounted on Home, over the saved climbs");
  else fail("the Best day tile is no longer mounted on Home over the saved climbs");
  // With no saved crag climb the tile says how to get one, and prints no number: it rates nothing.
  const empty = (tile.match(/if \(!crag\.length\) return [^\n]*/) || [""])[0];
  if (/scoreForecast\(/.test(tile) && /CRAG_SCORE_DISCIPLINES\.includes\(catOf\(r\)\)/.test(tile) && /Save a sport, trad, top-rope or bouldering climb/.test(empty) && /onClick=\{onExplore\}/.test(empty) && !/toFixed|stars/.test(empty)) ok("the tile scores with scoreForecast, crag climbs only, and with none saved shows how to save one, with no number");
  else fail("the tile no longer shares the score, its crag-only gate, or its no-number empty state");
  // A score cell opens THAT day on the route's Conditions card, through the one-shot OPEN_DAY.
  if (/OPEN_DAY\.date = d\.date; onOpen\(row\.r, "forecast"\)/.test(tile) && /OPEN_DAY\.date;OPEN_DAY\.date=null/.test(rd) && /d\.date===wantDate/.test(rd)) ok("a tapped score opens that climb's Conditions tab on that day");
  else fail("a tapped score no longer opens its day on the Conditions tab");
  if (/not a rating/.test(tile) && /No score: /.test(tile)) ok("a failed forecast or an unlocated climb is SAID, never scored or dropped");
  else fail("the tile no longer says when a climb could not be scored");
  // A wall direction researched for the crag (areas.aspect) reaches BOTH readers.
  const fallback = /aspect(?:Text)?[:=] ?(?:x\.)?r(?:oute)?\.aspect ?\|\| ?(?:x\.)?r(?:oute)?\.face ?\|\| ?\((?:x\.)?r(?:oute)?\._dbArea ?&& ?(?:x\.)?r(?:oute)?\._dbArea\.aspect\)/;
  if (fallback.test(rd.replace(/\s/g, "")) && fallback.test(tile.replace(/\s/g, ""))) ok("the card and the tile both fall back to the crag's researched wall direction");
  else fail("a reader of the score no longer falls back to areas.aspect");
}

// 7. WHAT A SUM CANNOT SAY — caps, condensation, drizzle, the past, sandstone, prefs, local time,
//    smoke. Each was a verified defect (hand-checked against a live Open-Meteo response) or a
//    feature whose honesty depends on it.
{
  // Rain caps the hour. Summed factors gave an hour of rain 53-59 points: "Fair".
  const rainy = [];
  for (let i = 72; i < 96; i++) rainy.push(i); // all of today
  const sR = scoreForecast(fixture({ rainAt: rainy }), WALL, null, NOW);
  const hR = at(sR, 12);
  if (hR && hR.stars <= 1 && hR.rawStars > 2.5 && hR.caps.some((c) => /rain/i.test(c.why)) && starsLabel(today(sR).stars) === "Poor") ok(`an hour of rain is capped (${hR.rawStars.toFixed(2)} by the factors -> ${hR.stars.toFixed(2)}) and the DAY reads Poor`);
  else fail(`rain did not cap the score: hour ${hR && hR.stars}, day ${today(sR).stars} (${starsLabel(today(sR).stars)})`);
  // ...and so does rock that is still mostly wet (dry fraction < 0.3), not only the raining hour.
  const sW = scoreForecast(fixture({ rainAt: [83], rainAmt: 0.5 }), WALL, null, NOW); // a soaking that stopped at 11:00
  const hW = at(sW, 12);
  if (hW && hW.dryFrac < 0.3 && hW.stars <= 1 && hW.caps.some((c) => /wet/i.test(c.why))) ok(`an hour after a soaking the rock is ${Math.round(hW.dryFrac * 100)}% dried and the hour is capped at 1 star`);
  else fail(`still-wet rock was not capped: dryFrac ${hW && hW.dryFrac}, stars ${hW && hW.stars}`);
  // Drizzle: Open-Meteo reports 0.1 mm steps (0.004"); `>= 0.01` used to throw it away.
  const sD = scoreForecast(fixture({ rainAt: [84], rainAmt: 0.004 }), WALL, null, NOW);
  const hD = at(sD, 12);
  if (hD && hD.factors.dry.raining && hD.stars <= 1) ok("a 0.1 mm drizzle counts as rain");
  else fail(`a 0.004" drizzle was ignored: ${JSON.stringify(hD && hD.factors.dry)}`);
  // ...and a drizzle dries faster than a soaking (drying scales with the rain that fell).
  const sm = at(scoreForecast(fixture({ rainAt: [78], rainAmt: 0.02 }), WALL, null, NOW), 12), big = at(scoreForecast(fixture({ rainAt: [78], rainAmt: 0.8 }), WALL, null, NOW), 12);
  if (sm && big && sm.dryFrac > big.dryFrac && sm.factors.dry.need < big.factors.dry.need) ok(`six hours after rain: a drizzle is ${Math.round(sm.dryFrac * 100)}% dried, a soaking ${Math.round(big.dryFrac * 100)}%`);
  else fail("drying time ignores how much rain fell");
  // Dew point: within DAMP_SPREAD of the air is damp rock — capped, dry factor limited, friction "damp".
  const sDew = scoreForecast(fixture({ dew: 58 }), WALL, null, NOW);
  const hDew = at(sDew, 12), dryOk = at(scoreForecast(fixture({ dew: 30 }), WALL, null, NOW), 12);
  if (hDew && hDew.stars <= 2 && hDew.factors.humidity.friction.key === "damp" && hDew.factors.dry.pts <= 0.25 * WEIGHTS.dry && dryOk.caps.length === 0 && dryOk.factors.humidity.friction.key === "crisp") ok(`air ${60 - 58}° above its dew point reads damp and is capped (${hDew.stars.toFixed(2)}); 30° above reads crisp and is not`);
  else fail(`dew point is not read: damp hour ${hDew && hDew.stars} friction ${hDew && JSON.stringify(hDew.factors.humidity.friction)}`);
  if (frictionOf(60, 40, null, [45, 68]) && frictionOf(60, null, 50, [45, 68]) === null) ok("friction with no humidity is not measured (null), never a default");
  else fail("friction with a missing input was guessed");
  // The past: today's window and default hour must be still to come.
  const after = Date.parse("2026-06-10T14:30:00Z");
  const sP = scoreForecast(fixture(), WALL, null, after);
  const d0 = today(sP);
  if (d0.hours.length && d0.hours.every((x) => x.utc + 3600e3 > after) && d0.best && d0.best.start >= 14) ok(`at 2:30 PM today's hours start at ${d0.hours[0].hr}:00 and the best window at ${d0.best.start}:00 — nothing already gone`);
  else fail(`today offers hours already gone: first ${d0.hours[0] && d0.hours[0].hr}, best ${d0.best && d0.best.start}`);
  // Sandstone: wet sandstone is capped, and "likely dry from" is given.
  const sS = scoreForecast(fixture({ rainAt: [54] }), { ...WALL, family: "sandstone" }, null, NOW);
  const hS = at(sS, 12);
  if (hS && hS.dryFrac < 1 && hS.stars <= 1 && hS.caps.some((c) => /sandstone/i.test(c.why)) && sS.dryFrom && sS.dryFrom.utc > NOW) ok(`sandstone 30 h after rain is capped at 1 star, likely dry from ${sS.dryFrom.date} ${sS.dryFrom.hr}:00`);
  else fail(`wet sandstone is not held down or has no dry-from time: ${hS && hS.stars} ${sS.dryFrom && sS.dryFrom.time}`);
  // Conglomerate dries like sandstone but is not WEAK when wet (quartz-cemented, e.g. the Gunks):
  // same drying, no sandstone cap. A conglomerate wall warned "holds can break" would be false.
  const sC = scoreForecast(fixture({ rainAt: [54] }), { ...WALL, family: "sandstone", rock: "conglomerate" }, null, NOW);
  const hC = at(sC, 12);
  if (hC && !sC.sandstone && !hC.caps.some((c) => /sandstone/i.test(c.why)) && hC.dryFrac === hS.dryFrac) ok(`conglomerate dries like sandstone (${Math.round(hC.dryFrac * 100)}%) without the weak-when-wet cap`);
  else fail(`conglomerate is treated as weak wet sandstone, or dries differently: ${sC.sandstone} ${hC && hC.caps.map((c) => c.why)}`);
  // Prefs: the band and the after-rain caution both reach the score.
  const warm = at(scoreForecast(fixture({ temp: 75 }), WALL, { band: "warm" }, NOW), 12), std = at(scoreForecast(fixture({ temp: 75 }), WALL, { band: "standard" }, NOW), 12);
  if (warm.factors.temp.pts === WEIGHTS.temp && std.factors.temp.pts < WEIGHTS.temp) ok("a 'warm' band scores 75° as ideal; 'standard' does not");
  else fail(`the temperature band pref does not reach the score: warm ${warm.factors.temp.pts}, standard ${std.factors.temp.pts}`);
  const fx = fixture({ rainAt: [66] });
  // A limestone wall (24 h): granite dries in 12 h now, which would leave BOTH settings fully dry here.
  const LIME = { ...WALL, family: "limestone" };
  const norm = scoreForecast(fx, LIME, { rainCaution: "normal" }, NOW), caut = scoreForecast(fx, LIME, { rainCaution: "cautious" }, NOW);
  if (caut.dryNeed === Math.round(norm.dryNeed * 1.5) && at(caut, 12).factors.dry.pts < at(norm, 12).factors.dry.pts) ok(`"Give it longer" stretches drying ${norm.dryNeed} h -> ${caut.dryNeed} h and lowers the dry score`);
  else fail("the after-rain pref does not reach the score");
  // Local time across a daylight-saving change: unix timestamps, placed by the crag's own timezone.
  const t0 = Date.parse("2026-10-30T07:00:00Z") / 1000, ut = [], tt = [];
  for (let i = 0; i < 24 * 6; i++) { ut.push(t0 + i * 3600); tt.push(50); }
  const dst = { timezone: "America/Los_Angeles", utc_offset_seconds: -25200, hourly: { time: ut, temperature_2m: tt, precipitation: tt.map(() => 0) } };
  const sT = scoreForecast(dst, { ...WALL, lat: 47.5, lng: -121.7 }, null, Date.parse("2026-10-30T07:00:00Z"));
  const find = (iso) => { for (const d of sT.days) for (const x of d.all) if (x.utc === Date.parse(iso)) return x; return null; };
  const pdt = find("2026-10-31T19:00:00Z"), pst = find("2026-11-02T20:00:00Z");
  if (pdt && pst && pdt.hr === 12 && pst.hr === 12 && pst.date === "2026-11-02") ok("noon is noon on both sides of the November clock change (one fixed offset was an hour off after it)");
  else fail(`local hours drift across DST: ${pdt && pdt.hr} / ${pst && pst.hr}`);
  // Smoke: unhealthy air caps the hour; air not fetched is "not measured", not clean.
  const air = { utc_offset_seconds: 0, hourly: { time: [], us_aqi: [], pm2_5: [] } };
  for (let i = 0; i < 240; i++) { air.hourly.time.push(new Date(Date.parse("2026-06-07T00:00:00Z") + i * 3600e3).toISOString().slice(0, 16)); air.hourly.us_aqi.push(180); air.hourly.pm2_5.push(110); }
  const sA = scoreForecast(fixture(), WALL, null, NOW, air), sN = scoreForecast(fixture(), WALL, null, NOW);
  if (at(sA, 12).stars <= 2 && at(sA, 12).caps.some((c) => /air/i.test(c.why)) && at(sN, 12).aqi === null && sN.airMeasured === false && aqiCategory(180).label === "Unhealthy") ok("AQI 180 holds the hour to 2 stars; with no air read the AQI is null (not measured), not clean");
  else fail("smoke does not reach the verdict, or a missing air read looks clean");
  // Seepage: the rain of the last 7 and 14 days, as a risk.
  const sSeep = scoreForecast(fixture({ rainAt: [10, 11, 12, 13, 14, 15, 16, 17], rainAmt: 0.2 }), WALL, null, NOW);
  if (sSeep.seep && Math.abs(sSeep.seep.rain7 - 1.6) < 1e-6 && sSeep.seep.risk === "high" && seepRisk(0, 0) === "low") ok(`1.6" in the last week reads HIGH seepage risk (stated as risk); none reads low`);
  else fail(`seepage risk is wrong: ${JSON.stringify(sSeep.seep)}`);
  // 'varies' (areas.aspect, 0249) is not "no wall direction on file".
  const sV = scoreForecast(fixture(), { ...WALL, aspect: "varies" }, null, NOW);
  if (sV.aspectVaries && sV.bearing === null && at(sV, 12).missing.includes("sun")) ok("aspect 'varies' leaves sun out and is SAID to vary, not to be missing");
  else fail("aspect 'varies' is not distinguished");

  // The card, the tile, Settings and the fetch.
  const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
  const card = (rd.replace(/\/\*[\s\S]*?\*\//g, "").match(/function ConditionsScoreCard\([\s\S]*?\n}\n/) || [""])[0];
  const need = ["Wet sandstone is weak — holds can break. Stay off it until it’s dry", "Fewer than three daylight hours to score", "Capped at ", "not a clean-air reading", "This says nothing about its season", "the wall faces several ways", "Seepage risk", "<HourlyChart ", "<SeasonChart ", "Sun on the wall", "Right now", "Best time to climb", "Rock & drying", "Air quality", "Season"];
  const lost = need.filter((s) => !card.includes(s));
  if (!lost.length) ok(`the card renders every section and honesty line (${need.length} anchors)`);
  else fail(`the card lost: ${lost.join(" | ")}`);
  if (/No three dry daylight hours/.test(rd)) fail('the old "No three dry daylight hours" label is back (it was wrong: the window needs daylight, not dry)');
  else ok("the no-window label says what is actually required: three daylight hours");
  const fc = fs.readFileSync(path.join(ROOT, "lib/forecast.js"), "utf8");
  const crag = (fc.match(/export function fetchCragForecast[\s\S]*?\n}\n/) || [""])[0];
  if (/dew_point_2m/.test(crag) && /is_day/.test(crag) && /past_days=14/.test(crag) && /timeformat=unixtime/.test(crag) && /daily=sunrise,sunset/.test(crag) && !/weather_code/.test(crag)) ok("the crag fetch asks for what the score reads (dew point, is_day, 14 past days, sunrise/sunset, unix time) and nothing it does not");
  else fail("the crag fetch and what the score reads have drifted apart");
  const prefs = fs.readFileSync(path.join(ROOT, "lib/CondPrefs.jsx"), "utf8");
  const tile = fs.readFileSync(path.join(ROOT, "lib/BestDayTile.jsx"), "utf8");
  const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
  if (/\["auto", "cool", "standard", "warm"\]\.map\(/.test(prefs) && !/\.filter\(function \(k\) \{ return k === "auto" \|\|/.test(prefs)) ok("all four temperature choices are offered, so exactly one is always pressed");
  else fail("the band chips filter a choice out again — a saved band equal to the default would press nothing");
  if (/useCondPrefs\(\)/.test(tile) && !/BAND_PREF\.load\(\)/.test(tile) && /useCondPrefs\(\)/.test(card) && /setCondPref\(/.test(prefs) && /useSyncExternalStore/.test(prefs)) ok("the route card and Home read ONE prefs store that broadcasts changes");
  else fail("a prefs reader loads storage on its own again, so Home can go stale after a change on a route");
  if (/<SL>Your conditions<\/SL>[\s\S]{0,400}<CondPrefsControls\/>/.test(app) && /onPrefs=\{\(\)=>setSettingsOpen\(true\)\}/.test(app)) ok("Settings has a Your conditions section, and the Home tile links to it");
  else fail("Your conditions is no longer reachable from Settings (menu and profile) or the Home tile");
}

// 8. THE WEATHER BESIDE THE SCORE (Climbit's crag page, 2026-10-07) — rain hour by hour and day by
//    day, feels-like, cloud cover, wind direction, and a SHADE MAP of the terrain's shadow.
{
  // Rain by day: precipitation[T] is the hour BEFORE T, so midnight's rain is the previous day's.
  // Index 72 is 2026-06-10 00:00 (today); 80 = 08:00 today; 96 = 00:00 tomorrow (rain of 23-24 today);
  // 97 = 01:00 tomorrow.
  const fx = fixture({ rainAt: [80, 96, 97], rainAmt: 0.1 });
  fx.hourly.apparent_temperature = fx.hourly.temperature_2m.map((v) => v - 5);
  fx.hourly.wind_direction_10m = fx.hourly.temperature_2m.map(() => 315);
  const sR = scoreForecast(fx, WALL, null, NOW);
  const d0 = sR.days[0], d1 = sR.days[1], d2 = sR.days[2];
  if (Math.abs(d0.rain - 0.2) < 1e-9 && d0.rainHrs === 2 && Math.abs(d1.rain - 0.1) < 1e-9 && d1.rainHrs === 1 && d2.rain === 0 && d2.rainHrs === 0) ok("day rain: each hour's rain is the day that hour BEGAN in (midnight's is the evening before), and a dry day reads 0, not missing");
  else fail(`day rain totals are wrong: ${[d0, d1, d2].map((d) => d.rain + "/" + d.rainHrs).join(" ")}`);
  const noP = fixture(); noP.hourly.precipitation = noP.hourly.precipitation.map(() => null);
  const sNP = scoreForecast(noP, WALL, null, NOW);
  if (sNP.days[1].rain === null && sNP.days[1].rainHrs === null) ok("a day with no precipitation values is NOT MEASURED (null), never \"No rain\"");
  else fail("a day with no precipitation values reads as dry");
  const h12 = d0.all.find((x) => x.hr === 12);
  if (h12 && h12.feels === 55 && h12.windDir === 315 && d0.feelsHi === 55 && d0.cloudAvg === 0 && d0.windMax === 4 && d0.gustMax === 6 && d0.rhMin === 35) ok("feels-like and wind direction reach each hour; the day carries feels range, daylight cloud, wind, gusts and humidity");
  else fail(`hour or day weather fields missing: ${JSON.stringify(h12 && { feels: h12.feels, windDir: h12.windDir })} ${JSON.stringify({ feelsHi: d0.feelsHi, cloudAvg: d0.cloudAvg, windMax: d0.windMax })}`);
  if (sN0().days[0].feelsHi === null) ok("no feels-like in the forecast is null, not the air temperature");
  else fail("a missing feels-like was filled in");

  // The shadow sweep against a ridge with a known answer: 100 m high, 10 m a pixel, sun 45° up.
  const { shadeMask, pointShaded, pinSunSpans, shadeGrid, terrainCredits } = await import("../lib/terrainShade.js");
  const W = 200, E = new Float32Array(W * W);
  for (let r = 0; r < W; r++) E[r * W + 100] = 100;
  const shadedCols = (m) => { const o = []; for (let c = 0; c < W; c++) if (m[100 * W + c] === 1) o.push(c); return o; };
  const east = shadedCols(shadeMask(E, W, W, 10, 90, 45)), west = shadedCols(shadeMask(E, W, W, 10, 270, 45)), se = shadedCols(shadeMask(E, W, W, 10, 135, 45)), north = shadedCols(shadeMask(E, W, W, 10, 0, 10));
  if (east.join() === "90,91,92,93,94,95,96,97,98,99" && west.join() === "101,102,103,104,105,106,107,108,109,110" && se.length === 7 && se[se.length - 1] === 99 && north.length === 0) ok("a 100 m ridge under a 45° sun shades exactly 100 m on the side AWAY from it (70 m across for a sun at 45° to the ridge, none along it)");
  else fail(`the terrain shadow is wrong: east ${east.join()} | west ${west.join()} | se ${se.length} | north ${north.length}`);
  if (pointShaded(E, W, W, 10, 95, 100, 90, 45, 100) === true && pointShaded(E, W, W, 10, 105, 100, 90, 45, 100) === false && pointShaded(E, W, W, 10, 105, 100, 90, -2, 100) === true) ok("the pin readout agrees: shaded behind the ridge, lit in front of it, dark once the sun is down");
  else fail("pointShaded disagrees with the shadow map");
  const holes = new Float32Array(W * W); holes.fill(NaN);
  const mh = shadeMask(holes, W, W, 10, 90, 45);
  if (mh.every((v) => v === 2) && pointShaded(holes, W, W, 10, 50, 50, 90, 45, 0) === null) ok("ground with no height on file is UNKNOWN (drawn without shade), never lit or shaded");
  else fail("missing terrain heights read as lit or shaded");
  const g = shadeGrid(44.367, -121.14), edge = Math.min(g.pin.c, g.W - g.pin.c, g.pin.r, g.H - g.pin.r);
  if (g.W === 1024 && edge >= 384 && g.tiles.length === 16) ok(`the terrain block keeps the pin ${edge} px (≥ 1.5 tiles) from every edge`);
  else fail(`the pin sits ${edge} px from the terrain block's edge`);
  // A flat grid: the pin sees the sun from sunrise to sunset, in one span.
  const flat = new Float32Array(1024 * 1024);
  const rise = Date.parse("2026-06-21T12:30:00Z"), set = Date.parse("2026-06-22T03:30:00Z");
  const sp = pinSunSpans({ E: flat, emax: 0 }, g, 44.367, -121.14, rise, set, 10);
  if (sp && sp.length === 1 && sp[0][1] === set) ok("on flat ground the sun reaches the pin in one span that ends at sunset");
  else fail(`flat-ground sun spans are wrong: ${JSON.stringify(sp)}`);
  const cr = terrainCredits(["ned13/imgn50w124_13.tif, nrcan_cdem/cdem_dem_092G.tif", "srtm/N25W101.tif", null]);
  if (cr.length === 1 && /Open Government Licence – Canada/.test(cr[0]) && terrainCredits(["ned/x.tif", "ned19/y.tif", "srtm/z.tif"]).length === 0) ok("the terrain credit appears only where its licence requires it (Canada yes; US 3DEP and SRTM, public domain, no)");
  else fail(`terrain credits are wrong: ${JSON.stringify(cr)}`);

  // The card and the fetch.
  const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
  const card = (rd.replace(/\/\*[\s\S]*?\*\//g, "").match(/function ConditionsScoreCard\([\s\S]*?\n}\n/) || [""])[0];
  const chart = (rd.match(/function HourlyChart\([\s\S]*?\n}\n/) || [""])[0];
  const need = ["Day by day", "Hour by hour", "All 7 days", "Shade map", "<ShadeMap ", "Cloud cover", "feels like ", " from the ", "Rain not measured", "A trace of rain"];
  const lost = need.filter((s) => !card.includes(s));
  if (!lost.length) ok(`the card renders day by day, hour by hour (a day or all 7), cloud cover, feels-like, wind direction and the shade map (${need.length} anchors)`);
  else fail(`the card lost: ${lost.join(" | ")}`);
  const chartNeed = ['"Rain ("', '"Chance of rain and cloud cover"', '"Humidity"', '"Wind and gusts"', "name:\"Feels\"", "windArrows", "week"];
  const cLost = chartNeed.filter((s) => !chart.includes(s));
  if (!cLost.length) ok("the hourly chart draws rain AMOUNT, chance with cloud, humidity, feels-like and wind direction, for a day or the week");
  else fail(`the hourly chart lost: ${cLost.join(" | ")}`);
  const fc = fs.readFileSync(path.join(ROOT, "lib/forecast.js"), "utf8");
  const crag = (fc.match(/export function fetchCragForecast[\s\S]*?\n}\n/) || [""])[0];
  if (/apparent_temperature/.test(crag) && /wind_direction_10m/.test(crag)) ok("the crag fetch asks for feels-like and wind direction, which the card reads");
  else fail("the crag fetch no longer asks for feels-like or wind direction");
  const sm = fs.readFileSync(path.join(ROOT, "lib/ShadeMap.jsx"), "utf8");
  if (/IntersectionObserver/.test(sm) && /under a clear sky/.test(sm) && /not trees, overhangs/.test(sm) && /isn’t counted/.test(sm) && /Couldn’t load the terrain/.test(sm) && /aria-label="Time of day for the shade"/.test(sm)) ok("the shade map loads only near the screen, says it is a clear-sky terrain shadow (not trees or one face), how far it reaches, and when it failed");
  else fail("the shade map lost a caveat, its lazy load, its failure state or its slider's name");
}
function sN0() { return scoreForecast(fixture(), WALL, null, NOW); }

console.log(failed ? `\ncheck:conditions-score: ${failed} FAILED` : "\ncheck:conditions-score: all passed");
process.exit(failed ? 1 : 0);
