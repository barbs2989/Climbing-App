#!/usr/bin/env node
// THE LAST SETTING THAT DID NOT SURVIVE A RELOAD, AND THE FOLD THAT date-pref ASKED FOR.
//
// Two claims, and the first is the one that needs proving hardest.
//
// 1. THE FOLD IS BEHAVIOUR-NEUTRAL. lib/units-pref.js and lib/date-pref.js each had their own
//    guarded try/catch; date-pref's own header said "if a THIRD stored preference appears, fold
//    all three into one module then — that is the point at which the duplicated try/catch starts
//    to be able to drift". lib/inbox-pref.js is the third. Moving working guard logic is exactly
//    the kind of change that looks obviously safe and quietly is not, so every module is driven
//    through the same four hostile stores it was written to survive, rather than read.
//
// 2. THE INBOX FILTER IS SAFE TO REMEMBER, which it was NOT before #1625. While the control read
//    "Who can message you" it claimed a restriction the app cannot impose, so persisting it would
//    have durably kept a promise it cannot keep. The honest label is a precondition, so this
//    probe asserts it rather than trusting that #1625 is still in place.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const problems = [];
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); problems.push(m); };

const MODULES = [
  ["units-pref", "loadUnits", "saveUnits", "climbmatch-units", ["imperial", "metric"], "imperial"],
  ["date-pref", "loadDateFmt", "saveDateFmt", "climbmatch-datefmt", ["auto", "us", "intl"], "auto"],
  ["inbox-pref", "loadInboxFilter", "saveInboxFilter", "climbmatch-inbox-filter", ["everyone", "requests", "friends"], "everyone"],
];

// ── 1. NO localStorage AT ALL. This is how every SSR guard imports the app; an unguarded read
//    throws ReferenceError at MODULE LOAD and takes all of them down.
if (typeof globalThis.localStorage !== "undefined") delete globalThis.localStorage;
for (const [file, loadName, saveName, , , dflt] of MODULES) {
  const m = await import("file://" + path.join(ROOT, "lib", file + ".js"));
  if (typeof m[loadName] !== "function" || typeof m[saveName] !== "function") { fail(`${file}: ${loadName}/${saveName} are not both exported — the fold changed the public API`); continue; }
  if (m[loadName]() !== dflt) { fail(`${file}: ${loadName}() does not fall back to ${dflt} with no localStorage (the SSR case)`); continue; }
  try { m[saveName](dflt); } catch (e) { fail(`${file}: ${saveName} threw with no localStorage: ${e.message}`); continue; }
  ok(`${file}: survives having no localStorage at all`);
}

// ── 2. A STORE THAT WORKS: every offered value round-trips, under its OWN key.
const store = {};
globalThis.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
for (const [file, loadName, saveName, key, valid] of MODULES) {
  const m = await import("file://" + path.join(ROOT, "lib", file + ".js") + "?t=1");
  let bad = null;
  for (const v of valid) { m[saveName](v); if (m[loadName]() !== v) bad = v; }
  if (bad) { fail(`${file}: ${bad} does not round-trip, though the control offers it`); continue; }
  if (!(key in store)) { fail(`${file}: nothing was written under ${key} — the fold changed the key, so an existing choice is lost`); continue; }
  ok(`${file}: all ${valid.length} offered values round-trip under ${key}`);
}
// ...and the three do not share a key, which a fold is exactly the way to get wrong.
const keys = MODULES.map((m) => m[3]);
if (new Set(keys).size === keys.length) ok("the three preferences use three distinct keys");
else fail(`two preferences share a key (${keys.join(", ")}) — one would overwrite the other`);

// ── 3. JUNK AND HOSTILITY. Validating only on write trusts whatever is already stored.
for (const [file, loadName, saveName, key, valid, dflt] of MODULES) {
  const m = await import("file://" + path.join(ROOT, "lib", file + ".js") + "?t=2");
  const kept = valid[valid.length - 1];
  m[saveName](kept);
  m[saveName]("not-an-option");
  // Inspect the STORE, not the load result: the read validates too, so it falls back either way
  // and could never see this. The injection suite caught that blind spot.
  if (store[key] === "not-an-option") { fail(`${file}: ${saveName} wrote a value the control does not offer — it outlives the session`); continue; }
  if (m[loadName]() !== kept) { fail(`${file}: a refused write disturbed the value that was already stored`); continue; }
  store[key] = "";               // the reachable one: a cleared or half-written key
  if (m[loadName]() !== dflt) { fail(`${file}: a stored empty string is believed`); continue; }
  store[key] = "{garbage";
  if (m[loadName]() !== dflt) { fail(`${file}: junk storage is believed rather than falling back`); continue; }
  ok(`${file}: refuses an unoffered write, and falls back on an empty or junk value`);
}
globalThis.localStorage = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
for (const [file, loadName, saveName, , valid, dflt] of MODULES) {
  const m = await import("file://" + path.join(ROOT, "lib", file + ".js") + "?t=3");
  try {
    if (m[loadName]() !== dflt) { fail(`${file}: a throwing localStorage was not handled on read`); continue; }
    m[saveName](valid[0]);
    ok(`${file}: survives a localStorage that throws on every access`);
  } catch (e) { fail(`${file}: a throwing localStorage escaped: ${e.message}`); }
}
delete globalThis.localStorage;

// ── 4. THE GUARD EXISTS ONCE. That was the whole point of folding.
const guardCount = MODULES.map(([f]) => fs.readFileSync(path.join(ROOT, "lib", f + ".js"), "utf8"))
  .filter((t) => /localStorage\.getItem/.test(t)).length;
if (guardCount === 0) ok("no preference module reads localStorage directly — the guard lives only in lib/prefs.js");
else fail(`${guardCount} preference module(s) still read localStorage directly — the fold left a copy behind`);
const core = fs.readFileSync(path.join(ROOT, "lib", "prefs.js"), "utf8");
if (/catch\s*\{/.test(core) && /localStorage\.getItem/.test(core)) ok("lib/prefs.js holds the guarded read");
else fail("lib/prefs.js does not contain a guarded localStorage read — the fold moved it nowhere");

// ── 5. THE PRECONDITION. Remembering this control is only honest because #1625 reworded it.
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
if (app.includes('aria-label="Who can message you"'))
  fail("the control claims control over who may SEND again — persisting that durably keeps a promise the app cannot keep");
else if (!app.includes('aria-label="Which messages reach your inbox"'))
  fail("ANCHOR LOST: the inbox filter's accessible name is neither the old nor the new one — re-read it before trusting this");
else ok("the control still describes FILING, so remembering the choice claims nothing false");

// ── 6. THE WIRING, which sections 1-4 all survive without.
if (/\[msgFrom,setMsgFrom\]=useState\(loadInboxFilter\)/.test(app)) ok("the inbox filter is SEEDED from storage");
else fail("the inbox filter is not seeded — lib/inbox-pref.js is dead code");
if (/setMsgFrom\(e\.target\.value\);saveInboxFilter\(e\.target\.value\)/.test(app)) ok("choosing a filter WRITES it");
else fail("choosing a filter does not write it — it would read a value nothing saves");

if (problems.length) { console.error("\nFAIL:"); problems.forEach((p) => console.error("  - " + p)); process.exit(1); }
console.log("\nok — three preferences, one guard, distinct keys, and the last volatile setting now survives a reload.");
