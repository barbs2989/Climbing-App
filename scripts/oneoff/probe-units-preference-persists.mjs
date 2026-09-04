// DOES THE UNITS TOGGLE SURVIVE A RELOAD, and can it take a screen down when storage is hostile?
//
// `units` was `useState("imperial")` with no storage anywhere, so a metric climber re-picked
// metric on every load — for every elevation, distance, pace and pack weight, not just the
// forecast. A setting that resets is worse than no setting: it looks like it works.
//
// Three questions, and they fail in different ways, so they are asked separately:
//   1. THE LOGIC round-trips, defaults, and refuses junk. Executed against a fake storage,
//      because the interesting cases (private mode throwing, no localStorage at all) are states a
//      real browser will not produce on demand.
//   2. THE WIRING is present. Static, because restoring happens in a useState initializer and
//      persisting happens in an onClick — neither of which a render can reach.
//   3. THE VALID LIST still covers every option the TOGGLE offers, lifted from the source. A
//      third unit system added to the UI and not to the list would persist as nothing and fall
//      back to imperial, silently.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let failed = 0;
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { failed++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("\nBROKEN PROBE: " + m); process.exit(2); };

const { loadUnits, saveUnits, DEFAULT_UNITS, VALID_UNITS } = await import(path.join(ROOT, "lib/units-pref.js"));
if (typeof loadUnits !== "function" || typeof saveUnits !== "function") dead("lib/units-pref.js does not export loadUnits/saveUnits — ANCHOR LOST");

// ── 1. THE LOGIC ────────────────────────────────────────────────────────────────────────────
console.log("1. the preference round-trips, defaults, and refuses junk\n");

// No localStorage at all — this is node, and it is also every SSR guard that renders the app.
if (typeof globalThis.localStorage !== "undefined") dead("something already defined localStorage; the no-storage case cannot be measured");
if (loadUnits() !== DEFAULT_UNITS) bad(`with no localStorage, loadUnits() returned ${loadUnits()} instead of the default`);
else ok(`no localStorage at all → "${DEFAULT_UNITS}" rather than a throw (this is the SSR path the guards take)`);
try { saveUnits("metric"); ok("saveUnits with no localStorage does not throw"); }
catch { bad("saveUnits threw when localStorage does not exist"); }

const fake = (impl) => { globalThis.localStorage = impl; };
const store = new Map();
fake({
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
});

if (loadUnits() !== DEFAULT_UNITS) bad("an empty store did not return the default");
else ok("an empty store → the default");

saveUnits("metric");
if (loadUnits() !== "metric") bad(`round trip failed: stored metric, read back ${loadUnits()}`);
else ok("metric survives a reload — the whole point");

saveUnits("imperial");
if (loadUnits() !== "imperial") bad("switching back to imperial did not persist");
else ok("...and switching back persists too, so the toggle is not one-way");

// A user-writable key that survives deploys: shape-check on READ, not only on write.
store.set("climbmatch-units", "furlongs");
if (loadUnits() !== DEFAULT_UNITS) bad(`a tampered value ("furlongs") was returned as a preference`);
else ok("a tampered stored value falls back to the default rather than propagating");

store.clear();
saveUnits("furlongs");
if (store.size) bad(`saveUnits wrote an invalid value: ${[...store.entries()]}`);
else ok("saveUnits refuses to write a value the app cannot read back");

// Safari private mode and a full profile THROW rather than returning null.
fake({
  getItem: () => { throw new Error("private mode"); },
  setItem: () => { throw new Error("quota exceeded"); },
});
if (loadUnits() !== DEFAULT_UNITS) bad("a throwing localStorage did not fall back to the default");
else ok("a throwing localStorage (private mode) → the default, not an exception");
try { saveUnits("metric"); ok("a throwing setItem (quota) is swallowed — a preference cannot take a screen down"); }
catch { bad("saveUnits let a quota error escape"); }
delete globalThis.localStorage;

// ── 2. THE WIRING ───────────────────────────────────────────────────────────────────────────
console.log("\n2. App restores on mount and writes on the toggle\n");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

if (!/from "\.\/lib\/units-pref"/.test(app)) bad("ClimbMatch.jsx does not import the units preference");
else ok("ClimbMatch.jsx imports it");

// The LAZY form matters: `useState(loadUnits())` would read storage on every render, and
// `useState("imperial")` would not read it at all.
if (/\[units,setUnits\]=useState\(loadUnits\)/.test(app)) ok("units restores from storage via a lazy initializer (read once, on mount)");
else if (/\[units,setUnits\]=useState\(loadUnits\(\)\)/.test(app)) bad("useState(loadUnits()) calls storage on EVERY render — pass the function, not its result");
else bad("units does not initialise from loadUnits — the preference is not restored");

if (/setUnits\(u\[0\]\);saveUnits\(u\[0\]\)/.test(app)) ok("the toggle writes the choice beside setting it");
else bad("the units toggle does not call saveUnits — the choice is not persisted");

// An effect on `units` would ALSO fire on the restore, writing back what it just read. Harmless
// here, but it makes a load indistinguishable from a choice, so the write stays at the control.
if (/useEffect\([^)]*saveUnits/.test(app)) bad("saveUnits is called from an effect — it will fire on the restore too");
else ok("...and not from an effect, so a load is never mistaken for a choice");

// ── 3. THE VALID LIST COVERS THE TOGGLE ─────────────────────────────────────────────────────
console.log("\n3. every unit the toggle offers can actually be stored\n");
/* Balance the array rather than matching a fixed shape. A pattern requiring EXACTLY two options
   would die with ANCHOR LOST the moment a third unit was added — which is precisely the case this
   section exists to report. The anchor has to survive the change it is watching for. */
const at = app.indexOf(`[["imperial","`);
if (at < 0) dead("the units toggle's option list is not where it was — ANCHOR LOST, so this check proved nothing");
let depth = 0, end = -1;
for (let k = at; k < app.length; k++) {
  if (app[k] === "[") depth++;
  else if (app[k] === "]" && --depth === 0) { end = k + 1; break; }
}
if (end < 0) dead("the units toggle's option list does not close");
const offered = [...app.slice(at, end).matchAll(/\["(\w+)","/g)].map((m) => m[1]);
if (offered.length < 2) dead(`parsed only ${offered.length} toggle option(s)`);
const missing = offered.filter((o) => VALID_UNITS.indexOf(o) < 0);
if (missing.length) bad(`the toggle offers ${missing.join(", ")}, which VALID_UNITS does not accept — those would persist as nothing`);
else ok(`all ${offered.length} offered units (${offered.join(", ")}) are storable`);
const extra = VALID_UNITS.filter((v) => offered.indexOf(v) < 0);
if (extra.length) bad(`VALID_UNITS accepts ${extra.join(", ")}, which the toggle no longer offers — stale bookkeeping`);
else ok("...and VALID_UNITS accepts nothing the toggle has stopped offering");

console.log(`\n${failed ? "FAILED — " + failed + " assertion(s)" : "ok — the units preference survives a reload and cannot take a screen down"}`);
process.exit(failed ? 1 : 0);
