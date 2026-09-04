// DO THE DISPLAY PREFERENCES SURVIVE A RELOAD, and can they take a screen down when storage is
// hostile?
//
// `units` and `dateFmt` were both plain `useState` with no storage anywhere, so a climber
// re-picked metric — and re-picked their date format — on every load. A setting that resets is
// worse than no setting: it looks like it works.
//
// Four questions, failing in different ways, so they are asked separately:
//   1. THE LOGIC round-trips, defaults and refuses junk. Executed against a fake storage, because
//      the interesting cases (private mode throwing, no localStorage at all) are states a real
//      browser will not produce on demand.
//   2. THE WIRING is present. Static, because restoring happens in a useState initializer and
//      persisting in an onChange/onClick — neither of which a render can reach.
//   3. THE VALID LISTS still cover every option each CONTROL offers, lifted from the source. An
//      option the UI offers and the module cannot store would persist as nothing and fall back,
//      silently.
//   4. THE LOCALE RULE IS WRITTEN ONCE. It appeared three times — once driving `__set_DLOCALE`,
//      twice in the Settings preview — so the example a climber is SHOWN and the rule the app
//      formats with were two copies free to drift.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let failed = 0;
const ok = (m) => console.log("  ok   " + m);
const bad = (m) => { failed++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("\nBROKEN PROBE: " + m); process.exit(2); };

const M = await import(path.join(ROOT, "lib/display-prefs.js"));
for (const fn of ["loadUnits", "saveUnits", "loadDateFmt", "saveDateFmt", "dateFmtToLocale"]) {
  if (typeof M[fn] !== "function") dead(`lib/display-prefs.js does not export ${fn} — ANCHOR LOST`);
}
const { loadUnits, saveUnits, loadDateFmt, saveDateFmt, dateFmtToLocale,
        DEFAULT_UNITS, DEFAULT_DATE_FMT, VALID_UNITS, VALID_DATE_FMTS } = M;

// ── 1. THE LOGIC ────────────────────────────────────────────────────────────────────────────
console.log("1. each preference round-trips, defaults, and refuses junk\n");

// No localStorage at all — this is node, and it is also every SSR guard that renders the app.
if (typeof globalThis.localStorage !== "undefined") dead("something already defined localStorage; the no-storage case cannot be measured");
if (loadUnits() !== DEFAULT_UNITS || loadDateFmt() !== DEFAULT_DATE_FMT) bad("with no localStorage, a load did not return its default");
else ok(`no localStorage at all → the defaults, not a throw (the SSR path the guards take)`);
try { saveUnits("metric"); saveDateFmt("us"); ok("saving with no localStorage does not throw"); }
catch { bad("a save threw when localStorage does not exist"); }

const store = new Map();
const fake = (impl) => { globalThis.localStorage = impl; };
const working = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
};
fake(working);

const CASES = [
  { what: "units", load: loadUnits, save: saveUnits, dflt: DEFAULT_UNITS, pick: "metric", back: "imperial", junk: "furlongs" },
  { what: "dateFmt", load: loadDateFmt, save: saveDateFmt, dflt: DEFAULT_DATE_FMT, pick: "intl", back: "us", junk: "klingon" },
];

for (const c of CASES) {
  store.clear();
  if (c.load() !== c.dflt) bad(`${c.what}: an empty store did not return the default`);
  else ok(`${c.what}: an empty store → "${c.dflt}"`);

  c.save(c.pick);
  if (c.load() !== c.pick) bad(`${c.what}: round trip failed — stored ${c.pick}, read back ${c.load()}`);
  else ok(`${c.what}: "${c.pick}" survives a reload — the whole point`);

  c.save(c.back);
  if (c.load() !== c.back) bad(`${c.what}: switching back to ${c.back} did not persist`);
  else ok(`${c.what}: ...and switching back persists, so the control is not one-way`);

  // A user-writable key that survives deploys: shape-check on READ, not only on write.
  const key = [...store.keys()][0];
  store.set(key, c.junk);
  if (c.load() !== c.dflt) bad(`${c.what}: a tampered value ("${c.junk}") was returned as a preference`);
  else ok(`${c.what}: a tampered stored value falls back to the default`);

  store.clear();
  c.save(c.junk);
  if (store.size) bad(`${c.what}: saved an invalid value: ${[...store.entries()]}`);
  else ok(`${c.what}: refuses to write a value the app cannot read back`);
}

// The two preferences must not collide on one key.
store.clear();
saveUnits("metric"); saveDateFmt("intl");
if (store.size !== 2) bad(`the two preferences share a key — ${store.size} entr(ies) for two settings`);
else if (loadUnits() !== "metric" || loadDateFmt() !== "intl") bad("one preference overwrote the other");
else ok("units and dateFmt use separate keys and do not overwrite each other");

// Safari private mode and a full profile THROW rather than returning null.
fake({ getItem: () => { throw new Error("private mode"); }, setItem: () => { throw new Error("quota exceeded"); } });
if (loadUnits() !== DEFAULT_UNITS || loadDateFmt() !== DEFAULT_DATE_FMT) bad("a throwing localStorage did not fall back to the defaults");
else ok("a throwing localStorage (private mode) → the defaults, not an exception");
try { saveUnits("metric"); saveDateFmt("us"); ok("a throwing setItem (quota) is swallowed — a preference cannot take a screen down"); }
catch { bad("a save let a quota error escape"); }
delete globalThis.localStorage;

