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
