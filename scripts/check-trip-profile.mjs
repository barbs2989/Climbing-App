#!/usr/bin/env node
// check:trip-profile — the Plan tab's TRIP PROFILE is on every route walked to a summit, empty or not, and its
// legs are measured only from what the route records.
//
// Owner note, 2026-11-26: "Is trip profile on all routes that it should be on? Even if there's no data on it?
// If not add it and audit how one would edit and or add info on one." It was on 128 of 12,099 routes that mount
// it (a recorded track with the trailhead and summit pins on it), and drew NOTHING on the rest: no heading, no
// way to learn that the waypoint editor is what fills it. This pins, on synthetic routes:
//   1. a route with NO track whose waypoints carry published distances from the trailhead draws its legs, and
//      the legs add up to the route's own one-way distance (the split, not a second number);
//   2. its climb comes from the waypoints' own heights, and the legs add up to the route's stored gain;
//   3. a waypoint with no distance has no leg, and the card says how many;
//   4. an alpine route with no waypoints draws the TRIP PROFILE heading and an empty state that opens the
//      waypoint editor; a car-to-car route's empty state opens the timing editor instead;
//   5. a roadside ice line with no waypoints draws nothing (it has no legs to split);
//   6. the distances path never reads a coordinate: a waypoint list with no lat/lng still has legs.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(import.meta.url);
const j = p => JSON.stringify(path.join(ROOT, p));
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TripProfileCard from ${j("src/components/TripProfileCard.tsx")};
export { tripProfile } from ${j("lib/tripProfile.js")};
export { planTimes } from ${j("lib/planTimes.js")};
export { tripLegGeometry } from ${j("lib/tripLegs.js")};
export const render = (route, handlers) => renderToStaticMarkup(React.createElement(TripProfileCard, Object.assign({ route, calc: {} }, handlers || {})));
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-tripprofile-")), "bundle.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const A = require_(out);
const text = h => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ").trim();
const tp = r => A.tripProfile(r, A.planTimes(r, {}), A.tripLegGeometry(r), {});

let fail = 0, ran = 0;
const ok = (label, cond, got) => { ran++; if (!cond) fail++; console.log(`  ${cond ? "ok  " : "FAIL"} ${label}${cond ? "" : `  got: ${got}`}`); };

// A route with no recorded track: trailhead 0 mi / 3,000 ft, camp 4 mi / 6,000 ft, col 5 mi / 7,000 ft, summit 6 mi / 9,000 ft.
const wps = [
  { type: "Trailhead", name: "Lake Trailhead", lat: 47, lng: -121, elev: 3000, distMi: 0 },
  { type: "Camp", name: "High Camp", lat: 47.05, lng: -121, elev: 6000, distMi: 4 },
  { type: "Col", name: "The Notch", lat: 47.07, lng: -121, elev: 7000, distMi: 5 },
  { type: "Summit", name: "Top", lat: 47.08, lng: -121, elev: 9000, distMi: 6 },
];
const KM = 6 * 1.609344;
const base = { discipline: "alpine", name: "Synthetic", gainFt: 6000, gainM: 6000 / 3.28084, lossFt: 6000, lossM: 6000 / 3.28084, outingShape: "outback", distKm: KM, waypoints: wps, gpxPts: null, elevPts: null };

// 1-2.
const p = tp(base);
ok("no track + published distances: the profile has legs", !!p.legs && p.measuredBy === "distances", JSON.stringify(p.reason));
if (p.legs) {
  ok("three legs up, in distance order", p.legs.up.map(l => l.to.name).join(",") === "High Camp,The Notch,Top", p.legs.up.map(l => l.to.name).join(","));
  const km = p.legs.up.reduce((s, l) => s + l.km, 0);
  ok("the legs add up to the route's one-way distance", Math.abs(km - KM) < 1e-9, km);
  const g = p.legs.up.reduce((s, l) => s + l.gainFt, 0);
  ok("the climb splits the route's stored gain by the waypoints' heights", Math.abs(g - 6000) < 1e-6 && Math.abs(p.legs.up[0].gainFt - 3000) < 1e-6, `${g} / ${p.legs.up[0].gainFt}`);
  ok("the time up is planTimes()'s, split", Math.abs(p.legs.up.reduce((s, l) => s + l.timeH, 0) - A.planTimes(base, {}).totalH) < 1e-9, "");
}
const card = text(A.render(base, { onEditWaypoints: () => {} }));
ok("the card prints each leg by name", /Lake Trailhead → High Camp[^]*High Camp → The Notch[^]*The Notch → Top/.test(card), card);
ok("the card has the edit pencil for the waypoints", /Edit the waypoints that set the legs/.test(A.render(base, { onEditWaypoints: () => {} })), card);

