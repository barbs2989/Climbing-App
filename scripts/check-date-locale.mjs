#!/usr/bin/env node
// check:date-locale — EVERY DATE OR TIME ON SCREEN IS FORMATTED THROUGH THE CLIMBER'S PREFERENCE.
//
// Settings offers a date format (auto / US / international, lib/date-pref.js) and App publishes
// it as DLOCALE, which the app's date formatters pass to toLocaleDateString / toLocaleTimeString.
// A call that passes `undefined` instead takes the DEVICE's locale, and one that passes a string
// takes whatever the author's own locale was: both render a climber who chose day-month-year a
// month-day-year date, on that one surface, with every neighbour honouring the choice.
//
// docs/guards/units-and-formatting.md records the first census of this class: five surfaces
// rendering a raw ISO date, found by reading a CI capture. The census of 2026-10-07 found NINE more
// calls passing `undefined` — the relative-time helper in core, three on the route page, four in
// the alpine conditions card, one in the map kit — written after that entry, each in a file whose
// other formatters pass DLOCALE. A convention everybody mostly follows is exactly what a guard is
// for: nothing else reads the first argument of these calls.
//
// WHAT COUNTS. A call to .toLocaleDateString or .toLocaleTimeString whose first argument is
// missing, the identifier `undefined`, `null`, or a string literal. `toLocaleString()` is NOT
// included: in this app it formats NUMBERS (route counts, elevations), and a number's thousands
// separator is not the date preference. An identifier (DLOCALE, a `locale` prop, a call such as
// currentDateLocale()) passes — this guard reads the call, not the value, and cannot tell that
// a `locale` prop was handed down empty; FireMap's is passed from App, and that is a reading.
//
// Static — Babel parses the app files and lib/, no browser, no database — so it sits in
// `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const METHODS = new Set(["toLocaleDateString", "toLocaleTimeString"]);

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const dead = (m) => { console.log("  DEAD  " + m + " — refusing to report a clean result"); process.exit(1); };

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx?|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}
const files = ["main.jsx", "ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "EnrichmentPanels.jsx"]
  .map((f) => path.join(ROOT, f)).filter((f) => fs.existsSync(f))
  .concat(walk(path.join(ROOT, "lib")));
if (files.length < 20) dead(`only ${files.length} app source files found — the walk is broken`);

let calls = 0;
const describe = (a) => !a ? "no argument" : a.type === "Identifier" ? a.name : a.type === "StringLiteral" ? JSON.stringify(a.value) : a.type === "NullLiteral" ? "null" : a.type;
for (const f of files) {
  const rel = path.relative(ROOT, f);
  const code = fs.readFileSync(f, "utf8");
  let ast;
  try { ast = parse(code, { sourceType: "module", plugins: ["jsx"], errorRecovery: true }); }
  catch (e) { dead(`${rel} does not parse: ${e.message}`); }
  traverse(ast, {
    CallExpression(p) {
      const c = p.node.callee;
      if (c.type !== "MemberExpression" || c.computed || c.property.type !== "Identifier" || !METHODS.has(c.property.name)) return;
      calls++;
      const a = p.node.arguments[0];
      const bad = !a || (a.type === "Identifier" && a.name === "undefined") || a.type === "NullLiteral" || a.type === "StringLiteral";
      if (bad) fail(`${rel}:${p.node.loc.start.line}: .${c.property.name}(${describe(a)}, …) ignores the climber's date preference — pass DLOCALE (or the locale handed down to this module)`);
    },
  });
}
// Fails closed: the app formats dates in dozens of places; a parse that found almost none is
// not a clean tree, it is a guard reading the wrong thing.
if (calls < 20) dead(`only ${calls} toLocaleDateString/toLocaleTimeString calls found across ${files.length} files`);
if (!failures) ok(`all ${calls} date and time formatters across ${files.length} files pass a locale`);

if (failures) { console.log(`\ncheck:date-locale: ${failures} failure(s)`); process.exit(1); }
console.log("ok — check:date-locale");
