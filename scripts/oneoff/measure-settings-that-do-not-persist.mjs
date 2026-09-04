#!/usr/bin/env node
// WHICH SETTINGS DOES A CLIMBER SET, AND WHICH SURVIVE A RELOAD?
//
// THIS FILE HAS BEEN CONFIDENTLY WRONG FOUR TIMES, EACH BY A DIFFERENT MECHANISM, AND EVERY ONE
// WAS A FACT RECORDED AT THE MOMENT OF WRITING IN A REPO WHERE SESSIONS FIX THINGS IN PARALLEL:
//
//   1. regex proximity         -- right until persistence moved into an imported module, after
//                                 which it called both FIXED settings still volatile
//   2. a declared column       -- right until #1595 gave showOnRanks a real one, after which it
//                                 called a WORKING account setting volatile
//   3. a count in the prose    -- "the two that are still volatile" was one by the time it merged
//   4. a declared SETTING LIST -- the subject of this rewrite. Classification was derived; the
//                                 POPULATION was still six names typed by hand, against FOURTEEN
//                                 labelled controls on the screen. Half of Settings -- most of it
//                                 privacy: who can see your profile, who can message you, who can
//                                 invite you to a crew -- had never been asked the question.
//
// So the controls are read off the Settings overlay, and each is linked to its state through the
// JSX that renders it. Nothing here is a list of what somebody believed was on the screen.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";

const traverse = _traverse.default || _traverse;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const dbSrc = src + fs.readFileSync(path.join(ROOT, "lib", "db.js"), "utf8");
const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });

// ── The Settings overlay's extent, by balancing braces from its own gate.
const open = src.indexOf("{settingsOpen&&<div");
if (open < 0) { console.error("ANCHOR LOST: the settings overlay gate moved — this run would measure nothing"); process.exit(1); }
let depth = 0, end = -1;
for (let i = open; i < src.length; i++) {
  if (src[i] === "{") depth++;
  else if (src[i] === "}" && --depth === 0) { end = i; break; }
}
if (end < 0) { console.error("ANCHOR LOST: the settings overlay does not close"); process.exit(1); }
if (end - open < 5000) { console.error(`the settings region parsed as ${end - open} chars — too small to be the screen`); process.exit(1); }

// ── Every control in it, and the STATE each one reads. A switch announces its state in
//    aria-checked and a select in value; both are the binding we need, taken from the markup
//    that renders the control rather than from a mapping somebody wrote down.
const CHROME = new Set(["Settings", "Close", "Back"]);
const controls = [];
traverse(ast, {
  JSXOpeningElement(p) {
    const { start } = p.node;
    if (start < open || start > end) return;
    const attr = (n) => p.node.attributes.find((a) => a.name && a.name.name === n);
    const label = attr("aria-label");
    if (!label || !label.value || label.value.type !== "StringLiteral") return;
    if (CHROME.has(label.value.value)) return;
    // Does an ENCLOSING conditional gate this control off? Ancestors, never character distance.
    let gate = null;
    for (let up = p.parentPath; up; up = up.parentPath) {
      const n = up.node;
      const test = n && (n.type === "ConditionalExpression" ? n.test
        : n.type === "LogicalExpression" && n.operator === "&&" ? n.left : null);
      if (!test) continue;
      const names = [];
      const scan = (x) => {
        if (!x || typeof x !== "object") return;
        if (x.type === "Identifier") names.push(x.name);
        for (const k of Object.keys(x)) {
          const v = x[k];
          if (Array.isArray(v)) v.forEach(scan);
          else if (v && typeof v === "object" && v.type) scan(v);
        }
      };
      scan(test);
      const flag = names.find((x) => /^[A-Z][A-Z0-9_]+$/.test(x));
      if (flag) { gate = flag; break; }
    }
    const bound = attr("aria-checked") || attr("value");
    let state = null;
    if (bound && bound.value && bound.value.type === "JSXExpressionContainer") {
      const scan = (n) => {
        if (!n || typeof n !== "object" || state) return;
        if (n.type === "Identifier") { state = n.name; return; }
        for (const k of Object.keys(n)) {
          const v = n[k];
          if (Array.isArray(v)) v.forEach(scan);
          else if (v && typeof v === "object" && v.type) scan(v);
        }
      };
      scan(bound.value.expression);
    }
    controls.push({ label: label.value.value, state, gate });
  },
});
if (controls.length < 8) { console.error(`only ${controls.length} controls found in Settings — the scan broke`); process.exit(1); }

// ── How a value is restored. Two shapes, both DERIVED rather than declared:
//    DEVICE  — the useState initialiser names a load*/read* helper (lib/units-pref, lib/date-pref)
//    ACCOUNT — the SETTER is called with an expression reading a snake_case column off a row
const states = new Map(), calls = new Set(), hydratedFrom = new Map();
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

