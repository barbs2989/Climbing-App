// Batch 6 of the prose-citation sweep: web analytics quoted as a crowd measurement.
//
// `crowds` is the single largest column left in `audit:prose-citations` (77 leaves naming a
// publisher). 14 of them share one mechanism, and it is worse than a citation: the estimate of
// how busy a route is was derived from a WEBSITE'S TRAFFIC FIGURES and the working out was left
// in the value. "31,125 total Mountain Project page views / ~148 monthly", "3,400+ AllTrails
// reviews", "3.8 stars / 178 votes", "1,043 total page views since being posted".
//
// PAGE VIEWS ARE NOT ASCENTS. Even with the publisher's name removed these numbers would not
// belong on the screen: nobody plans a trip around a route page's monthly view count, and a
// figure that precise reads as a measurement of the mountain when it is a measurement of a
// website. So the repair keeps the QUALITATIVE VERDICT - "Extremely low", "High", "Low-moderate",
// which is the part a climber actually uses - and cuts the analytics that stood behind it.
//
// Where a value carried a real observation alongside the analytics (Northeast Face Direct's
// eleven-year gap between documented ascents; Don't Climb That's position eight miles up an
// approach trail), that observation is KEPT. A finding is not uniformly contaminated, and
// blanking the value would lose the only useful sentence in it.
//
// Safety contract is the same as every repair script here: exact declared find -> replace, a
// find matching other than exactly once refuses the whole run before any write, edits accumulate
// per (route, column), writes go through patchRow, and every value is re-read afterwards.
//
// Dry run by default. Pass --apply to write.
import { SUPABASE_URL, anonKey, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const DASH = "—";
const Q = "'";

const EDITS = [
  {
    id: "wa_complete_south_buttress", col: "crowds",
    find: "Low as a distinct variant (only 2 Mountain Project votes vs. 108 for the standard South Buttress it extends)",
    repl: "Low as a distinct variant " + DASH + " most parties climb the standard South Buttress it extends",
    note: "the vote ratio was the evidence; the comparison it supported is the fact, so it is stated directly.",
  },
  {
    id: "wa_dolphin_chimney", col: "crowds",
    find: "Rarely climbed " + DASH + " Mountain Project's own text states " + Q + "a lack of good protection has probably minimized the number of ascents" + Q + "; 4★/2 votes, ~2,752 total views, ~33 monthly",
    repl: "Rarely climbed " + DASH + " the lack of good protection has probably minimized the number of ascents",
    note: "quotation plus analytics. The REASON is the useful half and survives as the page's own sentence.",
  },
  {
    id: "wa_don_t_climb_that_she_said", col: "crowds",
    find: "Extremely low -- Mountain Project's dedicated page for this boulder shows only 1,043 total page views since being posted (Jan 2020) and zero comments/discussion; it sits",
    repl: "Extremely low -- it sits",
    note: "the geographic explanation after the analytics is the real content and is kept in full.",
  },
  {
    id: "wa_lewis_creek_route", col: "crowds",
    find: "Low -- Mountain Project's Gunn Peak area page shows only 1,539 total views / ~23 monthly views, and WTA logs just 51 total trip reports for the hike, both low figures for a named Cascades objective.",
    repl: "Low -- little documented traffic for a named Cascades objective.",
    note: "two publishers' analytics supporting one claim; the claim survives without either.",
  },
  {
    id: "wa_mojo_rising", col: "crowds",
    find: "Most obscure SEWS route researched " + DASH + " 3★/2 votes on Mountain Project, ~1,446 total views; largely",
    repl: "The most obscure of the SEWS routes; largely",
    note: "analytics AND a research-act leak - 'researched' dates the claim to when somebody looked, not to anything about the route.",
  },
  {
    id: "wa_north_twin_sister_west_ridge", col: "crowds",
    find: " " + DASH + " AllTrails logs ~50 reviews total and it shows up repeatedly in Mountaineers.org route/trip-report listings and WTA trip reports, but there is no trailhead register or ranger count to cite a hard number",
    repl: " " + DASH + " there is no trailhead register or ranger tally to draw a hard number from",
    note: "the honest hedge is the valuable part and is kept; the three publishers behind it are not.",
  },
  {
    id: "wa_northeast_face_direct", col: "crowds",
    find: "Extremely low -- Mountain Project's dedicated route page shows only ~4,832 total page views since posting (~32/month), with a 2013 trip report explicitly labeling that ascent the " + Q + "second ascent" + Q + " -- meaning roughly 11 years",
    repl: "Extremely low -- the 2013 ascent was recorded as the second ascent, meaning roughly 11 years",
    note: "the eleven-year gap between documented ascents is a real fact about the route and is kept; the page views are not.",
  },
  {
    id: "wa_northwest_face_boving_pollock", col: "crowds",
    find: "Low " + DASH + " only 27 total Mountain Project votes (avg 2.6/5), much less traveled",
    repl: "Low " + DASH + " much less traveled",
  },
  {
    id: "wa_rapple_grapple", col: "crowds",
    find: " (105 Mountain Project votes, ~50 monthly page views, 8 comments), used by guide services",
    repl: ", used by guide services",
    note: "only the analytics go. Naming the Mountaineers as a CLUB THAT RUNS THIS OUTING is a fact about who climbs it, not a claim about where our data came from - the same distinction that keeps 589 land-manager references in the catalog.",
  },
  {
    id: "wa_south_arete", col: "crowds",
    find: "; 31,125 total Mountain Project page views / ~148 monthly (vs. 6,887/51 for Boving Roofs, 2,020/24 for Free Mojo, 27 total votes for NW Face)",
    repl: "",
    note: "the comparison across four routes is entirely page-view counts; the verdict it supports leads the sentence and stands alone.",
  },
  {
    id: "wa_south_spur", col: "crowds",
    find: "Extremely low " + DASH + " Mountain Project's route page shows only 893 total views (~8/month) since posted Aug 2017",
    repl: "Extremely low",
    note: "nothing but analytics stood behind the verdict, so a bare verdict is what is honestly left.",
  },
  {
    id: "wa_southern_man", col: "crowds",
    find: "Low-moderate " + DASH + " 3.6★/23 votes on Mountain Project, ~4,638 total views, ~35 monthly; shares",
    repl: "Low-moderate; shares",
  },
  {
    id: "wa_the_hitchhiker", col: "crowds",
    find: "Best-trafficked of the SEWS technical (non-South-Arete) routes " + DASH + " 3.8★/178 votes on Mountain Project, ~19,900 total views, ~127 monthly",
    repl: "Best-trafficked of the SEWS technical (non-South-Arete) routes",
  },

  // Parked earlier in this sweep as "a citation woven through a 500-character argument", and
  // that was a judgement about DIFFICULTY, not one that needed a human. Reading it properly, the
  // two attributions come apart cleanly: the review counts are analytics like the rest of this
  // batch, and the trailhead observation is a field observation that survives without its author.
  {
    id: "wa_mount_mccausland_n_route", col: "crowds",
    find: " (AllTrails lists 3,000+ reviews for the Lake Valhalla trail; ~1,200+ for the McCausland trail)",
    repl: "",
    note: "analytics. 'Lake Valhalla is a very popular standalone destination' is the claim, and it stands on its own.",
  },
  {
    id: "wa_mount_mccausland_n_route", col: "crowds",
    find: "a WTA trip report from August 2025 noted only ~3 other cars",
    repl: "one August 2025 visit found only ~3 other cars",
    note: "the attribution IS the verb. A count of cars in a trailhead lot is a field observation and keeps its force without naming who made it.",
  },
];

const IDS = [...new Set(EDITS.map((e) => e.id))];

function countIn(v, find) {
  if (typeof v === "string") return v.split(find).length - 1;
  if (Array.isArray(v)) return v.reduce((n, x) => n + countIn(x, find), 0);
  if (v && typeof v === "object") return Object.values(v).reduce((n, x) => n + countIn(x, find), 0);
  return 0;
}
function replaceIn(v, find, repl) {
  if (typeof v === "string") return v.split(find).join(repl);
  if (Array.isArray(v)) return v.map((x) => replaceIn(x, find, repl));
  if (v && typeof v === "object") {
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = replaceIn(x, find, repl);
    return o;
  }
  return v;
}
function leaves(v, out = []) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => leaves(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => leaves(x, out));
  return out;
}

