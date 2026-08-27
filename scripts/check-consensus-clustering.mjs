// Can three climbers who agree actually be COUNTED as agreeing?
//
// The merge gate is `win.n >= 3 || wasEmpty`: for a field that already holds a value, three
// contributors must land in the same cluster or the correction sits pending forever. So the
// CLUSTERING RULE decides whether a correction can ever go live — not the form, not SS, not the
// reader. And it was exact for everything except numbers.
//
// TWO WAYS IT COULD NOT BE REACHED, both live before this guard:
//
//   ORDER. `togMulti` appends chips in CLICK order (`arr.concat([o])`) and the comparison
//   preserved array order, so two climbers picking the same hazards in a different order produced
//   different JSON and never clustered. Identical to the object KEY-order defect the code already
//   documents and fixed — fixed for keys, left for arrays. Worst on `haz`/`objHaz`, which are the
//   fields most likely to actually be corrected.
//
//   WORDING. "Northwest Forest Pass" / "northwest forest pass" / "Northwest Forest Pass." are one
//   fact and were three clusters. This app writes CURLY apostrophes, so text typed in the form and
//   text pasted from elsewhere never matched either.
//
// WHY A GUARD AND NOT JUST THE FIX. The healthy output of the whole mechanism is invisible: a
// correction that never goes live looks exactly like a correction nobody has made yet. Nothing
// errors, nothing renders wrong, and the only symptom is a field that stays stale forever. There
// is no screen to walk and no exception to catch, which is precisely the shape that needs a
// script rather than a comment.
//
// IT ASSERTS BOTH DIRECTIONS, and the negative half is the one that matters. A rule loose enough
// to cluster genuinely different statements does not under-report — a big enough cluster WINS, so
// it publishes a value three people never agreed on. Every "must NOT agree" case below exists to
// stop somebody "improving" this into fuzzy matching.
//
// Static: bundles ClimbMatchCore.jsx and executes the real exported comparison. No browser, no
// database.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(ROOT, `.consensus-${process.pid}.mjs`);
const clean = () => fs.rmSync(out, { force: true });

let failures = 0, cases = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const dead = (what) => {
  console.error(`\ncheck:consensus-clustering FAILED — ${what}.`);
  console.error("Nothing below was checked, and every 'must not agree' case passes against a");
  console.error("comparison that returns false for everything, so a broken scan must never read clean.\n");
  clean();
  process.exit(1);
};

try {
  execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
    "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
    "--define:import.meta.env={}",
    "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
    "--log-level=error", "--outfile=" + out], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });
} catch { dead("esbuild could not bundle ClimbMatchCore.jsx"); }

const mod = await import(out + "?t=" + Date.now());
const { sameEditValue, normEditStr, SET_FIELDS } = mod;
if (typeof sameEditValue !== "function") dead("ClimbMatchCore.jsx does not export sameEditValue — ANCHOR LOST");
if (typeof normEditStr !== "function") dead("ClimbMatchCore.jsx does not export normEditStr — ANCHOR LOST");
if (!SET_FIELDS || typeof SET_FIELDS !== "object") dead("ClimbMatchCore.jsx does not export SET_FIELDS — ANCHOR LOST");