const loaderIn = (info) => {
  if (!info || !info.node) return null;
  let found = null;
  const scan = (n) => {
    if (!n || typeof n !== "object" || found) return;
    if (n.type === "Identifier" && /^(load|read)[A-Z]/.test(n.name)) { found = n.name; return; }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(scan);
      else if (v && typeof v === "object" && v.type) scan(v);
    }
  };
  scan(info.node);
  return found;
};
const coreSrc = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const flagIsOff = (flag) => new RegExp(flag + "\\s*=\\s*false\\b").test(coreSrc) || new RegExp(flag + "\\s*=\\s*false\\b").test(src);
const columnIsWritten = (col) => new RegExp("[{,]\\s*" + col + "\\s*:").test(dbSrc);
const setterOf = (g) => "set" + g[0].toUpperCase() + g.slice(1);
const pad = (x, n) => String(x === null || x === undefined ? "—" : x).padEnd(n);

console.log(`${controls.length} labelled controls on the Settings screen\n`);
console.log("CONTROL                                   STATE                PERSISTS?  HOW");
let persisted = 0, volatile_ = 0, unknown = 0;
const stillVolatile = [];
let gatedOff = 0;
for (const c of controls) {
  // A control that renders as null cannot reset on anybody. Report it as absent, not as volatile.
  if (c.gate && flagIsOff(c.gate)) {
    console.log(pad(c.label, 42), pad(c.state, 21), "n/a        not rendered — " + c.gate + " is false");
    gatedOff++; continue;
  }
  if (!c.state) { console.log(pad(c.label, 42), pad(null, 21), "?          no state bound to this control — read it"); unknown++; continue; }
  const col = hydratedFrom.get(setterOf(c.state));
  if (col) {
    if (columnIsWritten(col)) { console.log(pad(c.label, 42), pad(c.state, 21), "YES        profiles." + col); persisted++; }
    else { console.log(pad(c.label, 42), pad(c.state, 21), "HALF       restored from profiles." + col + " but nothing writes it"); unknown++; }
    continue;
  }
  const info = states.get(c.state);
  const loader = info ? loaderIn(info) : null;
  if (loader) {
    const saver = [...calls].find((x) => /^(save|write)[A-Z]/.test(x) && x.toLowerCase().includes(loader.toLowerCase().replace(/^(load|read)/, "")));
    if (saver) { console.log(pad(c.label, 42), pad(c.state, 21), "YES        " + loader + "/" + saver); persisted++; }
    else { console.log(pad(c.label, 42), pad(c.state, 21), "HALF       " + loader + " with no saver"); unknown++; }
    continue;
  }
  // Not App state and not hydrated through a setter: it may be read straight off the row at its
  // render site. Derive the column and REQUIRE it to be written — an absence is not evidence.
  if (!info) {
    const guess = c.state.replace(/[A-Z]/g, (x) => "_" + x.toLowerCase());
    if (columnIsWritten(guess)) { console.log(pad(c.label, 42), pad(c.state, 21), "YES        profiles." + guess + " (read at its render site)"); persisted++; }
    else { console.log(pad(c.label, 42), pad(c.state, 21), "?          not App state, no profiles." + guess + " write — read it"); unknown++; }
    continue;
  }
  console.log(pad(c.label, 42), pad(c.state, 21), "NO         resets on reload");
  volatile_++; stillVolatile.push(c);
}
console.log(`\n${persisted} persisted, ${volatile_} volatile, ${unknown} needing a look, ${gatedOff} not rendered`);
if (gatedOff) {
  console.log(`
${gatedOff} control(s) are behind a build flag that is FALSE, so they render as null. They are not
settings that reset — they are settings nobody can reach. Whether they should exist at all is a
product question; see memory/privacy-switches-that-cannot-reach-anyone.md.`);
}
if (stillVolatile.length) {
  console.log("\nStill volatile — each needs a profiles column to follow the ACCOUNT, or a lib/*-pref");
  console.log("module if it is really a DEVICE preference. Which one it wants is a question about who");
  console.log("the setting is FOR, and choosing a storage mechanism does not answer it:");
  for (const c of stillVolatile) console.log(`  ${c.label}  (${c.state})`);
}
console.log(`
The units toggle carries no aria-label — it is a pair of buttons reading "ft · mi" / "m · km" —
so it is absent from this table by construction. It persists (loadUnits/saveUnits, #1589).
Giving it a label would be a real improvement and is a change to the app, not to this script.

Read a NO as "nothing restores this", never as "somebody forgot". See
memory/display-settings-now-persist-account-ones-do-not.md.`);
