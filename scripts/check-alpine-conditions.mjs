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
export { CRAG_SCORE_DISCIPLINES, monthlyClimate } from ${JSON.stringify(path.join(ROOT, "lib", "conditionsScore.js"))};
export { fetchAlpineClimate } from ${JSON.stringify(path.join(ROOT, "lib", "forecast.js"))};
export { __set_UNITS, tickTypesFor, NONCOMPLETION_TICKS } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
export { inGeometry, zoneFor, avyReading, DANGER_NAME } from ${JSON.stringify(path.join(ROOT, "lib", "avalanche.js"))};
export { nearestStation, kmBetween, snowReading } from ${JSON.stringify(path.join(ROOT, "lib", "snotel.js"))};
export { recentOutcomes } from ${JSON.stringify(path.join(ROOT, "lib", "AlpineConditionsCard.jsx"))};
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
const code = card.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
eq("no provider is named on screen (comments aside)", code.match(/NWAC|avalanche\.org|SNOTEL|NRCS|CAIC|USDA/g), null);

const FLOOR = 85;
if (ran < FLOOR) { console.log(`\nFAIL  only ${ran} assertion(s) ran against a floor of ${FLOOR}`); fail++; }
fs.rmSync(path.dirname(out), { recursive: true, force: true });
console.log(fail ? `\ncheck:alpine-conditions: ${fail} FAILURE(S)` : `\ncheck:alpine-conditions: ok — each discipline reads its own conditions, the start counts back from the Planner, and nothing claims what it did not read (${ran} assertions).`);
process.exit(fail ? 1 : 0);
