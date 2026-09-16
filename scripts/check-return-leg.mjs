#!/usr/bin/env node
/* The RETURN leg must not re-add a walk the figures already covered.
 *
 * PREMISE, read off the code rather than assumed:
 *     hikeH  = scarfHrs(distKm, gainM, lossM)      -- ONE walk, charged for gain AND loss
 *     totalH = hikeH + techH ; sumH = depart + totalH
 *     retH   = publishedIsWholeDay ? sumH : sumH + (pitches>0 ? techH*0.7 : hikeH*0.75)
 * so hikeH is meant to be the ONE-WAY approach and the return is a fraction of it.
 *
 * `gainCoversWholeOuting` (|loss-gain|/gain <= 3%) is the app's OWN test for rows whose figures
 * cover the whole outing. For those it already relabels the tile "On foot" and TECH STATS already
 * says "Total ascent is the whole day from the trailhead, not just the walk in" -- and then the
 * return added another 75% of that same walk. Label and arithmetic contradicting each other on one
 * screen: wa_ptarmigan_traverse read `21.6hr On foot` with Est. return 16.2 hr after Est. summit.
 * 196 WA routes, median +7.67 hr.
 *
 * THE PREMISE IS SOLID BECAUSE 433 OF THE 484 QUALIFYING ROWS HAVE gain EXACTLY EQUAL TO loss --
 * a round trip, or a traverse ending at its start elevation. That is not a coincidence on a
 * one-way approach.
 *
 * SCOPED TO THE WALK BRANCH, and the first draft was not: a pitched route's return is `techH*0.7`,
 * the descent of the CLIMB, which the walk never double-counted. Short-circuiting the whole
 * expression the way publishedIsWholeDay does would have stripped a real leg from 212 rows.
 *
 * SECTION 2 IS THE SAME TILE'S OTHER HALF: the two red labels beside these clock times were
 * compared against a CLOCK HOUR while sumH/retH are UNBOUNDED. Both are absolute hours from
 * midnight of the departure day, so an estimate crossing midnight passes 18.5 (6:30 PM) and 13
 * (1:00 PM) permanently -- and `fmt`, one line up, reduces the same value mod 1440 to render the
 * time. A red "After dark" sat beside "Est. return 12:10 PM (+1d)", and "Leave earlier" beside a
 * 4:28 AM summit, where leaving earlier makes it DARKER.
 *
 * Measured at the calculator's default settings over the WA catalog
 * (scripts/oneoff/measure-after-dark-on-a-multiday-estimate.mjs): 168 of 495 "After dark" labels
 * annotated a return in broad daylight, eight of them within 15 minutes of NOON -- including
 * wa_mount_stuart_north_ridge, the route check:ui pins as its sample. 67 of 556 "Leave earlier"
 * labels sat beside a morning summit.
 *
 * NEITHER THRESHOLD MOVES. `retH > 18.5` is exactly "this outing runs past dusk", which is the
 * right trigger however long the outing; what it cannot say is which DAY the arrival lands on. So
 * the trigger is untouched -- no warning added, none suppressed -- and only the LABEL gains the
 * day.
 *
 * SECTION 2 PINS NO WORDING, and that is deliberate: a guard holding "Overnight" would forbid
 * improving the copy, which this repo records as its own failure mode more than once. The
 * invariant is structural instead -- a same-day tile and a next-day tile must both carry a label
 * and those labels must DIFFER. That catches the historical defect (both said "After dark"), it
 * catches deleting the label on the next-day tile, and it catches labelling everything the same
 * way; and it survives a reword of either string.
 *
 * Static SSR (no browser, no DB), so it sits in `npm run build`.
 */
import { build } from "esbuild";
import { createRequire } from "module";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require_ = createRequire(import.meta.url);

