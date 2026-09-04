// A "DISPLAY-HELPER BYPASS" GUARD WAS PROPOSED, MEASURED, AND REJECTED. This is the measurement.
//
// THE ANSWER IS NO. Do not build it. 528 candidates against 107 helper call sites, and of the 26
// read by hand across two complete buckets, ZERO are defects. Every one is correct code.
//
// The idea was sound on its face, and the shape is real: most surfaces render a field through its
// display helper and one or two read the raw column. Three such defects shipped in one day from
// three sessions — #1567 and #1578 (a metric climber read Fahrenheit) and the pubName split, where
// 36 call sites gated a name and 2 did not. So "find the sites that go round the helper" looks like
// it should find the next one.
//
// WHAT KILLS IT IS THAT READING A FIELD IS NOT DISPLAYING IT, and the false positives are not a
// tuning problem — they are four distinct correct uses that share the detector's shape:
//   - ARITHMETIC on the raw value. `wp.distMi - prevWp.distMi` is a segment length; the helper
//     formats a number and cannot be applied before the subtraction.
//   - A SORT COMPARATOR. `a.distMi - b.distMi` renders nothing at all.
//   - A FORM INPUT's `value`. An editor MUST show the raw stored value — formatting it there
//     would write "3.2 mi" back into a numeric column.
//   - A DIFFERENT HELPER. `uDist(r.distKm)` and `uGain(seg.gainM)` are also unit helpers and were
//     not in this script's list, so correctly-formatted sites read as bypasses. The detector's own
//     vocabulary was short — the deny-list failure this repo records under half a dozen names,
//     committed here by the detector.
//
// AND THE BIGGEST BUCKET IS A NAME COLLISION. pubName's 419 is `.name` on every object in the app —
// areas, routes, crews, lists, tick lists, waypoints — because `.name` is the most generic property
// in the codebase. It is not a climber-name detector; it is a `.name` detector.
//
// THE seasonShort BUCKET IS THE CLEAREST CASE, and it is worth stating because it inverts: of its
// 11 candidates, one IS THE FIX ITSELF. RouteDetail's header renders seasonShort(route.season) in
// the pill AND route.season in full as prose beneath it, deliberately, so the sentence is not lost
// — CLAUDE.md records that as the required behaviour. A guard firing there would tell an author to
// delete the thing the shortening work exists to preserve.
//
// SO THE RULE THIS PAYS FOR: the raw-vs-formatted distinction is not visible in the expression. It
// needs to know what the value is FOR, and a static reader cannot see that. What DID catch the
// three real defects was rendering the screen and reading the copy.
//
// Kept rather than deleted so the next session finds the number instead of rebuilding the detector.
// Re-run it before re-proposing this; the counts are current as of 194b9b07.
//
// Read-only, static, no browser, no DB.  SAMPLE=15 ONLY=uDistMi node scripts/oneoff/measure-display-helper-bypass.mjs
import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;

const ROOT = process.cwd();
const FILES = ["ClimbMatch.jsx", "ClimbMatchCore.jsx", "RouteDetail.jsx"];

// helper -> the field(s) it is the display form OF
const HELPERS = [
  { helper: "pubName",     fields: ["name"] },
  { helper: "shortGrade",  fields: ["grade"] },
  { helper: "seasonShort", fields: ["season"] },
  { helper: "uElev",       fields: ["elev", "elevFt", "highPointFt", "gainFt", "lossFt"] },
  { helper: "uDistMi",     fields: ["distKm", "distMi"] },
];
const FIELD_TO_HELPER = new Map();
for (const h of HELPERS) for (const f of h.fields) FIELD_TO_HELPER.set(f, h.helper);
const HELPER_NAMES = new Set(HELPERS.map(h => h.helper));

const rows = [];
const helperCalls = new Map();

for (const f of FILES) {
  const src = fs.readFileSync(path.join(ROOT, f), "utf8");
  const ast = parse(src, { sourceType: "module", plugins: ["jsx"] });

  traverse(ast, {
    CallExpression(p) {
      const n = p.node.callee;
      if (n.type === "Identifier" && HELPER_NAMES.has(n.name))
        helperCalls.set(n.name, (helperCalls.get(n.name) || 0) + 1);
    },
    MemberExpression(p) {
      const prop = p.node.property;
      if (p.node.computed || !prop || prop.type !== "Identifier") return;
      const helper = FIELD_TO_HELPER.get(prop.name);
      if (!helper) return;

      // must be RENDERED: some ancestor is a JSXExpressionContainer.
      let container = null, wrapped = false;
      let cur = p.parentPath;
      while (cur) {
        if (cur.node.type === "CallExpression" && cur.node.callee.type === "Identifier"
            && cur.node.callee.name === helper) wrapped = true;
        if (cur.node.type === "JSXExpressionContainer") { container = cur; break; }
        cur = cur.parentPath;
      }
      if (!container || wrapped) return;

      const inAttr = container.parentPath && container.parentPath.node.type === "JSXAttribute";
      const attrName = inAttr ? container.parentPath.node.name.name : null;
      const line = p.node.loc.start.line;
      const from = Math.max(0, p.node.start - 45);
      const snip = src.slice(from, p.node.end + 45).replace(/\s+/g, " ");
      rows.push({ file: f, line, helper, field: prop.name, attr: attrName, snip });
    },
  });
}

console.log("helper call sites (the population going THROUGH the helper):");
for (const h of HELPERS) console.log(`  ${h.helper.padEnd(12)} ${helperCalls.get(h.helper) || 0}`);

const byHelper = new Map();
for (const r of rows) byHelper.set(r.helper, (byHelper.get(r.helper) || 0) + 1);
console.log("\ncandidate BYPASSES — a rendered read of the field with no helper in the expression:");
for (const h of HELPERS) console.log(`  ${h.helper.padEnd(12)} ${byHelper.get(h.helper) || 0}`);
console.log(`  ${"TOTAL".padEnd(12)} ${rows.length}`);

const n = Number(process.env.SAMPLE || 0);
if (n) {
  const only = process.env.ONLY;
  const pool = only ? rows.filter(r => r.helper === only) : rows;
  console.log(`\n--- ${Math.min(n, pool.length)} of ${pool.length}${only ? ` (${only})` : ""} ---`);
  for (const r of pool.slice(0, n))
    console.log(`${r.file}:${r.line} [${r.helper}${r.attr ? " attr=" + r.attr : ""}] ${r.snip.slice(0, 155)}`);
}
