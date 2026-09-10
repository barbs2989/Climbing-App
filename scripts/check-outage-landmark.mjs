// Does check:outage's Logbook:Areas LANDING CHECK actually identify the Areas view?
//
// That stop exists to tell "the sub-tab click did not land" from "it landed and the screen said
// nothing" — two outcomes that are identical from an exit code and want opposite repairs. It can
// only do that if its landmark is text the Areas view has and the rest of the Logbook does NOT.
//
// It was not. The landmark led with "saved areas", and the Logbook's own header prose says
//   "Your objectives, completed climbs, challenges and saved areas — all in one place."
// ABOVE the sub-tab bar, so it renders on all four sub-tabs. One alternative matching is enough,
// so a capture that never left the default Objectives view passed the stop, and the guard then
// compared the default view against itself and reported two empty states as "introduced by the
// outage" when they are on screen in both runs.
//
// NO BROWSER AND NO DATABASE. This is a question about which region of the source a string lives
// in, so it is answered from the source, costs milliseconds, and can be run on a box too loaded
// for a walk to be evidence. What it does NOT prove is that the click lands — only check:outage
// itself can say that, and it says it by this stop no longer firing.
//
// A BUILD GATE RATHER THAN A PROBE, on the two grounds check:waypoint-dedupe records for a class
// of one. ANTI-REVERT: the repair changes a REGEX and no identifier, so audit:silent-reverts is
// blind to it by its own closing caveat, and a stale-base squash could restore the vacuous
// landmark with every other guard green. CLASS GROWTH: check:outage has other landing checks, and
// the rule generalises — a landmark must not appear outside the view it identifies. It also runs
// where it is needed: an extracted-from-source probe with a fail-closed anchor IS a behaviour-
// revert detector, and this file records that such a thing is worth nothing in scripts/oneoff/,
// which nothing runs.
//
// The landmark is LIFTED from the guard rather than retyped: a copy would agree with itself
// whatever the guard did, which is the entire question.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ONE level up, not two. This was promoted out of scripts/oneoff/, and its depth changed with it —
// the trap check:pitch-discount records, where a promoted one-off resolved the wrong tree and
// measured another branch's code for weeks.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("ok    " + m); };
const bad = (m) => { fail++; console.log("FAIL  " + m); };

// ---------------------------------------------------------------- lift the landmark
const guard = rd("scripts/check-outage.mjs");
const LIFT = /out\[SUBTAB2\]\s*=\s*\/([^/]+)\/i\.test\(areasText\)/;
const lifted = guard.match(LIFT);
if (!lifted) {
  console.log("ANCHOR LOST: could not lift the Logbook:Areas landmark from scripts/check-outage.mjs.");
  console.log("  Either the stop was renamed or its shape changed. This probe proved NOTHING.");
  process.exit(1);
}
const ALTS = lifted[1].split("|").map((x) => x.trim()).filter(Boolean);
if (ALTS.length < 1) {
  console.log("FAIL-CLOSED: the landmark parsed to zero alternatives, so every test below is vacuous.");
  process.exit(1);
}
console.log("landmark: /" + lifted[1] + "/i  -> " + ALTS.length + " alternative(s)\n");

// ---------------------------------------------------------------- carve the regions
// Balance braces from the JSX expression container that OPENS the gate, skipping string and
// template contents -- a brace inside a string would desynchronise the counter, and this file's
// prose is full of them.
function region(src, needle, what) {
  const a = src.indexOf(needle);
  if (a < 0) throw new Error("ANCHOR LOST: " + what + " (" + needle + ")");
  const i = src.lastIndexOf("{", a);
  let j = i, depth = 0, started = false, q = null;
  while (j < src.length) {
    const c = src[j];
    if (q) {
      if (c === "\\") { j += 2; continue; }
      if (c === q) q = null;
    } else if (c === '"' || c === "'" || c === "`") q = c;
    else if (c === "{") { depth++; started = true; }
    else if (c === "}") { depth--; if (started && depth === 0) break; }
    j++;
  }
  if (!started || depth !== 0) throw new Error("region for " + what + " did not close");
  return { start: i, end: j, text: src.slice(i, j + 1) };
}

const app = rd("ClimbMatch.jsx");
let logbook, lists;
try {
  logbook = region(app, 'tab==="logbook"', "the Logbook tab");
  lists = region(app, 'logbookTab==="lists"', "the Logbook's Areas sub-view");
} catch (e) {
  console.log("FAIL-CLOSED: " + e.message);
  console.log("  Regions that cannot be carved make every assertion below vacuous.");
  process.exit(1);
}

// Fail closed on a region that lifted short: every "is absent" test passes against empty text.
// The floors are MEASURED, not guessed -- a first draft put the Logbook at 20000 and failed on a
// correct carve, because most of this tab's content renders through components (ListsManager and
// friends) rather than inline, so its own JSX is only ~7.7k. Each floor sits well under today's
// real size and far above the ~150 chars a mis-anchored carve returns.
if (logbook.text.length < 4000) {
  console.log("FAIL-CLOSED: the Logbook region lifted only " + logbook.text.length + " chars.");
  process.exit(1);
}
if (lists.text.length < 1500) {
  console.log("FAIL-CLOSED: the Areas sub-view lifted only " + lists.text.length + " chars.");
  process.exit(1);
}
if (!(lists.start >= logbook.start && lists.end <= logbook.end)) {
  console.log("FAIL-CLOSED: the Areas sub-view is not inside the Logbook region -- wrong anchor.");
  process.exit(1);
}

