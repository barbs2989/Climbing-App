// A ROUTE HAS ONE SUMMIT. IT DOES NOT HAVE ONE TRAILHEAD.
//
// `dedupeWaypoints` in lib/waypoints.js merges a SINGLETON type on TYPE ALONE — two "Summit" pins
// are the same summit whatever they are called, which is right. `trailhead` was in that list, and
// is not: CLAUDE.md names four WA peaks with two GENUINE approaches (Carru, Remmel, Howard,
// Stuart's North Ridge) and warns twice against sweeping them to one.
//
// The merge was WORSE THAN A DROP, because mergePair() keeps the first pin's COORDINATE and the
// LONGER name. wa_remmel_mountain_southeast_slope stores Thirtymile (48.8228,-120.0197) and
// Andrews Creek (48.7837,-120.1086), 7,829 m apart, and rendered as "Andrews Creek Trailhead" AT
// THIRTYMILE — one trailhead's label on the other's position, on the pin that drives the
// Directions button and gets written into the downloaded GPX.
//
// WHY A GATE FOR A CLASS OF ONE, which is the thing this repo usually refuses to build. Two
// reasons, and neither is the finding:
//
//   ANTI-REVERT. The fix is one word removed from a regex alternation. It changes no NAME, so
//   `audit:silent-reverts` cannot see a stale-base squash putting it back — that audit says so in
//   its own closing caveat, and CLAUDE.md records the incident where exactly that happened to a
//   guard clause. Nothing else in the repo reads lib/waypoints.js: `audit:waypoint-order` and
//   `audit:waypoint-geometry` import it, and both are report-only DB reads outside the build.
//
//   CLASS GROWTH. The class is one route TODAY because only one route stores two trailhead pins.
//   The rule is wrong in general, so the next row to record a second start is eaten silently — and
//   silently is the whole problem: the count does not move, the panel still renders, and the pin
//   that survives looks like an ordinary correct pin.
//
// Static, no browser, no DB — it executes the real exported function over constructed pins, so it
// costs a module import and runs in milliseconds.
//
// Injection cases at the bottom.
import { dedupeWaypoints } from "../lib/waypoints.js";

const th = (name, lat, lng) => ({ type: "Trailhead", name, lat, lng });
const fails = [];
const ok = [];
function check(label, pass, detail) {
  (pass ? ok : fails).push(`${label}${detail ? " — " + detail : ""}`);
}

// ---------------------------------------------------------------- the rule that was wrong
// Remmel's real stored pins. Two names, two places, 7,829 m apart.
{
  const out = dedupeWaypoints([
    th("Thirtymile Trailhead", 48.8228, -120.0197),
    th("Andrews Creek Trailhead", 48.7837, -120.1086),
  ]);
  check(
    "two DIFFERENT trailheads survive",
    out.length === 2,
    out.length === 2 ? "" : `merged to ${out.length}: ${out.map((w) => `${w.name} @ ${w.lat},${w.lng}`).join(" | ")}`
  );
}

// ---------------------------------------------------------------- what the rule was FOR
// Removing `trailhead` from SINGLETON must not stop two pins for ONE start merging. Both of the
// paths that do it are asserted, because they are independent: coordinate, and name.
{
  const out = dedupeWaypoints([
    th("Thirtymile Trailhead", 48.8228, -120.0197),
    th("Thirtymile TH (FR-5400)", 48.82281, -120.01971), // ~1 m — the same gravel
  ]);
  check("one trailhead recorded twice AT THE SAME SPOT still merges", out.length === 1,
    out.length === 1 ? "" : `left ${out.length}`);
}
{
  const out = dedupeWaypoints([
    { type: "Trailhead", name: "Andrews Creek Trailhead" },
    { type: "Trailhead", name: "the Andrews Creek trailhead" }, // no coordinate on either
  ]);
  check("one trailhead recorded twice UNDER ONE NAME still merges", out.length === 1,
    out.length === 1 ? "" : `left ${out.length}`);
}

// ---------------------------------------------------------------- the singletons that remain
// The tempting over-correction is to gut SINGLETON. A route really does have one summit, and two
// summit pins in different places is the Mount Olympus defect the module was written for.
{
  const out = dedupeWaypoints([
    { type: "Summit", name: "Mount Olympus summit", lat: 47.8, lng: -123.7 },
    { type: "Summit", name: "West Peak (true summit)", lat: 47.81, lng: -123.71 },
  ]);
  check("two SUMMIT pins still merge — a route has one summit", out.length === 1,
    out.length === 1 ? "" : `left ${out.length}`);
}
{
  const out = dedupeWaypoints([
    { type: "Topout", name: "Topout", lat: 47.8, lng: -123.7 },
    { type: "Topout", name: "top of the buttress", lat: 47.9, lng: -123.8 },
  ]);
  check("two TOPOUT pins still merge", out.length === 1, out.length === 1 ? "" : `left ${out.length}`);
}

