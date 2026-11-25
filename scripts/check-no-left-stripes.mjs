#!/usr/bin/env node
import { fileURLToPath } from "node:url";
// check:no-left-stripes — no box wears a thick coloured line down its left side.
// Owner, 2026-11-25: "I don't like the thick line on the left side of boxes. Remove all of those and find
// something more unique." 82 stripes in 50 files were replaced by the three looks in lib/accents.js:
// knotHead / knotMark (a heading's mark is the rope's knot, an open ring), glowCard (a callout card is lit
// from its top-left corner) and noteBox (an aside is a soft tinted panel). This keeps the stripe out.
//
// What fails, in app source (comments stripped):
//   1. borderLeft / borderInlineStart / border-left / border-inline-start of 2px or more (any colour). A 1px
//      left rule is a column divider in a stat grid or a panel edge, not a stripe, and is allowed.
//   2. borderLeftWidth of 2px or more, and borderLeftColor (it only ever recoloured a stripe).
//   3. An inset box-shadow drawn on the left edge only: "inset Npx 0 0" with N >= 2.
//   4. A bar SPAN: a style with width 2–5 and a height of 10+ (or alignSelf stretch / no height but a fill)
//      immediately followed by borderRadius + background — the shape CardHead and the area browser's
//      headings drew their bar as. Only the shape `{width:N,height:M,borderRadius:R,background:…}` is
//      matched; a 2px connector in a timeline does not carry that shape.
// Allowed: the rope (docs/features/app-shell-and-layout.md) is a line BETWEEN boxes, never a box's edge. Its
// one borderLeft, the waypoint list's gap segment, is marked `data-rope=""` on the same element; a stripe
// on an element carrying data-rope is skipped.
//
// Static — no browser, no DB, no network — so it sits in `npm run build`.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const APP = /^(ClimbMatch\.jsx|ClimbMatchCore\.jsx|RouteDetail\.jsx|EnrichmentPanels\.jsx|main\.jsx|index\.html|lib\/.*\.(jsx?|tsx?)|src\/.*\.(jsx?|tsx?))$/;
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .split("\n").filter((f) => APP.test(f));
if (files.length < 100 || !files.includes("ClimbMatchCore.jsx")) {
  console.error(`check:no-left-stripes FAILED — only ${files.length} app file(s) found; a broken walk, not a small app.`);
  process.exit(1);
}

const stripComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
  .replace(/(^|[\s;{}(),])\/\/[^\n]*/g, (m, pre) => pre + " ".repeat(m.length - pre.length));

const RULES = [
  [/\b(borderLeft|borderInlineStart)\s*:\s*[`"']\s*([0-9.]+)px/g, (m) => Number(m[2]) >= 2, "a left border of 2px or more"],
  [/\bborder-(left|inline-start)\s*:\s*([0-9.]+)px/g, (m) => Number(m[2]) >= 2, "a left border of 2px or more (CSS text)"],
  [/\bborderLeftWidth\s*:\s*[`"']?([0-9.]+)/g, (m) => Number(m[1]) >= 2, "borderLeftWidth of 2px or more"],
  [/\bborderLeftColor\s*:/g, () => true, "borderLeftColor (it only recolours a stripe)"],
  [/inset\s+([0-9.]+)px\s+0(px)?\s+0(px)?\s/g, (m) => Number(m[1]) >= 2, "an inset shadow on the left edge only"],
  [/\bwidth\s*:\s*([2-5])\s*,\s*height\s*:\s*(\d+)\s*,\s*borderRadius\s*:\s*\d+\s*,\s*background\s*:/g, (m) => Number(m[2]) >= 10, "a bar span (width 2–5, a heading's stripe)"],
];

const hits = [];
let ropes = 0;
for (const f of files) {
  let src;
  try { src = readFileSync(ROOT + f, "utf8"); } catch { continue; }
  const text = stripComments(src);
  for (const [re, bad, what] of RULES) {
    for (const m of text.matchAll(re)) {
      if (!bad(m)) continue;
      // The element's own opening tag: from the last "<" before the match to the match.
      const tagStart = text.lastIndexOf("<", m.index);
      if (tagStart >= 0 && /data-rope=/.test(text.slice(tagStart, m.index))) { ropes++; continue; }
      const line = text.slice(0, m.index).split("\n").length;
      hits.push(`${f}:${line}  ${what}: ${text.slice(m.index, m.index + 60).replace(/\s+/g, " ")}`);
    }
  }
}

if (hits.length) {
  console.error(`check:no-left-stripes FAILED — ${hits.length} thick left stripe(s). The owner asked for none (2026-11-25).`);
  console.error("Use lib/accents.js instead: knotHead/knotMark for a heading's mark, glowCard for a callout card, noteBox for an aside.");
  for (const h of hits) console.error("  " + h);
  process.exit(1);
}
console.log(`check:no-left-stripes OK — ${files.length} app files, no thick left stripe (${ropes} rope segment(s) allowed by data-rope).`);
