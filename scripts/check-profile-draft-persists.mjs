#!/usr/bin/env node
// A PROFILE FIELD THE EDITOR COLLECTS, AND THE DATABASE CAN HOLD, MUST ACTUALLY BE SENT.
//
// `saveEdit` collected certifications and skills, set them on local state, and sent NEITHER —
// because `profiles` had no column for either. So a real signed-in climber typed their belay
// cert, watched it render under CERTIFICATIONS & SKILLS, watched trustFactors pay 3 points per
// certification, and lost the lot on the next load. Silently: the save itself succeeds, since
// every other field in the payload is real. 0181 added the columns and wired both ends.
//
// THE RULE IS GENERAL RATHER THAN A PAIR OF NAMES, and that is the point — it would have caught
// this the day the field was added: every key in openEdit's DRAFT that has a matching `profiles`
// column must appear in saveEdit's payload. A draft key with NO column says nothing (`level` and
// `availWeek` are both in that state today and are correctly silent), so the rule cannot nag
// about a field the schema cannot hold.
//
// WHY A GATE. The fix is a key in an object literal. Dropping it changes NO identifier, so
// `audit:silent-reverts` is blind to it by its own closing caveat — and a stale-base squash that
// took it would restore silent data loss with every other guard green.
//
// Static: two source reads and the committed schema snapshot. No browser, no database.
//
//   node scripts/check-profile-draft-persists.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let bad = 0, ran = 0;
const ok = (m) => { ran++; console.log("  ok    " + m); };
const fail = (m) => { ran++; bad++; console.log("  FAIL  " + m); };
const dead = (m) => { console.log("  FAIL  " + m + "\n\nthis run proved nothing."); process.exit(1); };

const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

// A draft key whose column is NOT its camelCase→snake_case spelling. Declared, never derived:
// `showRealName` stores as `show_name`, and check:visibility-switches records getting exactly
// this wrong — it derived `show_real_name`, found no column, and reported a healthy control.
// A STALE entry fails, so the map cannot rot into a description of a key that is gone.
const ALIAS = { showRealName: "show_name" };

// A draft key that is deliberately not a `profiles` column at all. Declared with a reason so the
// day one gains a column, this guard starts demanding it rather than staying quiet.
const NOT_A_COLUMN = {
  availWeek: "the weekly availability grid — `profiles` has no availability column for anyone, which is also why compatUnknown caps the browse row at 3 unknowns",
  level: "a real profile carries no level; check:real-profile-rows exists because rendering one invents a value the account does not have",
};

// ---- 1. LIFT THE DRAFT. Balanced from setEditDraft's own object literal.
const oi = app.indexOf("openEdit=");
if (oi < 0) dead("ANCHOR LOST: `openEdit=` could not be found");
const setI = app.indexOf("setEditDraft({", oi);
if (setI < 0 || setI - oi > 900) dead("ANCHOR LOST: openEdit no longer opens with setEditDraft({…}");
let depth = 0, end = -1;
const brace = app.indexOf("{", setI);
for (let i = brace; i < app.length; i++) {
  if (app[i] === "{") depth++;
  else if (app[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
}
if (end < 0) dead("ANCHOR LOST: openEdit's draft literal does not close");
// Sliced from the BRACE, not from `setEditDraft(` — the call's own paren opens a level, so
// keys would sit at depth 2 and a depth-1 scan finds none.
const draftSrc = app.slice(brace, end);
// Top-level keys only: a nested `ME.availWeek.length ? … : weekOf(ME)` carries no keys of its own,
// but a value like `[...(ME.disciplines||[])]` does contain punctuation, so depth is tracked.
const draftKeys = [];
{
  let d = 0;
  for (const m of draftSrc.matchAll(/([{}[\]()])|([A-Za-z_$][\w$]*)\s*:/g)) {
    if (m[1]) { d += "{[(".includes(m[1]) ? 1 : -1; continue; }
    if (d === 1) draftKeys.push(m[2]);
  }
}
if (draftKeys.length < 8) dead(`only ${draftKeys.length} draft keys parsed — every comparison below would be vacuous`);
ok(`openEdit's draft carries ${draftKeys.length} fields`);

// ---- 2. LIFT THE PAYLOAD. The literal, PLUS the conditional `f.x=` adds beneath it — name and
// username are appended only when non-blank, so a literal-only scan would call them unsent.
const si = app.indexOf("saveEdit=");
if (si < 0) dead("ANCHOR LOST: `saveEdit=` could not be found");
const saveEdit = app.slice(si, si + 2200);
const payM = saveEdit.match(/var f=\{([\s\S]*?)\};/);
if (!payM) dead("ANCHOR LOST: saveEdit's DB payload literal could not be lifted");
const sent = new Set();
for (const m of payM[1].matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) sent.add(m[1]);
for (const m of saveEdit.matchAll(/\bf\.([A-Za-z_$][\w$]*)\s*=/g)) sent.add(m[1]);
if (sent.size < 5) dead(`only ${sent.size} payload keys parsed — every comparison below would be vacuous`);
ok(`saveEdit sends ${sent.size} columns`);

if (/saveProfile\(uid,\s*f\)/.test(saveEdit)) ok("...and that payload is what reaches saveProfile");
else fail("saveEdit no longer hands `f` to saveProfile — the payload above may not be the write");

// ---- 3. WHAT THE TABLE CAN HOLD.
const snap = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "schema-snapshot.json"), "utf8"));
const profiles = snap.profiles || (snap.tables || {}).profiles;
if (!profiles) dead("ANCHOR LOST: `profiles` is not in scripts/schema-snapshot.json");
const raw = Array.isArray(profiles) ? profiles : (profiles.columns || Object.keys(profiles));
const columns = new Set(raw.map((c) => (typeof c === "string" ? c : c.name)));
if (columns.size < 10) dead(`only ${columns.size} profiles columns parsed — every absence below would be vacuous`);
ok(`profiles has ${columns.size} columns in the snapshot`);