// 3.
const gap = { ...base, waypoints: [...wps.slice(0, 2), { type: "Water", name: "Creek", lat: 47.06, lng: -121, elev: 6500 }, ...wps.slice(2)] };
ok("a waypoint with no distance has no leg, and the card says so", /1 waypoint has no distance from the trailhead/.test(text(A.render(gap))) && tp(gap).legs.up.length === 3, text(A.render(gap)));

// 4.
const none = { ...base, waypoints: [] };
const nh = A.render(none, { onEditWaypoints: () => {}, onEditTiming: () => {} });
ok("no waypoints: the TRIP PROFILE heading still draws", /TRIP PROFILE/.test(text(nh)) && /data-section-head/.test(nh), text(nh));
ok("...with an empty state that offers the waypoint editor", /No leg-by-leg profile yet/.test(text(nh)) && /Add waypoints and distances/.test(text(nh)), text(nh));
const c2c = { ...base, timing: { totalHrs: 12 } };
const c2cP = tp(c2c);
const c2cTxt = text(A.render(c2c, { onEditWaypoints: () => {}, onEditTiming: () => {} }));
ok("car to car: the legs still draw, with distance and climb", !!c2cP.legs && c2cP.legs.up.length === 3 && c2cP.wholeDayH > 0 && c2cP.legs.up.every(l => l.timeH == null), JSON.stringify(c2cP.reason || c2cP.wholeDayH));
ok("...with no Time per leg, and the whole-day time stated", !/Time/.test(c2cTxt) && /known only for the whole day, about 12\.0 hr car to car/.test(c2cTxt), c2cTxt);

// 5.
const ice = { ...none, discipline: "ice", grade: "WI4", gainFt: null, gainM: null, lossFt: null, lossM: null };
ok("a roadside ice line with no waypoints draws nothing", A.render(ice, { onEditWaypoints: () => {} }) === "", A.render(ice));

// 7. A summit with no stated distance sits at the route's own one-way distance; a stated pin past it refuses.
const noTopDist = { ...base, waypoints: wps.map(w => (w.type === "Summit" ? { ...w, distMi: null } : w)) };
const nt = tp(noTopDist);
ok("a summit with no distance sits at the route's one-way figure, and the legs still split", !!nt.legs && nt.legs.up.length === 3 && Math.abs(nt.legs.up.reduce((s, l) => s + l.km, 0) - KM) < 1e-9, nt.reason);
const clash = { ...noTopDist, distKm: 4.5 * 1.609344 };
ok("...but not when a stated waypoint lies past that figure (the two records disagree)", !tp(clash).legs, JSON.stringify(tp(clash).legs && tp(clash).legs.up.map(l => l.to.name)));

// 8. No Trailhead waypoint, but stated distances: the legs start at the route's own trailhead at 0.
const noTh = { ...base, waypoints: wps.slice(1), approachLogistics: { trailhead: "Lake Road End" } };
const nth = tp(noTh);
ok("no trailhead waypoint: the legs start at the route's trailhead, at 0", !!nth.legs && nth.legs.up.length === 3 && nth.legs.up[0].from.name === "Lake Road End", nth.reason || (nth.legs && nth.legs.up[0].from.name));

// 6.
const nocoord = { ...base, waypoints: wps.map(w => ({ ...w, lat: null, lng: null })) };
ok("the distances path needs no coordinate", !!tp(nocoord).legs && tp(nocoord).legs.up.length === 3, tp(nocoord).reason);

console.log(`\ncheck:trip-profile: ${fail ? `${fail} of ${ran} FAILED` : `ok — the trip profile draws on every mountain route, and its legs split the route's own figures (${ran} assertions).`}`);
process.exit(fail ? 1 : 0);
