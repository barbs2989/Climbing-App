#!/usr/bin/env node
// check:scroll-containment — every scroll pane in the app declares `overscrollBehavior`.
//
// Why. With the default `overscroll-behavior: auto`, a drag that runs out of a pane's own
// scroll is handed to the next scroller out — the page behind an overlay — and on a phone
// the pane appears to freeze until the gesture's momentum dies. Reported as "Challenges and
// lists scroll is sticky and hard to navigate" (2026-09-30), the same report #684 and #702
// fixed for other sheets.
//
// check:overlay-scroll already asks this question in a real browser — but only of overlays
// it can OPEN, and it opens an overlay by setting App's (or RouteDetail's) own state. An
// overlay whose open flag is LOCAL to a component (Challenges' `showLists`, the All-areas
// picker, the guides screens) is invisible to it by construction. That hole held 11 panes
// when this was written. This is the static half: no layout, no reachability question —
// just the declaration, on every pane, in every file.
//
// The rule is total rather than "inside an overlay", because deciding what is an overlay
// from text is exactly the pairing check:overlay-scroll says a regex cannot do (the fixed
// wrapper and the scrolling child sit in different elements). Declaring containment on a
// pane that never chains costs nothing.
//
// ALLOWED is the one place a pane must CHAIN: #appscroll is the page itself.
//
// WHAT IT CANNOT SEE: a style that is not an inline `style={{…}}` literal — a style held in
// a variable, or spread from one. Those panes are check:overlay-scroll's to catch, where
// they are reachable.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appSources } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const G = "check:scroll-containment";
const EXTRA = ["EnrichmentPanels.jsx"];
const ALLOWED = [/id="appscroll"/];

