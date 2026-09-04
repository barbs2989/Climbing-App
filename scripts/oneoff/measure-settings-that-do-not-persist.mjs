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
  ["units", "Units (ft·mi / m·km)"],
  ["dateFmt", "Date format (auto / US / intl)"],
  ["showOnRanks", "Show me on leaderboards"],
  ["notifPrefs", "Notification preferences"],
  ["discoverable", "Listed in partner search"],
  ["showRealName", "Show my real name"],
];
// Written as an object KEY in a payload, i.e. actually sent rather than merely mentioned.
const dbSrc = src + fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");
const columnIsWritten = (col) => new RegExp("[{,]\\s*" + col + "\\s*:").test(dbSrc);

// Every useState in App, by the name it binds.
const states = new Map();
const calls = new Set();
const hydratedFrom = new Map(); // setter name -> the column it is restored from
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
  CallExpression(p) {
    const name = p.node.callee.name;
    if (!name) return;
    calls.add(name);
    // setX(row.some_column ...) is the restore-on-reload link, derived rather than declared.
    if (/^set[A-Z]/.test(name)) {
      const cols = [];
      const scan = (n) => {
        if (!n || typeof n !== "object") return;
        if (n.type === "MemberExpression" && n.property && n.property.name && /_/.test(n.property.name)) cols.push(n.property.name);
        for (const k of Object.keys(n)) {
          const v = n[k];
          if (Array.isArray(v)) v.forEach(scan);
          else if (v && typeof v === "object" && v.type) scan(v);
        }
      };
      p.node.arguments.forEach(scan);
      if (cols.length) hydratedFrom.set(name, cols[0]);
    }
  },
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
for (const [get, label] of SETTINGS) {
  const info = states.get(get);
  // ACCOUNT path, derived: the setter is called with an expression reading a snake_case column.
  const column = hydratedFrom.get("set" + get[0].toUpperCase() + get.slice(1));
  if (column) {
    if (columnIsWritten(column)) { console.log(label.padEnd(34), (info ? "(hydrated)" : "(not App useState)").padEnd(24), "YES        profiles." + column); persisted++; }
    else { console.log(label.padEnd(34), "".padEnd(24), "HALF       restored from profiles." + column + ", but nothing writes it — the choice is read and never saved"); other++; }
    continue;
  }
  if (!info) {
    // Derive the likely column from the getter, then require it to be WRITTEN somewhere.
    const guess = get.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
    if (columnIsWritten(guess)) { console.log(label.padEnd(34), "(read from the row)".padEnd(24), "YES        profiles." + guess + " (read at its render site, not via a setter)"); persisted++; }
    else { console.log(label.padEnd(34), "(not App useState)".padEnd(24), "?          no App state and no profiles." + guess + " write found — read it before trusting this row"); other++; }
    continue;
  }
  const loader = loaderIn(info);
  // A loader with no matching saver is half a feature: it would read a value nothing writes.
  const saver = loader ? [...calls].find((c) => /^(save|write)[A-Z]/.test(c) && c.toLowerCase().includes(loader.toLowerCase().replace(/^(load|read)/, ""))) : null;
  const shown = info.init.length > 22 ? info.init.slice(0, 21) + "…" : info.init;
  if (loader && saver) { console.log(label.padEnd(34), shown.padEnd(24), "YES        " + loader + "/" + saver); persisted++; }
  else if (loader) { console.log(label.padEnd(34), shown.padEnd(24), "HALF       " + loader + " with no saver — it reads a value nothing writes"); other++; }
  else { console.log(label.padEnd(34), shown.padEnd(24), "NO         resets on reload"); volatile_++; }
}
console.log(`\n${persisted} persisted, ${volatile_} volatile, ${other} needing a look`);

// No hard-coded count in the prose: this file has now been caught three times by a number or a
// declaration that was true when it was written. Say it per row, from what was measured.
if (volatile_) {
  console.log("\nStill volatile:");
  for (const [get, label] of SETTINGS) {
    const info = states.get(get);
    if (!info || hydratedFrom.get("set" + get[0].toUpperCase() + get.slice(1)) || loaderIn(info)) continue;
    console.log(`  ${label} — client-only. It needs a profiles column to survive a reload for an
  ACCOUNT, or a lib/*-pref module if it is really a DEVICE display preference. Which one it wants
  is a question about who the setting is FOR, not about storage.`);
  }
}
console.log(`
Read a NO here as "nothing restores this", not as "somebody forgot". showOnRanks was volatile for
one afternoon and #1595 gave it profiles.show_on_ranks; this script reported it as still resetting
because the column was DECLARED here rather than derived. It derives it now.
See memory/display-settings-now-persist-account-ones-do-not.md.`);
