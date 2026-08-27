// A pitch row is a clickable() control whose "CRUX" badge is a separate <span> held off the grade
// by `marginLeft:6`. The accessibility tree has no margins, so a pitch graded "5.9" announced as
// "5.9CRUX" — #740's shape, on the row whose glued half says this is the hardest pitch on the climb.
//
// check:a11y-badges exists for exactly this and is green, because `?zr=1` opens ROUTES[0]
// (`kings_hf`, a scramble with `pitchDetail: null`) and no pitch row renders in that walk at all.
//
// SSR is enough here: the fix is an explicit name, which is an attribute in the markup. What SSR
// cannot do is compute the name Chrome would — that inference is what check:a11y-badges already
// established for this exact shape.
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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from "${path.join(ROOT, "RouteDetail.jsx")}";
const noop = () => {};
export function render(route) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderToStaticMarkup(
    React.createElement(QueryClientProvider, { client: qc },
      React.createElement(RouteDetail, {
        route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
        contribs: [], myReports: [], connections: [], comments: {},
        hzVotes: {}, sunReports: {}, gearEdits: {}, diffRatings: {},
        crewsForRoute: [], myStars: {}, presence: null,
      })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-pitch-")), "b.cjs");
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

// "5.9" is the glue case (word char on both sides of the boundary); "5.9+" was already safe,
// because `+` separates the fragments on its own. Both are asserted so the fix is shown to name
// the row rather than to have been unnecessary.
const ROUTE = {
  id: "probe_pitch", name: "Probe Ridge", grade: "5.9", gradeSystem: "yds",
  discipline: "alpine", pitches: 3, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Peak", areaType: "peak", region: "Washington" },
  pitchDetail: [
    { pitch: 1, grade: "5.7", notes: "ZZP1ZZ", lengthM: 30 },
    { pitch: 2, grade: "5.9", crux: true, notes: "ZZP2ZZ", lengthM: 40 },
    { pitch: 3, grade: "5.9+", crux: true, notes: "ZZP3ZZ", lengthM: 35 },
  ],
};

const html = render(ROUTE);

// ── 0. The probe must be able to fail.
if (!/ZZP2ZZ/.test(html)) {
  console.log("  FAIL  ANCHOR LOST: the pitch table did not render. Nothing below was checked.");
  process.exit(1);
}
ok("the pitch table renders");

// Every aria-label in the markup, so the assertion is about the ELEMENT and not the page.
const labels = [...html.matchAll(/aria-label="([^"]*)"/g)].map((m) =>
  m[1].replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"'));
const pitchLabels = labels.filter((l) => /^Pitch \d/.test(l));

if (!pitchLabels.length) fail("no pitch row carries a name — the control announces its raw text, glue and all");
else ok(`${pitchLabels.length} pitch row(s) name themselves`);

// ── 1. The crux row must not weld the badge onto the grade.
const cruxLabel = pitchLabels.find((l) => /crux/i.test(l));
if (!cruxLabel) fail("no pitch row announces its crux at all — the badge is on screen but unnamed");
else if (/\dCRUX/i.test(cruxLabel) || /\d\s*crux/i.test(cruxLabel.replace(/,\s*crux/i, ""))) {
  fail("the crux row still welds the badge onto the grade: " + JSON.stringify(cruxLabel));
} else ok("the crux row announces: " + JSON.stringify(cruxLabel));

// ── 2. …and the grade is still IN the name. A label that dropped it would satisfy 1 alone.
if (cruxLabel && /5\.9/.test(cruxLabel)) ok("the grade survives in the announced name");
else fail("the announced name lost the grade: " + JSON.stringify(cruxLabel));

// ── 3. A non-crux row must not claim one.
const plain = pitchLabels.find((l) => /5\.7/.test(l));
if (plain && !/crux/i.test(plain)) ok("a non-crux pitch does not claim one: " + JSON.stringify(plain));
else fail("a non-crux pitch announces a crux: " + JSON.stringify(plain));

console.log(failures ? `\n${failures} assertion(s) failed.` : "\nok — a pitch row names itself, and the crux is a word rather than a suffix on the grade.");
process.exit(failures ? 1 : 0);
