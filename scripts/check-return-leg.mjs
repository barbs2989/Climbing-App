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

/* Clock text -> minutes since the departure day's midnight, so two tiles can be SUBTRACTED. A
   leading "≥" is the lower-bound marker (no climbing time on file) and is kept out of the number. */
const mins = (t) => { const m = /^≥?(\d+):(\d+) ([AP]M)(?: \(\+(\d+)d\))?$/.exec(t || ""); if (!m) return null; return ((+m[1] % 12) + (m[3] === "PM" ? 12 : 0)) * 60 + +m[2] + (m[4] ? +m[4] * 1440 : 0); };
const legs = (r) => { const t = times(r); if (!t) return null; const s = mins(t.summit), e = mins(t.ret); return s == null || e == null ? null : { summit: s, ret: e, down: e - s }; };

console.log("the planner renders both clock tiles (so an EQUAL pair is not vacuous)");
const roundTrip = legs(route({ gainM: 7000 / FT, lossM: 7000 / FT }));
eq("ANCHOR: both tiles rendered and parsed", !!roundTrip, true);

console.log("\nthe walk is TWO legs: the descent is walked after the summit, not before it");
/* THE DEFECT THIS SECTION NOW HOLDS. One walk leg charged gain AND loss before the summit, so on a
   gain=loss round trip the summit landed at the END of the day and Est. return equalled Est.
   summit -- 352 routes, measured 2026-10-07 -- and every loss_ft made the summit later. */
const dipsOnly = legs(route({ gainM: 7000 / FT, lossM: 500 / FT }));
const noLoss = legs(route({ gainM: 7000 / FT }));
eq("ANCHOR: the dips-only and no-loss shapes rendered", !!dipsOnly && !!noLoss, true);
eq("a round trip returns AFTER its summit", roundTrip ? roundTrip.down > 0 : null, true);
eq("Est. summit does not move with loss_ft (the descent is not walked on the way up)", roundTrip && dipsOnly && noLoss ? roundTrip.summit === dipsOnly.summit && dipsOnly.summit === noLoss.summit : null, true);
/* loss_ft holds two conventions; a party back at its car has dropped at least what it climbed. */
eq("the walk out descends at least the gain, whatever loss_ft holds", roundTrip && dipsOnly && noLoss ? roundTrip.down === dipsOnly.down && dipsOnly.down === noLoss.down : null, true);
const bigLoss = legs(route({ gainM: 5150 / FT, lossM: 7680 / FT }));
const bigGainOnly = legs(route({ gainM: 5150 / FT }));
eq("...and a loss LARGER than the gain (gain from high camp, loss to the car) is walked in full", bigLoss && bigGainOnly ? bigLoss.down > bigGainOnly.down : null, true);

console.log("\n...a pitched route walks out too, and a loop walks its distance once");
/* A pitched route's return was techH*0.7 ALONE -- the climb's descent with no walk to the car. */
const pitchedFar = legs(route({ gainM: 3000 / FT, lossM: 3000 / FT, pitches: 8, grade: "5.8", distKm: 20 }));
const pitchedNear = legs(route({ gainM: 3000 / FT, lossM: 3000 / FT, pitches: 8, grade: "5.8", distKm: 2 }));
eq("ANCHOR: pitched routes rendered", !!pitchedFar && !!pitchedNear, true);
eq("a PITCHED route's return includes the walk out (a longer walk, a longer descent)", pitchedFar && pitchedNear ? pitchedFar.down > pitchedNear.down : null, true);
/* A recorded loop holds the WHOLE outing in its distance: 20 km round a loop is 10 out and 10 back. */
const loop = legs(route({ gainM: 4000 / FT, lossM: 4000 / FT, distKm: 20, outingShape: "loop" }));
const outback = legs(route({ gainM: 4000 / FT, lossM: 4000 / FT, distKm: 10 }));
eq("ANCHOR: loop and out-and-back rendered", !!loop && !!outback, true);
eq("a 20 km loop takes the same day as a 10 km-each-way out-and-back", loop && outback ? loop.ret === outback.ret && loop.summit === outback.summit : null, true);

console.log("\na route's own STORED legs win over the walk model, and the descent is the longer of the two");
/* lib/planTimes.js. The walk model charges the WHOLE car-to-summit gain on the way in, and a stored
   summit leg then charged the top of it again: Easton read 17 hr to the summit. Against online
   trip-report times (2026-10-07, 27 routes, model / online) walk + stored summit read 1.6x and
   stored approach + stored summit 1.2x; the stored descent alone read 0.8x with 14 of 23 SHORT, so
   the descent is the LONGER of the stored one and the walk down. Depart is the fixture's 6:00 AM. */
