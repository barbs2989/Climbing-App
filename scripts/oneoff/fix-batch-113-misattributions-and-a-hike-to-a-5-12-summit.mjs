// Batch 113 repairs. Every one is settled by at least two records, and most by a record the row
// ALREADY HOLDS — the external source only confirms which of the row's own halves is right.
//
// ── COLCHUCK BALANCED ROCK ────────────────────────────────────────────────────────────────────
//
// 1-2. `grade` says V2; FOUR records say V1, two of them inside the catalog. The row's own
//   `rock_grade` reads "V1 (boulder)", and the sibling wa_the_scoop_2's pitch 10 calls it a "V1
//   boulder problem". Mountain Project's header for this exact problem is "V1 (YDS) / 5 (Font)"
//   (https://www.mountainproject.com/route/121203676/the-balanced-rock) and Steph Abegg, who has
//   done it twice, writes "an exposed V1 boulder problem to surmount the balanced rock on the
//   summit". The `overview` carries the same error twice over — "V2 (5+ Font)" against MP's Font 5.
//
// 3. `dist_km` 16.74 is a ROUND TRIP in a column the app doubles. 16.74 km = 10.402 miles, which
//   is exactly this row's own itinerary.days[0].miles = 10.4, on a day whose gainFt (3700) equals
//   its lossFt (3700) — a round trip by construction. WTA gives the Colchuck Lake trail as "8.0
//   miles, roundtrip" = 4.0 one-way (https://www.wta.org/go-hiking/hikes/colchuck-lake), plus
//   ~1 mi of steep ground to the wall, so one-way is ~5 mi = 8.0 km — which is what TWELVE
//   siblings on this formation store. Copied from a sibling rather than typed.
//
// ── THE TEMPEST ───────────────────────────────────────────────────────────────────────────────
//
// 4. `descent` puts the summit rappel "on the south/southwest side". The row's OWN `descent_text`
//   says "a single ~30m (100ft) rappel TO THE EAST off a sling around a horn", and both sibling
//   rows say east. Abegg says it twice, on two different routes: "Make a 30m rappel to east from
//   slung horn" (https://stephabegg.com/trip-reports/washington/cbr-scoop/). One field in one row
//   is the outlier, and it is the one a party reads when looking for the way down.
//
// 5. `fa` misspells the second ascensionist and dates the climb a year late. Alpinist's newswire,
//   WRITTEN BY BLAKE HERRINGTON HIMSELF and published 11 September 2008, reads "The Tempest Wall
//   (IV 5.10 A2) ... established by Blake Herrington and Sol WERTKIN on August 28, 2008"
//   (https://alpinist.com/doc/web08f/newswire-cascades-tempest-herrington, fetched this session).
//   A piece published in September 2008 cannot describe an August 2009 climb. The stored 2009 is
//   the AAJ's PUBLICATION year — the AAJ covers the prior season — and the AAJ also carries the
//   "Werkin" typo that Herrington's own two accounts do not.
//
// ── THE SCOOP ─────────────────────────────────────────────────────────────────────────────────
//
// 6. `fa` dates the first ascent 27 August 2010 while the row's OWN `overview` says 9 August 2010.
//   The AAJ report, written by FA-party member Stewart Matthiesen, says "Matt Clifton, Evan
//   Cabodi, and I returned to Colchuck Balanced Rock on AUGUST 9 and completed a free ascent"
//   (http://publications.americanalpineclub.org/articles/12201009400/...). 27 August 2010 is the
//   Mountain Project page's "Shared By" UPLOAD date; MP's own FA line carries no date at all.
//
// ── SLOAN PEAK, SUPERALPINE ───────────────────────────────────────────────────────────────────
//
// 7. `fa` credits the first ascent to a WEBSITE: "Kyle (climberkyle.com)". `fa` renders on the
//   route page (RouteDetail.jsx:760 and :2284), so a domain stands where a person's surname
//   belongs — the standing "no sources anywhere in the app" rule, in the field that names who did
//   the climb. The AAC's The Line (October 2023) supplies the name: "Superalpine, a WI3/4 on the
//   face that was established by Porter McMichael and Kyle McCROHEN in 2020"
//   (https://americanalpineclub.org/news/2023/10/22/the-line-october-2023, fetched this session).
//
// ── THE CHOPPING BLOCK, NORTHWEST ROUTE ───────────────────────────────────────────────────────
//
// 8. `overview` calls this "The peak's original technical line: first climbed in 1961". The source
//   is the AAJ, written by Ed Cooper himself, and it files the entry as "NEW ROUTE on Pinnacle
//   Peak, 6805 feet, September 9, 1961 (Ed Cooper and Glen Denny)" — while listing five genuine
//   first ascents elsewhere in the same article BY NAME (North Face of Mount Terror,
//   Himmelgeisterhorn, Dusseldorferspitze, Ottohorn, Frenzelspitz). The same article says outright
//   that "the giant cairn on top had remained undisturbed since the first ascent in 1932 by Bill
//   Degenhardt and H. V. Strandberg"
//   (http://publications.americanalpineclub.org/articles/12196206500/..., fetched this session).
//   The row's own `beta` already quotes this article correctly; only the overview overreaches.
//
// ── THE CHOPPING BLOCK, NORTHEAST RIDGE ───────────────────────────────────────────────────────
//
// 9-11. THREE fields hang a modern party's rope choice on the 1970 first ascent. Mountain Project
//   reads "Rappel with 1-2 ropes. Seemed like 70m would get to most stations, WE used a 50m and a
//   tagline", on a page whose byline is "Shared By: Joe Manning on Jul 26, 2021" and whose FA is a
//   SEPARATE header field reading "Firey party, 1970"
//   (https://mountainproject.com/route/121075395/northeast-ridge, fetched this session). The "we"
//   is the 2021 party. Each edit removes the false attribution and keeps the rope fact.
//
// ── THE TOOTH, INDENTURED SERVANT ─────────────────────────────────────────────────────────────
//
// 12-13. `pitches` 6 and `length_m` 252 both count the UNROPED SUMMIT SCRAMBLE as part of the
//   climb. The row labels the stage itself: pitch_detail[5] is pitch "Summit scramble", grade
//   "3rd/4th class", lengthM 100, notes "roughly 100m of UNPROTECTED SCRAMBLING to the true
//   summit". Mountain Project gives the route as 5 pitches and "500 ft (152 m)", twice — on the
//   route page and on The Tooth area page — and 252 - 100 = 152 exactly, so the arithmetic is the
//   row's own. `pitches` feeds the planner's climbing-time model and `length_m` renders as
//   "Height / length", so this overstates the technical route by 66%.
//
// 14. A waypoint typed `route-start` and named "Indentured Servant base" sits 5.1 METRES from the
//   summit pin — measured from the row's own coordinates, no source needed. The base of a 500 ft
//   route cannot be five metres from its top; the pin is a duplicate of the summit, and it carries
//   neither an elevation nor a trail mileage, so nothing else is lost by removing it. The map draws
//   it as a second marker on the summit.
//
// Dry run by default; --hashes prints the constants; --apply writes.
import { runRepairs } from "./lib/repair-engine.mjs";
import { requireServiceKey } from "../lib/supabase-env.mjs";
const KEY = requireServiceKey();

