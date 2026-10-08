// check:alpine-conditions — the alpine Conditions tab says what each discipline's OWN conditions
// mean, counts its start time back from the Planner's own estimate, and never claims what it did not
// read.
//
// The owner's decisions (2026-10-07): alpine, mountaineering, scrambling, ice and mixed routes get a
// Conditions tab of FLAGS, never stars; the start time gets a party back DOWN off the snow before it
// softens ("going down is more dangerous"); and each discipline is checked against what is published
// online, because they disagree on which direction a number is bad in. A cold clear night is good
// for a glacier and bad for a scramble; a thaw ruins waterfall ice and builds snow-ice on a turf
// route. One flag set for all five would tell one of them the opposite of the truth, so this guard
// holds each kind to its own set:
//   1. KIND      — every route is read as the right kind (waterfall vs alpine ice, crag vs alpine mixed,
//                  and the trad-on-a-peak route the page calls "alpine").
//   2. GLACIER   — refreeze and the softening hour read off the freezing level at the snow's height;
//                  the start is that hour minus up AND down (or the summit leg x 1.69 from camp); a
//                  Planner estimate that is only a floor gives NO start, because it would be too late.
//   3. SCRAMBLE  — thunder anchors the start (off the summit by noon, or the onset if earlier); a cold
//                  wet night is VERGLAS, and there is no refreeze flag at all on snow-free rock.
//   4. ROCK      — showers and storms anchor the start of the DESCENT.
//   5. ICE/MIXED — waterfall ice reads the temperature HISTORY (warm nights, warm runs, rain, the ice
//                  not in yet) and never gets a start time; crag mixed reads weeks of freeze, never a
//                  warm-spell flag.
//   6. WORDS     — every flag words itself in the climber's units, and carries no display text of its own.
//   7. REACH     — the tab is offered on these disciplines and not on crags, the stars never mount on
//                  them, the weather panel moved off Safety for them, and a failed forecast says so.
//   8. LIVE READS — avalanche danger, snow on the ground and recent outcomes: off season, no rating,
//                  outside every zone and a failed read are four answers and none is "Low"; the snow
//                  station is the nearest within 30 km and says how far and how much lower; outcomes
//                  are the last 60 days of Summit / Attempt / Turned around reports, nothing inferred,
//                  and every discipline on this tab can log a Turned around. The season is read at the
//                  TOP of the climb, with snowfall, and says it is a guide, not a forecast.
//                  A day the forecast MODELS disagree on gets a caution; one model is no comparison.
//   9. SUN AND SHADE — the terrain's shadow on the route's OWN pins (summit, base, highest camp), a
//                  line per kind on what the sun does there, steep-and-sunlit ground only where snow or
//                  ice is in play.
//  10. SUN ON THE FACE — glacier and alpine ice count the start back from the first sun on the steep
//                  ground of the face (owner: "do what you recommend", research 2026-10-08): be above
//                  each height before the sun reaches it, no lag; never on rock or a scramble, never
//                  after a night that did not freeze; and the card says what it could not read.
//  11. WHOLE-DAY ROWS — a route that publishes ONE car-to-car time is counted back from that total only
//                  for a scramble or alpine rock route (the way up taken as wholeDayUpShare of it, said
//                  out loud); a glacier or alpine ice row, or a multi-day one, keeps NO start and is no
//                  longer called "only a minimum".
// Thresholds and their research live in docs/guards/honesty-claims.md.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(import.meta.url);
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
export * from ${JSON.stringify(path.join(ROOT, "lib", "alpineConditions.js"))};
export { flagText, forecastPoint, KIND_LABEL } from ${JSON.stringify(path.join(ROOT, "lib", "AlpineConditionsCard.jsx"))};
export { planTimes } from ${JSON.stringify(path.join(ROOT, "lib", "planTimes.js"))};
export { CRAG_SCORE_DISCIPLINES, monthlyClimate } from ${JSON.stringify(path.join(ROOT, "lib", "conditionsScore.js"))};
export { fetchAlpineClimate } from ${JSON.stringify(path.join(ROOT, "lib", "forecast.js"))};
export { __set_UNITS, tickTypesFor, NONCOMPLETION_TICKS } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
export { inGeometry, zoneFor, avyReading, DANGER_NAME } from ${JSON.stringify(path.join(ROOT, "lib", "avalanche.js"))};
export { nearestStation, kmBetween, snowReading } from ${JSON.stringify(path.join(ROOT, "lib", "snotel.js"))};
export { recentOutcomes, sunPins, sunFace } from ${JSON.stringify(path.join(ROOT, "lib", "AlpineConditionsCard.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, { route, initialSubTab: tab, onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-alpcond-")), "bundle.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const A = require_(out);

let fail = 0, ran = 0;
const eq = (label, got, want) => {
  const good = JSON.stringify(got) === JSON.stringify(want);
  ran++; if (!good) fail++;
  console.log(`  ${good ? "ok  " : "FAIL"} ${label}${good ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};

/* A synthetic Open-Meteo response in the units the card asks for: UTC, sunrise 06:00, sunset 18:00,
   21 days (14 past + today + 6). `at(dayIndex, hour)` gives each field; day 14 is "today". */
const DAY0 = Date.UTC(2026, 0, 1) / 1000;
function forecast(at) {
  const time = [], H = { temperature_2m: [], precipitation: [], rain: [], showers: [], snowfall: [], weather_code: [], cape: [], freezing_level_height: [], wind_speed_10m: [], wind_gusts_10m: [], cloud_cover: [], precipitation_probability: [], is_day: [] };
  for (let d = 0; d < 21; d++) for (let h = 0; h < 24; h++) {
    const v = Object.assign({ t: 25, fl: 5000, p: 0, rain: 0, showers: 0, snow: 0, code: 0, cape: 0, wind: 5, gust: 10, pp: 0 }, at(d, h));
    time.push(DAY0 + (d * 24 + h) * 3600);
    H.temperature_2m.push(v.t); H.precipitation.push(v.p + v.rain + v.showers); H.rain.push(v.rain); H.showers.push(v.showers); H.snowfall.push(v.snow);
    H.weather_code.push(v.code); H.cape.push(v.cape); H.freezing_level_height.push(v.fl); H.wind_speed_10m.push(v.wind); H.wind_gusts_10m.push(v.gust);
    H.cloud_cover.push(0); H.precipitation_probability.push(v.pp); H.is_day.push(h >= 6 && h < 18 ? 1 : 0);
  }
  const daily = { time: [], sunrise: [], sunset: [] };
  for (let d = 0; d < 21; d++) { daily.time.push(DAY0 + d * 86400); daily.sunrise.push(DAY0 + d * 86400 + 6 * 3600); daily.sunset.push(DAY0 + d * 86400 + 18 * 3600); }
  return { utc_offset_seconds: 0, hourly: Object.assign({ time }, H), daily };
}
const T = 14, clock = (s) => (s - DAY0) / 3600 - T * 24; // hours from today's midnight
const run = (fc, ctx) => { const days = A.localDays(fc); return A.dayFlags(fc, days, T, ctx); };
const keys = (r) => r.flags.map((f) => f.key + ":" + f.level);
const has = (r, k) => r.flags.some((f) => f.key === k);
const LEGS = { up: 6, down: 4, fromCamp: false, floor: false };

console.log("1. KIND — each route is read as its own discipline");
const k = (route, terrain, disc) => A.condKind(route, terrain || {}, disc);
eq("roadside WI4 on a crag is WATERFALL ice", k({ discipline: "ice", grade: "WI4" }), "waterfall");
eq("AI3 is ALPINE ice", k({ discipline: "ice", grade: "AI3" }), "alpineice");
eq("WI3 with snow in its grade is ALPINE ice", k({ discipline: "ice", grade: "WI3 Steep Snow" }), "alpineice");
eq("WI4 filed on a PEAK is alpine ice", k({ discipline: "ice", grade: "WI4", _dbArea: { areaType: "peak" } }), "alpineice");
eq("a 2-pitch M7 is CRAG mixed", k({ discipline: "mixed", grade: "M7", pitches: 2 }), "cragmixed");
eq("a 5-pitch M6 with no snow in its grade (Asteroid Alley) is ALPINE mixed", k({ discipline: "mixed", grade: "M6", pitches: 5 }), "alpineice");
eq("mountaineering is GLACIER & snow", k({ discipline: "mountaineering" }, { snow: "unknown" }), "glacier");
eq("...unless its own text says no snow, when it is read as a scramble", k({ discipline: "mountaineering" }, { snow: "no" }), "scramble");
eq("scrambling is SCRAMBLING", k({ discipline: "scrambling" }), "scramble");
eq("a trad route the page calls alpine (it climbs a peak) is ALPINE ROCK", k({ discipline: "trad" }, {}, "alpine"), "alpinerock");
eq("an ALPINE route graded AI is alpine ice, not rock (Chair Peak N Face, AI2)", k({ discipline: "alpine", grade: "AI2" }, {}, "alpine"), "alpineice");
eq("...and one graded WI (Triple Couloirs, WI3)", k({ discipline: "alpine", grade: "WI3" }, {}, "alpine"), "alpineice");
eq("...while an alpine rock grade stays alpine rock", k({ discipline: "alpine", grade: "5.8" }, {}, "alpine"), "alpinerock");
eq("a sport route gets no alpine kind", k({ discipline: "sport" }, {}, "sport"), null);
eq("the alpine set and the crag score's set are DISJOINT", A.ALPINE_COND_DISCIPLINES.filter((d) => A.CRAG_SCORE_DISCIPLINES.includes(d)), []);

console.log("\n2. GLACIER — refreeze, the softening hour, and a start that gets you DOWN in time");
// Night FL 5,000 ft (snow at 7,000 frozen); from sunrise it climbs 1,000 ft/hour: 8,000 at 09:00.
const thaw = (d, h) => ({ fl: h >= 6 ? 5000 + 1000 * (h - 6) : 5000 });
const gl = run(forecast(thaw), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: LEGS });
eq("a cold night is NOT flagged as a missing refreeze", has(gl, "no-refreeze"), false);
eq("the snow at 7,000 ft softens at the first daylight hour the freezing level passes it (09:00)", clock(gl.softAt), 9);
eq("start = softening - (6 h up + 4 h down) = 23:00 the night before", gl.start && [clock(gl.start.at), gl.start.why], [-1, "snow"]);
const camp = run(forecast(thaw), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: { up: 6, down: 4, fromCamp: true, floor: false } });
eq("from high camp: start = softening - 6 h x (1 + 0.69) (the way back to camp, not to the car)", camp.start && Math.round(clock(camp.start.at) * 100) / 100, Math.round((9 - 6 * (1 + A.LIMITS.descentShareOfPush)) * 100) / 100);
const floorR = run(forecast(thaw), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: { up: 6, down: 4, fromCamp: false, floor: true } });
eq("a Planner estimate that is only a FLOOR gives NO start (counting back from a minimum is too late)", floorR.start, null);
const warm = run(forecast(() => ({ fl: 9000 })), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: LEGS });
eq("a night with the freezing level above the snow is flagged: no refreeze (warn)", keys(warm).includes("no-refreeze:warn"), true);
eq("...and that day gets NO snow-anchored start: there is no frozen window to be back down in", [warm.start, warm.noFreeze], [null, true]);
const nfText = (kind, terrain) => { const r = run(forecast(() => ({ fl: 9000 })), { kind, terrain, highFt: 10000, snowFt: 7000, legs: LEGS }); const f = r.flags.find((x) => x.key === "no-refreeze"); return f ? A.flagText(f) : null; };
eq("'bridges are weak' only where there may be a glacier: yes on a glacier, no on a snow scramble with none", [/bridges/.test(nfText("glacier", { snow: "yes", glacier: "yes" }) || ""), /bridges/.test(nfText("scramble", { snow: "yes", glacier: "no" }) || "x bridges")], [true, false]);
eq("...and the card says why, instead of a start beside a warning that the snow starts soft", /day\.noFreeze && floor\)[\s\S]{0,200}didn’t freeze overnight at[\s\S]{0,80}no frozen window to be back down in/.test(fs.readFileSync(path.join(ROOT, "lib", "AlpineConditionsCard.jsx"), "utf8")), true);
const hot = run(forecast(() => ({ fl: 12000 })), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: LEGS });
eq("the freezing level above the SUMMIT all night is its own warning", has(hot, "fl-above-night"), true);
const frozen = run(forecast(() => ({ fl: 4000 })), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: LEGS });
eq("snow that never thaws has no softening hour and no snow-anchored start", [frozen.softAt, frozen.start], [null, null]);

console.log("\n3. SCRAMBLE — thunder sets the deadline; cold and wet is verglas, not a refreeze");
const storm = run(forecast((d, h) => (d === T && h === 14 ? { code: 95 } : {})), { kind: "scramble", terrain: { snow: "no" }, highFt: 8000, snowFt: null, legs: { up: 4, down: 3, fromCamp: false, floor: false } });
eq("a thunderstorm code in the afternoon is a warning", keys(storm).includes("thunder:warn"), true);
eq("...and the start gets the party off the summit by NOON: 12:00 - 4 h up = 08:00", storm.start && [clock(storm.start.at), storm.start.why], [8, "storm-summit"]);
const early = run(forecast((d, h) => (d === T && h === 10 ? { code: 96 } : {})), { kind: "scramble", terrain: { snow: "no" }, highFt: 8000, snowFt: null, legs: { up: 4, down: 3, fromCamp: false, floor: false } });
eq("a storm forecast from 10:00 moves the deadline EARLIER than noon: start 06:00", early.start && clock(early.start.at), 6);
const cape = run(forecast((d, h) => (d === T && h === 13 ? { cape: 600, pp: 40 } : {})), { kind: "scramble", terrain: { snow: "no" }, highFt: 8000, legs: LEGS });
eq("CAPE over the cut WITH rain in the air reads 'possible' (caution), never 'forecast'", keys(cape).includes("thunder:caution"), true);
const dryCape = run(forecast((d, h) => (d === T && h === 13 ? { cape: 600 } : {})), { kind: "scramble", terrain: { snow: "no" }, highFt: 8000, legs: LEGS });
eq("...and CAPE alone, with nothing falling, is no thunder flag", has(dryCape, "thunder"), false);
const verg = run(forecast((d, h) => (d === T - 1 && h === 15 ? { p: 0.1, fl: 6000 } : { fl: 6000 })), { kind: "scramble", terrain: { snow: "no" }, highFt: 8000, legs: LEGS });
eq("wet yesterday and below freezing on the route overnight is VERGLAS (warn)", keys(verg).includes("verglas:warn"), true);
const warmScr = run(forecast(() => ({ fl: 12000 })), { kind: "scramble", terrain: { snow: "no" }, highFt: 8000, snowFt: 6000, legs: LEGS });
eq("a snow-free scramble gets NO refreeze or softening flag, however warm the night", [has(warmScr, "no-refreeze"), warmScr.softAt], [false, null]);
const wet = run(forecast((d, h) => (d === T - 1 && h === 12 ? { rain: 0.3, fl: 12000 } : { fl: 12000 })), { kind: "scramble", terrain: { snow: "no" }, highFt: 8000, legs: LEGS });
eq("rain in the last two days is a wet-rock caution", keys(wet).includes("wet-rock:caution"), true);
const snowed = run(forecast((d, h) => (d === T && h === 3 ? { snow: 2 } : {})), { kind: "scramble", terrain: { snow: "no" }, highFt: 8000, legs: LEGS });
eq("an inch or more of new snow on a scramble is flagged (it becomes a winter climb)", has(snowed, "new-snow"), true);

console.log("\n4. ALPINE ROCK — showers and storms anchor the start of the DESCENT");
const shw = run(forecast((d, h) => (d === T && h >= 12 && h < 16 ? { pp: 50, fl: 12000 } : { fl: 12000 })), { kind: "alpinerock", terrain: { snow: "no" }, highFt: 8000, legs: LEGS });
eq("a 50% afternoon chance of rain is a showers caution", keys(shw).includes("showers:caution"), true);
const rstorm = run(forecast((d, h) => (d === T && h === 15 ? { code: 95, fl: 12000 } : { fl: 12000 })), { kind: "alpinerock", terrain: { snow: "no" }, highFt: 8000, legs: LEGS });
eq("a storm day's start is anchored to starting DOWN, not to the summit", rstorm.start && rstorm.start.why, "storm-descent");

console.log("\n5. ICE and MIXED — the temperature HISTORY, and no start time");
const warmNights = run(forecast((d, h) => ({ t: h < 6 || h >= 18 ? 36 : 40 })), { kind: "waterfall", terrain: {}, highFt: 6000, legs: LEGS });
eq("waterfall ice: a night above freezing is a warning", keys(warmNights).includes("ice-warm-night:warn"), true);
eq("...a run of 3+ days above freezing is a warning (undercut pillars)", keys(warmNights).includes("ice-warm-run:warn"), true);
eq("...waterfall ice gets NO start time and NO snow-softening flag, ever", [warmNights.start, has(warmNights, "no-refreeze"), warmNights.softAt], [null, false, null]);
const notIn = run(forecast((d, h) => ({ t: d >= T - 7 ? 38 : 20 })), { kind: "waterfall", terrain: {}, highFt: 6000, legs: LEGS });
eq("...a week without freezing days says the ice may not be in", has(notIn, "ice-not-in"), true);
const iceRain = run(forecast((d, h) => (d === T - 1 && h === 12 ? { rain: 0.2, t: 34 } : {})), { kind: "waterfall", terrain: {}, highFt: 6000, legs: LEGS });
eq("...rain on the ice is a warning", keys(iceRain).includes("ice-rain:warn"), true);
const steady = run(forecast(() => ({ t: 20 })), { kind: "waterfall", terrain: {}, highFt: 6000, legs: LEGS });
eq("...a steady cold spell raises no ice flag at all", steady.flags.length, 0);
const thawMixed = run(forecast((d, h) => ({ t: d % 3 === 0 ? 38 : 25 })), { kind: "cragmixed", terrain: {}, highFt: 6000, legs: LEGS });
eq("crag mixed: too few frozen days in the last two weeks is a caution", has(thawMixed, "mixed-not-frozen"), true);
eq("...and a thaw is NEVER a warm-spell warning on mixed (thaw-freeze builds snow-ice)", thawMixed.flags.filter((f) => /^ice-/.test(f.key)).length, 0);
eq("...and crag mixed gets no start time", thawMixed.start, null);

console.log("\n6. WORDS — wind, wind chill, and every flag in the climber's units");
const gusty = run(forecast((d, h) => (d === T && h === 12 ? { gust: 55 } : {})), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: LEGS });
eq("gusts of 55 mph at the summit are a warning", keys(gusty).includes("wind:warn"), true);
const breezy = run(forecast((d, h) => (d === T && h === 12 ? { gust: 35 } : {})), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: LEGS });
eq("...35 mph is a caution", keys(breezy).includes("wind:caution"), true);
eq("NWS wind chill: 0 F in a 30 mph wind is -26 F", Math.round(A.windChillF(0, 30)), -26);
const chill = run(forecast((d, h) => (d === T && h === 7 ? { t: 0, wind: 30 } : {})), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: LEGS });
eq("...and that wind chill is a frostbite warning", keys(chill).includes("wind-chill:warn"), true);
const all = [gl, camp, warm, hot, storm, cape, verg, wet, snowed, shw, warmNights, notIn, iceRain, thawMixed, gusty, chill].flatMap((r) => r.flags);
eq("no flag carries display text of its own (values only)", all.filter((f) => f.text != null || typeof f.v !== "object").length, 0);
const KEYS = [...new Set(all.map((f) => f.key))];
eq("ANCHOR: the fixtures reach at least 14 different flags", KEYS.length >= 14, true);
for (const units of ["imperial", "metric"]) {
  A.__set_UNITS(units);
  const bad = all.filter((f) => { const t = A.flagText(f); return !t || /undefined|NaN|null/.test(t) || t === f.key; });
  eq(`every flag words itself (${units}): no undefined, NaN or raw key`, bad.map((f) => f.key), []);
  const unitsWrong = all.filter((f) => { const t = A.flagText(f); return units === "metric" ? /\bft\b|mph|"|°F/.test(t) : /\bkm\/h\b| cm\b| mm\b/.test(t); });
  eq(`...and in ${units} units only`, unitsWrong.map((f) => f.key + ": " + A.flagText(f)), []);
}
A.__set_UNITS("imperial");

console.log("\n7. REACH — the tab, the stars, the weather panel, and a failed read");
const BASE = { id: "probe_alp", name: "Probe", grade: "Class 3", gradeSystem: "yds", distKm: 8, gainM: 1200, lossM: 1200, highPointFt: 9000, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Peak", areaType: "peak", region: "Washington", lat: 47.5, lng: -121.5, elevation: 9000 } };
const tabBar = (html) => (html.match(/>(Overview|Plan|Conditions|Reports|Send Reports|Safety|Partners|Photos)</g) || []).map((x) => x.slice(1, -1));
for (const disc of ["mountaineering", "scrambling", "alpine", "ice", "mixed"]) {
  const html = A.render(Object.assign({}, BASE, { discipline: disc, grade: disc === "ice" ? "WI4" : disc === "mixed" ? "M5" : BASE.grade }), "forecast");
  eq(`${disc}: the Conditions tab is offered and its card mounts (no stars)`, [tabBar(html).includes("Conditions"), /CONDITIONS · /.test(html), /CONDITIONS SCORE/.test(html)], [true, true, false]);
}
const sportHtml = A.render(Object.assign({}, BASE, { discipline: "sport", grade: "5.10a" }), "forecast");
eq("a sport route keeps the STAR score, not the alpine flags", [/CONDITIONS SCORE/.test(sportHtml), /CONDITIONS · /.test(sportHtml)], [true, false]);
const safetyAlp = A.render(Object.assign({}, BASE, { discipline: "mountaineering" }), "safety");
const safetyHike = A.render(Object.assign({}, BASE, { discipline: "hiking" }), "safety");
eq("the weather panel left Safety on an alpine route (it lives on Conditions now)", /Weather &amp; mountain forecasts/.test(safetyAlp), false);
eq("...and stays on Safety for a discipline with no Conditions tab", /Weather &amp; mountain forecasts/.test(safetyHike), true);
const fcHtml = A.render(Object.assign({}, BASE, { discipline: "mountaineering", waypoints: [] }), "forecast");
eq("a route with NO waypoints still gets a weather panel (its area's point), not 'No forecast yet'", /No forecast yet/.test(fcHtml), false);
const noLoc = A.render(Object.assign({}, BASE, { discipline: "mountaineering", _dbArea: Object.assign({}, BASE._dbArea, { lat: null, lng: null }) }), "forecast");
eq("a route with no location at all says so, rather than loading forever", /neither it nor the area it is on has a location/.test(noLoc), true);
const card = fs.readFileSync(path.join(ROOT, "lib", "AlpineConditionsCard.jsx"), "utf8");
eq("a failed forecast shows NO flags and says it is not a reading of the conditions", /wx && wx\.error\) return[\s\S]{0,300}This is not a reading of the conditions/.test(card), true);
eq("a day with no flags never says 'safe' or 'good' — it says nothing flagged it", /Nothing in the forecast flags this day\./.test(card) && !/>\s*(Safe|Good to go)/i.test(card), true);
eq("every kind states what a forecast cannot see", Object.keys(A.KIND_LABEL).every((kk) => new RegExp(kk + ": \"A forecast can’t see").test(card)), true);

console.log("\n8. LIVE READS — avalanche danger, snow on the ground, recent outcomes");
// A zone 1x1 degree with a hole in the middle, as the avalanche map layer sends its polygons ([lng, lat]).
const RING = [[-122, 47], [-121, 47], [-121, 48], [-122, 48], [-122, 47]], HOLE = [[-121.6, 47.4], [-121.4, 47.4], [-121.4, 47.6], [-121.6, 47.6], [-121.6, 47.4]];
const ZONE = { id: 1, type: "Feature", properties: { name: "Probe Zone", center_id: "PRB", off_season: false, danger_level: 2, link: "https://example.org/forecast" }, geometry: { type: "Polygon", coordinates: [RING, HOLE] } };
const FAR = { id: 2, type: "Feature", properties: { name: "Far Zone", center_id: "FAR" }, geometry: { type: "MultiPolygon", coordinates: [[[[-100, 40], [-99, 40], [-99, 41], [-100, 41], [-100, 40]]]] } };
eq("a route inside a zone's polygon is in that zone", A.inGeometry(47.2, -121.8, ZONE.geometry), true);
eq("...a point in a zone's HOLE is not (later rings are holes)", A.inGeometry(47.5, -121.5, ZONE.geometry), false);
eq("...and a MultiPolygon zone is read part by part", A.inGeometry(40.5, -99.5, FAR.geometry), true);
eq("zoneFor picks the zone the route is in, and none when it is in none", [A.zoneFor({ features: [FAR, ZONE] }, 47.2, -121.8)?.id, A.zoneFor({ features: [FAR, ZONE] }, 60, -150)], [1, null]);
const prod = (u, m, l) => ({ danger: [{ valid_day: "current", upper: u, middle: m, lower: l }, { valid_day: "tomorrow", upper: 1, middle: 1, lower: 1 }] });
const avB = A.avyReading(ZONE, prod(3, 2, 1));
eq("bands: today's three elevation bands are read, and the headline is the HIGHEST of them", [avB.kind, avB.max, avB.today], ["bands", 3, { upper: 3, middle: 2, lower: 1 }]);
eq("outside every zone is 'outside', with no rating", A.avyReading(null, null), { kind: "outside" });
const off = A.avyReading({ properties: { name: "Probe Zone", off_season: true, danger_level: -1 } }, null);
eq("off season is 'off', never a rating", [off.kind, off.max], ["off", undefined]);
const none = A.avyReading({ properties: { name: "Probe Zone", off_season: false, danger_level: -1 } }, prod(null, null, null));
eq("in season with no band or overall rating is 'none' — never an empty set read as Low", [none.kind, none.max], ["none", undefined]);
const ov = A.avyReading(ZONE, prod(null, null, null));
eq("in season with no bands but an overall rating reads that rating ('overall')", [ov.kind, ov.max], ["overall", 2]);
const junk = A.avyReading({ properties: { off_season: false, danger_level: -1 } }, prod(0, -1, 9));
eq("a band value outside 1-5 is no rating, not a number to show", [junk.kind, junk.max], ["none", undefined]);
const zn = (props) => A.avyReading({ properties: Object.assign({ off_season: true, danger_level: -1 }, props) }, null).zone;
eq("a zone named after its forecasting centre is not printed (no source names on screen); a place name is", [zn({ name: "CAIC zone", center_id: "CAIC", center: "Colorado Avalanche Information Center" }), zn({ name: "Bridgeport Avalanche Center", center_id: "BAC", center: "Bridgeport Avalanche Center" }), zn({ name: "West Slopes North", center_id: "NWAC", center: "Northwest Avalanche Center" })], [null, null, "West Slopes North"]);
eq("the danger scale's names are the published five", [1, 2, 3, 4, 5].map((d) => A.DANGER_NAME[d]), ["Low", "Moderate", "Considerable", "High", "Extreme"]);
const STNS = [{ id: "near", name: "Near", elevFt: 3500, lat: 47.0, lng: -121.0 }, { id: "far", name: "Far", elevFt: 5000, lat: 47.4, lng: -121.0 }];
eq("the snow station is the NEAREST one", A.nearestStation(STNS, 47.05, -121.0, 30)?.id, "near");
eq("...and no station within 30 km gives none, rather than one from another range", A.nearestStation(STNS, 47.75, -121.0, 30), null);
eq("great-circle distance: one degree of latitude is 111 km", Math.round(A.kmBetween(47, -121, 48, -121)), 111);
const vals = [10, 10, 12, 12, 14, 14, 15, 18].map((v, i) => ({ date: "2026-01-0" + (i + 1), value: v }));
eq("snow on the ground: the latest depth, and its change over a day and a week", A.snowReading(vals), { date: "2026-01-08", depth: 18, d24: 3, d7: 8 });
eq("...one report gives a depth and NO change (not a change of zero)", A.snowReading(vals.slice(-1)), { date: "2026-01-08", depth: 18, d24: null, d7: null });
eq("...and a station with no reports gives no reading", A.snowReading([]), null);
const NOW = Date.UTC(2026, 9, 7, 12), ago = (n) => new Date(NOW - n * 864e5).toISOString().slice(0, 10);
const acts = [{ tickType: "Attempt", date: ago(59) }, { tickType: "Summit", date: ago(3) }, { tickType: "Turned around", date: ago(10) }, { tickType: "Summit", date: ago(61) }, { tickType: "Redpoint", date: ago(1) }, { tickType: "Conditions", date: ago(1) }, { date: ago(1) }, { tickType: "Summit", date: "last spring" }];
eq("recent outcomes: Summit / Attempt / Turned around from the last 60 days, newest first, nothing else", A.recentOutcomes(acts, NOW).map((a) => a.tickType), ["Summit", "Turned around", "Attempt"]);
const noTA = A.ALPINE_COND_DISCIPLINES.filter((d) => { const t = A.tickTypesFor({ discipline: d, grade: d === "ice" ? "WI3" : d === "mixed" ? "M4" : "5.6" }); return !t.includes("Summit") || !t.includes("Turned around"); });
eq("every discipline on this tab can log a Summit AND a Turned around", noTA, []);
eq("...and a Turned around is not a send", A.NONCOMPLETION_TICKS.includes("Turned around"), true);
const strip = (h) => h.replace(/<!-- -->/g, "");
const today = new Date().toISOString().slice(0, 10);
const withOut = strip(A.render(Object.assign({}, BASE, { discipline: "mountaineering", activity: [{ id: "o1", user: "A", date: today, tickType: "Turned around", outcomeReasons: ["Weather"], outcomeNote: "Whiteout at the saddle" }, { id: "o2", user: "B", date: today, tickType: "Summit" }] }), "forecast"));
eq("a route with outcome reports shows them, with the reason and the note", [/Recent outcomes/.test(withOut), /1 of 2 reports in the last 60 days summited\./.test(withOut), /Turned around<\/b> — Weather: Whiteout at the saddle/.test(withOut)], [true, true, true]);
const glHtml = strip(A.render(Object.assign({}, BASE, { discipline: "mountaineering" }), "forecast"));
eq("...and one with none has no outcomes section at all (not 'no one summited')", /Recent outcomes|0 of /.test(glHtml), false);
eq("a snow route mounts the avalanche AND snow sections", [/Avalanche today/.test(glHtml), /Snow on the ground/.test(glHtml)], [true, true]);
const dryScr = strip(A.render(Object.assign({}, BASE, { discipline: "scrambling" }), "forecast"));
eq("a scramble whose own data rules avalanche terrain out gets snow but no avalanche section", [/Avalanche today/.test(dryScr), /Snow on the ground/.test(dryScr)], [false, true]);
eq("a failed avalanche read says it is not a rating", /st\.error\) return[\s\S]{0,300}Couldn’t load the avalanche forecast\. This is not a rating\./.test(card), true);
eq("...off season, no rating and outside every zone each say 'That is not a rating'", (card.match(/That is not a rating/g) || []).length, 3);
eq("a failed snow-station read says it says nothing about the snow", /st\.error\) return[\s\S]{0,300}Couldn’t load the snow station\. This says nothing about the snow\./.test(card), true);
eq("the snow station's distance AND height below the climb are worded every time", /" away at " \+ uElev\(s\.elevFt\)[\s\S]{0,120}below the top of this climb/.test(card), true);
// SEASON AT THE TOP. A year of synthetic archive days: snow falls only in January.
const ARCH = { daily: { time: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [], snowfall_sum: [] } };
for (let t = Date.UTC(2025, 0, 1); t < Date.UTC(2026, 0, 1); t += 864e5) { const d = new Date(t); ARCH.daily.time.push(d.toISOString().slice(0, 10)); ARCH.daily.temperature_2m_max.push(30); ARCH.daily.temperature_2m_min.push(20); ARCH.daily.precipitation_sum.push(0.1); ARCH.daily.snowfall_sum.push(d.getUTCMonth() === 0 ? 0.5 : 0); }
const climSnow = A.monthlyClimate(ARCH), climCrag = A.monthlyClimate({ daily: Object.assign({}, ARCH.daily, { snowfall_sum: undefined }) });
eq("the season reading carries each month's snowfall when it was asked for (January 0.5 in/day = 15.5 in)", climSnow && [Math.round(climSnow.months[0].snow * 10) / 10, climSnow.months[6].snow], [15.5, 0]);
eq("...and a crag's reading, which never asks, has no snow key at all (its output is unchanged)", climCrag && "snow" in climCrag.months[0], false);
const realFetch = globalThis.fetch; const asked = [];
globalThis.fetch = (u) => { asked.push(String(u)); return Promise.reject(new Error("probe")); };
await A.fetchAlpineClimate(48.7768, -121.8144, 10781).catch(() => null);
await A.fetchAlpineClimate(48.7768, -121.8144, null).catch(() => null);
globalThis.fetch = realFetch;
eq("the season is read at the TOP of the climb: 10,781 ft asks the archive for 3,286 m, with snowfall", [/&elevation=3286&/.test(asked[0] || ""), /snowfall_sum/.test(asked[0] || "")], [true, true]);
eq("...and with no height on file it asks for none, rather than inventing one", /elevation=/.test(asked[1] || "elevation="), false);
eq("a snow route mounts the season section", /Season at the top/.test(glHtml), true);
eq("a failed climate read says it says nothing about the season", /st\.error\) return[\s\S]{0,300}Couldn’t load the climate\. This says nothing about the season\./.test(card), true);
eq("...and the season says where it was read and that it is a guide, not a forecast", /"Averages for " \+ m\.years \+ " at "[\s\S]{0,160}a guide to the season, not a forecast\./.test(card), true);
// MODELS DISAGREE. One day, three models, every hour the same value per model.
const SPD = (gusts, highs, fls) => {
  const time = [], H = { time }, t0 = Date.UTC(2026, 0, 15) / 1000;
  for (let i = 0; i < 24; i++) time.push(t0 + i * 3600);
  ["gfs_seamless", "icon_seamless", "ecmwf_ifs025"].forEach((m, j) => { H["wind_gusts_10m_" + m] = time.map(() => gusts[j]); H["temperature_2m_" + m] = time.map(() => highs[j]); H["freezing_level_height_" + m] = time.map(() => fls[j]); });
  return { utc_offset_seconds: 0, hourly: H };
};
const msA = A.modelSpread(SPD([20, 30, 65], [30, 32, 31], [8000, 8500, null]), "2026-01-15");
eq("models 45 mph apart on the day's top gust flag it (the freezing level is compared across the two that send one)", msA && [msA.over, msA.fl], [["gust"], [8000, 8500]]);
const msB = A.modelSpread(SPD([20, 25, 30], [30, 44, 31], [6000, 9500, null]), "2026-01-15");
eq("...as do highs 14 F apart and freezing levels 3,500 ft apart", msB && msB.over, ["high", "fl"]);
const msC = A.modelSpread(SPD([20, 25, 30], [30, 32, 31], [8000, 8500, null]), "2026-01-15");
eq("...and ordinary disagreement (gusts 10 mph apart) flags nothing", msC && msC.over, []);
eq("ONE model answering is no comparison: null, never 'they agree'", A.modelSpread(SPD([20, null, null], [30, null, null], [8000, null, null]), "2026-01-15"), null);
eq("...and a day the spread does not cover is null too", A.modelSpread(SPD([20, 30, 65], [30, 32, 31], [8000, 8500, null]), "2026-01-16"), null);
for (const units of ["imperial", "metric"]) {
  A.__set_UNITS(units);
  const t = A.flagText({ key: "models-disagree", level: "caution", v: msB });
  eq(`the disagreement flag words itself in ${units} units`, [/undefined|NaN|null/.test(t), units === "metric" ? /\bft\b|mph|°F/.test(t) : /km\/h| m\b/.test(t)], [false, false]);
}
A.__set_UNITS("imperial");
eq("the card adds that flag only to a day the models disagree on, from a second read that adds NOTHING when it fails", /fetchAlpineSpread\([\s\S]{0,200}function \(\) \{ if \(live\) setSp\(null\); \}/.test(card) && /if \(ms && ms\.over\.length\) r = /.test(card), true);
eq("a start counted back from STORED legs says they are a fit party's times, so a slower party starts earlier", /P\.legsStored \? "\. Times are this route’s published times for a fit party \(Plan tab\), so a slower party should start earlier\."/.test(card), true);
const code = card.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
eq("no provider is named on screen (comments aside)", code.match(/NWAC|avalanche\.org|SNOTEL|NRCS|CAIC|USDA/g), null);

console.log("\n9. SUN AND SHADE — the terrain's shadow on the route's own pins");
{
  const W = (type, lat, lng, elev) => ({ type, lat, lng, elev });
  const pins = A.sunPins({ waypoints: [W("trailhead", 46.85, -121.73, 5400), W("camp", 46.83, -121.73, 8000), W("camp", 46.82, -121.73, 10000), W("base", 46.81, -121.74, 10200), W("summit", 46.85, -121.76, 14400), W("topout", 46.85, -121.76, 14400), W("summit", "", "", null)] });
  eq("the pins are the route's own: summit, base and the HIGHEST camp — never the trailhead, and a top-out beside a summit is not a second top", pins.map((p) => p.key + "@" + p.lat), ["Summit@46.85", "Base@46.81", "Campsite@46.82"]);
  // A summit pin a pixel off the model's top read first sun 80 min late at Colchuck Peak (2026-10-07).
  eq("only the SUMMIT is read at the terrain's high point beside it; a base or camp keeps its own pixel, where a wall beside it is real shade", pins.map((p) => p.key + ":" + p.top), ["Summit:true", "Base:false", "Campsite:false"]);
  const shadeSrc = fs.readFileSync(path.join(ROOT, "lib", "ShadeMap.jsx"), "utf8");
  eq("...and the map snaps exactly those pins", /return px && p\.top && d \? highestNear\(d\.E, grid\.W, grid\.H, px, Math\.round\(SUMMIT_SNAP_M \/ grid\.pxM\)\) : px;/.test(shadeSrc), true);
  eq("a route with no placed pins has none (the map then falls back to the forecast point, said to be the area's)", A.sunPins({ waypoints: [W("summit", null, null, null)] }), []);
  eq("...and the section tells an area pin from the route's own", /place=\{pins\.length \? "climb" : "area"\}/.test(card), true);
  eq("every kind gets its OWN line on what the sun does there", Object.keys(A.KIND_LABEL).every((kk) => new RegExp("\\n  " + kk + ": \"").test(card.slice(card.indexOf("const SUN_NOTE")))), true);
  eq("...each called a rule of thumb on screen", /SUN_NOTE\[kind\] \+ " A rule of thumb\."/.test(card), true);
  eq("steep-and-sunlit ground is offered only where snow or ice is in play (not on a dry scramble or rock)", /const steep = kind === "glacier" \|\| kind === "alpineice" \|\| kind === "waterfall" \|\| kind === "cragmixed" \|\| hasSnowLegs\(kind, terrain\);/.test(card), true);
  eq("the terrain is centred on the CLIMB (its base, else its top), not the trailhead", /p\.key === "Base"[\s\S]{0,120}p\.key === "Summit" \|\| p\.key === "Topout"/.test(card), true);
  eq("it reads the SELECTED day's sunrise and sunset, and renders under the forecast", /<SunShadeSection route=\{route\} kind=\{kind\} terrain=\{terrain\} pt=\{pt\} fc=\{fc\} day=\{day\}/.test(card) && /day\.sunrise \* 1000, set = day\.sunset \* 1000/.test(card), true);
  // The section reads day.sunrise, so the card's own day objects must CARRY it: they are rebuilt from
  // localDays() with only the fields the card names, and the first draft dropped these two, which
  // rendered the section for nobody while the line above passed.
  eq("...and the card's day objects carry the sunrise and sunset that line reads", /out\.push\(Object\.assign\(\{ date: d\.date, sum: daySummary\(fc, d\), sunrise: d\.sunrise, sunset: d\.sunset, aqi: aq \}/.test(card), true);
  const fcSrc = fs.readFileSync(path.join(ROOT, "lib", "forecast.js"), "utf8");
  eq("...which the alpine forecast fetch asks for", /export function fetchAlpineForecast[\s\S]{0,1200}daily=sunrise,sunset/.test(fcSrc), true);
  const judge = fs.readFileSync(path.join(ROOT, "lib", "alpineConditions.js"), "utf8");
  eq("the judgement module IMPORTS no terrain: the card reads it and hands over plain numbers", /^import[^\n]*(terrainShade|ShadeMap)/m.test(judge), false);
}

console.log("\n10. SUN ON THE FACE — be above each height of the face before the sun first reaches it");
{
  eq("the climb starts early enough to be above 9,000 ft (3/4 of the way, in a 4 h climb) when the sun reaches it", A.sunClimbStart([{ ft: 9000, at: 1e6 }, { ft: 11000, at: 1 }, { ft: 5000, at: 1 }], 6000, 10000, 4), { at: 1e6 - 3 * 3600, ft: 9000, sunAt: 1e6 });
  eq("...and with nothing to read, or no height to climb, nothing binds", [A.sunClimbStart([], 6000, 10000, 4), A.sunClimbStart([{ ft: 9000, at: 1 }], null, 10000, 4), A.sunClimbStart([{ ft: 9000, at: 1 }], 6000, 10000, 0)], [null, null, null]);
  const M = DAY0 + T * 86400, LEGS2 = { up: 6, down: 4, fromCamp: false, floor: false, tech: 4, hike: 2 };
  const SUN = { bands: [{ ft: 9500, at: M + 7 * 3600 }, { ft: 8000, at: M + 9 * 3600 }], fromFt: 5000, topFt: 10000 };
  const frozen = forecast(() => ({ fl: 5000 })), LEGS3 = Object.assign({}, LEGS2, { down: 1 });
  // A warm day (the freezing level passes 10,000 ft at 11:00) and snow read high (9,800 ft softens at
  // 11:00, so the snow start is 11:00 - 7 h = 04:00): the sun on the face comes first.
  const gs = run(forecast(thaw), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 9800, legs: LEGS3, sun: SUN });
  eq("glacier on a warm day: the SUN decides — above 9,500 ft by 07:00 is a 4 h climb from 01:24 after the 2 h walk in", gs.start && [Math.round(clock(gs.start.at) * 10) / 10, gs.start.why, gs.start.sun.ft], [1.4, "sun", 9500]);
  const gc = run(frozen, { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: LEGS2, sun: SUN });
  eq("...but on a day the air at those heights never thaws, the sun sets NO deadline, and says why", [gc.sun, gc.sunCold, gc.start && gc.start.why], [null, true, null]);
  const ga = run(forecast(thaw), { kind: "alpineice", terrain: { snow: "yes" }, highFt: 10000, snowFt: 9800, legs: LEGS3, sun: SUN });
  eq("...and alpine ice the same", ga.start && ga.start.why, "sun");
  const gsn = run(forecast(thaw), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: LEGS2, sun: SUN });
  eq("when the SNOW deadline is earlier it decides, and the sun's reading is still handed back to be shown", [gsn.start && gsn.start.why, gsn.sun && gsn.sun.ft], ["snow", 9500]);
  const rk = run(frozen, { kind: "alpinerock", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: LEGS2, sun: SUN });
  eq("alpine rock never counts the sun (it dries and warms rock)", [rk.sun, rk.start && rk.start.why], [null, null]);
  const nf = run(forecast(() => ({ fl: 9000 })), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: LEGS2, sun: SUN });
  eq("after a night that never froze there is NO sun deadline: nothing was frozen in place to begin with", [has(nf, "no-refreeze"), nf.sun], [true, null]);
  const cp = run(forecast(thaw), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 9800, legs: { up: 4, down: 3, fromCamp: true, floor: false, tech: 4, hike: 0 }, sun: { bands: [{ ft: 9500, at: M + 7 * 3600 }], fromFt: 8000, topFt: 10000 } });
  eq("from camp, the whole summit leg is the climb and nothing is added for a walk in", cp.start && [Math.round(clock(cp.start.at) * 100) / 100, cp.start.why], [4, "sun"]);
  const fl = run(frozen, { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: { up: 6, down: 4, fromCamp: false, floor: true, tech: 4, hike: 2 }, sun: SUN });
  eq("a Planner estimate that is only a floor still gives no start at all", fl.start, null);

  const Wp = (type, lat, lng, elev) => ({ type, lat, lng, elev });
  const route = (aspect, wps) => ({ aspect, waypoints: wps });
  const f1 = A.sunFace(route("NE", [Wp("trailhead", null, null, 3400), Wp("summit", 47.48, -120.85, 8705)]), "glacier", { campFt: null }, false);
  eq("the face is read from the summit pin and a one-direction aspect, from the trailhead's height", f1 && [f1.deg, f1.fromFt, f1.top.key, f1.ctr.key], [45, 3400, "Summit", "Summit"]);
  eq("...from the highest camp on a multi-day push, its height read even when the pin isn't placed", A.sunFace(route("N", [Wp("camp", null, null, 5000), Wp("camp", 47.49, -120.83, 5570), Wp("summit", 47.48, -120.85, 8705)]), "alpineice", {}, true).fromFt, 5570);
  eq("...and with no camp height, from the trailhead's — lower, so the start errs EARLY", A.sunFace(route("N", [Wp("trailhead", null, null, 3400), Wp("summit", 47.48, -120.85, 8705)]), "alpineice", {}, true).fromFt, 3400);
  eq("an aspect that isn't one direction, a missing summit pin or a missing start height is NAMED, not guessed", [A.sunFace(route("varies", [Wp("trailhead", null, null, 3400), Wp("summit", 47.48, -120.85, 1)]), "glacier", {}, false), A.sunFace(route("NE", [Wp("trailhead", null, null, 3400)]), "glacier", {}, false), A.sunFace(route("NE", [Wp("summit", 47.48, -120.85, 1)]), "glacier", {}, true)], [{ missing: "aspect" }, { missing: "summit" }, { missing: "from" }]);
  const nm = (name) => A.sunFace(Object.assign(route("N", [Wp("trailhead", null, null, 3400), Wp("summit", 47.48, -120.85, 8705)]), { name }), "glacier", {}, false);
  eq("a RIDGE route gets no sun deadline (what sheds off a flank falls away from the crest), but a face, couloir or glacier named beside a ridge does", ["Liberty Ridge", "North Face of the Northwest Ridge", "Southwest Ridge / McAllister Glacier", "Northeast Couloir", "Standard Route"].map((n) => nm(n).missing || "face"), ["ridge", "face", "face", "face", "face"]);
  eq("...and the card says so", /ridge: "it climbs a ridge, and what sheds off either side falls away from the crest"/.test(card), true);
  eq("...and rock, scrambles and waterfall ice get no face at all", ["alpinerock", "scramble", "waterfall"].map((kk) => A.sunFace(route("NE", [Wp("trailhead", null, null, 1), Wp("summit", 1, 1, 2)]), kk, {}, false)), [null, null, null]);

  eq("the card hands the day's face reading to the judgement, and only a COMPUTED one", /sun: fs && fs\.bands \? fs : null/.test(card), true);
  eq("a start the sun decided says so, with the height and the hour", /day\.start\.why === "sun" \?[^\n]*" and be above " \+ uElev\(Math\.ceil\(day\.start\.sun\.ft \/ 50\) \* 50\) \+ " by "[^\n]*when the sun reaches steep ground that sheds onto the line above that height/.test(card), true);
  eq("...and says the line is the fall line from the summit, not a traced route, and reads one flank on a ridge", /The line is the fall line down the " \+ faceDir \+ " side from the summit, not a traced route — on a ridge it reads one flank\./.test(card), true);
  eq("the model's limits are said beside it — no lag counted, shade isn't frozen, cornices, seracs, narrow walls", /no lag is counted/.test(card) && /shade isn’t proof the snow is frozen/.test(card) && /misses cornices, seracs and narrow walls/.test(card), true);
  eq("...and on a glacier, that no timing reduces serac fall", /kind === "glacier" \? " No timing reduces serac fall\." : ""/.test(card), true);
  eq("a night that never froze says the sun gives no deadline", /The sun gives no deadline today: with nothing frozen overnight/.test(card), true);
  eq("...and so does a day too cold for the sun to matter", /day\.sunCold \? "The sun reaches steep ground shedding onto the line, but the air there stays below freezing all day/.test(card), true);
  eq("what the start could not read is said, every time (no aspect, no summit pin, no start height, no terrain)", /This start doesn’t count in sun on the face: /.test(card) && /Couldn’t load the terrain, so this start doesn’t count in sun on the face\./.test(card), true);
  eq("...in the start box itself", /\{startEl\}\{sunEl\}/.test(card), true);
}

console.log("\n11. WHOLE-DAY ROWS — one published total counts back where the kind allows it, and says the split is assumed");
{
  const r2 = (x) => Math.round(x * 1e6) / 1e6, WL = A.wholeDayLegs;
  const sc = WL(10, "scramble");
  eq("a scramble's whole-day 10 h is 8 h up + 2 h down (the way up is wholeDayUpShare of it)", [r2(sc.up), r2(sc.down), sc.total, A.LIMITS.wholeDayUpShare], [8, 2, 10, 0.8]);
  eq("...and so is alpine rock: neither has a sun deadline that needs the walk in and the climb apart", r2(WL(10, "alpinerock").up), 8);
  eq("a glacier, alpine ice, waterfall ice and crag mixed get NO whole-day legs (their sun deadline needs the split, or they have no start)", ["glacier", "alpineice", "waterfall", "cragmixed", null].map((kk) => WL(10, kk)), [null, null, null, null, null]);
  eq("a total that is not a positive number gives none: 0, -1, null, undefined, a string, NaN", [0, -1, null, undefined, "10", NaN].map((x) => WL(x, "scramble")), [null, null, null, null, null, null]);
  const wdL = { up: sc.up, down: sc.down, fromCamp: false, floor: false, tech: sc.up, hike: 0, wholeDay: sc.total };
  const wst = run(forecast((d, h) => (d === T && h === 14 ? { code: 95 } : {})), { kind: "scramble", terrain: { snow: "no" }, highFt: 8000, snowFt: null, legs: wdL });
  eq("a thunder day on a 10 h scramble: off the summit by NOON, 8 h up -> start 04:00", wst.start && [clock(wst.start.at), wst.start.why], [4, "storm-summit"]);
  const wsn = run(forecast(thaw), { kind: "scramble", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: wdL });
  eq("a snowy 10 h scramble: back down by the softening hour with the WHOLE 10 h (up + down = the total) -> 23:00 the night before", wsn.start && [r2(clock(wsn.start.at)), wsn.start.why], [-1, "snow"]);
  eq("a whole-day row on a glacier still gets NO start (floor), as before", run(forecast(thaw), { kind: "glacier", terrain: { snow: "yes" }, highFt: 10000, snowFt: 7000, legs: { up: 10, down: 0, fromCamp: false, floor: true } }).start, null);
  const pt = A.planTimes({ timing: { totalHrs: 10, recommendedStart: "4:00 AM from the trailhead" }, pitches: 0 });
  eq("the Planner reads a total-only timing as a whole day and its techH IS that total (the number the card splits)", [pt.publishedIsWholeDay, pt.techH], [true, 10]);
  const pk = A.planTimes({ timing: { totalHrs: 10, approachTimeHrs: 3, summitTimeHrs: 4, descentTimeHrs: 3 }, pitches: 0 });
  eq("...and a row with legs is NOT a whole day: it keeps its own legs", pk.publishedIsWholeDay, false);
  eq("the card counts a whole-day row back only on a single day and only where wholeDayLegs allows", /const wd = P\.publishedIsWholeDay && !fromCamp \? wholeDayLegs\(P\.techH, kind\) : null;/.test(card), true);
  eq("...every other whole-day row keeps the floor (no start)", /floor: P\.legsFloor \|\| P\.publishedIsWholeDay/.test(card), true);
  eq("...and says WHY: a whole-day figure is not 'only a minimum'", /P\.publishedIsWholeDay\s*\? \(fromCamp \? "No start time: this climb’s published time is one figure for the whole trip[^"]*"\s*: "No start time: this climb’s published time is one whole-day figure, with no split between the walk in and the climb/.test(card), true);
  eq("...while a row that really is a minimum still says so", /: "No start time: the Plan tab’s estimate for this climb is only a minimum/.test(card), true);
  eq("a start counted back from a whole-day total says the split is ASSUMED, and that it errs early", /legs\.wholeDay \? "\. The route publishes one whole-day time \(" \+ hrs\(legs\.wholeDay\) \+ "\) with no split, so the way up is counted as " \+ Math\.round\(LIMITS\.wholeDayUpShare \* 100\) \+ "% of it: a rule of thumb that errs early\./.test(card), true);
  eq("...and does not print a way-up time the route never published ('(8 h up)')", /\(legs\.wholeDay \? "" : " \(" \+ hrs\(legs\.up\) \+ " up\)"\)/.test(card), true);
}

/* ── 12. HOUR BY HOUR: every box names its OWN period, and the day's gust is one number everywhere ──
   Open-Meteo stamps hour T and means the reading AT T for temperature, wind and the freezing level, but
   the sum/probability/maximum of the hour BEFORE T for rain, snow, chance of precipitation and gusts
   (open-meteo.com/en/docs, 2026-10-08). One shared label would be wrong for half the boxes beside it.
   And the top "Gusts" tile counted DAYLIGHT hours while the summit forecast below it counted all 24
   (Rainier, live, 2026-10-08: 4 vs 13 mph and 17.7 vs 25.1 on two of seven days), so the owner saw two
   numbers for one thing. */
console.log("\n12. HOUR BY HOUR — each box names its own period; the day's gust is stated once, with its window");
{
  const card = fs.readFileSync(path.join(ROOT, "lib", "AlpineConditionsCard.jsx"), "utf8");
  const tiles = fs.readFileSync(path.join(ROOT, "lib", "HourTiles.jsx"), "utf8");
  const day = { hours: [0, 1, 2] }, fc = { utc_offset_seconds: 0, hourly: { time: [0, 3600, 7200], temperature_2m: [30, 40, 50], freezing_level_height: [9000, 9000, 9000], wind_gusts_10m: [10, 50, 20], is_day: [1, 0, 1], snowfall: [0, 0, 0], precipitation: [0, 0, 0] } };
  const sm = A.daySummary(fc, day);
  eq("the day's gust counts EVERY hour of the day (the summit forecast's own window): 50, the night hour included", sm.gust, 50);
  eq("...and the daylight maximum is kept beside it, so the card can state both: 20", sm.gustDay, 20);
  eq("the top tile says which window it is and prints the daylight figure under it", /\["Gusts, any hour", s\.gust != null \? uWind\(s\.gust\) : "—", s\.gust != null && s\.gustDay != null \? "daylight hours: " \+ uWind\(s\.gustDay\) : null\]/.test(card), true);
  eq("the wind FLAG says it is a daylight reading, because that is the window the flag is judged on", /case "wind": return "Summit gusts to " \+ uWind\(v\.gust\) \+ " in daylight";/.test(card), true);
  eq("the hour boxes for gusts and rain/snow carry the hour BEFORE the stamp (spanEnding)", /label="Gusts" when=\{spanEnding\(hr\)\}/.test(card) && /when=\{spanEnding\(hr\)\} value=\{sn != null && sn > 0/.test(card), true);
  eq("...and temperature, wind and the freezing level carry the reading AT the stamp", /label="Temperature" when=\{"at " \+ clockHr\(hr\)\}/.test(card) && /label="Wind" when=\{"at " \+ clockHr\(hr\)\}/.test(card) && /label="Freezing level" when=\{"at " \+ clockHr\(hr\)\}/.test(card), true);
  eq("the hour before 1 PM is '12–1 PM', and across noon and midnight it names both halves", /11 AM–12 PM/.test(tiles) && /11 PM–12 AM/.test(tiles), true);
  eq("no hour is ever labelled safe, and the card says so", !/label="[^"]*[Ss]afe/.test(card) && /no hour is marked safe/.test(card), true);
  eq("the section is mounted for the SELECTED day (keyed, so a new day resets the hour)", /<HourByHour key=\{day\.date\} fc=\{fc\} day=\{day\}/.test(card), true);
  eq("the alpine forecast fetch asks for the wind direction the hour box prints", /export function fetchAlpineForecast[\s\S]{0,900}wind_direction_10m/.test(fs.readFileSync(path.join(ROOT, "lib", "forecast.js"), "utf8")), true);
}

/* ── 13. SMOKE AND AIR QUALITY — the alpine card read none; a smoke day must flag, an unread day must not claim ──
   US AQI bands are the EPA's (101-150 sensitive groups, 151+ everyone). Open-Meteo's US AQI averages PM over
   the PRECEDING 24 h and the grid is ~45 km (11 km in Europe): a number for the area, never for the route. */
console.log("\n13. SMOKE AND AIR QUALITY — flagged on the EPA's bands, never read as clean when it was not read");
{
  const card = fs.readFileSync(path.join(ROOT, "lib", "AlpineConditionsCard.jsx"), "utf8");
  const off = -25200, base = Date.UTC(2026, 9, 8, 7, 0, 0) / 1000; // 00:00 local on 2026-10-08 at UTC-7
  const air = (aqis) => ({ utc_offset_seconds: off, hourly: { time: aqis.map((_, i) => base + i * 3600), us_aqi: aqis, pm2_5: aqis.map((a) => a / 3) } });
  const day1 = Array(24).fill(40), day2 = Array(24).fill(60);
  day1[15] = 160; day2[3] = 120;
  const a = air(day1.concat(day2));
  eq("the worst hour of the LOCAL day is found (160 at 3 PM), not the other day's 120", A.airDay(a, "2026-10-08").max, 160);
  eq("...and the next local day reads its own worst (120)", A.airDay(a, "2026-10-09").max, 120);
  eq("a day the forecast does not reach is NULL, not 0 and not 'good'", A.airDay(a, "2026-10-12"), null);
  eq("no series at all is NULL", A.airDay(null, "2026-10-08") === null && A.airDay({ hourly: {} }, "2026-10-08") === null, true);
  eq("AQI 100 flags nothing (the EPA's 'moderate' band)", A.smokeFlag({ max: 100, at: 0, pm: 9 }), null);
  eq("AQI 101-150 is a CAUTION", A.smokeFlag({ max: 120, at: 0, pm: 40 }).level, "caution");
  eq("AQI above 150 is a WARNING", A.smokeFlag({ max: 160, at: 0, pm: 60 }).level, "warn");
  eq("an unread day gets NO flag (no claim either way)", A.smokeFlag(null), null);
  eq("the EPA's word for 101-150 and 151-200", [A.aqiWord(120), A.aqiWord(160)], ["Unhealthy for sensitive groups", "Unhealthy"]);
  eq("the flag says it is the AREA's forecast and what it cannot see", /smoke aloft or pooled in a valley is not seen/.test(card), true);
  eq("a failed air read says smoke is NOT MEASURED and is not a clean-air reading, with a retry", /Couldn’t load air quality, so smoke is not measured\. This is not a clean-air reading\./.test(card) && /onClick=\{onRetry\}/.test(card), true);
  eq("a day beyond the forecast says smoke is not measured for it", /does not reach this day[^"]*so smoke is not measured for it/.test(card), true);
  eq("the card states the 24-hour averaging and the grid, so a late or missing plume is understood", /averaged over the preceding 24 hours/.test(card) && /about 45 km/.test(card), true);
  eq("the smoke flag joins the day's flags (and so the day chips' dots)", /if \(sf\) r = Object\.assign\(\{\}, r, \{ flags: r\.flags\.concat\(\[sf\]\) \}\);/.test(card), true);
}

/* ── 14. WEATHER ALERTS — the alpine card had none; an alert must land on the right day, and "none" must never be claimed unread ──
   Shapes below are the live response (api.weather.gov/alerts/active, 2026-10-08): a Blowing Dust Advisory had
   expires 07:15 and ends 19:00 the next day -- the MESSAGE expires hours before the EVENT ends, because it is
   due to be reissued. Reading `expires` would drop a live alert hours early. */
console.log("\n14. WEATHER ALERTS — each on the right local day, by its event window; unread is never 'none'");
{
  const card = fs.readFileSync(path.join(ROOT, "lib", "AlpineConditionsCard.jsx"), "utf8");
  const fcSrc2 = fs.readFileSync(path.join(ROOT, "lib", "forecast.js"), "utf8");
  const feat = (event, severity, onset, ends, expires, description) => ({ id: "urn:" + event, properties: { event, severity, urgency: "Expected", certainty: "Likely", onset, effective: onset, ends, expires, description } });
  const json = { features: [
    feat("Blowing Dust Advisory", "Moderate", "2026-10-09T12:00:00-07:00", "2026-10-09T19:00:00-07:00", "2026-10-09T07:15:00-07:00", "* WHAT...Patchy blowing dust expected, with\nvisibility dropping to one-quarter mile.\nWinds 15 to 25 mph.\n\n* WHERE...Coulee City"),
    feat("High Wind Warning", "Severe", "2026-10-08T15:00:00-07:00", "2026-10-09T05:00:00-07:00", "2026-10-09T05:00:00-07:00", null),
  ] };
  const al = A.normAlerts(json), off = -25200;
  eq("both alerts are read, and the WHAT line is kept whole across its line breaks, in the issuer's words", al[0].what, "Patchy blowing dust expected, with visibility dropping to one-quarter mile. Winds 15 to 25 mph.");
  eq("an alert with no description has no WHAT (nothing invented)", al[1].what, null);
  eq("the event window ends at `ends`, NOT at the earlier message `expires` (19:00 local, not 07:15)", al[0].end, Date.parse("2026-10-09T19:00:00-07:00"));
  eq("a day the event touches lists it: the dust advisory on 10-09", A.alertsForDay(al, "2026-10-09", off).map((a) => a.event).includes("Blowing Dust Advisory"), true);
  eq("...and a day it does not touch does not: 10-08 has only the wind warning", A.alertsForDay(al, "2026-10-08", off).map((a) => a.event), ["High Wind Warning"]);
  eq("the 07:15 expiry would have missed an afternoon query on 10-09 -- the event window does not", A.alertsForDay(al, "2026-10-09", off).length, 2);
  eq("most severe first", A.alertsForDay(al, "2026-10-09", off)[0].event, "High Wind Warning");
  eq("Severe is a WARNING; Moderate is a CAUTION; Minor and Unknown are cautions", [A.alertLevel({ severity: "Extreme" }), A.alertLevel({ severity: "Severe" }), A.alertLevel({ severity: "Moderate" }), A.alertLevel({ severity: "Minor" }), A.alertLevel({ severity: "Unknown" })], ["warn", "warn", "caution", "caution", "caution"]);
  eq("no alerts and no response are both []", [A.normAlerts({ features: [] }).length, A.normAlerts(null).length], [0, 0]);
  eq("outside the US the fetch resolves {outside:true} (HTTP 400), which the card words as NOT CHECKED", /r\.status === 400\) return \{ outside: true \}/.test(fcSrc2) && /Weather alerts are only checked for places in the United States\. Nothing was checked for this route\./.test(card), true);
  eq("a failed read is 'not measured' with a retry, never 'none'", /Couldn’t load weather alerts, so they are not measured\. This is not a report of none\./.test(card), true);
  eq("a quiet day says none is NOT an all-clear and that an alert covers a zone, not the route", /a day with none is not an all-clear/.test(card) && /covers a whole forecast zone, which can be much larger than the route/.test(card), true);
  eq("the alerts are cached for minutes, not the session (they are issued and cancelled within the hour)", /ALERT_TTL = 10 \* 60 \* 1000/.test(card), true);
  eq("each alert joins the day's flags, so the day chips show it", /key: "alert", level: alertLevel\(a\)/.test(card), true);
  eq("the card prints the alert's own prose verbatim and says so, in the units issued", /"As issued: " \+ a\.what/.test(card), true);
}

const FLOOR = 205;
if (ran < FLOOR) { console.log(`\nFAIL  only ${ran} assertion(s) ran against a floor of ${FLOOR}`); fail++; }
fs.rmSync(path.dirname(out), { recursive: true, force: true });
console.log(fail ? `\ncheck:alpine-conditions: ${fail} FAILURE(S)` : `\ncheck:alpine-conditions: ok — each discipline reads its own conditions, the start counts back from the Planner, and nothing claims what it did not read (${ran} assertions).`);
process.exit(fail ? 1 : 0);
