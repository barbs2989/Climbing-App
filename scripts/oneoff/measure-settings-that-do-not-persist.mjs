#!/usr/bin/env node
// WHICH SETTINGS DOES A CLIMBER SET, AND WHICH SURVIVE A RELOAD?
//
// Asked of the whole Settings screen rather than of the one control somebody happened to notice.
// That is what found the answer being FOUR rather than one, and what separated the two that
// should persist from the two that must not.
//
// THIS SCRIPT'S FIRST VERSION WAS WRONG IN BOTH DIRECTIONS, AND WORTH RECORDING. It classified by
// REGEX PROXIMITY -- "does `localStorage` or `updateMyProfile` appear within 300 characters of
// this state name in ClimbMatch.jsx". That happened to be right while nothing persisted. The
// moment persistence moved into lib/units-pref.js and lib/date-pref.js (imported, so the name is
// nowhere near a storage call) it reported both FIXED settings as still volatile, and handed
// `showOnRanks` a false YES off an unrelated nearby match. A plausible table, every row wrong.
//
// So it resolves the useState INITIALISER through Babel instead: a setting persists when its
// initialiser calls a loader and a handler calls the matching saver. That is a fact about the
// code rather than about how close two strings happen to sit on one very long line.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });

// The controls the Settings screen actually offers, and what each is called on screen.
const SETTINGS = [
  // [state getter, label on screen, profiles column if it is an ACCOUNT setting]
  ["units", "Units (ft·mi / m·km)", null],
  ["dateFmt", "Date format (auto / US / intl)", null],
  ["showOnRanks", "Show me on leaderboards", null],
  ["notifPrefs", "Notification preferences", null],
  ["discoverable", "Listed in partner search", "discoverable"],
  ["showRealName", "Show my real name", "show_name"],
];
// Written as an object KEY in a payload, i.e. actually sent, not merely mentioned.
const dbSrc = src + fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");
const columnIsWritten = (col) => new RegExp("[{,]\\s*" + col + "\\s*:").test(dbSrc);

// Every useState in App, by the name it binds.
const states = new Map();
const calls = new Set();
traverse(ast, {
  VariableDeclarator(p) {
    const { id, init } = p.node;
    if (!id || id.type !== "ArrayPattern" || !init || init.type !== "CallExpression") return;
    if ((init.callee.name || "") !== "useState") return;
    const get = id.elements[0] && id.elements[0].name;
    if (!get) return;
    const arg = init.arguments[0];
    states.set(get, { init: arg ? src.slice(arg.start, arg.end) : "undefined", node: arg });
  },
  CallExpression(p) { if (p.node.callee.name) calls.add(p.node.callee.name); },
});

// A loader is any function the initialiser CALLS or NAMES -- `useState(loadDateFmt)` passes it
// by reference, `useState(() => readPref(...))` calls it inside a thunk. Both are the shape.
const loaderIn = (info) => {
  if (!info || !info.node) return null;
  const found = [];
  const scan = (n) => {
    if (!n || typeof n !== "object") return;
    if (n.type === "Identifier" && /^(load|read)[A-Z]/.test(n.name)) found.push(n.name);
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(scan);
      else if (v && typeof v === "object" && v.type) scan(v);
    }
  };
  scan(info.node);
  return found[0] || null;
};

console.log("SETTING                            INITIALISER              PERSISTS?  HOW");
let volatile_ = 0, persisted = 0, other = 0;
for (const [get, label, column] of SETTINGS) {
  const info = states.get(get);
  // An ACCOUNT setting persists through its column, whatever its useState default looks like.
  if (column) {
    if (columnIsWritten(column)) { console.log(label.padEnd(34), (info ? "(hydrated)" : "(not App useState)").padEnd(24), "YES        profiles." + column); persisted++; }
    else { console.log(label.padEnd(34), "".padEnd(24), "BROKEN     declared profiles." + column + " is never written — this declaration is stale, or the write was lost"); other++; }
    continue;
  }
  if (!info) { console.log(label.padEnd(34), "(not App useState)".padEnd(24), "?          neither a loader nor a declared column — read it"); other++; continue; }
  const loader = loaderIn(info);
  // A loader with no matching saver is half a feature: it would read a value nothing writes.
  const saver = loader ? [...calls].find((c) => /^(save|write)[A-Z]/.test(c) && c.toLowerCase().includes(loader.toLowerCase().replace(/^(load|read)/, ""))) : null;
  const shown = info.init.length > 22 ? info.init.slice(0, 21) + "…" : info.init;
  if (loader && saver) { console.log(label.padEnd(34), shown.padEnd(24), "YES        " + loader + "/" + saver); persisted++; }
  else if (loader) { console.log(label.padEnd(34), shown.padEnd(24), "HALF       " + loader + " with no saver — it reads a value nothing writes"); other++; }
  else { console.log(label.padEnd(34), shown.padEnd(24), "NO         resets on reload"); volatile_++; }
}
console.log(`\n${persisted} persisted, ${volatile_} volatile, ${other} needing a look`);

console.log(`
The two that are still volatile are DELIBERATE, and they only look like the same defect:

  showOnRanks is \`showOnRanks?[me]:[]\` — it decides whether YOU are appended to a leaderboard
  built CLIENT-SIDE from seed CLIMBERS. It hides you from nobody, while its label reads as a
  claim about what other people see, so storing it would durably keep a promise the app cannot
  keep. It also defaults to true, so turning it off is undone on the next load.

  notifPrefs is client-only for the same reason.

Both need a profiles column to mean what their labels say — migration, RLS, and a read that can
fail. That is feature work, not polish. See memory/display-settings-now-persist-account-ones-do-not.md.`);
