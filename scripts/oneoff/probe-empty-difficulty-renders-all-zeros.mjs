// DiffRadar guards on `if(!d) return null` — and `{}` is TRUTHY, so an empty difficulty object
// renders the whole DIFFICULTY BREAKDOWN panel with every axis at 0/5. `dv()` opens
// `const b = d[k] || 0`, and the bar colour is `cur>=4?red : cur>=3?amber : green`, so 0 paints
// GREEN: the most reassuring colour on the panel, for the least information.
//
// 0 is not on the scale the panel advertises. Its own copy reads "A 1-5 read on what makes this
// hard", and underneath it each axis prints a blurb explaining what that axis MEANS, so the page
// does not read as missing data — it reads as a route that is trivial on all five counts.
//
// The live row is wa_mount_fury_east_mongo_ridge: Grade VI, 5.10, 25 pitches, 1,219 m, 10,000 ft
// of gain, 38.6 km, `commitment` VI, `alpine_grade` TD+, solitudeRating 5, and an overview calling
// it "The biggest, most sustained alpine rock ridge in the Cascades", soloed over four days.
//
// This renders the REAL RouteDetail rather than reading the source, because the question is what
// reaches a screen. It asserts both directions: `{}` produces the false panel, and `null` — the
// repair — makes the panel disappear entirely, since `!null` is true.
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require_ = createRequire(import.meta.url);

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
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-diffradar-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, " ")
  .replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&")
  .replace(/&#x2F;/g, "/").replace(/\s+/g, " ");

// The live Mongo Ridge row, in the shape dbRouteToCamel hands the reader.
const mongo = (difficulty) => ({
  id: "wa_mount_fury_east_mongo_ridge", name: "Mongo Ridge (Southwest Buttress)",
  grade: "Grade VI, 5.10", gradeSystem: "yds", gradeNum: 10, discipline: "alpine",
  pitches: 25, lengthM: 1219, gainFt: 10000, distKm: 38.6,
  commitment: "VI", alpineGrade: "TD+", difficulty,
  mountainId: "wa_mount_fury_west",
  _dbArea: { id: "wa_mount_fury_west", name: "Mount Fury, West Peak", areaType: "peak", region: "Washington" },
});

let failures = 0;
const fail = (m) => { console.log("  FAIL  " + m); failures++; };
const ok = (m) => console.log("  ok    " + m);

const HEAD = "DIFFICULTY BREAKDOWN";
const AXES = ["Physical", "Technical", "Exposure", "Commitment", "Route-finding"];
const GREEN = "#3fb950"; // C.green, read off the palette in ClimbMatchCore.jsx rather than guessed

// ── 1. the defect: {} renders the panel, all zeros
const htmlEmpty = render(mongo({}), "overview");
const tEmpty = text(htmlEmpty);
if (tEmpty.length < 2000) fail(`the {} render is only ${tEmpty.length} chars — the probe rendered nothing`);
else ok(`{} render: ${tEmpty.length} chars`);

if (!tEmpty.includes(HEAD)) fail(`{} did not render the ${HEAD} panel — the anchor moved, nothing below is checked`);
else ok(`{} renders the ${HEAD} panel`);

const zeros = (tEmpty.match(/0\/5/g) || []).length;
if (zeros < 10) fail(`expected 10 "0/5" readings (5 bars + 5 blurbs), saw ${zeros}`);
else ok(`{} prints "0/5" ${zeros} times — every axis, in the bar row and again in the blurb`);

for (const a of AXES) {
  if (!tEmpty.includes(a)) fail(`axis "${a}" is not on screen`);
}
if (!failures) ok(`all five axes named: ${AXES.join(", ")}`);

if (!tEmpty.includes("A 1–5 read on what makes this hard"))
  fail(`the panel's own "1-5" promise is not on screen — check the copy`);
else ok(`the panel promises "A 1–5 read on what makes this hard" while printing 0/5`);

// the colour: 0 takes the `green` branch, which is the affirmation colour
const greenHits = (htmlEmpty.match(new RegExp(GREEN, "gi")) || []).length;
if (!greenHits) fail(`C.green (${GREEN}) does not appear — re-read the colour off the palette`);
else ok(`0/5 paints C.green ${greenHits}x — the reassuring colour, for no information`);

// ── 2. the repair: null removes the panel entirely
const htmlNull = render(mongo(null), "overview");
const tNull = text(htmlNull);
if (tNull.length < 2000) fail(`the null render is only ${tNull.length} chars — it rendered nothing at all`);
else ok(`null render: ${tNull.length} chars (the page still renders)`);

if (tNull.includes(HEAD)) fail(`null STILL renders ${HEAD} — the repair does not remove the panel`);
else ok(`null removes the ${HEAD} panel outright — no false scores, no invented ones`);

if ((tNull.match(/0\/5/g) || []).length) fail(`null still prints a "0/5" somewhere`);
else ok(`null prints no "0/5" anywhere on the tab`);

// ── 3. a populated object must be UNAFFECTED, or the repair would be a regression
const htmlReal = render(mongo({ exposure: 4, physical: 4, technical: 2, commitment: 4, routefinding: 4 }), "overview");
const tReal = text(htmlReal);
if (!tReal.includes(HEAD)) fail(`a populated difficulty lost its panel`);
else ok(`a populated difficulty still renders the panel`);
if (!tReal.includes("4/5")) fail(`a populated difficulty does not print its own scores`);
else ok(`a populated difficulty prints its real scores (4/5 present)`);

console.log(failures ? `\nFAILED (${failures})` : `\nok — {} renders a green 0/5 on every axis; null removes the panel`);
process.exitCode = failures ? 1 : 0;
