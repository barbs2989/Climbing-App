// Prove the policy edit changed exactly what it meant to, by comparing the PARSED arrays
// before and after -- the rule CLAUDE.md states for these documents. A line diff cannot answer
// it: all three arrays live on single lines of ~10,000 characters, where an edit that swallowed
// a neighbouring entry renders identically to one that did not.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const balanced = (src, start) => {
  let d = 0, q = null, esc = false;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (q) { if (esc) { esc = false; continue; } if (c === "\\") { esc = true; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "[") d++; else if (c === "]") { d--; if (!d) return src.slice(start, i + 1); }
  }
  throw new Error("unbalanced");
};
const pull = (src, needle, label) => {
  const at = src.indexOf(needle);
  if (at < 0) throw new Error("ANCHOR LOST: " + label);
  const v = new Function("return " + balanced(src, src.indexOf("[", at)))();
  if (!Array.isArray(v) || !v.length) throw new Error("empty: " + label);
  return v;
};
const parse = (core, app) => ({
  TERMS: pull(core, "const TERMS=", "Terms"),
  PRIVACY: pull(core, "const PRIVACY=", "Privacy"),
  SHEET: pull(app.slice(app.indexOf('aria-label="Privacy"')), '{[["What we store"', "sheet"),
});

const at = (ref) => {
  const g = (f) => execFileSync("git", ["show", `${ref}:${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 });
  return parse(g("ClimbMatchCore.jsx"), g("ClimbMatch.jsx"));
};
const now = parse(fs.readFileSync(ROOT + "/ClimbMatchCore.jsx", "utf8"), fs.readFileSync(ROOT + "/ClimbMatch.jsx", "utf8"));
const before = at("origin/main");

let bad = 0;
const ok = (m) => console.log("  ok    " + m);
const fail = (m) => { console.log("  FAIL  " + m); bad++; };

// Which entries THIS change is allowed to touch. Passed on the command line so the script
// survives its first use: pinned to one edit's set, it goes stale the moment that edit merges
// and then reports "was meant to change and did not" about work that is already on main --
// the rotting-baseline shape recorded for injection harnesses.
//   node scripts/oneoff/verify-policy-edit.mjs "PRIVACY/What we collect" "SHEET/Age"
const EXPECTED = new Set(process.argv.slice(2).length ? process.argv.slice(2)
  : ["PRIVACY/What we collect", "PRIVACY/Data retention", "PRIVACY/Sharing with others", "SHEET/What we don't do"]);
/* ...AND THE COMMENT ABOVE PREDICTED ITS OWN FAILURE WITHOUT PREVENTING IT. The default set is
   ONE historical edit's, so running this bare after that edit merged reports "was meant to change
   and did not" about work that is already on main — the rotting baseline it warns of, committed by
   its own default. Run with no arguments it is a SPENT one-shot, and that is a different verdict
   from a defect: `origin/main` already contains the change, so there is nothing left to compare.
   Saying so is not a pass either — the gone/present assertions below stay meaningful forever and
   still run, and the "changed and was NOT meant to" direction is still fatal. */
const SPENT = !process.argv.slice(2).length &&
  [...EXPECTED].every((key) => {
    const [k, ...rest] = key.split("/"); const title = rest.join("/");
    const i = (now[k] || []).findIndex((x) => x[0] === title);
    return i >= 0 && before[k] && before[k][i] && before[k][i][1] === now[k][i][1];
  });
if (SPENT) console.log("  SPENT origin/main already carries this edit — the before/after half has nothing to compare.\n        Pass the entry keys of a NEW edit to use it again.");
for (const k of ["TERMS", "PRIVACY", "SHEET"]) {
  if (before[k].length === now[k].length) ok(`${k}: still ${now[k].length} entries`);
  else { fail(`${k}: ${before[k].length} entries -> ${now[k].length}`); continue; }
  const tb = before[k].map((x) => x[0]).join("|"), ta = now[k].map((x) => x[0]).join("|");
  if (tb === ta) ok(`${k}: titles and order unchanged`);
  else fail(`${k}: titles changed\n        was: ${tb}\n        now: ${ta}`);
  for (let i = 0; i < now[k].length; i++) {
    const key = `${k}/${now[k][i][0]}`;
    const changed = before[k][i][1] !== now[k][i][1];
    if (changed && !EXPECTED.has(key)) fail(`${key} changed and was NOT meant to`);
    if (!changed && EXPECTED.has(key) && !SPENT) fail(`${key} was meant to change and did not`);
  }
}
// The claims that were false must be gone, not merely outnumbered.
const flat = JSON.stringify(now);
const DEFAULTS = !process.argv.slice(2).length;
for (const dead of DEFAULTS ? ["then delete or anonymize it", "basic device and usage data", "(hosting, maps)"] : []) {
  if (flat.includes(dead)) fail(`the untrue phrasing survives: ${JSON.stringify(dead)}`);
  else ok(`gone: ${JSON.stringify(dead)}`);
}
for (const live of DEFAULTS ? ["Deletion is not automated", "the mapping library", "photography used around the app", "We do not run analytics"] : []) {
  if (flat.includes(live)) ok(`present: ${JSON.stringify(live)}`);
  else fail(`missing: ${JSON.stringify(live)}`);
}
/* THE VERSION IS COMPARED, NOT PINNED. This tested for the literal "2026-08-19" — the version at
   the time of that one edit — so it reported "POLICY_VERSION not bumped" the moment the next edit
   bumped it, which is the opposite of what it means. The durable claim is that a policy change
   carries a NEWER version than the base has, so read both. */
const verOf = (src) => { const m = /POLICY_VERSION\s*=\s*"([^"]+)"/.exec(src); return m ? m[1] : null; };
const polNow = verOf(fs.readFileSync(ROOT + "/lib/policy.js", "utf8"));
let polBefore = null;
try { polBefore = verOf(execFileSync("git", ["show", "origin/main:lib/policy.js"], { cwd: ROOT, encoding: "utf8" })); } catch {}
if (!polNow) fail("POLICY_VERSION could not be read from lib/policy.js");
else if (SPENT) ok(`POLICY_VERSION is ${polNow} on both sides — nothing to bump on a spent run`);
else if (!polBefore) fail("POLICY_VERSION could not be read from origin/main — the comparison proved nothing");
else if (polNow > polBefore) ok(`POLICY_VERSION bumped ${polBefore} -> ${polNow} — the documents changed materially`);
else fail(`POLICY_VERSION not bumped (still ${polNow}); a reader would accept words they have not been shown`);

console.log(bad ? `\n${bad} FAILED` : "\nthe parsed documents changed exactly where intended, and nowhere else");
process.exit(bad ? 1 : 0);