const REPAIRS = [
  // ---- Colchuck Balanced Rock
  { kind: "set", route: "wa_the_balanced_rock", path: "grade", expect: "47cfe5eb8ada0e74", value: "V1",
    why: "MP, Abegg twice, the row's own rock_grade \"V1 (boulder)\" and the sibling Scoop's pitch 10 all say V1" },
  { kind: "edit", route: "wa_the_balanced_rock", path: "overview", expect: "83006eda266fd018",
    find: "rated around V2 (5+ Font)", repl: "rated around V1 (5 Font)", count: 1,
    why: "the same error twice in one sentence — MP's Font grade for this problem is 5, not 5+" },
  { kind: "copyRow", route: "wa_the_balanced_rock", path: "dist_km", expect: "ee66b6ed063a824e",
    from: { route: "wa_the_scoop_2", path: "dist_km", expect: "2c624232cdd22177" },
    why: "16.74 km is this row's own itinerary round trip (10.4 mi, gain==loss) in a one-way column; twelve siblings store the one-way figure" },

  // ---- The Tempest
  { kind: "edit", route: "wa_the_tempest", path: "descent", expect: "af642af66e38b413",
    find: "on the south/southwest side", repl: "on the east side", count: 1,
    why: "the row's own descent_text, both sibling rows and Abegg twice all put the slung-horn rappel on the EAST" },
  { kind: "edit", route: "wa_the_tempest", path: "fa", expect: "0c7ddd1659b1ffd0",
    find: "Sol Werkin, August 27-28, 2009", repl: "Sol Wertkin, August 27-28, 2008", count: 1,
    why: "Alpinist, written by Herrington and published 11 Sep 2008, gives Sol Wertkin and 28 Aug 2008; 2009 is the AAJ's publication year" },

  // ---- The Scoop
  { kind: "edit", route: "wa_the_scoop_2", path: "fa", expect: "7658a5132e35a779",
    find: "first ascent dated August 27, 2010", repl: "first ascent August 9, 2010", count: 1,
    why: "the row's own overview and the AAJ both say 9 August; 27 August is Mountain Project's page-upload date" },

  // ---- Sloan Peak
  { kind: "edit", route: "wa_superalpine", path: "fa", expect: "341fde3da32557ac",
    find: "Kyle (climberkyle.com)", repl: "Kyle McCrohen", count: 1,
    why: "a website domain rendered where the first ascensionist's surname belongs; the AAC names him Kyle McCrohen" },

  // ---- The Chopping Block, NW Route
  { kind: "edit", route: "wa_the_chopping_block_northwest_route", path: "overview", expect: "7ba1abacdb2b2d35",
    find: "The peak's original technical line: first climbed in 1961 by",
    repl: "A new route rather than the peak's first ascent, climbed in 1961 by", count: 1,
    why: "the AAJ, written by Cooper, files this as a NEW ROUTE and records the peak's first ascent as 1932" },

  // ---- The Chopping Block, NE Ridge — one misattribution, three fields
  { kind: "edit", route: "wa_the_chopping_block_northeast_ridge", path: "rappels", expect: "e6352fb4aeadc425",
    find: "(the first-ascent party used a 50m rope plus tagline)",
    repl: "(one reporting party used a 50m rope plus a tagline)", count: 1,
    why: "the 50m-plus-tagline is a 2021 Mountain Project contributor's \"we\", not the 1970 first ascent" },
  { kind: "edit", route: "wa_the_chopping_block_northeast_ridge", path: "descent_text", expect: "876d742289b2755a",
    find: "the 1970 first-ascent party got down on a 50m rope with a tagline",
    repl: "one reporting party got down on a 50m rope with a tagline", count: 1,
    why: "same misattribution, second field" },
  { kind: "edit", route: "wa_the_chopping_block_northeast_ridge", path: "pro_tips.0", expect: "793252433051a568",
    find: "(as the FA party did with a 50m)", repl: "(as one party did with a 50m)", count: 1,
    why: "same misattribution, third field" },

  // ---- The Tooth, Indentured Servant
  { kind: "set", route: "wa_the_tooth_indentured_servant", path: "pitches", expect: "e7f6c011776e8db7", value: 5,
    why: "the 6th pitch_detail entry is the row's own \"Summit scramble\", 3rd/4th class and unprotected; MP gives 5 pitches twice" },
  { kind: "set", route: "wa_the_tooth_indentured_servant", path: "length_m", expect: "d6e5a20b30f87216", value: 152,
    why: "252 counts the row's own 100 m unroped scramble; MP gives the route as 500 ft (152 m), and 252 - 100 = 152" },
  { kind: "drop", route: "wa_the_tooth_indentured_servant", path: "waypoints", expect: "ae371fc306bdf3ae",
    drop: [{ i: 1, name: "Indentured Servant base (west side, left of Tooth Fairy)" }],
    why: "a route-start pin 5.1 m from the summit pin, carrying no elevation and no mileage — a duplicate of the summit" },
];

const res = await runRepairs(REPAIRS, {
  apply: process.argv.includes("--apply"),
  hashes: process.argv.includes("--hashes"),
  key: KEY,
  select: "id,grade,rock_grade,overview,dist_km,descent,descent_text,fa,rappels,pro_tips,pitches,length_m,waypoints",
});
process.exitCode = (res.refused || res.bad) ? 1 : 0;
