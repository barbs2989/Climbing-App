#!/usr/bin/env node
// Which rendered LABELS name an imperial unit in a literal, where no conversion is possible?
//
// This is deliberately NOT the display-helper-bypass rule that was measured and rejected beside it
// (528 candidates, 0 real). That one asked whether a raw FIELD was read instead of its formatter,
// and could not tell "reading a value" from "displaying it". A string LITERAL is the opposite: it
// cannot convert, so if it reaches the screen it says "ft" to a metric climber whatever the
// setting is. Perfect precision by construction, like the helper-argument rule.
//
// RESULT, re-measured 2026-09-09 after the approach-variants fix: 103 unit literals, 60 in a scope
// with no unit awareness at all (was 109/71 before #1654 and #1671). QUOTE THE RUN, NOT THIS LINE —
// it has already been stale once. Most of the 60 are SEED PROSE ("Summit — Kings Peak, 13,528 ft")
// and are correctly left alone: an itinerary written into a seed array is content, not a control.
// What the run is for is the controls, and the WRITE half of that list is now closed:
//
//   FIXED — the log form's TEMP (#1578); the itinerary builder's GAIN (FT) / LOSS (FT) /
//   DISTANCE (MI) / PACK WEIGHT (LB) and the bail form's DIST. TO SAFETY (MI) (#1654); the
//   approach-variants editor's distance and gain (#1671). Every one of them was ALSO seeded with
//   the raw stored number and STORED WHAT WAS TYPED, which is why they mattered more than a label.
//
//   STILL OPEN, and all DISPLAY-ONLY — no write path remains:
//     Guides       "Within 50 mi" / "Within 100 mi" / "Within 250 mi" — untouched by any PR
//     PartnerSearch / Leaderboards  five aria-labels: 4x "Search radius in miles", 1x "Maximum
//                  distance in miles"
//
//   RouteFinder's length map ("200 ft or less" / "201-600 ft" / ...) was on this list and LANDED in
//   #1670 while this branch was building — it is derived from passesFilters' own bounds now. The
//   count above predates that merge by minutes, which is the second time in one session a figure
//   here went stale: RE-RUN IT rather than quoting it.
//
// Read-only, static.
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
import { fileURLToPath } from "node:url";
const traverse = _traverse.default || _traverse;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];
const UNIT = /(^|[\s\d(,–—-])(ft|feet|mi|miles|mph|lb|lbs|°F)($|[\s.,;:)–—/])|ft\s*\/\s*hr/i;

let total = 0, unaware = 0;
for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });
  const hits = [];
  traverse(ast, {
    StringLiteral(p) {
      const v = p.node.value;
      if (!UNIT.test(v) || v.length > 60) return;   // over 60 chars is prose, not a control label
      const fn = p.getFunctionParent();
      let aware = false, name = "(top level)";
      if (fn) {
        name = fn.node.id ? fn.node.id.name : (fn.parentPath.node.id ? fn.parentPath.node.id.name : "(anon)");
        aware = /uImp\(\)/.test(src.slice(fn.node.start, fn.node.end));
      }
      hits.push({ v, line: p.node.loc.start.line, fn: name, aware });
    },
  });
  const raw = hits.filter((h) => !h.aware);
  total += hits.length; unaware += raw.length;
  console.log(`\n=== ${f}: ${hits.length} unit literals, ${raw.length} in a scope that never consults uImp() ===`);
  const by = {};
  for (const h of raw) (by[h.fn] ||= []).push(h);
  for (const k of Object.keys(by)) console.log(`  ${k} (L${by[k][0].line}): ` + by[k].map((h) => JSON.stringify(h.v)).join(", "));
}
console.log(`\n${total} unit literals, ${unaware} in a scope with no unit awareness at all.`);
