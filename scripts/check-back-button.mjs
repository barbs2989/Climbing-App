#!/usr/bin/env node
// The phone's Back button steps back inside the app (lib/backButton.js, owner 2026-11-14), and a sideways
// swipe does NOT change the page.
//
// This file was check-page-swipe.mjs. The swipe between a page's tabs and between the bottom-bar sections
// (lib/pageSwipe.js) was removed on 2026-11-18 (owner: "Remove the swipe to go to next or previous page").
// The Back-button checks that lived beside it stay, and section 2 keeps the swipe from coming back by a
// stray import. SwipeRow (swipe a row to archive or delete) is a different gesture and is untouched.
import { readFileSync, existsSync, readdirSync } from "node:fs";

let bad = 0;
const ok = (cond, what) => { if (!cond) { bad++; console.error("✗ " + what); } };
const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");

// ---- 1. the phone's Back button -------------------------------------------------------------
const app = read("ClimbMatch.jsx");
ok(/useBackButton\(\{enabled:!wide,isHome:tab==="today",goHome:function\(\)\{goTab\("today"\);\}\}\);/.test(app), "App wires the phone's Back button (phone only; Home from another section)");
ok(/export function findBackControl\(\)/.test(read("lib/dialogA11y.js")), "lib/dialogA11y.js exports findBackControl, which Back taps through");
ok(/pushState\(\{ \[MARK\]: 1 \}, "", window\.location\.href\)/.test(read("lib/backButton.js")), "Back's history entry keeps the same URL (no new navigation for a reload or the service worker)");

// ---- 2. no page swipe -----------------------------------------------------------------------
ok(!existsSync(new URL("../lib/pageSwipe.js", import.meta.url)), "lib/pageSwipe.js stays removed (owner, 2026-11-18)");
const files = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx", "EnrichmentPanels.jsx", "main.jsx"];
for (const dir of ["lib", "src/components"]) {
  for (const f of readdirSync(new URL("../" + dir + "/", import.meta.url))) if (/\.(jsx?|tsx?)$/.test(f)) files.push(dir + "/" + f);
}
let scanned = 0;
for (const f of files) {
  if (!existsSync(new URL("../" + f, import.meta.url))) continue;
  scanned++;
  ok(!/useSwipeTabs|pageSwipe/.test(read(f)), f + " does not change the page on a sideways swipe");
}
ok(scanned > 50, "the no-swipe scan read the app's files (" + scanned + ")");

if (bad) { console.error(bad + " back-button check(s) failed."); process.exit(1); }
console.log("back button: wired, same-URL history entry; no page swipe in " + scanned + " files OK.");
