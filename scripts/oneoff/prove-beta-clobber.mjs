// Proof for the `beta` clobber. Renders the real RouteDetail with `beta` held as an array
// (what dbRouteToCamel and the seed both produce) and as a string (what the contribute form
// produces today, since CONV has no `beta` entry).
//
// ROOT is derived from this file's own location, never hardcoded — the trap
// scripts/oneoff/measure-which-tab-renders-each-field.mjs shipped, where a pinned worktree
// path silently measured a different branch than the one you ran it in.
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-prove-beta-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = await import(out);

const BASE = {
  id: "prove_beta", name: "Guard Route", grade: "5.8", pitches: 4,
  mountainId: "guard_area", discipline: "alpine",
};
// >=220 chars so it lands in the BETA section rather than PRO TIPS.
const LONG =
  "The route follows the crest for six pitches of clean granite, with the crux a thin " +
  "hands corner on pitch four that is easy to underestimate when the rock is wet. Belays are " +
  "bolted throughout and the descent walks off to the north without any rappels at all.";
const SHORT = "Bring a light rack; the crux protects well.";

const seen = (h, s) => h.includes(s.slice(0, 60));
const row = (label, html, text, marker) =>
  console.log(
    "  " + label.padEnd(22) + marker.padEnd(10) + String(html.includes(marker)).padEnd(7) + "text on screen: " + seen(html, text)
  );

console.log("\nHow each shape renders:");
row("LONG  as ARRAY", render({ ...BASE, beta: [LONG] }, "overview"), LONG, ">BETA<");
row("LONG  as STRING", render({ ...BASE, beta: LONG }, "overview"), LONG, ">BETA<");
row("SHORT as ARRAY", render({ ...BASE, beta: [SHORT] }, "overview"), SHORT, "PRO TIPS");
row("SHORT as STRING", render({ ...BASE, beta: SHORT }, "overview"), SHORT, "PRO TIPS");

// The clobber: a route that HAD enrichment beta, then somebody contributes a correction.
const before = render({ ...BASE, beta: [LONG] }, "overview");
const after = render({ ...BASE, beta: "My corrected description of the route." }, "overview");
console.log("\nThe clobber — a route with enrichment beta, after one contribution:");
console.log("  BETA section before contribution :", before.includes(">BETA<"));
console.log("  BETA section after  contribution :", after.includes(">BETA<"));
console.log("  existing prose still on screen   :", seen(after, LONG));
console.log("  contributed text on screen       :", after.includes("My corrected description"));

// And the fix, run through the app's OWN converter rather than a hand-written stand-in — the
// point is that what the merge actually produces reaches the screen, so a copy of CONV.beta
// would prove nothing about CONV.beta.
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const m = app.match(/beta:function\(v\)\{[^}]*\}[^,]*,/);
if (!m) {
  console.log("\nCONV.beta not found — the fix is not in this checkout.");
} else {
  const convBeta = eval("(function(){return " + m[0].replace(/^beta:/, "").replace(/,$/, "") + ";})()");
  // Both sides of the 220-char split are exercised: the reader routes per ENTRY, so a fix that
  // only ever produced one shape would leave half the behaviour unproven.
  const TYPED_LONG =
    "A description a climber typed into the textarea. " + LONG;
  const TYPED_SHORT = "Short tip a climber typed.";
  const mLong = convBeta(TYPED_LONG), mShort = convBeta(TYPED_SHORT);
  const fLong = render({ ...BASE, beta: mLong }, "overview");
  const fShort = render({ ...BASE, beta: mShort }, "overview");
  console.log("\nWith CONV.beta applied (the fix):");
  console.log("  converter output is an array     :", Array.isArray(mLong), "(" + mLong.length + " entry, " + TYPED_LONG.length + " chars)");
  console.log("  long  -> BETA section renders    :", fLong.includes(">BETA<"), " text on screen:", fLong.includes("A description a climber typed"));
  console.log("  short -> PRO TIPS renders        :", fShort.includes("PRO TIPS"), " text on screen:", fShort.includes(TYPED_SHORT));
  console.log("  a blank submission stays empty   :", JSON.stringify(convBeta("   ")));
}
