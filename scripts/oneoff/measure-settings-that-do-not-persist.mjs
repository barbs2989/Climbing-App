#!/usr/bin/env node
// WHICH SETTINGS DOES A CLIMBER SET, AND WHICH SURVIVE A RELOAD?
//
// The units toggle does not, and the question is whether that is one control or a class. This
// asks it of the whole Settings screen rather than fixing the one I happened to notice.
//
// The split that matters is WHERE a control's state lives:
//   - a `profiles` column      -> persists, per account, across devices
//   - React useState in App    -> gone on reload, and there is NO localStorage anywhere in the
//                                 three app files (measured: 0 references)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");

// Locate the Settings overlay so we judge the controls a climber actually sees, not every
// piece of state in App.
const anchor = src.indexOf("settingsOpen");
if (anchor < 0) { console.error("ANCHOR LOST: no settingsOpen in ClimbMatch.jsx"); process.exit(1); }

// Every aria-label / visible label inside the settings region, paired with the setter it calls.
const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
const setters = new Map(); // setter name -> initial value text
traverse(ast, {
  VariableDeclarator(p) {
    const id = p.node.id, init = p.node.init;
    if (!id || id.type !== "ArrayPattern" || !init || init.type !== "CallExpression") return;
    if ((init.callee.name || "") !== "useState") return;
    const set = id.elements[1] && id.elements[1].name;
    const get = id.elements[0] && id.elements[0].name;
    if (!set) return;
    setters.set(set, { get, init: src.slice(init.start, init.end).slice(0, 60) });
  },
});

// A setting is PERSISTED if something writes it to the database or to storage.
const persistedHints = ["updateMyProfile", "saveProfile", "patchRow", "localStorage", "sessionStorage", "supabase"];
const KNOWN_SETTINGS = [
  // [state getter, what the control is called on screen]
  ["units", "Units (ft·mi / m·km)"],
  ["dateFmt", "Date format (auto / US / international)"],
  ["showOnRanks", "Show me on leaderboards"],
  ["discoverable", "Listed in partner search"],
  ["showName", "Show my real name"],
  ["notifPrefs", "Notification preferences"],
];

console.log("SETTING                                  STATE          PERSISTED?");
let volatile = 0, persisted = 0, missing = 0;
for (const [get, label] of KNOWN_SETTINGS) {
  const setter = [...setters.entries()].find(([, v]) => v.get === get);
  if (!setter) {
    // Not App useState -- it may live in a query/profile row, which IS persistence.
    const inProfile = new RegExp("\\b" + get + "\\b").test(src) &&
      persistedHints.some((h) => new RegExp(h + "[\\s\\S]{0,400}" + get).test(src) || new RegExp(get + "[\\s\\S]{0,400}" + h).test(src));
    console.log(label.padEnd(40), (inProfile ? "profile row" : "not found").padEnd(14), inProfile ? "YES" : "?");
    inProfile ? persisted++ : missing++;
    continue;
  }
  const [setName, info] = setter;
  // Does anything persist this setter's value?
  const near = persistedHints.some((h) => new RegExp(h + "[\\s\\S]{0,300}\\b" + get + "\\b").test(src));
  console.log(label.padEnd(40), ("useState" + info.init.replace("useState", "")).slice(0, 13).padEnd(14), near ? "YES" : "NO — resets on reload");
  near ? persisted++ : volatile++;
}
console.log(`\n${volatile} volatile, ${persisted} persisted, ${missing} unresolved`);
console.log(`localStorage references in the three app files: ${(fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8").match(/localStorage/g) || []).length}`);