// ── 2. THE WIRING ───────────────────────────────────────────────────────────────────────────
console.log("\n2. App restores on mount and writes at the control\n");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

if (!/from "\.\/lib\/display-prefs"/.test(app)) bad("ClimbMatch.jsx does not import the display preferences");
else ok("ClimbMatch.jsx imports them");

// The LAZY form matters: `useState(loadX())` would read storage on every render, and a literal
// would not read it at all.
for (const [state, fn] of [["units", "loadUnits"], ["dateFmt", "loadDateFmt"]]) {
  const re = new RegExp(`\\[${state},set[A-Z]\\w*\\]=useState\\(${fn}\\)`);
  const eager = new RegExp(`\\[${state},set[A-Z]\\w*\\]=useState\\(${fn}\\(\\)\\)`);
  if (re.test(app)) ok(`${state} restores via a lazy initializer (read once, on mount)`);
  else if (eager.test(app)) bad(`useState(${fn}()) calls storage on EVERY render — pass the function, not its result`);
  else bad(`${state} does not initialise from ${fn} — the preference is not restored`);
}

if (/setUnits\(u\[0\]\);saveUnits\(u\[0\]\)/.test(app)) ok("the units toggle writes the choice beside setting it");
else bad("the units toggle does not call saveUnits — the choice is not persisted");

if (/setDateFmt\(e\.target\.value\);saveDateFmt\(e\.target\.value\)/.test(app)) ok("the date-format select writes the choice beside setting it");
else bad("the date-format select does not call saveDateFmt — the choice is not persisted");

// An effect on the state would ALSO fire on the restore, writing back what it just read.
if (/useEffect\([^)]*save(Units|DateFmt)/.test(app)) bad("a save is called from an effect — it will fire on the restore too");
else ok("...and neither writes from an effect, so a load is never mistaken for a choice");

// ── 3. THE VALID LISTS COVER THE CONTROLS ───────────────────────────────────────────────────
console.log("\n3. every option the controls offer can actually be stored\n");

/* Balance the array rather than matching a fixed shape: a pattern requiring exactly two options
   would die with ANCHOR LOST the moment a third was added, which is the case this exists to
   report. The anchor has to survive the change it is watching for. */
const at = app.indexOf(`[["imperial","`);
if (at < 0) dead("the units toggle's option list is not where it was — ANCHOR LOST, so this proved nothing");
let d = 0, end = -1;
for (let k = at; k < app.length; k++) {
  if (app[k] === "[") d++;
  else if (app[k] === "]" && --d === 0) { end = k + 1; break; }
}
if (end < 0) dead("the units toggle's option list does not close");
const unitOpts = [...app.slice(at, end).matchAll(/\["(\w+)","/g)].map((m) => m[1]);

// The date format is a <select>, so its options are <option value="…">.
const selAt = app.indexOf(`aria-label="Date and time format"`);
if (selAt < 0) dead("the date-format select is not where it was — ANCHOR LOST");
const selEnd = app.indexOf("</select>", selAt);
if (selEnd < 0) dead("the date-format select does not close");
const dateOpts = [...app.slice(selAt, selEnd).matchAll(/<option value="(\w+)"/g)].map((m) => m[1]);

for (const [what, offered, valid] of [["units", unitOpts, VALID_UNITS], ["dateFmt", dateOpts, VALID_DATE_FMTS]]) {
  if (offered.length < 2) dead(`parsed only ${offered.length} option(s) for ${what}`);
  const missing = offered.filter((o) => valid.indexOf(o) < 0);
  if (missing.length) bad(`${what}: the control offers ${missing.join(", ")}, which the module does not accept — those would persist as nothing`);
  else ok(`${what}: all ${offered.length} offered options (${offered.join(", ")}) are storable`);
  const extra = valid.filter((v) => offered.indexOf(v) < 0);
  if (extra.length) bad(`${what}: the module accepts ${extra.join(", ")}, which the control no longer offers — stale bookkeeping`);
  else ok(`${what}: ...and accepts nothing the control has stopped offering`);
}

// ── 4. ONE LOCALE RULE ──────────────────────────────────────────────────────────────────────
console.log("\n4. the locale rule is written once\n");
const inline = app.split(`dateFmt==="us"?"en-US"`).length - 1;
if (inline) bad(`the locale rule is still inlined ${inline} time(s) — the preview a climber SEES can drift from what the app formats with`);
else ok("no inline copy of the locale rule survives");
const uses = app.split("dateFmtToLocale(dateFmt)").length - 1;
if (uses < 3) bad(`only ${uses} site(s) call dateFmtToLocale — there were 3 copies, so one was missed`);
else ok(`all ${uses} sites derive the locale from one helper`);

// "auto" MUST yield undefined: toLocaleDateString reads that as "use the runtime's locale", which
// is what "Match my device" promises. A concrete tag there would silently override the device.
if (dateFmtToLocale("auto") !== undefined) bad(`dateFmtToLocale("auto") returned ${JSON.stringify(dateFmtToLocale("auto"))} — that overrides the device instead of matching it`);
else ok(`"auto" → undefined, which is what "Match my device" means to toLocaleDateString`);
if (dateFmtToLocale("us") !== "en-US" || dateFmtToLocale("intl") !== "en-GB") bad("dateFmtToLocale no longer maps us/intl to en-US/en-GB");
else ok("us → en-US and intl → en-GB");

console.log(`\n${failed ? "FAILED — " + failed + " assertion(s)" : "ok — both display preferences survive a reload and cannot take a screen down"}`);
process.exit(failed ? 1 : 0);