const T = (timing, over) => route(Object.assign({ gainM: 7000 / FT, lossM: 7000 / FT, timing }, over || {}));
const stored = legs(T({ approachTimeHrs: 3, summitTimeHrs: 5, descentTimeHrs: 4, totalHrs: 12 }));
const storedNear = legs(T({ approachTimeHrs: 3, summitTimeHrs: 5, descentTimeHrs: 4, totalHrs: 12 }, { distKm: 2, gainM: 1000 / FT, lossM: 1000 / FT }));
const push = legs(T({ approachTimeHrs: 3, summitTimeHrs: 10, totalHrs: 13 }));
eq("ANCHOR: the stored-leg fixtures rendered", !!stored && !!storedNear && !!push, true);
eq("Est. summit = depart + STORED approach + STORED summit leg, not the walk model's approach", stored ? stored.summit === (6 + 3 + 5) * 60 : null, true);
eq("a stored descent SHORTER than the 20 km walk down is replaced by the walk down", stored ? stored.down > 4 * 60 : null, true);
eq("...and a stored descent LONGER than a 2 km walk down is kept as stored", storedNear ? storedNear.down === 4 * 60 : null, true);
/* 94 rows store "Summit push and full descent" in summitTimeHrs (approach + summit = total, no
   descent): the summit leg is the round trip from camp, and 0.59 of it is the way up. */
eq("a summit leg that INCLUDES the descent counts only its way-up share (0.59) toward Est. summit", push ? push.summit === Math.round((6 + 3 + 10 * 0.59) * 60) : null, true);
/* ...and that leg's DESCENT share goes on the way down. It used to be dropped: the push climbed its
   0.59 and walked only the trail out, so American Border Peak came down in 2.9 hr against 7 online.
   Three stored shapes hold a descent inside the summit leg (lib/planTimes.js): the push; a DERIVED
   leg (only an approach and a total), whose total - approach is the climb AND the way down; and a
   MULTI-DAY outing whose walk in ~= walk out, whose summit leg is the summit DAY from camp. Each
   sends 0.59 up and the rest down, so the round trip is never shorter than the stored total. The
   walk is kept short (2 km, 1,000 ft) so the stored legs, not the walk, decide. */
const NEAR = { distKm: 2, gainM: 1000 / FT, lossM: 1000 / FT };
const CAMP_DAYS = { days: [{ n: 1, title: "Approach to camp" }, { n: 2, title: "Summit day" }, { n: 3, title: "Walk out" }] };
const pushNear = legs(T({ approachTimeHrs: 3, summitTimeHrs: 10, totalHrs: 13 }, NEAR));
const derivedNear = legs(T({ approachTimeHrs: 2, totalHrs: 10 }, NEAR));
const campMulti = legs(T({ approachTimeHrs: 6, summitTimeHrs: 11, descentTimeHrs: 5, totalHrs: 22 }, Object.assign({ itinerary: CAMP_DAYS }, NEAR)));
const campOneDay = legs(T({ approachTimeHrs: 6, summitTimeHrs: 11, descentTimeHrs: 5, totalHrs: 22 }, NEAR));
eq("ANCHOR: the push, derived and camp fixtures rendered", !!pushNear && !!derivedNear && !!campMulti && !!campOneDay, true);
eq("a push's DESCENT share (0.41) is walked down, not dropped: the round trip is its stored 13 hr total", pushNear ? JSON.stringify([pushNear.down, pushNear.ret]) : null, JSON.stringify([Math.round(10 * 0.41 * 60), (6 + 13) * 60]));
eq("a DERIVED leg (total - approach) holds the descent too: 0.59 of it up, the rest down", derivedNear ? JSON.stringify([derivedNear.summit, derivedNear.ret]) : null, JSON.stringify([Math.round((6 + 2 + 8 * 0.59) * 60), (6 + 10) * 60]));
eq("a MULTI-DAY route's summit leg beside walk in ~= walk out is a round trip from camp: 0.59 up", campMulti ? campMulti.summit : null, Math.round((6 + 6 + 11 * 0.59) * 60));
eq("...and its other 0.41 comes down to camp BEFORE the stored walk out (round trip = the 22 hr total)", campMulti ? campMulti.ret : null, (6 + 22) * 60);
eq("...while the same legs on a SINGLE-day route are a one-way climb, left whole", campOneDay ? JSON.stringify([campOneDay.summit, campOneDay.down]) : null, JSON.stringify([(6 + 6 + 11) * 60, 5 * 60]));
/* ...and a stored leg is a FIT PARTY's day ("published times for a fit party in good conditions",
   the contribute form's definition of `timing`), which fitness and pack do not scale. The Planner
   says so rather than presenting it as the climber's own day; a walk-only route makes no such claim. */
