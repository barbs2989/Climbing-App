#!/usr/bin/env node
// A CONTRIBUTE-FORM SUMMARY LINE MUST NOT PRINT "[object Object]".
//
// `objStr` builds the line every keyed editor OPENS WITH, and it used to do a raw `String(v)`.
// `weather` is an object on 498 of the 504 routes carrying seasonal_hazards, so the form showed
//
//     Exposure: … · Weather: [object Object] · Avalanche forecast zone: …
//
// on 100% of them. Not cosmetic: that same line feeds `wasEmpty`, which decides whether ONE
// climber can fill a blank or THREE must agree, and a form opening on [object Object] invites a
// climber to replace a real value with whatever they can actually see.
//
// WHY THIS IS A GATE AND NOT A PROBE. The fix is a string literal (`weather` -> `weather.typical`)
// and a call (`String(v)` -> `fmtSlingVal(v)`). It introduces NO NEW IDENTIFIER, so
// audit:silent-reverts — which tracks named definitions — is blind to a stale-base squash undoing
// it, and says so in its own closing caveat. Same reasoning as check:verification-fallback and
// check:topo-outage-copy, both of which exist to gate a fix of exactly this shape.
//
// STATIC: it executes two pure functions lifted from source. No browser, no database, no dev
// server — so it sits in `npm run build` and runs on every machine rather than only in CI.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const die = (w) => { console.error(`\ncheck:contrib-summary FAILED — ${w}\n`); process.exit(1); };

function liftBody(src, opener, label) {
  const i = src.indexOf(opener);
  if (i < 0) die(`ANCHOR LOST: ${label} (${JSON.stringify(opener)}). The summary line went unchecked, so this run proved less than it claims.`);
  let depth = 0, k = src.indexOf("{", i);
  if (k < 0) die(`ANCHOR LOST: no brace after ${label}`);
  for (; k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}") { depth--; if (!depth) break; }
  }
  if (depth !== 0) die(`could not balance braces for ${label}`);
  return src.slice(i, k + 1);
}

const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const ok = fs.readFileSync(path.join(ROOT, "lib/objKeys.js"), "utf8");

// The three pieces the summary line is built from.
const dgetSrc = liftBody(rd, "const _dget=", "_dget");
const slingValSrc = liftBody(rd, "function fmtSlingVal(", "fmtSlingVal");
const objStrSrc = liftBody(rd, "objStr=function(", "objStr");

let objStr;
try {
  objStr = new Function("var " + dgetSrc.replace(/^const /, "") + ";\n" + slingValSrc +
    "\nvar " + objStrSrc + ";\nreturn objStr;")();
} catch (e) { die("the lifted source did not evaluate: " + (e && e.message)); }
if (typeof objStr !== "function") die("objStr did not lift as a function");

// Prove the lift on a shape whose answer is not in doubt, BEFORE trusting a verdict. Without
// this, a lift that returned a broken function would report every spec clean.
if (objStr([["a", "A"]], { a: "plain" }) !== "A: plain") {
  die("the lifted objStr does not format a flat string — the lift is wrong, not the app");
}

// Every key spec the contribute form offers, read from OBJ_KEYS so a new field is covered
// without editing this guard.
const om = /OBJ_KEYS=\{([^}]*)\}/.exec(rd);
if (!om) die("ANCHOR LOST: OBJ_KEYS in RouteDetail.jsx");
const pairs = [...om[1].matchAll(/([A-Za-z]+):([A-Z_]+)/g)].map((x) => [x[1], x[2]]);
if (pairs.length < 8) die(`parsed only ${pairs.length} keyed field(s) from OBJ_KEYS — a short parse would make every check below vacuous`);

function specKeys(name) {
  const i = ok.indexOf(name + "=[");
  if (i < 0) die(`ANCHOR LOST: ${name} in lib/objKeys.js`);
  let depth = 0, k = ok.indexOf("[", i), end = k;
  for (; end < ok.length; end++) {
    if (ok[end] === "[") depth++;
    else if (ok[end] === "]") { depth--; if (!depth) break; }
  }
  const keys = [...ok.slice(k, end + 1).matchAll(/\[\s*"([^"]+)"/g)].map((x) => x[1]);
  if (!keys.length) die(`${name} parsed to zero keys`);
  return keys;
}

// Build a value where EVERY offered key holds a nested object, including through a dotted path.
function nest(keys) {
  const o = {};
  for (const k of keys) {
    const parts = k.split(".");
    let cur = o;
    for (let i = 0; i < parts.length - 1; i++) cur = (cur[parts[i]] = cur[parts[i]] || {});
    cur[parts[parts.length - 1]] = { detail: "nested value", note: "second leaf" };
  }
  return o;
}

let checked = 0, fails = 0;
for (const [field, specName] of pairs) {
  const keys = specKeys(specName);
  const line = objStr(keys.map((k) => [k, k]), nest(keys));
  checked++;
  if (String(line).includes("[object Object]")) {
    console.error(`  FAIL  ${field}: a nested value prints raw — ${String(line).slice(0, 140)}`);
    fails++;
  } else if (!String(line).includes("nested value")) {
    // Flattening must not DROP the content either; that would be a different defect wearing the
    // same clean output.
    console.error(`  FAIL  ${field}: a nested value lost its content — ${String(line).slice(0, 140)}`);
    fails++;
  }
}
if (checked !== pairs.length) die(`checked ${checked} of ${pairs.length} field(s)`);

/* DECLARED PINS — keys the CATALOG stores as objects, which must therefore be offered as a DOTTED
   sub-key rather than bare. The universal test above is the fail-safe; this is the specific
   regression. A bare key here is not detectably wrong from source alone (the value's shape lives
   in the database), so it is declared with the measurement that justified it.
   A pin naming a key that is no longer offered at all fails as STALE, so the list cannot rot. */
const DOTTED = [
  { spec: "SEASHAZ_KEYS", bare: "weather", need: "weather.typical",
    why: "object on 498 of 504 routes carrying seasonal_hazards (measured 2026-09-02)" },
];
for (const p of DOTTED) {
  const keys = specKeys(p.spec);
  if (keys.includes(p.bare)) {
    console.error(`  FAIL  ${p.spec} offers the bare key "${p.bare}" — ${p.why}`);
    fails++;
  }
  if (!keys.includes(p.need)) {
    console.error(`  FAIL  ${p.spec} no longer offers "${p.need}" — stale pin, or the sub-key a climber edits was removed`);
    fails++;
  }
}

if (fails) {
  console.error(`\ncheck:contrib-summary: ${fails} failure(s).`);
  console.error(`The keyed editor OPENS on this line, and it also feeds wasEmpty — so a climber is`);
  console.error(`invited to replace a real value with whatever they can actually see.`);
  process.exit(1);
}
console.log(`check:contrib-summary ok — ${checked} keyed field(s); a nested value flattens readably in all of them, and ${DOTTED.length} declared pin(s) hold.`);