const ENTRY = `
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import RouteDetail from ${JSON.stringify(path.join(ROOT, "RouteDetail.jsx"))};
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
const noop = () => {};
export function render(route) {
  return renderToStaticMarkup(React.createElement(QueryClientProvider, { client: qc },
    React.createElement(RouteDetail, { route, initialSubTab: "planner", onBack: noop, onSubTab: noop,
      contribs: [], myReports: [], connections: [], comments: {}, hzVotes: {}, sunReports: {},
      gearEdits: {}, diffRatings: {}, crewsForRoute: [], myStars: {}, presence: null })));
}
`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-retleg-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = require_(out);

const text = (h) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const FT = 3.28084;
/* gainM/lossM because dbRouteToCamel hands the app METRES; getting that backwards would silence
   every case here while the fixtures still looked right. */
const route = (over) => Object.assign({
  id: "probe_ret", name: "Probe", grade: "Class 3", gradeSystem: "yds",
  discipline: "mountaineering", distKm: 20, mountainId: "probe_area",
  _dbArea: { id: "probe_area", name: "Probe Area", areaType: "peak", region: "Washington" },
}, over || {});

let fail = 0, ran = 0;
const eq = (label, got, want) => {
  const ok = got === want;
  ran++;
  if (!ok) fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};
// The two clock times, read off the rendered tiles.
const TIMES = /([^ ]+ [AP]M(?: \(\+\d+d\))?) Est\. summit.*?([^ ]+ [AP]M(?: \(\+\d+d\))?) Est\. return/;
const times = (r) => { const m = text(render(r)).match(TIMES); return m ? { summit: m[1], ret: m[2] } : null; };

console.log("the planner renders both clock tiles (so an EQUAL pair is not vacuous)");
const wholeDay = route({ gainM: 7000 / FT, lossM: 7000 / FT });
const t0 = times(wholeDay);
eq("ANCHOR: both tiles rendered", !!t0, true);

console.log("\na walk that already covers the day is not re-added");
eq("Est. return equals Est. summit", t0 ? t0.summit === t0.ret : null, true);

console.log("\n...and every other shape KEEPS its return leg");
/* One-way: gain and loss differ, so hikeH really is just the walk in. */
const oneWay = times(route({ gainM: 7000 / FT, lossM: 500 / FT }));
eq("ANCHOR: one-way rendered", !!oneWay, true);
eq("a one-way approach still adds a return", oneWay ? oneWay.summit !== oneWay.ret : null, true);
/* PITCHED whole-outing: the return is techH*0.7, the descent of the CLIMB, which the walk never
   double-counted. This is the case the first draft of the fix wrongly stripped, on 212 rows. */
const pitchedWhole = times(route({ gainM: 7000 / FT, lossM: 7000 / FT, pitches: 8, grade: "5.8" }));
eq("ANCHOR: pitched whole-outing rendered", !!pitchedWhole, true);
eq("a PITCHED whole-outing route keeps its climb descent", pitchedWhole ? pitchedWhole.summit !== pitchedWhole.ret : null, true);
/* Just outside the app's own 3% window — not a whole-outing row. */
const nearMiss = times(route({ gainM: 7000 / FT, lossM: 6500 / FT }));
eq("outside the 3% window still adds a return", nearMiss ? nearMiss.summit !== nearMiss.ret : null, true);

/* The warning div sits immediately after the tile's own "Est. summit" / "Est. return" caption and
   is identified by carrying a margin-top the caption does not. Read from the RAW markup rather
   than the stripped text: stripping welds the label to the next tile, and there is no reliable
   right-hand boundary for it there. The colour is matched as `[^"]*` on purpose -- pinning C.red's
   hex would be a hand-copy of the palette. An ABSENT warning returns "" and a caption that never
   rendered returns null, because "there is no warning" and "the tile is missing" want different
   repairs and must not print alike. */
const warning = (html, caption) => {
  const cap = ">Est. " + caption + "</div>";
  const i = html.indexOf(cap);
  if (i < 0) return null;
  const m = /^<div style="font-size:12px;color:[^"]*;margin-top:1px">([^<]*)<\/div>/
    .exec(html.slice(i + cap.length));
  return m ? m[1] : "";
};
const labels = (r) => {
  const h = render(r);
  return { summit: warning(h, "summit"), ret: warning(h, "return") };
};