// ---- 1. every chip field must be a declared set, or its votes can never cluster ----
const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const fi = rd.indexOf('const FIELDS=[{k:');
if (fi < 0) dead("RouteDetail.jsx's FIELDS list moved — ANCHOR LOST");
const seg = rd.slice(fi);
const st = seg.indexOf("[");
let d = 0, end = 0;
for (let j = st; j < seg.length; j++) { if (seg[j] === "[") d++; else if (seg[j] === "]") { d--; if (!d) { end = j; break; } } }
const body = seg.slice(st, end + 1);
const multi = [...body.matchAll(/\{k:"([A-Za-z0-9_]+)"[^{]*?type:"multi"/g)].map((m) => m[1]);
if (multi.length < 3) dead(`parsed only ${multi.length} multi field(s) — the scan broke`);
cases++;
const undeclared = multi.filter((k) => !SET_FIELDS[k]);
if (!undeclared.length) ok(`all ${multi.length} chip field(s) are declared unordered sets`);
else fail(`chip field(s) not in SET_FIELDS, so their votes can never cluster: ${undeclared.join(", ")}`);

// A name in SET_FIELDS that is no longer a chip field is stale bookkeeping.
cases++;
const stale = Object.keys(SET_FIELDS).filter((k) => !multi.includes(k));
if (!stale.length) ok("no stale SET_FIELDS entry");
else fail(`SET_FIELDS names field(s) the form no longer offers as chips: ${stale.join(", ")}`);

// ---- 2. the same fact, typed differently, must agree ----
const agrees = [
  ["haz", ["Rockfall", "Loose rock"], ["Loose rock", "Rockfall"], "same chips, different click order"],
  ["objHaz", ["Serac", "Crevasse", "Avalanche"], ["Avalanche", "Serac", "Crevasse"], "three chips, rotated"],
  ["permit", "Northwest Forest Pass", "northwest forest pass", "case only"],
  ["permit", "Northwest Forest Pass", "Northwest Forest Pass.", "trailing full stop"],
  ["permit", "Northwest  Forest   Pass", " Northwest Forest Pass ", "whitespace"],
  ["overview", "the climber’s left ramp", "the climber's left ramp", "curly vs straight apostrophe"],
  ["road", { name: "Cascade River Rd", status: "Open" }, { status: "open", name: "cascade river rd." },
    "same road block, different key order and typing"],
  /* The reason a picker is worth more than a text box: two climbers choosing the same option are
     byte-identical, so the 3-agree gate is actually reachable. solitudeRating is a NUMBER 1-5 in
     the column (measured: 219x 5, 141x 4, 84x 3, 42x 2, 12x 1), and the enum row stores that
     number rather than a phrase. */
  ["crowds", { solitudeRating: 4 }, { solitudeRating: 4 }, "two climbers pick the same solitude rating"],
  ["partnerRequirements", { fitnessSpec: { hiking: "1,000 ft/hr" } },
    { fitnessSpec: { hiking: "1,000 FT/HR " } }, "same nested fitness fact, different typing"],
  /* A NESTED number compares exactly through _agreeJson — JSON.stringify(4.8) and (4.9) are
     different strings — so two parties measuring the same walk were two clusters. distMi and
     gainFt are the facts different parties genuinely measure differently, so they compare with a
     tolerance, the way pitchDetail's lengthM already did. */
  ["approachVariants", [{ name: "Snow Creek trail", distMi: 4.8, gainFt: 4200 }],
    [{ name: "snow creek trail", distMi: 4.9, gainFt: 4180 }], "same walk in, measured slightly differently"],
  ["approachVariants", [{ name: "Colchuck", hazards: ["No water above the lake", "Loose talus"] }],
    [{ name: "Colchuck", hazards: ["Loose talus", "No water above the lake"] }], "same hazards listed in a different order"],
];
for (const [k, a, b, why] of agrees) {
  cases++;
  if (sameEditValue(k, a, b)) ok(`agree: ${why}`);
  else fail(`these should cluster and do not (${k}): ${why}`);
}

// ---- 3. genuinely different claims must NOT agree ----
// The half that keeps this honest: a cluster of three WINS, so over-clustering publishes a value
// nobody agreed on.
const differ = [
  ["haz", ["Rockfall"], ["Rockfall", "Loose rock"], "a subset is not the same set"],
  ["permit", "Northwest Forest Pass", "National Park entrance fee", "different permits"],
  ["overview", "a 5.8 slab", "a 5.10 slab", "different grade in the prose"],
  ["road", { name: "Cascade River Rd", status: "Open" }, { name: "Cascade River Rd", status: "Washed out" },
    "same road, opposite status"],
  // order IS a fact here — sorting these would make two different routes compare equal
  ["waypoints", [{ type: "Trailhead", name: "TH" }, { type: "Summit", name: "Top" }],
    [{ type: "Summit", name: "Top" }, { type: "Trailhead", name: "TH" }], "waypoint sequence is reversed"],
  ["pitchDetail", [{ grade: "5.8" }, { grade: "5.10a" }], [{ grade: "5.10a" }, { grade: "5.8" }],
    "pitch order is reversed"],
  /* The itinerary is the ordered field that actually flows through _agreeJson — waypoints and
     pitchDetail each have their own branch above it, so an injection that sorted every array
     inside _agreeJson changed NOTHING they assert and the case reported a false pass. Day order
     is a fact: day 1 approach / day 2 summit is not day 1 summit / day 2 approach. */
  ["crowds", { solitudeRating: 4 }, { solitudeRating: 2 }, "different solitude ratings"],
  // Tolerance must not swallow a genuinely different walk: 4.8 vs 9.5 miles is another approach.
  ["approachVariants", [{ name: "Snow Creek trail", distMi: 4.8 }], [{ name: "Snow Creek trail", distMi: 9.5 }],
    "same name, a distance twice as long"],
  ["approachVariants", [{ name: "Snow Creek trail" }], [{ name: "Colchuck Lake trail" }], "different approaches"],
  ["itinerary", { days: [{ n: 1, title: "Approach to camp" }, { n: 2, title: "Summit day" }] },
    { days: [{ n: 2, title: "Summit day" }, { n: 1, title: "Approach to camp" }] },
    "itinerary day order is reversed"],
];
for (const [k, a, b, why] of differ) {
  cases++;
  if (!sameEditValue(k, a, b)) ok(`kept apart: ${why}`);
  else fail(`these must NOT cluster (${k}): ${why} — a cluster of three publishes a value nobody agreed on`);
}

// ---- 4. the normaliser must not erase the value ----
cases++;
if (normEditStr("  Cascade  River Rd. ") === "cascade river rd") ok("normEditStr collapses typing, keeps words");
else fail(`normEditStr produced "${normEditStr("  Cascade  River Rd. ")}"`);
cases++;
if (normEditStr("5.10a") !== normEditStr("5.10b")) ok("normEditStr keeps distinct grades distinct");
else fail("normEditStr collapsed two different grades");

clean();
if (cases < 23) dead(`only ${cases} case(s) ran`);
console.log(`\ncheck:consensus-clustering: ${cases} case(s), ${failures} failure(s)`);
process.exit(failures ? 1 : 0);
