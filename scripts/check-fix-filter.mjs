#!/usr/bin/env node
// The "you are here" dot (lib/fixFilter.js, used by useFollowMe on every map) -- owner 2026-11-14,
// "where you are on a map needs to be more accurate":
//   1. acceptFix: a tight reading always counts, a stray coarse one between GPS readings does not,
//      a stale or impossible-to-reconcile one does, and a late (older) reading never pulls it back;
//   2. smoothFix: standing still, the dot settles nearer the truth than the raw readings and stops
//      hopping; walking, it keeps up; a coarse reading barely moves a GPS-grade estimate; a jump
//      no walk explains (a car, a wrong first fix) resets it;
//   3. the hook still uses both, and frames a coarse first fix instead of zooming in on it.
import { readFileSync } from "node:fs";
import { acceptFix, smoothFix, fixDistM, FIX_STALE_MS, FIX_GOOD_M } from "../lib/fixFilter.js";

let bad = 0;
const ok = (cond, what) => { if (!cond) { bad++; console.error("✗ " + what); } else console.log("✓ " + what); };

const LAT = 40.0, LNG = -105.3;
const M_LAT = 1 / 111320, M_LNG = 1 / (111320 * Math.cos(LAT * Math.PI / 180));
const at = (nM, eM, acc, t) => ({ lat: LAT + nM * M_LAT, lng: LNG + eM * M_LNG, acc, t });
const home = { lat: LAT, lng: LNG };

// ---- 1. acceptFix ----------------------------------------------------------------------------
const gps = at(0, 0, 8, 10_000);
ok(acceptFix(null, gps), "the first reading counts");
ok(acceptFix(gps, at(3, 0, 12, 11_000)), "a GPS-grade reading a little worse than the last still counts");
ok(!acceptFix(gps, at(150, 0, 400, 12_000)), "a stray tower fix between GPS readings is ignored");
ok(acceptFix(gps, at(150, 0, 400, 10_000 + FIX_STALE_MS + 1)), "a coarse reading counts once the GPS one is stale");
ok(acceptFix(gps, at(3000, 0, 400, 12_000)), "a coarse reading that cannot be reconciled (you moved) counts");
ok(!acceptFix(gps, at(1, 0, 5, 9_000)), "a reading stamped older than the one shown is dropped");
ok(!acceptFix(gps, { lat: NaN, lng: LNG, acc: 5, t: 12_000 }), "a broken reading is dropped");

// ---- 2. smoothFix ----------------------------------------------------------------------------
// Standing still for a minute: deterministic +-noise readings around the true spot.
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
let est = null, rawErr = 0, estErr = 0, rawHop = 0, estHop = 0, prevRaw = null, prevEst = null;
for (let i = 0; i < 60; i++) {
  const f = at(rnd() * 30, rnd() * 30, 10, 20_000 + i * 1000);
  est = smoothFix(est, f);
  if (i >= 10) {
    rawErr += fixDistM(home, f); estErr += fixDistM(home, est);
    rawHop += fixDistM(prevRaw, f); estHop += fixDistM(prevEst, est);
  }
  prevRaw = f; prevEst = est;
}
ok(estErr < rawErr * 0.75, "standing still, the dot sits nearer the truth than the raw readings (" + (estErr / 50).toFixed(1) + " m vs " + (rawErr / 50).toFixed(1) + " m)");
ok(estHop < rawHop * 0.5, "standing still, the dot hops less than half as far between readings (" + (estHop / 50).toFixed(1) + " m vs " + (rawHop / 50).toFixed(1) + " m)");

// Walking north at 1.4 m/s for a minute with clean readings: the dot keeps up.
est = null;
for (let i = 0; i <= 60; i++) est = smoothFix(est, at(i * 1.4, 0, 8, 100_000 + i * 1000));
ok(fixDistM(est, at(60 * 1.4, 0, 8, 0)) < 15, "walking, the dot stays within 15 m of you (" + fixDistM(est, at(84, 0, 8, 0)).toFixed(1) + " m behind)");

// A coarse reading after a GPS-grade estimate barely moves it.
est = smoothFix(null, at(0, 0, 6, 200_000));
const nudged = smoothFix(est, at(200, 0, 500, 200_000 + FIX_STALE_MS + 1000));
ok(fixDistM(est, nudged) < 25, "a stale-time tower fix 200 m off moves a GPS estimate under 25 m (" + fixDistM(est, nudged).toFixed(1) + " m)");

// A coarse FIRST fix, then GPS: the dot goes to the GPS reading.
est = smoothFix(null, at(600, 400, 900, 300_000));
est = smoothFix(est, at(0, 0, 8, 302_000));
ok(fixDistM(home, est) < 5, "after a coarse first fix, the first GPS reading takes over (" + fixDistM(home, est).toFixed(1) + " m off)");

// Driving: a jump no walk explains resets to the new reading.
est = smoothFix(null, at(0, 0, 8, 400_000));
est = smoothFix(est, at(0, 500, 8, 402_000));
ok(fixDistM(at(0, 500, 8, 0), est) < 1, "a 500 m jump in 2 s resets the dot to the new reading");

// A reading with no accuracy figure is loose, not exact.
est = smoothFix(null, at(0, 0, 6, 500_000));
const noAcc = smoothFix(est, { ...at(40, 0, NaN, 501_000) });
ok(fixDistM(est, noAcc) < 5, "a reading with no accuracy figure barely moves a GPS estimate");

ok(FIX_GOOD_M >= 50 && FIX_GOOD_M <= 150, "FIX_GOOD_M is a GPS-grade threshold (" + FIX_GOOD_M + " m)");

// ---- 3. the hook still wires it --------------------------------------------------------------
const kit = readFileSync(new URL("../lib/mapKit.jsx", import.meta.url), "utf8");
ok(/smoothFix\(estRef\.current, fix\)/.test(kit), "useFollowMe draws the smoothed estimate");
ok(/acceptFix\(curRef\.current, fix\)/.test(kit), "useFollowMe still gates readings with acceptFix");
ok(/fix\.acc > FIX_GOOD_M|acc > FIX_GOOD_M/.test(kit) && /fitBounds\(ringRef\.current\.getBounds\(\)/.test(kit), "a coarse first fix frames its ring instead of zooming in");
ok(/enableHighAccuracy: true, maximumAge: 0/.test(kit), "the watch still asks for fresh GPS readings");

if (bad) { console.error("\n" + bad + " check(s) failed"); process.exit(1); }
console.log("\ncheck:fix-filter ok");
