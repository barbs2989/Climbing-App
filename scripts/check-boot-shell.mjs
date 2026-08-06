#!/usr/bin/env node
// check:boot — keeps index.html's inline boot shell honest against the real chrome.
//
// index.html paints a placeholder (#cm-boot) with the app's banner and primary nav
// while the ~1.2MB bundle loads; React's createRoot clears it on first render (PR
// #521). It is a HAND-COPY, so it drifts silently: rename a tab, add a seventh,
// reorder them, and the shell keeps showing the old set until React swaps it out —
// a visible flicker of stale chrome, and nothing else in the repo would notice.
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

console.log(`\ncheck:boot: ok — boot shell nav matches NAV (${realLabels.length} tabs: ${realLabels.join(", ")}).`);
