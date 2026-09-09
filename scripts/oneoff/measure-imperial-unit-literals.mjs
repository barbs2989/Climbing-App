#!/usr/bin/env node
// Which rendered LABELS name an imperial unit in a literal, where no conversion is possible?
//
// This is deliberately NOT the display-helper-bypass rule that was measured and rejected beside it
// (528 candidates, 0 real). That one asked whether a raw FIELD was read instead of its formatter,
// and could not tell "reading a value" from "displaying it". A string LITERAL is the opposite: it
// cannot convert, so if it reaches the screen it says "ft" to a metric climber whatever the
// setting is. Perfect precision by construction, like the helper-argument rule.
//
// RESULT, 2026-09-09: 109 unit literals, 71 in a scope with no unit awareness at all. Most of the
// 71 are SEED PROSE ("Summit — Kings Peak, 13,528 ft") and are correctly left alone — an itinerary
// written into a seed array is content, not a control. What the run is for is the controls:
//
//   FIXED here — the itinerary builder's GAIN (FT) / LOSS (FT) / DISTANCE (MI) / PACK WEIGHT (LB),
//   which were also seeded with the raw stored number and STORED WHAT WAS TYPED.
//
//   STILL OPEN, and deliberately not swept in a change about a write path:
//     Guides       "Within 50 mi" / "Within 100 mi" / "Within 250 mi"
//     RouteFinder  "200 ft or less" / "201-600 ft" / "600-1500 ft" / "1500+ ft" — and that map is
//                  HAND-COPIED TWICE, once for the chips and once for the applied-filter chips
//     PartnerSearch / Leaderboards  aria-labels "Search radius in miles", "Maximum distance in miles"
//     BailoutForm  "Distance to safety (mi)" — another INPUT, so the same write class as above
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
