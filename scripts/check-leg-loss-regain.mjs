#!/usr/bin/env node
// check:leg-loss-regain — the trip-leg cards print the DOWNHILL on the way up and the UPHILL on the way back,
// from PUBLISHED figures only.
//
// Owner, 2026-11-14: "mt goode northeast buttress has a pretty big descent on the approach, but the stats
// don't show that", then "i dont want to have to do any of our own math, all the information should be
// online". PR #3352 measured both on the recorded track's heights; that was replaced the same day by
// routes.approach_loss_ft / return_gain_ft (0449), which the research pipeline writes with their sources in
// route_field_evidence. publishedLegClimb() (lib/tripLegs.js) only reads them. This pins, on synthetic routes:
//   1. a route with a published approach loss and return regain prints "Loss" up and "Regain" down;
//   2. the DESCENT strip carries the same Regain;
//   3. a route whose recorded track drops and climbs, but has NO published figure, prints neither —
//      nothing is measured or computed by the app;
//   4. a loop's whole-outing gain is not printed as the TRAILHEAD TO SUMMIT leg's gain; the note states it;
//   5. a scrambling route's stored gain prints (scrambling was missing from tripLegGeometry's list);
//   6. no leg card or its helper reads the track heights for a climb figure.
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
export { publishedLegClimb } from ${j("lib/tripLegs.js")};
export const render = (which, route) => renderToStaticMarkup(React.createElement(which === "up" ? SummitLegsCard : DescentLegStrip, { route, calc: {} }));
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-legloss-")), "bundle.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true, format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const A = require_(out);
const text = h => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

let fail = 0, ran = 0;
const ok = (label, cond, got) => { ran++; if (!cond) fail++; console.log(`  ${cond ? "ok  " : "FAIL"} ${label}${cond ? "" : `  got: ${got}`}`); };

// A recorded track going north from the trailhead: 4,400 ft -> down to 3,000 -> up to the 9,000 ft summit.
const LAT0 = 47, LNG = -121, STEP = 0.002;
const heightsUp = [];
for (let h = 4400; h > 3000; h -= 100) heightsUp.push(h);
for (let h = 3000; h <= 9000; h += 200) heightsUp.push(h);
const upPts = heightsUp.map((_, i) => [LAT0 + i * STEP, LNG]);
const summit = upPts[upPts.length - 1];
const pins = [
  { type: "Trailhead", name: "TH", lat: LAT0, lng: LNG, elev: 4400 },
  { type: "Summit", name: "Top", lat: summit[0], lng: summit[1], elev: 9000 },
];
const base = { discipline: "alpine", name: "Synthetic", gainFt: 6000, gainM: 6000 / 3.28084, lossFt: 6000, lossM: 6000 / 3.28084, waypoints: pins, outingShape: "outback", distKm: 7,
  gpxPts: [...upPts, ...upPts.slice(0, -1).reverse()], elevPts: [...heightsUp, ...heightsUp.slice(0, -1).reverse()] };

// 1-2. Published figures print.
const pub = { ...base, approachLossFt: 1600, returnGainFt: 1600 };
ok("publishedLegClimb reads the two stored columns", JSON.stringify(A.publishedLegClimb(pub)) === JSON.stringify({ upLoss: 1600, downGain: 1600 }), JSON.stringify(A.publishedLegClimb(pub)));
const card = text(A.render("up", pub));
ok("TRAILHEAD TO SUMMIT prints the published Loss", /TRAILHEAD TO SUMMIT[^]*↓ 1,600 ft Loss[^]*SUMMIT TO TRAILHEAD/.test(card), card);
ok("SUMMIT TO TRAILHEAD prints the published Regain", /SUMMIT TO TRAILHEAD[^]*↑ 1,600 ft Regain/.test(card), card);
ok("the card says what Loss and Regain mean", /Loss is the downhill on the way up, regain the uphill on the way back/.test(card), card);
ok("the card never claims to have measured them", !/measured/.test(card), card);
const strip = text(A.render("down", pub));
ok("the DESCENT strip carries the same Regain", /↑ 1,600 ft Regain/.test(strip), strip);

// 3. A track that drops 1,400 ft on the way in, but no published figure: nothing printed.
const bare = text(A.render("up", base));
ok("track heights alone print no Loss or Regain", !/Loss|Regain/.test(bare), bare);
ok("...and the DESCENT strip no Regain", !/Regain/.test(text(A.render("down", base))), text(A.render("down", base)));
ok("publishedLegClimb ignores the track", JSON.stringify(A.publishedLegClimb(base)) === JSON.stringify({ upLoss: null, downGain: null }), JSON.stringify(A.publishedLegClimb(base)));
ok("a stated 0 prints nothing", !/Loss|Regain/.test(text(A.render("up", { ...base, approachLossFt: 0, returnGainFt: 0 }))), "");

// 4. A loop whose stored gain is the whole outing.
const loop = { ...base, outingShape: "loop", gainFt: 10700, gainM: 10700 / 3.28084, lossFt: 10700, lossM: 10700 / 3.28084, distKm: 30 };
const lc = text(A.render("up", loop));
ok("loop: the whole outing's gain is not printed as the leg's", !/TRAILHEAD TO SUMMIT ↑ 10,700 ft Gain/.test(lc), lc);
ok("loop: the note states the whole outing's gain", /whole outing gains 10,700 ft/.test(lc), lc);

// 5. Scrambling prints its gain.
const scr = { ...base, gpxPts: null, elevPts: null, discipline: "scrambling", gainFt: 3200, gainM: 3200 / 3.28084, lossFt: 2900, lossM: 2900 / 3.28084 };
ok("a scramble prints its stored gain", /TRAILHEAD TO SUMMIT ↑ 3,200 ft Gain/.test(text(A.render("up", scr))), text(A.render("up", scr)));

// 6. Source: the helper and the cards never read track heights for a climb figure.
for (const f of ["lib/tripLegs.js", "src/components/SummitLegsCard.tsx", "src/components/DescentLegStrip.tsx"]) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\/\*[^]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  ok(`${f} does not read elevPts or measure a track`, !/elevPts|climbAlong|measuredLegClimb|recordedTrackPts/.test(src), f);
}

console.log(`\ncheck:leg-loss-regain: ${fail ? `${fail} of ${ran} FAILED` : `ok — the leg cards print only the published approach loss and return regain (${ran} assertions).`}`);
process.exit(fail ? 1 : 0);
