// THE NWS CROSS-CHECK ROW PUT A MACHINE TOKEN ON A SAFETY SCREEN.
//
// The forecast panel prints three sources side by side. MET's condition goes through
// `metWxLabel()`; NWS's went through `cap()`, which only uppercases the first letter — so NWS's
// snake_case gridpoint vocabulary reached the climber intact:
//
//     NWS  High 53° · Low 45° · Wind 9 mph · Rain_showers
//
// Seen on the CI capture's route:Safety. The asymmetry is the defect, not a missing map entry:
// two sibling sources on one row, one labelled and one not.
//
// A MAP IS RIGHT FOR MET AND WRONG FOR NWS. `clearsky` and `partlycloudy` are not English, so that
// source needs a table. NWS ships English words joined by underscores, so replacing the separator
// labels the WHOLE vocabulary -- and a table here would be a second list to maintain whose first
// unlisted code puts the raw token straight back on screen. This probe therefore tests the rule
// against every value NWS publishes, not the one code that was noticed.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let bad = 0;
const ok = (m) => console.log("  ok   " + m);
const fail = (m) => { bad++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("\nBROKEN PROBE: " + m); process.exit(2); };

const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");

// Lifted from source, never retyped: a copy would agree with itself whatever the app did.
const grab = (decl) => {
  const at = rd.indexOf(decl);
  if (at < 0 || rd.indexOf(decl, at + 1) >= 0) dead("`" + decl + "` is not in RouteDetail.jsx exactly once — ANCHOR LOST");
  const end = rd.indexOf("};", at);
  if (end < 0) dead("`" + decl + "` does not close — ANCHOR LOST");
  return rd.slice(at, end + 2);
};
const { cap, nwsWxLabel } = new Function(
  grab("const cap=function(s){") + "\n" + grab("const nwsWxLabel=function(s){") + "\nreturn {cap,nwsWxLabel};"
)();

console.log("\n1. every value NWS publishes reads as prose\n");

// api.weather.gov gridpoint `weather[].weather` vocabulary.
const NWS = [
  "rain", "rain_showers", "thunderstorms", "snow", "snow_showers", "fog", "freezing_rain",
  "freezing_drizzle", "ice_pellets", "blowing_snow", "blowing_dust", "haze", "smoke", "drizzle",
  "hail", "volcanic_ash", "sleet", "frost", "funnel_cloud", "water_spouts",
];
let leaked = 0;
for (const code of NWS) {
  const out = nwsWxLabel(code);
  if (!out || /_/.test(out)) { leaked++; fail(`\`${code}\` renders as "${out}" — a machine token on screen`); }
}
if (!leaked) ok(`all ${NWS.length} NWS weather values render without an underscore`);

if (nwsWxLabel("rain_showers") === "Rain showers") ok('rain_showers -> "Rain showers"');
else fail(`rain_showers -> "${nwsWxLabel("rain_showers")}"`);

if (nwsWxLabel("freezing_rain") === "Freezing rain") ok('freezing_rain -> "Freezing rain"');
else fail(`freezing_rain -> "${nwsWxLabel("freezing_rain")}"`);

console.log("\n2. non-vacuity — the OLD helper still reproduces the defect\n");

// Without this, every assertion above is satisfied by a labeller that happens to work on a
// vocabulary that never had underscores in the first place.
if (cap("rain_showers") === "Rain_showers")
  ok('cap() still yields "Rain_showers" — the shipped defect, so the cases above mean something');
else fail(`cap("rain_showers") = "${cap("rain_showers")}" — the defect no longer reproduces`);

console.log("\n3. the call site uses it (SOURCE)\n");

for (const [what, needle, absent] of [
  ["the NWS row is labelled", "wx:nwsWxLabel(modeOf(nwsWxByDay[date]))"],
  ["...and the bare cap() call is gone", "wx:cap(modeOf(nwsWxByDay[date]))", true],
  ["MET keeps its own map, which it needs", "wx:metWxLabel(modeOf(metWxByDay[date]))"],
]) {
  const n = rd.split(needle).length - 1;
  if (absent ? n === 0 : n === 1) ok(what);
  else fail(`[wiring] ${what} — matched ${n} time(s)`);
}

console.log("\n4. what must NOT change\n");

if (nwsWxLabel("") === null && nwsWxLabel(null) === null && nwsWxLabel(undefined) === null)
  ok("an absent condition stays absent rather than becoming an empty separator on the row");
else fail(`[wiring] nwsWxLabel drops to "${nwsWxLabel("")}" on an empty value`);

// A single-word code must not be mangled by a labeller reaching for something to replace.
if (nwsWxLabel("fog") === "Fog") ok("a single-word code is unchanged but for its capital");
else fail(`fog -> "${nwsWxLabel("fog")}"`);

console.log("");
if (bad) { console.log(`${bad} assertion(s) failed.`); process.exit(1); }
console.log("ok — the NWS condition reaches the screen as prose, for every value NWS publishes.");
