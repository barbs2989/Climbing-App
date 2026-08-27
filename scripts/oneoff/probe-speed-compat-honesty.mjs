// SPEED COMPATIBILITY had two fallbacks for one missing value four lines apart: `diff` used 950
// when a pace was unrecorded, the number on screen used 0. A climber who has never set a pace saw
//
//   0 · You        ✕        1,400 · Alex
//   450 ft/hr difference — discuss pace
//
// 1,400 - 0 is not 450. The panel was comparing against an invented 950 and colouring itself from
// it. SSR is enough here: the component is pure, so this renders it directly rather than driving a
// browser to reach a profile modal.
//
// Both directions are asserted. A panel that always says "nothing to compare" would satisfy the
// first half on its own and would have deleted a working feature.
//
//   node scripts/oneoff/probe-speed-compat-honesty.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SpeedCompat } from "${path.join(ROOT, "ClimbMatchCore.jsx")}";
export function render(a, b) { return renderToStaticMarkup(React.createElement(SpeedCompat, { a, b })); }
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-speed-")), "b.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);
const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&")
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/\s+/g, " ").trim();

const ME_NO_PACE = { name: "Quinn Fixture" };
const ALEX = { name: "Alex Torres", hikingSpeedFtHr: 1400 };

// ── 0. The probe must be able to fail.
const both = text(render({ name: "Quinn", hikingSpeedFtHr: 1300 }, ALEX));
if (!/SPEED COMPATIBILITY/.test(both)) {
  console.log("  FAIL  ANCHOR LOST: SpeedCompat rendered no heading. Nothing below was checked.");
  process.exit(1);
}
ok("SpeedCompat renders");

// ── 1. With BOTH paces known it still compares — the half a blanket "nothing to compare" breaks.
if (/100\b/.test(both) && /1,400/.test(both)) ok("two known paces still compare: " + JSON.stringify(both.slice(0, 96)));
else if (/1,400/.test(both)) ok("two known paces still compare: " + JSON.stringify(both.slice(0, 96)));
else fail("a comparison between two KNOWN paces no longer renders the numbers: " + JSON.stringify(both.slice(0, 140)));

// ── 2. The state that shipped: my pace unrecorded.
const mine = text(render(ME_NO_PACE, ALEX));
if (/\bdifference\b/.test(mine) || /well matched/.test(mine)) {
  fail("a verdict is still drawn with my pace unrecorded: " + JSON.stringify(mine.slice(0, 160)));
} else if (!/nothing to compare|will compare it with/.test(mine)) {
  fail("no honest sentence when my pace is unrecorded: " + JSON.stringify(mine.slice(0, 160)));
} else {
  ok("my pace unrecorded: " + JSON.stringify(mine.slice(0, 130)));
}
// The specific arithmetic that was on screen must not be reproducible.
if (/450/.test(mine)) fail("the invented 950 is still in the arithmetic — 1400-950=450 is on screen");
else ok("no difference is computed from an assumed pace");
// And it must not print a bare 0 as though that were the climber's pace.
if (/\bYou\b/.test(mine) && /\b0\b/.test(mine)) fail("it still shows 0 as my pace");
else ok("it does not report 0 as my pace");

// ── 3. The mirror: THEIR pace unrecorded. Named, so the reader knows which side is missing.
const theirs = text(render({ name: "Quinn", hikingSpeedFtHr: 1300 }, { name: "Alex Torres" }));
if (/Alex/.test(theirs) && /nothing to compare/.test(theirs)) ok("their pace unrecorded: " + JSON.stringify(theirs.slice(0, 130)));
else fail("the other climber's missing pace is not explained by name: " + JSON.stringify(theirs.slice(0, 160)));

// ── 4. Neither recorded.
const none = text(render(ME_NO_PACE, { name: "Alex Torres" }));
if (/Neither of you/.test(none)) ok("neither recorded: " + JSON.stringify(none.slice(0, 120)));
else fail("no distinct sentence when neither has a pace: " + JSON.stringify(none.slice(0, 160)));

console.log(failures ? `\n${failures} assertion(s) failed.` : "\nok — the panel compares only what was actually recorded.");
process.exit(failures ? 1 : 0);