// ---- 4. THE RULE.
const snake = (k) => k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
let checked = 0;
for (const key of draftKeys) {
  if (NOT_A_COLUMN[key]) continue;
  const col = ALIAS[key] || (columns.has(key) ? key : snake(key));
  if (!columns.has(col)) {
    fail(`the editor collects "${key}" and \`profiles\` has no "${col}" column — either add the column, or declare it in NOT_A_COLUMN with the reason it is not stored`);
    continue;
  }
  checked++;
  if (sent.has(col)) ok(`"${key}" is collected, has a column, and is sent as "${col}"`);
  else fail(`THE DEFECT: the editor collects "${key}" and \`profiles\` has a "${col}" column, but saveEdit never sends it — what the climber types is lost on the next load`);
}
if (checked < 6) dead(`only ${checked} storable draft fields were compared — the rule is not reaching the payload`);

// ---- 5. THE DECLARATIONS MUST NOT ROT.
for (const key of Object.keys(NOT_A_COLUMN)) {
  if (!draftKeys.includes(key)) fail(`NOT_A_COLUMN declares "${key}", which the editor no longer collects — drop the entry`);
  else if (columns.has(ALIAS[key] || snake(key)) || columns.has(key)) fail(`NOT_A_COLUMN says "${key}" cannot be stored, but \`profiles\` now has that column — wire it into saveEdit and drop the entry`);
  else ok(`NOT_A_COLUMN: "${key}" is still collected and still has no column`);
}
for (const key of Object.keys(ALIAS)) {
  if (!draftKeys.includes(key)) fail(`ALIAS declares "${key}", which the editor no longer collects — drop the entry`);
  else ok(`ALIAS: "${key}" -> "${ALIAS[key]}" still describes a live field`);
}

// ---- 6. AND THE READ BACK. A write with no reader round-trips to nothing: the hydration is an
// ALLOW-LIST, so a column it does not name never reaches state however faithfully it was stored.
const hy = app.indexOf("getProfile(uid).then(");
if (hy < 0) dead("ANCHOR LOST: the sign-in profile hydration could not be found");
const hydration = app.slice(hy, hy + 1600);
for (const key of ["certifications", "skills"]) {
  if (hydration.includes(key + ":")) ok(`the sign-in hydration reads "${key}" back`);
  else fail(`the hydration never reads "${key}" back — it is stored and then ignored, so the editor still opens blank`);
}

const FLOOR = 14;
if (ran < FLOOR) dead(`only ${ran} assertions ran, expected at least ${FLOOR} — this run proved less than it claims`);

console.log("");
console.log(bad ? `${bad} problem(s).` : `ok — every storable field the profile editor collects is written and read back (${ran} assertions)`);
process.exit(bad ? 1 : 0);