// The rest of the Logbook: every sub-tab that is NOT Areas, plus the shared header above the bar.
const REST = (app.slice(logbook.start, lists.start) + app.slice(lists.end + 1, logbook.end + 1)).toLowerCase();

// THE FLOOR THAT ACTUALLY MATTERS. If the two regions ever carved to the same span, REST would be
// empty and every "appears nowhere else in the Logbook" assertion below would pass VACUOUSLY --
// reporting a clean landmark for a scan that compared against nothing.
if (REST.length < 800) {
  console.log("FAIL-CLOSED: rest-of-Logbook is only " + REST.length + " chars, so the exclusion " +
              "tests would pass against almost no text.");
  process.exit(1);
}
if (!REST.includes("all in one place")) {
  console.log("FAIL-CLOSED: rest-of-Logbook does not contain the shared header prose, so the carve " +
              "is not separating the header from the Areas view -- which is the whole question.");
  process.exit(1);
}
const AREAS = lists.text.toLowerCase();
console.log("Logbook region " + logbook.text.length + " chars; Areas sub-view " + lists.text.length +
            "; rest-of-Logbook " + REST.length + "\n");

// ---------------------------------------------------------------- 1. the landmark identifies the view
// Every failure below names its own REPAIR. A guard that fires correctly and leaves the reader to
// guess sends them at the wrong half -- this file records check:column-drift doing exactly that,
// and the likeliest repair here (edit the LANDMARK) is not the one somebody staring at an app
// diff reaches for.
const FIX = "\n        FIX: this is a landmark in scripts/check-outage.mjs, not a defect in the app." +
            "\n        If you renamed or moved a card on the Logbook's Areas sub-view, point the" +
            "\n        landmark at another heading that is UNCONDITIONAL on that view and appears" +
            "\n        nowhere else in the Logbook. Do not widen it to make this pass.";

for (const alt of ALTS) {
  const a = alt.toLowerCase();
  if (AREAS.includes(a)) ok(`"${alt}" is ON the Areas sub-view`);
  else bad(`"${alt}" does NOT appear on the Areas sub-view -- it can only ever report a false ` +
           `"did not land", so the stop is dead in the direction that matters.` + FIX);

  if (REST.includes(a)) {
    bad(`"${alt}" ALSO appears elsewhere in the Logbook -- a capture that never left the default ` +
        `sub-tab would match it, which is the vacuity this stop exists to avoid.` + FIX);
  } else ok(`"${alt}" appears NOWHERE else in the Logbook`);
}

// ---------------------------------------------------------------- 2. the fix is load-bearing
// Without this the suite is satisfied by any landmark at all, including the broken one -- so it
// asserts the REMOVED term really did match the rest of the Logbook.
if (REST.includes("saved areas")) {
  ok('the removed "saved areas" DOES match the rest of the Logbook -- the header prose, so the ' +
     "old landmark really was vacuous and the removal was load-bearing");
} else {
  bad('"saved areas" no longer appears outside the Areas sub-view, so this probe can no longer ' +
      "show why the old landmark was vacuous. Re-read the header prose before trusting it.");
}
for (const alt of ALTS) {
  if (alt.toLowerCase() === "saved areas") {
    bad('"saved areas" is back in the landmark -- it matches the Logbook header on every sub-tab');
  }
}

// ---------------------------------------------------------------- 3. no dead alternative
// A term that appears nowhere in the app can never match, so it is not a landmark -- it is a third
// of an alternation that has never once fired. "offline library" was exactly that.
const core = rd("ClimbMatchCore.jsx").toLowerCase();
const appLower = app.toLowerCase();
for (const alt of ALTS) {
  const a = alt.toLowerCase();
  if (appLower.includes(a) || core.includes(a)) ok(`"${alt}" exists in the app at all`);
  else bad(`"${alt}" appears NOWHERE in either app file -- a dead alternative that cannot match.` +
           "\n        FIX: delete it from the landmark in scripts/check-outage.mjs. It protects" +
           "\n        nothing, and while it sits there the alternation LOOKS broader than it is.");
}
if (!appLower.includes("offline library") && !core.includes("offline library")) {
  ok('"offline library" is confirmed absent from the app -- the dead term the landmark used to carry');
} else {
  bad('"offline library" now exists in the app; re-check whether it belongs in the landmark');
}

// ---------------------------------------------------------------- 4. the landmark is a HEADING
// A stop asserting on an EMPTY STATE passes or fails for the same reason the verdict does, so it
// cannot separate "did not land" from "landed and said nothing". Each alternative must name a
// card heading that renders unconditionally, not the copy inside a `length ?` branch.
for (const alt of ALTS) {
  const re = new RegExp("<MeH>\\s*" + alt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*</MeH>", "i");
  if (re.test(lists.text)) ok(`"${alt}" is a <MeH> card heading, so it does not move with the data`);
  else bad(`"${alt}" is not a <MeH> heading on this view -- if it is empty-state copy the stop is ` +
           "entangled with the verdict it is meant to qualify");
}

console.log("\n" + (fail ? "FAILED " + fail + " of " + (pass + fail) : "ok — " + pass + " assertions"));
process.exit(fail ? 1 : 0);
