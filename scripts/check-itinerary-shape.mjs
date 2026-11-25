#!/usr/bin/env node
// check:itinerary-shape — the trip-plan rule holds, and every writer still applies it.
//
// The rule (owner 2026-11-11: "text only plans convert day by day, make that a rule in the app when
// we do other routes and states") lives in lib/itineraryShape.js: a route's `itinerary` is null or
// { days: [ … ] }, never prose. This guard is offline (no DB, no credential) and asks two things:
//
//   1. THE RULE SAYS WHAT IT MEANS. Fixed cases, including a real stored plan (Bonanza Peak, Mary
//      Green Glacier) that must pass and the real prose shapes that must not. A rule that quietly
//      started accepting a string would leave every caller "checking" and nothing refused.
//   2. EVERY WRITER CALLS IT. Each scripts/pipeline/*.mjs that puts an `itinerary` into a row, and
//      every scripts/oneoff/apply-trip-plans-*.mjs, must import itineraryShapeErrors. A new state
//      loader copied from an old one without the call is exactly how prose would come back.
//
// The live table is audit:itinerary-shape's job (it needs the service key); migration 0409 makes
// the database itself refuse a non-object plan.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { itineraryShapeErrors } from "../lib/itineraryShape.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let fail = 0, ran = 0;
const expect = (label, it, opts, wantOk) => {
  ran++;
  const errs = itineraryShapeErrors(it, opts);
  if ((errs.length === 0) !== wantOk) { fail++; console.log("  FAIL  " + label + " — got " + (errs.length ? JSON.stringify(errs) : "accepted")); }
  else console.log("  ok    " + label);
};

// ── 1. the rule's own cases ──
const tplPath = path.join(ROOT, "research-data/trip-plans-wa-2026-11-11/inputs/template.json");
if (!fs.existsSync(tplPath)) { console.error("check:itinerary-shape FAILED — the real-plan fixture " + tplPath + " is gone; nothing below was checked."); process.exit(1); }
const real = JSON.parse(fs.readFileSync(tplPath, "utf8"));
expect("a real stored plan (Bonanza Mary Green, 3 days) is accepted", real, null, true);
expect("...and clears the bar for a NEW plan", real, { complete: true }, true);
expect("null (no plan yet) is accepted", null, null, true);
expect("PROSE with Day markers is refused", "Day 1: hike to camp. Day 2: summit and out.", null, false);
expect("PROSE without markers is refused", "Usually done car-to-car in a long day.", null, false);
expect("an empty string is refused", "", null, false);
expect("a list of days without the object is refused", [{ title: "Day 1" }], null, false);
expect("an object with no days is refused", { cal: "Permit required." }, null, false);
expect("a STORED day with no title is accepted (Bacon Peak's shape; the card shows its DAY tag)", { days: [{ note: "Hike in." }] }, null, true);
expect("...but a NEW day with no title is refused", { days: [{ note: "Hike in.", hours: 5 }] }, { complete: true }, false);
expect("a NEW day title over 60 characters is refused", { days: [{ title: "x".repeat(61), hours: 5 }] }, { complete: true }, false);
expect("a title that is not text is refused", { days: [{ title: 3 }] }, null, false);
expect("a figure stored as text is refused", { days: [{ title: "Hike in", gainFt: "3,800 ft" }] }, null, false);
expect("hours as a range string is accepted", { days: [{ title: "Summit day", hours: "8-9" }] }, null, true);
expect("hours as '45 min' is refused", { days: [{ title: "Summit day", hours: "45 min" }] }, null, false);
expect("a spare day of zeros is accepted, even as a NEW plan", { days: [{ title: "Weather day", gainFt: 0, lossFt: 0, hours: 0, miles: 0 }] }, { complete: true }, true);
expect("a day with no figures is accepted as STORED", { days: [{ title: "Hike out" }] }, null, true);
expect("...but refused as a NEW plan", { days: [{ title: "Hike out" }] }, { complete: true }, false);
expect("a schedule stop with no label is refused", { days: [{ title: "Summit day", schedule: [{ time: "5 AM" }] }] }, null, false);

// ── 2. every writer applies it ──
const writers = [];
for (const f of fs.readdirSync(path.join(ROOT, "scripts/pipeline")).filter((f) => f.endsWith(".mjs"))) {
  const src = fs.readFileSync(path.join(ROOT, "scripts/pipeline", f), "utf8");
  if (/\bitinerary\s*:/.test(src)) writers.push("scripts/pipeline/" + f);
}
for (const f of fs.readdirSync(path.join(ROOT, "scripts/oneoff")).filter((f) => /^apply-trip-plans-.*\.mjs$/.test(f))) writers.push("scripts/oneoff/" + f);
if (writers.length < 3) { console.error("check:itinerary-shape FAILED — found only " + writers.length + " itinerary writer(s); the scan broke (expected the pipeline loaders and the apply scripts)."); process.exit(1); }
for (const w of writers) {
  ran++;
  const src = fs.readFileSync(path.join(ROOT, w), "utf8");
  if (/import\s*\{[^}]*\bitineraryShapeErrors\b[^}]*\}\s*from\s*["'][./]*lib\/itineraryShape\.js["']/.test(src) && /itineraryShapeErrors\(/.test(src.replace(/^.*import.*$/gm, ""))) console.log("  ok    " + w + " applies the trip-plan rule");
  else { fail++; console.log("  FAIL  " + w + " writes an itinerary without calling itineraryShapeErrors (lib/itineraryShape.js)"); }
}

if (fail) { console.error("\ncheck:itinerary-shape FAILED — " + fail + " of " + ran + "."); process.exit(1); }
console.log("\ncheck:itinerary-shape: ok — a trip plan is day by day or nothing, and all " + writers.length + " writers refuse prose (" + ran + " checks).");
