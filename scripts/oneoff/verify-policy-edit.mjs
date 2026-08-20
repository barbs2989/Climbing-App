// Prove the policy edit changed exactly what it meant to, by comparing the PARSED arrays
// before and after -- the rule CLAUDE.md states for these documents. A line diff cannot answer
// it: all three arrays live on single lines of ~10,000 characters, where an edit that swallowed
// a neighbouring entry renders identically to one that did not.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const ROOT = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/top-contributors-photo-crew-resume";
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
    if (!changed && EXPECTED.has(key)) fail(`${key} was meant to change and did not`);
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
const pol = fs.readFileSync(ROOT + "/lib/policy.js", "utf8");
if (/POLICY_VERSION = "2026-08-19"/.test(pol)) ok("POLICY_VERSION bumped — the documents changed materially");
else fail("POLICY_VERSION not bumped");

console.log(bad ? `\n${bad} FAILED` : "\nthe parsed documents changed exactly where intended, and nowhere else");
process.exit(bad ? 1 : 0);
