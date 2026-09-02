#!/usr/bin/env node
// check:boot — keeps index.html's inline boot shell honest against the real chrome.
//
// index.html paints a placeholder (#cm-boot) with the app's banner and primary nav
// while the ~1.2MB bundle loads; React's createRoot clears it on first render (PR
// #521). It is a HAND-COPY, so it drifts silently: rename a tab, add a seventh,
// reorder them, and the shell keeps showing the old set until React swaps it out —
// a visible flicker of stale chrome, and nothing else in the repo would notice.
//
// SECTION 2 covers a SECOND hand-copy of NAV, and the name of this guard is now
// narrower than its contents — the rename is deliberately not done in the same
// change (this repo has recorded collisions from two sessions editing one thing).
// The Help modal's tour enumerates the tabs in prose. It had drifted three ways at
// once under a heading reading "a quick tour of each tab": Home, the tab a new
// climber lands on, was missing entirely; the tab labelled "Crew" was called "My
// Crew", so somebody scanning the nav bar for it would not find it; and three
// entries named things that are not tabs at all (Groups is a crewView sub-view,
// Guides is outside NAV, and "Safety & Trust" appeared exactly ONCE in the whole
// codebase — inside that modal — so it named no surface).
//
// The rule is a SUPERSET test, not the equality section 1 uses: the tour may
// legitimately describe sections that are not tabs, and it may order them its own
// way. What it may not do is omit a tab or spell one differently from the nav bar
// a reader is looking at while they read it.
//
// Nothing here validates styling. It checks the one thing that is objectively
// verifiable and actually goes wrong: the nav labels, and that they are in the
// same order as the real NAV array.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const fail = (msg) => { console.error("check:boot FAILED — " + msg); process.exit(1); };

// the real tab labels, in render order
const navDecl = app.match(/const NAV=\[(.*?)\];/s);
if (!navDecl) fail("could not find `const NAV=[...]` in ClimbMatch.jsx — update this check if it was renamed.");
const realLabels = [...navDecl[1].matchAll(/label:"([^"]+)"/g)].map((m) => m[1]);
if (!realLabels.length) fail("NAV parsed but no label: entries found.");

// the shell's labels: the text nodes of <div class="b-nav">'s children
const shell = html.match(/<div class="b-nav">([\s\S]*?)<\/div>\s*\n/);
if (!shell) fail('could not find `<div class="b-nav">` in index.html — the boot shell is missing or was restructured.');
const shellLabels = [...shell[1].matchAll(/<div><b><\/b>([^<]+)<\/div>/g)].map((m) => m[1].trim());
if (!shellLabels.length) fail("the boot shell nav has no labels.");

const same = realLabels.length === shellLabels.length && realLabels.every((l, i) => l === shellLabels[i]);
if (!same) {
  console.error("check:boot FAILED — the boot shell's nav has drifted from the real one.\n");
  console.error("  ClimbMatch.jsx NAV :", realLabels.join(" | "));
  console.error("  index.html #cm-boot:", shellLabels.join(" | "));
  console.error("\nUpdate the `b-nav` block in index.html so the placeholder matches what");
  console.error("React renders a moment later — otherwise users see stale tabs, then a jump.");
  process.exit(1);
}

// the wordmark should still be the real one, split so "Match" can be accented
if (!/Climb<span>Match<\/span>/.test(html)) fail("the boot shell wordmark is missing or changed shape (expected Climb<span>Match</span>).");


// ---- section 2: the Help modal's tab tour must cover every tab ----------------
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const fi = core.indexOf("const feats=[");
if (fi < 0) fail("could not find `const feats=[` in ClimbMatchCore.jsx — the Help tour was renamed; update this check.");
// balance brackets rather than taking a fixed window: the entries are long prose
// and this file packs everything onto one physical line.
let depth = 0, end = -1;
const open = core.indexOf("[", fi + "const feats=".length);
for (let k = open; k < core.length; k++) {
  if (core[k] === "[") depth++;
  else if (core[k] === "]" && --depth === 0) { end = k; break; }
}
if (end < 0) fail("the `feats` array in ClimbMatchCore.jsx does not close — could not parse the Help tour.");
const tourTitles = [...core.slice(open, end + 1).matchAll(/\["","([^"]+)"/g)].map((m) => m[1]);
if (tourTitles.length < 5) fail(`parsed only ${tourTitles.length} Help tour entr(ies) — the tour's shape changed, so this check is not reading it.`);

const missing = realLabels.filter((l) => !tourTitles.includes(l));
if (missing.length) {
  console.error("check:boot FAILED — the Help modal's tour does not cover every tab.\n");
  console.error("  ClimbMatch.jsx NAV :", realLabels.join(" | "));
  console.error("  Help tour entries  :", tourTitles.join(" | "));
  console.error("  NOT covered        :", missing.join(", "));
  console.error("\nA climber opens Help precisely because they are lost, so a tab with no entry");
  console.error("is missing from the one place that explains the app. A title that merely");
  console.error("resembles the tab is not enough — it must match the nav label exactly, or a");
  console.error('reader scanning the bar for it will not find it (this is how "My Crew" drifted');
  console.error("from the tab actually labelled \"Crew\"). Add or rename an entry in `feats`.");
  process.exit(1);
}

console.log(`\ncheck:boot: ok — boot shell nav matches NAV, and the Help tour covers all of it (${realLabels.length} tabs: ${realLabels.join(", ")}; ${tourTitles.length} tour entries).`);
