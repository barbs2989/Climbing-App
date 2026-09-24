// Is moving `boxGrid` out of audit-waypoint-elevations.mjs and into scripts/lib/ground-box.mjs
// behaviour-neutral?
//
// The whole point of the move is that the arithmetic is shared rather than written twice, and the
// whole risk is that "shared" quietly means "slightly different". A textual diff cannot settle it:
// the signature changed on purpose (it takes METRES now, so the type -> slop policy stays in the
// audit that owns it), so the two bodies do not look alike even where they agree.
//
// So: run BOTH. The reference is lifted from git rather than retyped — a retyped copy agrees with
// itself whatever the original did, which is the entire question — and both run over constructed
// coordinates, so this needs no network and no database and is deterministic.
//
// It also pins `roundingSlack` and `boxAdmits`, which are NEW rather than moved, on the six live
// findings' numbers. Those have no git-side reference, so the assertions are stated outright.
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { boxGrid, dpOf, roundingSlack, boxAdmits } from "../lib/ground-box.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = process.argv.find(a => a.startsWith("--base="))?.split("=")[1] || "origin/main";

// --- lift the pre-change implementation out of git, never a retyped copy --------------------
const before = execFileSync("git", ["show", `${BASE}:scripts/audit-waypoint-elevations.mjs`],
  { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const m = before.match(/function boxGrid\(lat, lng, type\) \{[\s\S]*?\n\}/);
if (!m) { console.error(`ANCHOR LOST: ${BASE} has no \`function boxGrid(lat, lng, type)\` — re-point this, do not delete it.`); process.exit(2); }
const dp = before.match(/const dpOf = v => \{[^\n]*\};/);
if (!dp) { console.error(`ANCHOR LOST: ${BASE} has no \`const dpOf\`.`); process.exit(2); }
const slop = before.match(/const SLOP_M = [^\n]*;/);
if (!slop) { console.error(`ANCHOR LOST: ${BASE} has no \`const SLOP_M\`.`); process.exit(2); }

const oldGrid = new Function(`${dp[0]}\n${slop[0]}\n${m[0]}\nreturn boxGrid;`)();

// --- every shape the catalog actually holds, plus the awkward ones it does not --------------
const COORDS = [
  [47.5278, -120.8205, "Trailhead"],      // 4 dp — Stuart Lake TH
  [48.70681, -121.81225, "Trailhead"],    // 5 dp — Park Butte
  [46.852947, -121.760424, "Summit"],     // 6 dp, and the SLOP differs for a summit
  [48.7767, -121.8144, "summit"],         // lower case — the regex is /i
  [47.43, -120.89, "Junction"],           // 2 dp — the rounding box dominates
  [47, -121, "Campsite"],                 // 0 dp — no decimal point at all
  [-33.9, 18.4, "Hazard"],                // southern hemisphere, eastern longitude
  [47.4751180, -120.9031440, "Topout"],   // trailing zeros: dpOf reads the STRING
  [61.2, -149.9, "Water"],                // high latitude — cos(lat) shrinks the lng box hard
];

let fail = 0, n = 0;
const near = (a, b) => Math.abs(a - b) < 1e-12;
for (const [lat, lng, type] of COORDS) {
  const a = oldGrid(lat, lng, type);
  const b = boxGrid(lat, lng, /summit|topout/i.test(type) ? 40 : 183);
  n++;
  if (a.length !== b.length) { console.log(`FAIL ${lat},${lng} ${type}: ${a.length} points vs ${b.length}`); fail++; continue; }
  const bad = a.findIndex((p, i) => !near(p[0], b[i][0]) || !near(p[1], b[i][1]));
  if (bad >= 0) { console.log(`FAIL ${lat},${lng} ${type}: point ${bad} ${a[bad]} vs ${b[bad]}`); fail++; continue; }
  console.log(`ok   ${String(lat).padStart(11)},${String(lng).padStart(12)} ${type.padEnd(10)} ${a.length} points identical  (dp ${dpOf(lat)}/${dpOf(lng)})`);
}

// --- dpOf is used by both, so it is asserted rather than assumed ----------------------------
const oldDp = new Function(`${dp[0]}\nreturn dpOf;`)();
for (const v of [47.5278, 48.70681, 47, -121, 47.475118, 1e-7, 0.1, -0.25]) {
  n++;
  if (oldDp(v) !== dpOf(v)) { console.log(`FAIL dpOf(${v}): ${oldDp(v)} vs ${dpOf(v)}`); fail++; }
}
console.log(`ok   dpOf identical on 8 values`);

// --- the NEW pieces, stated outright because git has no reference for them ------------------
// A value rounded to the nearest 100 is consistent with any ground within 50 ft of it; one given
// to the foot is consistent with almost nothing. Read off the number, so nothing is fitted.
const SLACK = [[3200, 50], [3400, 50], [3360, 5], [3540, 5], [5392, 0.5], [6900, 50], [7170, 5], [1000, 500], [0, 0.5]];
for (const [h, want] of SLACK) {
  n++;
  if (roundingSlack(h) !== want) { console.log(`FAIL roundingSlack(${h}) = ${roundingSlack(h)}, want ${want}`); fail++; }
}
console.log(`ok   roundingSlack on ${SLACK.length} values`);

// The six findings the audit reported on 2026-09-24, with the box each pin's own uncertainty
// actually spans, measured against 3DEP that day and BEFORE the Park Butte repair this change
// applies. They are numbers, not a query — so this stays a statement about `boxAdmits` after the
// catalog moves on, and a change that silently re-tunes the margin shows up as a flipped verdict
// rather than as nothing. The audit itself reports five now; that is the repair, not drift.
const LIVE = [
  ["wa_sherpa_peak_east_ridge",          4221, 4815, 3500, 6200, false, false],
  ["wa_esmeralda_peaks_scramble",        4221, 4723, 3800, 5600, false, false],
  ["wa_magic_mountain_northwest_ridge",  3409, 4024, 3600, 5392, true,  false],
  ["wa_osceola_peak_scramble",           6730, 7216, 7170, 6900, true,  true],
  ["wa_mount_baker_easton_glacier",      3292, 3485, 3200, 3360, false, true],
  ["wa_mount_stuart_north_ridge",        3342, 3770, 3400, 3540, true,  true],
];
for (const [id, lo, hi, pinElev, stated, wantPin, wantStated] of LIVE) {
  const box = { lo, hi, relief: hi - lo };
  n += 2;
  const gotPin = boxAdmits(box, pinElev), gotStated = boxAdmits(box, stated);
  const okRow = gotPin === wantPin && gotStated === wantStated;
  if (!okRow) fail++;
  console.log(`${okRow ? "ok  " : "FAIL"} ${id.padEnd(36)} box ${lo}..${hi} (${hi - lo} ft)  pin ${pinElev} ${gotPin ? "admitted" : "REFUSED"}  stated ${stated} ${gotStated ? "admitted" : "REFUSED"}`);
}

// NON-VACUITY. Every assertion above is satisfied by a boxAdmits that returns a constant, so prove
// it separates: one of the six must admit the pin and refuse the stated height, and one must do
// the opposite. Those are the only two shapes a verdict can be drawn from.
const admitsBoth = LIVE.some(r => r[5] && r[6]), refusesBoth = LIVE.some(r => !r[5] && !r[6]);
const pinOnly = LIVE.some(r => r[5] && !r[6]), statedOnly = LIVE.some(r => !r[5] && r[6]);
n += 4;
for (const [label, v] of [["admits both", admitsBoth], ["refuses both", refusesBoth],
                          ["admits the pin only", pinOnly], ["admits the stated height only", statedOnly]]) {
  if (!v) { console.log(`FAIL non-vacuity: no live finding ${label} — boxAdmits is not separating`); fail++; }
}
console.log("ok   all four admit/refuse combinations occur in the live six");

console.log(`\n${n} assertions, ${fail} failed.`);
if (n < 40) { console.error("FAIL: fewer than 40 assertions ran — this proved less than it claims."); process.exit(2); }
process.exit(fail ? 1 : 0);