console.log("\na warning names the DAY it lands on");
/* Returns before dusk on the departure day: neither tile has anything to warn about. A rule that
   always labels is satisfied by labelling everything, so this is asserted as hard as the rest. */
const daylight = labels(route({ distKm: 4, gainM: 400 / FT, lossM: 100 / FT }));
eq("ANCHOR: the same-day daylight route rendered both captions", daylight.summit !== null && daylight.ret !== null, true);
eq("a daylight return carries NO warning", daylight.ret, "");
eq("a daylight summit carries NO warning", daylight.summit, "");

/* Same day, past the thresholds. Both warnings are correct here and must survive the fix. */
const sameDay = labels(route({ distKm: 24, gainM: 5200 / FT, lossM: 500 / FT }));
eq("ANCHOR: the same-day dusk route rendered both captions", sameDay.summit !== null && sameDay.ret !== null, true);
eq("a same-day return after dusk is still warned about", sameDay.ret !== "", true);
eq("a same-day summit after 1 PM is still warned about", sameDay.summit !== "", true);

/* Crosses midnight and lands mid-morning. This is the historical defect: the SAME words as the
   same-day case, on a tile whose own clock reads 10:51 AM (+1d). */
const nextDay = labels(route({ distKm: 20, gainM: 6015 / FT, lossM: 500 / FT, pitches: 20, grade: "5.9" }));
eq("ANCHOR: the next-day route rendered both captions", nextDay.summit !== null && nextDay.ret !== null, true);
eq("ANCHOR: its return really is on a later day", /\(\+\d+d\)<\/div><div[^>]*>Est\. return/.test(render(route({ distKm: 20, gainM: 6015 / FT, lossM: 500 / FT, pitches: 20, grade: "5.9" }))), true);
/* THE LOAD-BEARING PAIR. Deleting the label satisfies any "must not say After dark" assertion,
   so non-emptiness is asserted before difference. */
eq("a next-day return is still warned about at all", nextDay.ret !== "", true);
eq("a next-day summit is still warned about at all", nextDay.summit !== "", true);
eq("...and the next-day RETURN does not reuse the same-day wording", nextDay.ret !== sameDay.ret, true);
eq("...and the next-day SUMMIT does not reuse the same-day wording", nextDay.summit !== sameDay.summit, true);

/* The two tiles are judged INDEPENDENTLY: a long climb off a short walk summits late on the
   departure day and returns the next, so one tile takes each wording. Without this, a fix keyed on
   "is this estimate multi-day" rather than on each tile's own clock would pass everything above. */
const split = labels(route({ distKm: 5, gainM: 800 / FT, lossM: 200 / FT, pitches: 20, grade: "5.9" }));
eq("ANCHOR: the split-day route rendered both captions", split.summit !== null && split.ret !== null, true);
eq("its same-day summit is worded like a same-day summit", split.summit, sameDay.summit);
eq("...while its next-day return is worded like a next-day return", split.ret, nextDay.ret);

/* The label and the "(+Nd)" suffix come from ONE function, so they cannot disagree. Asserted
   rather than assumed: a second next-day test written beside the label is the drift this guards. */
const dayOfDecls = (fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8").match(/const dayOf=/g) || []).length;
eq("dayOf is declared exactly once", dayOfDecls, 1);

const FLOOR = 21;
if (ran < FLOOR) {
  console.log(`\nFAIL  only ${ran} assertion(s) ran against a floor of ${FLOOR} — this run proved less than it claims`);
  fail++;
}

console.log(fail
  ? `\ncheck:return-leg: ${fail} FAILURE(S)`
  : `\ncheck:return-leg: ok — a whole-day walk is not counted twice, every other shape keeps its return, and each red label names the day it lands on (${ran} assertions).`);
process.exit(fail ? 1 : 0);
