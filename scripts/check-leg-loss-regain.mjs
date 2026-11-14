#!/usr/bin/env node
// check:leg-loss-regain — the trip-leg cards print the DOWNHILL on the way up and the UPHILL on the way back.
//
// Owner, 2026-11-14: "mt goode northeast buttress has a pretty big descent on the approach, but the stats
// don't show that." The leg cards printed one direction per leg (Gain up, Drop down), so the ~2,200 ft Bridge
// Creek drop on Goode's approach, and the climb back out of it, appeared nowhere. measuredLegClimb()
// (lib/tripLegs.js) measures both from the route's recorded track heights. This pins, on synthetic routes:
//   1. an out-and-back whose approach drops 1,400 ft shows "Loss ↓ 1,400 ft" up and "Regain ↑ 1,400 ft" down;
//   2. the DESCENT strip carries the same Regain;
//   3. a loop's TRAILHEAD TO SUMMIT gain is the measured leg, not the whole-outing gain, which the note keeps;
//   4. wiggles under 10 m are noise, and a route with no track prints no Loss/Regain at all (nothing invented);
//   5. a scrambling route's stored gain prints (scrambling was missing from tripLegGeometry's list).
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
import SummitLegsCard from ${j("src/components/SummitLegsCard.tsx")};
import DescentLegStrip from ${j("src/components/DescentLegStrip.tsx")};
export { measuredLegClimb, climbAlong } from ${j("lib/tripLegs.js")};
export const render = (which, route) => renderToStaticMarkup(React.createElement(which === "up" ? SummitLegsCard : DescentLegStrip, { route, calc: {} }));
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-legloss-")), "bundle.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const A = require_(out);
const text = h => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

let fail = 0, ran = 0;
const ok = (label, cond, got) => { ran++; if (!cond) fail++; console.log(`  ${cond ? "ok  " : "FAIL"} ${label}${cond ? "" : `  got: ${got}`}`); };

// A track going north from the trailhead: 4,400 ft -> down to 3,000 -> up to the 9,000 ft summit.
const LAT0 = 47, LNG = -121, STEP = 0.002; // ~220 m per point
const heightsUp = [];
for (let h = 4400; h > 3000; h -= 100) heightsUp.push(h);
for (let h = 3000; h <= 9000; h += 200) heightsUp.push(h);
const upPts = heightsUp.map((_, i) => [LAT0 + i * STEP, LNG]);
const summit = upPts[upPts.length - 1];
const pins = [
  { type: "Trailhead", name: "TH", lat: LAT0, lng: LNG, elev: 4400 },
  { type: "Summit", name: "Top", lat: summit[0], lng: summit[1], elev: 9000 },
];
const base = { discipline: "alpine", name: "Synthetic", gainFt: 6000, gainM: 6000 / 3.28084, lossFt: 6000, lossM: 6000 / 3.28084, waypoints: pins };

// 1-2. Out-and-back, round-trip track.
const rt = { ...base, outingShape: "outback", distKm: 7, gpxPts: [...upPts, ...upPts.slice(0, -1).reverse()], elevPts: [...heightsUp, ...heightsUp.slice(0, -1).reverse()] };
const m = A.measuredLegClimb(rt);
ok("measured up leg: +6,000 / -1,400", m && m.up.gain === 6000 && m.up.loss === 1400, JSON.stringify(m));
ok("measured way home walks the track back: +1,400 / -6,000", m && m.down && m.down.gain === 1400 && m.down.loss === 6000 && m.downBy === "track", JSON.stringify(m));
const card = text(A.render("up", rt));
ok("TRAILHEAD TO SUMMIT prints the approach's Loss", /TRAILHEAD TO SUMMIT[^]*↓ 1,400 ft Loss[^]*SUMMIT TO TRAILHEAD/.test(card), card);
ok("SUMMIT TO TRAILHEAD prints the Regain", /SUMMIT TO TRAILHEAD[^]*↑ 1,400 ft Regain/.test(card), card);
ok("the card says where Loss and Regain come from", /measured on the route.s recorded track/.test(card), card);
const strip = text(A.render("down", rt));
ok("the DESCENT strip carries the same Regain", /↑ 1,400 ft Regain/.test(strip), strip);

// Ascent-only track of an out-and-back: the way home is the same line reversed.
const asc = { ...rt, gpxPts: upPts, elevPts: heightsUp };
const ma = A.measuredLegClimb(asc);
ok("ascent-only track: way home is the line reversed", ma && ma.down && ma.down.gain === 1400 && ma.down.loss === 6000 && ma.downBy === "reversed", JSON.stringify(ma));

// 3. A loop whose stored gain is the whole outing.
const loop = { ...rt, outingShape: "loop", gainFt: 10700, gainM: 10700 / 3.28084, lossFt: 10700, lossM: 10700 / 3.28084, distKm: 30 };
const lc = text(A.render("up", loop));
ok("loop: TRAILHEAD TO SUMMIT gain is the measured leg (6,000), not the outing", /TRAILHEAD TO SUMMIT ↑ 6,000 ft Gain/.test(lc), lc);
ok("loop: the note keeps the whole outing's gain", /whole outing gains 10,700 ft/.test(lc), lc);

// 4. Noise and absence.
ok("wiggles under 10 m are not counted", JSON.stringify(A.climbAlong([1000, 1020, 1000, 1025, 1003, 1500])) === JSON.stringify({ gain: 500, loss: 0 }), JSON.stringify(A.climbAlong([1000, 1020, 1000, 1025, 1003, 1500])));
const none = { ...base, outingShape: "outback", distKm: 7, gpxPts: null, elevPts: null };
ok("no track: measuredLegClimb is null", A.measuredLegClimb(none) === null, "");
const nc = text(A.render("up", none));
ok("no track: no Loss or Regain is printed", !/Loss|Regain/.test(nc), nc);
const noH = { ...rt, elevPts: null };
ok("track without heights: nothing measured", A.measuredLegClimb(noH) === null, "");

// 5. Scrambling prints its gain.
const scr = { ...none, discipline: "scrambling", gainFt: 3200, gainM: 3200 / 3.28084, lossFt: 2900, lossM: 2900 / 3.28084 };
const sc = text(A.render("up", scr));
ok("a scramble prints its stored gain", /TRAILHEAD TO SUMMIT ↑ 3,200 ft Gain/.test(sc), sc);

console.log(`\ncheck:leg-loss-regain: ${fail ? `${fail} of ${ran} FAILED` : `ok — approach loss and return regain are measured from the track and printed on the leg cards (${ran} assertions).`}`);
process.exit(fail ? 1 : 0);