const fitLine = (r) => { const m = /data-fit-party="1"[^>]*>([^<]*)</.exec(render(r)); return m ? m[1].replace(/&#x27;|\u2019/g, "’") : null; };
eq("a route with a published approach and climb says they are a FIT party's times, unscaled by fitness and pack", /approach and climb are this route’s published times for a fit party, so fitness and pack don’t change them/.test(fitLine(T({ approachTimeHrs: 3, summitTimeHrs: 5, descentTimeHrs: 4, totalHrs: 12 })) || ""), true);
eq("...a published car-to-car day says the car-to-car time is", /car-to-car time is this route’s published time for a fit party/.test(fitLine(route({ distKm: null, timing: { summitTimeHrs: 9, totalHrs: 9 } })) || ""), true);
eq("...and a route timed by the walk model alone makes no fit-party claim", fitLine(route({ gainM: 1000 / FT, lossM: 1000 / FT })), null);
/* ...and a PUBLISHED TIMES section with no hours prints no hours. Three of the five sections of
   Mount Seattle's South Route store `hrs: null` and its itinerary's notes differ in wording, so the
   card's section list is NOT suppressed as a duplicate: it printed "null hr" three times (found
   2026-10-08 reading the camp-shaped rows; 4 rows in the catalog store a non-numeric section hrs). */
const nullHrsCard = text(render(T({ approachTimeHrs: 3, summitTimeHrs: 5, descentTimeHrs: 4, totalHrs: 12, sectionBreakdown: [
  { section: "Approach", fromTo: "Up the valley", hrs: null, note: "Follow the river trail to camp." },
  { section: "Climb", fromTo: "Summit day", hrs: 5, note: "Go light from camp." } ] })));
eq("ANCHOR: the PUBLISHED TIMES card rendered both of its sections", /PUBLISHED TIMES/.test(nullHrsCard) && /Up the valley/.test(nullHrsCard) && /Summit day/.test(nullHrsCard), true);
eq("a section with no hours prints no \"null hr\" (nor \"undefined hr\"), while a numeric one still prints its hours", /\b(?:null|undefined) hr\b/.test(nullHrsCard) ? "prints a missing value" : (/\b5 hr\b/.test(nullHrsCard) ? "ok" : "lost the real hours"), "ok");
const pitchedStored = legs(T({ approachTimeHrs: 3, summitTimeHrs: 5, descentTimeHrs: 1, totalHrs: 9 }, { pitches: 8, grade: "5.8" }));
const unpitchedStored = legs(T({ approachTimeHrs: 3, summitTimeHrs: 5, descentTimeHrs: 1, totalHrs: 9 }));
eq("ANCHOR: pitched and unpitched stored-leg fixtures rendered", !!pitchedStored && !!unpitchedStored, true);
eq("a STORED summit leg already covers its rappels: no 0.7 x climb is added on top", pitchedStored && unpitchedStored ? pitchedStored.down === unpitchedStored.down : null, true);
/* A stored approach is not a hole: with no distance or gain on file the Approach tile states the
   stored leg as a value, not a floor, and the lower-bound note stays away when both legs are stored. */
const noWalkHtml = text(render(route({ distKm: null, timing: { approachTimeHrs: 3, summitTimeHrs: 5, descentTimeHrs: 2, totalHrs: 10 } })));
const tile = /(≥?)(\d+\.\d)hr Approach/.exec(noWalkHtml);
eq("ANCHOR: the Approach tile rendered for a route with stored legs and no walk inputs", !!tile, true);
eq("...and it states the stored approach (3.0hr) with no lower-bound mark", tile ? tile[1] + tile[2] : null, "3.0");
eq("...and no 'Lower bounds only' note claims the walk is missing", /Lower bounds only — this climb has no recorded/.test(noWalkHtml), false);

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

/* -- 3. a multi-day route SAYS SO, and points at something that is on the screen ----------------
   The amber "typically done over N days" box sits directly above these tiles, and it was gated on
   `route.campOptions` — a SEED-ONLY field. `routes` has no such column under any spelling, the DB
   store is `bivy`, and deploy.yml sets VITE_USE_DB=true, so it rendered for NOBODY in production:
   measured by executing dbRouteToCamel rather than grepping it, campOptions survives on 0 of 8,365
   WA routes. Meanwhile the GEAR box in the same file derived the same fact from the route's own
   itinerary and added a tent, a sleeping bag and a stove — so on 344 routes the app packed for a
   bivy and said nothing about the day being multi-day, on exactly the routes whose single-push
   estimate is least believable.

   BOTH DIRECTIONS, because a rule that only demands the box APPEAR is satisfied by showing it on
   every route — which would put "typically done over 1 days" on a car-to-car scramble. And the
   seed-shaped fixture is the anti-revert: restoring the old gate fails the first case, while
   OR-ing the two fails this one. */
/* FOUND BY ITS OWN `data-multiday`, NOT BY ITS SENTENCE, and the injection is what forced that:
   a first version matched the copy, so `SILENT-multiday-copy-reworded-but-still-honest` FIRED ON
   CORRECT WORK — a guard pinned to one phrasing forbids improving it, which this repo records as
   a real cost several times over. The attribute is the same structural anchor ROUTE BREAKDOWN's
   rows already use, and it carries the day count so the two cannot drift: the box must also PRINT
   that number, which is asserted separately and needs no particular wording to do it. */
const discl = (r) => {
  const html = render(r);
  const m = html.match(/data-multiday="(\d+)"/);
  if (!m) return null;
  return { days: m[1], saysIt: text(html).includes(" " + m[1] + " days") };
};
const md3 = route({ distKm: 30, gainM: 6000 / FT, lossM: 6000 / FT, itinerary: { days: [{ n: 1 }, { n: 2 }, { n: 3 }] } });
const md1 = route({ distKm: 30, gainM: 6000 / FT, lossM: 6000 / FT, itinerary: { days: [{ n: 1 }] } });
const mdNone = route({ distKm: 30, gainM: 6000 / FT, lossM: 6000 / FT });
/* The seed shape the gate used to read, on a route whose OWN itinerary is a single day. */
const mdSeed = route({ distKm: 30, gainM: 6000 / FT, lossM: 6000 / FT, itinerary: { days: [{ n: 1 }] }, campOptions: [{ name: "High camp", stars: 5 }] });

eq("a route whose own itinerary runs 3 days says it is a multi-day outing", !!discl(md3), true);
eq("...derived from that itinerary's own day count", discl(md3) && discl(md3).days, "3");
eq("...and PRINTS it, rather than saying 'multiple' or carrying it only in the markup", discl(md3) && discl(md3).saysIt, true);
eq("a single-day itinerary does NOT get the multi-day disclaimer", discl(md1), null);
eq("a route with no itinerary at all does NOT get it either", discl(mdNone), null);
eq("a starred seed campOption does NOT drive it — that field reaches no real route", discl(mdSeed), null);

/* THE POINTER MUST NAME SOMETHING ON THE SCREEN. The old copy read "use the Plan tab for a
   realistic day-by-day plan" while sitting ON the Plan tab, with <ItineraryView/>'s "Trip plan"
   rendered directly ABOVE it — a pointer past the very thing it pointed at, invisible for as long
   as the box rendered for nobody. Asserted as ORDER rather than mere presence, because "above" is
   the claim being made. */
const md3Html = render(md3);
const iPlan = md3Html.indexOf(">Trip plan<"), iDiscl = md3Html.search(/data-multiday="/);
eq("ANCHOR: the Trip plan section rendered on the same tab", iPlan >= 0, true);
eq("...and it really is ABOVE the disclaimer that points at it", iPlan >= 0 && iDiscl > iPlan, true);
/* The box's OWN text, sliced from its anchor to the first closing tag — it holds one <b> and no
   nested div. Scoped rather than matched page-wide, because "Trip plan" is also the heading of the
   section being pointed AT, so a page-wide test would pass on the strength of the destination
   existing rather than on the disclaimer naming it. The rule is that the pointer names a
   destination, never that it is worded one way. */
const box = md3Html.slice(iDiscl).split("</div>")[0];
eq("the disclaimer names the section it points at", box.includes("Trip plan"), true);
eq("...and no longer sends a reader to the tab they are already on", /use the .?Plan.? tab/.test(text(md3Html)), false);

const FLOOR = 57;
if (ran < FLOOR) {
  console.log(`\nFAIL  only ${ran} assertion(s) ran against a floor of ${FLOOR} — this run proved less than it claims`);
  fail++;
}

console.log(fail
  ? `\ncheck:return-leg: ${fail} FAILURE(S)`
  : `\ncheck:return-leg: ok — the walk is split at the summit, stored legs win and the descent is the longer of stored and walked, every route walks out, and each red label names the day it lands on (${ran} assertions).`);
process.exit(fail ? 1 : 0);
