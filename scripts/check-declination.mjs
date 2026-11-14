#!/usr/bin/env node
// check:declination — THE BASE-OF-THE-CLIMB ARROW POINTS AT TRUE NORTH, NOT MAGNETIC.
//
// *Point the way* (BaseCheckinPanel, RouteDetail.jsx) turns an arrow with the phone toward the base of
// the climb. A browser's compass is MAGNETIC: Safari fills webkitCompassHeading from Core Location's
// magneticHeading and corrects nothing (WebKit's WebCoreMotionManager.mm), and Android's absolute
// orientation follows the geomagnetic field. The bearing to the base (bearingDeg) is TRUE. So the
// heading is corrected by the local declination from lib/declination.js, a World Magnetic Model
// evaluator. In the Cascades that is ~15°: left out, the arrow points at the wrong line from 100 m,
// and it looks exactly like a right one.
//
// This guard EXECUTES the model, because a plausible rewrite (a sign flipped, geodetic latitude used
// where geocentric belongs, a Legendre term dropped) is valid JS that returns a confident number. It
// checks NOAA's own published test values for WMM2025 (WMM2025_TestValues.txt, shipped with the
// coefficient file: 100 points, 2025.0–2029.5, every latitude band), each within TOLERANCE_DEG of
// the declination NOAA prints to two decimals. It then executes the heading helpers in
// lib/baseCheckin.js on constructed events: an iPhone's magnetic heading turns true by adding the
// declination, a non-absolute `alpha` is refused, and the arrow says "Straight ahead" when it should.
//
// Static — no browser, no database — so it sits in `npm run build`.
import { declinationDeg } from "../lib/declination.js";
import { headingFromOrientation, relativeBearing, turnWord, smoothHeading, bearingDeg } from "../lib/baseCheckin.js";

const TOLERANCE_DEG = 0.01; // NOAA prints two decimals; rounding alone is 0.005.
// year, altitude km, lat, lng, declination (NOAA WMM2025 test values).
const NOAA = `
2025.0 28 89 -121 -99.77|2025.0 48 80 -96 -29.91|2025.0 54 82 87 54.89|2025.0 65 43 93 0.50|2025.0 51 -33 109 -5.49
2025.0 39 -59 -8 -15.75|2025.0 3 -50 -103 27.96|2025.0 94 -29 -110 15.74|2025.0 66 14 143 -0.19|2025.0 18 0 21 1.29
2025.5 6 -36 -137 20.28|2025.5 63 26 81 0.51|2025.5 69 38 -144 12.93|2025.5 50 -70 -133 57.21|2025.5 8 -52 -75 14.91
2025.5 8 -66 17 -33.14|2025.5 22 -37 140 9.28|2025.5 40 -12 -129 10.76|2025.5 44 33 -118 11.10|2025.5 50 -81 -67 28.13
2026.0 74 -57 3 -22.51|2026.0 46 -24 -122 14.01|2026.0 69 23 63 1.17|2026.0 33 -3 -147 9.71|2026.0 47 -72 -22 -6.32
2026.0 62 -14 99 -1.43|2026.0 83 86 -46 -30.61|2026.0 82 -64 87 -81.74|2026.0 34 -19 43 -14.98|2026.0 56 -81 40 -59.77
2026.5 14 0 80 -3.10|2026.5 12 -82 -68 29.79|2026.5 44 -46 -42 -11.36|2026.5 43 17 52 1.19|2026.5 64 10 78 -1.53
2026.5 12 33 -145 11.96|2026.5 12 -79 115 -137.58|2026.5 14 -33 -114 18.12|2026.5 19 29 66 2.24|2026.5 86 -11 167 10.24
2027.0 37 -66 -5 -17.22|2027.0 67 72 -115 13.73|2027.0 44 22 174 6.46|2027.0 54 54 178 0.63|2027.0 57 -43 50 -48.27
2027.0 44 -43 -111 24.31|2027.0 12 -63 178 57.87|2027.0 38 27 -169 8.48|2027.0 61 59 -77 -16.48|2027.0 67 -47 -32 -13.52
2027.5 8 62 53 19.39|2027.5 77 -68 -7 -16.19|2027.5 98 -5 159 7.79|2027.5 34 -29 -107 15.64|2027.5 60 27 65 1.85
2027.5 73 -72 95 -102.64|2027.5 96 -46 -85 17.93|2027.5 0 -13 -59 -17.49|2027.5 16 66 -178 0.37|2027.5 72 -87 38 -65.44
2028.0 49 20 167 5.10|2028.0 71 5 -13 -6.47|2028.0 95 14 65 -0.51|2028.0 86 -85 -79 41.09|2028.0 30 -36 -64 -4.65
2028.0 75 79 125 -18.59|2028.0 21 6 -32 -14.34|2028.0 1 -76 -75 29.87|2028.0 45 -46 -41 -11.68|2028.0 11 -22 -21 -23.24
2028.5 28 54 -120 15.43|2028.5 68 -58 156 41.57|2028.5 39 -65 -88 29.45|2028.5 27 -23 81 -13.27|2028.5 11 34 0 1.57
2028.5 72 -62 65 -67.87|2028.5 55 86 70 67.64|2028.5 59 32 163 0.15|2028.5 65 48 148 -9.55|2028.5 95 30 28 4.56
2029.0 95 -60 -59 8.58|2029.0 95 -70 42 -55.06|2029.0 50 87 -154 -73.48|2029.0 58 32 19 4.11|2029.0 57 34 -13 -1.89
2029.0 38 -76 49 -64.28|2029.0 49 -50 -179 32.11|2029.0 90 -55 -171 38.65|2029.0 41 42 -19 -4.13|2029.0 19 46 -22 -5.65
2029.5 31 13 -132 9.04|2029.5 93 -2 158 7.09|2029.5 51 -76 40 -56.34|2029.5 64 22 -132 10.23|2029.5 26 -65 55 -63.48
2029.5 66 -21 32 -14.63|2029.5 18 9 -172 9.24|2029.5 63 88 26 36.52|2029.5 33 17 5 0.89|2029.5 77 -18 138 4.45`
  .trim().split(/[|\n]/).map((r) => r.trim().split(/\s+/).map(Number));