// ---------------------------------------------------------------- a positional word disambiguates
// nameKey() strips words that "carry no distinguishing information". Eight POSITIONAL ones were in
// that list, and they are usually the whole distinction: "Upper Boulder Field" and "Lower Boulder
// Field" on wa_bedal_peak_standard are two Hazard pins 435 m apart, and they merged into one. Both
// pairs below are the real stored names, at their real separation.
{
  const out = dedupeWaypoints([
    { type: "Hazard", name: "Lower Boulder Field", lat: 48.1234, lng: -121.4321 },
    { type: "Hazard", name: "Upper Boulder Field", lat: 48.1273, lng: -121.4321 }, // ~435 m
  ]);
  check("UPPER and LOWER of one feature are two places", out.length === 2,
    out.length === 2 ? "" : `merged to ${out.length}: ${out.map((w) => w.name).join(" | ")}`);
}
{
  const out = dedupeWaypoints([
    { type: "Junction", name: "North Fork crossing", lat: 48.5, lng: -121.5 },
    { type: "Junction", name: "South Fork crossing", lat: 48.52, lng: -121.5 },
  ]);
  check("NORTH and SOUTH of one feature are two places", out.length === 2,
    out.length === 2 ? "" : `merged to ${out.length}`);
}
// ...and the stripping that remains still earns its place: an article, a case difference and a
// generic noun are noise, so two spellings of ONE junction still collapse.
{
  const out = dedupeWaypoints([
    { type: "Junction", name: "the Cascade Pass Trail junction" },
    { type: "Junction", name: "Cascade Pass trail junction" },
  ]);
  check("two spellings of ONE junction still merge", out.length === 1,
    out.length === 1 ? "" : `left ${out.length}`);
}

// ---------------------------------------------------------------- ordinary types are untouched
{
  const out = dedupeWaypoints([
    { type: "Junction", name: "PCT junction", lat: 47.4, lng: -121.4 },
    { type: "Junction", name: "climbers' path junction", lat: 47.5, lng: -121.3 },
  ]);
  check("two JUNCTION pins in different places are kept", out.length === 2,
    out.length === 2 ? "" : `merged to ${out.length}`);
}

// ---------------------------------------------------------------- report BEFORE the floor
// ORDER IS LOAD-BEARING, and the injection suite is what proved it: the fail-closed floor below
// was written first and exited first, so gutting SINGLETON reported "this run proved nothing"
// instead of naming the summit rule that broke. Whichever block exits first is the only one
// anyone reads — CLAUDE.md records the same mistake in check:clickable and check:field-renders.
// The floor only has a job on a CLEAN run: if a named assertion already failed, the guard is
// demonstrably live and the specific message is the actionable one.
for (const f of fails) console.error(`FAIL - ${f}`);
if (fails.length) {
  console.error("");
  console.error("`trailhead` is back in SINGLETON in lib/waypoints.js, or the merge rules moved.");
  console.error("A route has one summit; it does not have one trailhead. Two stored trailhead pins");
  console.error("mean two genuine approaches — merging them puts one start's NAME on the other's");
  console.error("COORDINATE, which is the pin the Directions button drives to. And a positional word");
  console.error("(upper/lower/north/south/...) is not noise in a name: it is usually the whole");
  console.error("distinction, so stripping it in nameKey() deletes one of two real places.");
  process.exit(1);
}

// ---------------------------------------------------------------- fail closed
// Every assertion above is satisfied in one direction or the other by a function that does
// nothing at all, so a clean run has to prove it still merges AND still keeps.
{
  const merges = dedupeWaypoints([
    { type: "Summit", name: "a" }, { type: "Summit", name: "b" },
  ]).length === 1;
  const keeps = dedupeWaypoints([
    { type: "Water", name: "creek", lat: 47.1, lng: -121.1 },
    { type: "Water", name: "spring", lat: 47.9, lng: -121.9 },
  ]).length === 2;
  if (!merges || !keeps) {
    console.error("FAIL - dedupeWaypoints neither merges nor keeps as expected. This run proved nothing;");
    console.error("       every assertion above passes vacuously against a function that returns its input.");
    process.exit(1);
  }
}
if (ok.length < 9) {
  console.error(`FAIL - only ${ok.length} assertion(s) ran. A short run is a broken guard.`);
  process.exit(1);
}
console.log(`ok - waypoint dedupe: ${ok.length} assertions.`);
console.log("  a route has ONE summit and MORE THAN ONE trailhead, and upper/lower name two places;");
console.log("  two pins for one place still merge, on the spot or on the name.");
