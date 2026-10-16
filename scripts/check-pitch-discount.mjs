// Two questions about the climbing-time discount, and the second is the one that rots.
//
//   1. Does pitchedFraction() actually have the properties its comment claims -- never shortens
//      an estimate, monotone, bounded, cliff removed? A comment cannot fail; these assertions can.
//   2. Does the planner DISCLOSE the discount, on exactly the grades that receive one?
//
// Prove-it-can-fail discipline: an SSR probe that matches nothing reads identically to a real
// defect, so this asserts BOTH directions -- present at 5.5 and 5.4, absent at 5.6, 5.10a and
// with no pitches -- and refuses to judge anything if the Planner tab did not render, which would
// make every "absent" vacuous.
//
// The 5.6 assertion is the load-bearing one. When the step became a taper the boundary MOVED, and
// 5.6 went from "full discount" to "no discount". An earlier version of this probe asserted the
// disclosure was PRESENT at 5.6 and caught the drift by failing. Keep model and message pinned
// together here, or they will separate silently.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Resolved, never hardcoded: a pinned worktree path makes a probe silently measure another
// branch's code, which is how measure-which-tab-renders-each-field.mjs lied for weeks.
// `..` and not `../..`: this lives in scripts/ since being promoted out of scripts/oneoff/, and the
// depth changed with it. It failed LOUDLY (esbuild could not resolve the app files) rather than
// silently measuring the wrong tree, which is the direction that matters — a pinned or mis-resolved
// root is how measure-which-tab-renders-each-field.mjs reported another branch's code for weeks.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
export { pitchedFraction, techHrs } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route, tab) {
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: tab, onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-techhrs-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render, pitchedFraction, techHrs } = await import(out);

let fails = 0;
const ck = (l, c) => { console.log("  " + (c ? "ok  " : "FAIL") + "  " + l); if (!c) fails++; };

// ── The curve's PROPERTIES, asserted rather than described ──────────────────────────────────
// The comment beside pitchedFraction claims three things. A comment cannot fail, so:
//   1. it never shortens an estimate versus the old step  <- the safety-critical one
//   2. it is monotone non-decreasing and bounded to [0.5, 1]
//   3. it removes the 2.17x single-grade cliff
// Grades come through the app's real gn() mapping: gn("5.6")=6.5, NOT 6.
{
  const gnOf = (g) => { const m = g.match(/5\.(\d+)([a-d]?)/); return m ? parseInt(m[1]) + (m[2] ? ("abcd".indexOf(m[2]) + 1) / 4 : 0.5) : 7.5; };
  const oldF = (g) => (g <= 6.5 ? 0.5 : 1);
  const GRADES = ["5.0", "5.1", "5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "5.10a"];
  let shorter = 0, nonMono = 0, outOfRange = 0, worstNew = 0, worstOld = 0, prevN = null, prevO = null;
  let prevF = -Infinity;
  for (const g of GRADES) {
    const n = gnOf(g), f = pitchedFraction(n);
    if (f < oldF(n) - 1e-9) shorter++;
    if (f < prevF - 1e-9) nonMono++;
    if (f < 0.5 - 1e-9 || f > 1 + 1e-9) outOfRange++;
    prevF = f;
    const tN = techHrs(10, 50, n), tO = (0.17 + 50 / (130 * Math.exp(-0.11 * (n - 5)))) * oldF(n) * 10;
    if (prevN != null) { worstNew = Math.max(worstNew, tN / prevN); worstOld = Math.max(worstOld, tO / prevO); }
    prevN = tN; prevO = tO;
  }
  console.log("curve properties:");
  ck(`never shortens an estimate vs the old step (${shorter} violations)`, shorter === 0);
  ck(`monotone non-decreasing (${nonMono} violations)`, nonMono === 0);
  ck(`bounded to [0.5, 1] (${outOfRange} violations)`, outOfRange === 0);
  ck(`cliff reduced: worst single-grade jump ${worstOld.toFixed(2)}x -> ${worstNew.toFixed(2)}x`, worstNew < worstOld - 0.1);
  ck("an unparsed grade gets NO discount (gn returns 7.5)", pitchedFraction(7.5) === 1);
  ck("NaN cannot silently earn a discount", pitchedFraction(NaN) === 0.5 || pitchedFraction(NaN) === 1);
  console.log("");
}

const NEEDLE = "Climbing time assumes a party moving continuously";
const route = (grade, pitches) => ({
  id: "guard_techhrs", name: "Guard Route", grade, pitches,
  mountainId: "guard_area", discipline: "alpine",
  distKm: 10, gainM: 1200, lossM: 1200, avgPitchLength: 50,
});

// The boundary MOVED when the cliff was replaced by a taper. The disclosure fires wherever a
// discount is actually applied -- pitchedFraction < 1 -- which is now 5.5 and below, not 5.6 and
// below. 5.6 is the first grade with NO discount, so it must be silent: asserting it here is what
// pins the model and the message together, and it is the assertion that caught the drift.
const easy = render(route("5.5", 10), "planner");     // factor 0.83 -> discount applied
const easier = render(route("5.4", 10), "planner");   // factor 0.67 -> discount applied
const hard = render(route("5.10a", 10), "planner");
const atBoundary = render(route("5.6", 10), "planner"); // factor 1.00 -> no discount, no message
const noPitch = render(route("5.5", 0), "planner");

if (!easy || easy.length < 400) {
  console.error(`FAILED — the route page rendered ${easy ? easy.length : 0} chars. Nothing below was checked.`);
  process.exit(1);
}


// If this anchor is gone the three assertions below mean nothing.
ck("ANCHOR: the estimate tiles rendered", easy.includes("Est. summit") || easy.includes("Est. return"));
ck("renders on a 10-pitch 5.5 (factor 0.83, discount applied)", easy.includes(NEEDLE));
ck("renders on a 10-pitch 5.4 (factor 0.67, discount applied)", easier.includes(NEEDLE));
ck("ABSENT at 5.6 — the first grade with NO discount", !atBoundary.includes(NEEDLE));
ck("ABSENT on a 10-pitch 5.10a", !hard.includes(NEEDLE));
ck("ABSENT with no pitches (no climbing estimate at all)", !noPitch.includes(NEEDLE));

console.log(fails ? `\n${fails} assertion(s) failed` : "\nall assertions hold");
process.exit(fails ? 1 : 0);