// Every `style={{ … }}` literal whose body scrolls vertically. `overflow:"auto"` counts too;
// a pure `overflowX` strip (a chip row) is horizontal and is not this bug.
export function scan(src) {
  const out = [];
  const re = /style=\{\{/g; let m;
  while ((m = re.exec(src))) {
    let i = m.index + 8, depth = 1;
    while (depth && i < src.length) { const c = src[i]; if (c === "{") depth++; else if (c === "}") depth--; i++; }
    const body = src.slice(m.index + 8, i - 1);
    if (!/\boverflow(Y)?\s*:\s*"(auto|scroll)"/.test(body)) continue;
    const tagStart = src.lastIndexOf("<", m.index);
    const opening = src.slice(tagStart, i);
    out.push({ at: m.index, body, opening, contained: /overscrollBehavior/.test(body) });
  }
  return out;
}

// Self-test on every run, so a scan that stops matching cannot report a clean app.
const probe = scan('<div style={{flex:1,overflowY:"auto"}}/><div style={{overflowY:"auto",overscrollBehavior:"contain"}}/><div style={{overflowX:"auto"}}/>');
if (probe.length !== 2 || probe[0].contained || !probe[1].contained) {
  console.error(`${G} FAILED — the scanner no longer classifies its own fixture. Nothing was checked.`);
  process.exit(1);
}

const files = appSources(ROOT, G);
for (const f of EXTRA) {
  if (!fs.existsSync(path.join(ROOT, f))) { console.error(`${G} FAILED — ${f} is missing, so it went unscanned.`); process.exit(1); }
  files.push(f);
}

let panes = 0; const bad = [];
for (const f of files) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  for (const p of scan(src)) {
    panes++;
    if (p.contained || ALLOWED.some((r) => r.test(p.opening))) continue;
    const line = src.slice(0, p.at).split("\n").length;
    bad.push(`${f}:${line}  style={{${p.body.replace(/\s+/g, " ").slice(0, 140)}}}`);
  }
}

// Fewer than this and the scan broke, not the app got simpler: there were 90 at writing.
if (panes < 40) {
  console.error(`${G} FAILED — found only ${panes} scroll pane(s) across ${files.length} files. The scan broke; nothing was checked.`);
  process.exit(1);
}
if (bad.length) {
  console.error(`${G} FAILED — ${bad.length} scroll pane(s) with no overscrollBehavior. A drag that reaches the end of one`);
  console.error(`hands the gesture to the page behind it, and on a phone the pane reads as stuck. Add overscrollBehavior:"contain".\n`);
  for (const b of bad) console.error("  " + b);
  process.exit(1);
}
console.log(`  ok    ${panes} scroll panes across ${files.length} files all declare overscrollBehavior (#appscroll exempt)`);

// ── ONE page scroll lock ──
// lib/dialogA11y.js locks the page behind every open popup (overflow:hidden on <html>, <body>
// pinned). A component that ALSO locked it froze the whole app for good (2026-11-23, the Route
// finder's Filters sheet: "after I apply filters the scroll stops working, even when I click
// back"): its lock ran first, the shared one recorded that "hidden" as the page's own value and
// put it back after the sheet had cleared it. So no file but the shared lock may write an
// element's `overflow` from script, in ANY spelling: the assignment, a bracketed property,
// setProperty, a cssText string, or an Object.assign onto a style. (overflowX / overflowY are other
// properties — lib/Ads.jsx toggles its rail's overflowY — and are not matched.)
// ALLOW: a deliberate overflow write on an element that is NOT the page (an inner pane, say), keyed
// "file" -> the reason. Empty at writing; an entry must say why it cannot freeze the page.
const LOCK_OWNER = "lib/dialogA11y.js";
const ALLOW_WRITERS = {};
const OVERFLOW_WRITES = [
  /\.style\.overflow\s*=(?!=)/,                                        // el.style.overflow = "hidden"
  /\.style\[\s*["'`]overflow["'`]\s*\]\s*=(?!=)/,                      // el.style["overflow"] = …
  /\.style\.setProperty\(\s*["'`]overflow["'`]/,                       // el.style.setProperty("overflow", …)
  /\.style\.cssText\s*\+?=(?!=)[^\n]*?[\s;"'`]overflow\s*:/,           // el.style.cssText = "…overflow:hidden" (one line)
  /Object\.assign\(\s*[\w.$]*\.style\s*,\s*\{[^}]*(?:^|[\s,{"'`])overflow["'`]?\s*:/m, // Object.assign(el.style, { overflow: … })
];
export const writesOverflow = (src) => OVERFLOW_WRITES.some((re) => re.test(src));
// Every spelling above must be caught, and none of the look-alikes the app really has may be.
const CAUGHT = ['el.style.overflow = "hidden";', 'el.style.overflow="hidden"', 'document.body.style["overflow"] = "hidden";',
  'root.style.setProperty("overflow", "hidden");', 'el.style.cssText = "position:fixed; overflow:hidden";',
  'Object.assign(document.documentElement.style, { overflow: "hidden" });', 'Object.assign(b.style, {top: "0", overflow: "hidden"})'];
const PASSED = ['rail.style.overflowY = "hidden";', 'if (a.style.overflow === "x") {}', 'el.style.setProperty("overflow-y", "auto")',
  'el.style.cssText = "width:24px;height:24px"', 'Object.assign(b.style, { position: "fixed", overflowY: "auto" })', 'const o = el.style.overflow;'];
const missed = CAUGHT.filter((s) => !writesOverflow(s)), wrong = PASSED.filter((s) => writesOverflow(s));
if (missed.length || wrong.length) {
  console.error(`${G} FAILED — the page-lock scan no longer classifies its own fixture. Nothing was checked.`);
  for (const s of missed) console.error("  missed:   " + s);
  for (const s of wrong) console.error("  wrongly caught: " + s);
  process.exit(1);
}
const libFiles = fs.readdirSync(path.join(ROOT, "lib")).filter((f) => /\.(jsx?|tsx?)$/.test(f)).map((f) => "lib/" + f);
if (!libFiles.includes(LOCK_OWNER) || !writesOverflow(fs.readFileSync(path.join(ROOT, LOCK_OWNER), "utf8"))) {
  console.error(`${G} FAILED — ${LOCK_OWNER} no longer writes the page's overflow, so this rule names the wrong owner. Re-read it.`);
  process.exit(1);
}
const scanned = [...new Set([...files, ...libFiles])];
for (const f of Object.keys(ALLOW_WRITERS)) {
  if (!scanned.includes(f) || !writesOverflow(fs.readFileSync(path.join(ROOT, f), "utf8"))) {
    console.error(`${G} FAILED — ALLOW_WRITERS names ${f}, which no longer writes an overflow. Remove the stale entry.`);
    process.exit(1);
  }
}
const lockers = scanned.filter((f) => f !== LOCK_OWNER && !ALLOW_WRITERS[f] && writesOverflow(fs.readFileSync(path.join(ROOT, f), "utf8")));
if (lockers.length) {
  console.error(`${G} FAILED — ${lockers.join(", ")} write(s) an element's overflow from script. The page scroll lock lives in ${LOCK_OWNER} ONLY;`);
  console.error(`a second lock un-does it in the wrong order and leaves the whole app unscrollable. Give the popup role="dialog" aria-modal and let that lock hold the page.`);
  console.error(`(If the element is NOT the page, add the file to ALLOW_WRITERS with the reason it cannot freeze it.)`);
  process.exit(1);
}
console.log(`  ok    only ${LOCK_OWNER} writes the page's scroll lock (${scanned.length} files, 5 spellings)`);