const KEY = APPLY ? requireServiceKey() : anonKey();
const url = `${SUPABASE_URL}/rest/v1/routes?id=in.(${IDS.join(",")})&select=id,crowds`;
const r = await fetch(url, { headers: headers(KEY) });
if (!r.ok) { console.error(`read failed: ${r.status} ${await r.text()}`); process.exit(1); }
const rows = await r.json();
if (rows.length !== IDS.length) {
  console.error(`read returned ${rows.length} row(s) for ${IDS.length} id(s) - refusing`);
  process.exit(1);
}
const byId = new Map(rows.map((x) => [x.id, x]));

const staged = new Map();
const refusals = [];
for (const e of EDITS) {
  const key = `${e.id} ${e.col}`;
  if (!staged.has(key)) staged.set(key, { id: e.id, col: e.col, value: byId.get(e.id)[e.col], edits: [] });
  const s = staged.get(key);
  const n = countIn(s.value, e.find);
  if (n !== 1) {
    refusals.push(`${e.id} ${e.col}: found ${n} occurrence(s) of ${JSON.stringify(e.find)}, expected exactly 1`);
    continue;
  }
  s.value = replaceIn(s.value, e.find, e.repl);
  s.edits.push(e);
}
if (refusals.length) {
  console.error(`REFUSED - ${refusals.length} edit(s) did not match exactly once:\n  ` + refusals.join("\n  "));
  console.error("\nNothing was written. Re-read the live value before changing the declaration.");
  process.exit(1);
}

for (const s of staged.values()) {
  console.log(`\n### ${s.id}`);
  for (const e of s.edits) if (e.note) console.log(`   why: ${e.note}`);
  const before = new Set(leaves(byId.get(s.id)[s.col]));
  for (const l of leaves(s.value)) if (!before.has(l)) console.log(`   => ${l}`);
}
console.log(`\n${EDITS.length} edit(s) across ${staged.size} value(s) on ${IDS.length} route(s).`);

if (!APPLY) { console.log("\nDRY RUN - pass --apply to write."); process.exit(0); }

let wrote = 0;
for (const s of staged.values()) { await patchRow("routes", s.id, { [s.col]: s.value }); wrote++; }
console.log(`\nwrote ${wrote} value(s).`);

const v = await fetch(url, { headers: headers(KEY) });
const after = new Map((await v.json()).map((x) => [x.id, x]));
let bad = 0;
for (const e of EDITS) {
  if (countIn(after.get(e.id)[e.col], e.find) !== 0) {
    console.error(`NOT APPLIED: ${e.id} ${e.col} still contains ${JSON.stringify(e.find)}`);
    bad++;
  }
}
console.log(bad ? `\nVERIFY FAILED: ${bad} edit(s) did not land.` : `\nverified: all ${EDITS.length} edit(s) re-read clean.`);
process.exit(bad ? 1 : 0);