const fails = [];
let worst = 0;
for (const [year, altKm, lat, lng, want] of NOAA) {
  const got = declinationDeg(lat, lng, { year, altKm });
  const err = Math.abs(got - want);
  worst = Math.max(worst, err);
  if (!(err <= TOLERANCE_DEG)) fails.push(`  ${year} ${lat},${lng} alt ${altKm} km: NOAA ${want.toFixed(2)}°, model ${Number.isFinite(got) ? got.toFixed(3) : got}°`);
}
if (NOAA.length !== 100) fails.push(`  expected NOAA's 100 test values, read ${NOAA.length}`);

const close = (a, b) => Math.abs(((a - b + 540) % 360) - 180) < 1e-9;
const expect = (ok, what) => { if (!ok) fails.push("  " + what); };
// An iPhone pointing at magnetic north (webkitCompassHeading 0) in a 15°E declination faces 15° true.
const ios = headingFromOrientation({ webkitCompassHeading: 0, webkitCompassAccuracy: 10, alpha: 123 }, 0, 15);
expect(ios && close(ios.heading, 15) && ios.accuracy === 10, "iOS: magnetic 0° + 15°E declination must read 15° true (got " + JSON.stringify(ios) + ")");
// Android's absolute alpha turns counter-clockwise: alpha 90 means the top of the phone faces west (270°).
const andr = headingFromOrientation({ absolute: true, alpha: 90 }, 0, 0);
expect(andr && close(andr.heading, 270), "Android: absolute alpha 90 must read 270° (got " + JSON.stringify(andr) + ")");
// Held sideways (screen angle 90), the top of the screen is 90° clockwise of the top of the phone.
const side = headingFromOrientation({ absolute: true, alpha: 0 }, 90, 0);
expect(side && close(side.heading, 90), "screen angle 90 must add 90° (got " + JSON.stringify(side) + ")");
// A relative alpha is measured from wherever the phone faced when listening began: never a compass.
expect(headingFromOrientation({ absolute: false, alpha: 40 }, 0, 0) === null, "a non-absolute alpha must be refused");
expect(headingFromOrientation({ webkitCompassHeading: -1 }, 0, 0) === null, "an uncalibrated iOS heading (-1) must be refused");
expect(turnWord(relativeBearing(100, 95)) === "Straight ahead", "5° off must read Straight ahead");
expect(turnWord(relativeBearing(10, 280)) === "To your right", "base at 10° facing 280° must be To your right");
expect(turnWord(relativeBearing(0, 180)) === "Behind you", "base at 0° facing 180° must be Behind you");
expect(close(smoothHeading(359, 1, 0.5), 0), "smoothing 359° and 1° must give 0°, not 180°");
expect(Math.round(bearingDeg({ lat: 48, lng: -121 }, { lat: 48.001, lng: -121 })) === 0, "bearingDeg due north must be 0°");
// The Cascades check the comment above promises: Washington's declination is ~15°E.
const wa = declinationDeg(48.5, -121.4, { year: 2026.8 });
expect(wa > 13 && wa < 17, "North Cascades declination must be ~15°E (got " + wa.toFixed(2) + ")");

if (fails.length) {
  console.error("check:declination FAILED — the base arrow would point the wrong way:\n" + fails.join("\n"));
  process.exit(1);
}
console.log(`check:declination: ${NOAA.length} NOAA WMM2025 test values within ${TOLERANCE_DEG}° (worst ${worst.toFixed(4)}°); heading helpers OK.`);
