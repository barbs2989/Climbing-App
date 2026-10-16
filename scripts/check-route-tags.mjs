// Assert the catalog's REAL list prose still reaches a list key, and that every key the UI
// can emit renders as a chip.
//
// Static and fast (no DB, no browser), so it sits in `npm run build`.
//
// The defect this exists to stop is not a crash. Challenges asked `inList("fifty")` while the
// catalog tagged `"fifty_classics"`, and the Bulger peaks carried whole sentences in eleven
// spellings. Every one of those challenges rendered **0 of N with the data in the column**.
// Nothing failed: the column was populated, the consumer ran, and the answer was quietly
// always zero.
//
// So the assertions are built from the ACTUAL strings in the live `routes.lists` column, not
// from invented examples. An invented fixture keeps passing through exactly the change that
// breaks real data — a new enrichment phrasing, or a tightened pattern.
//
// It also pins the SPLIT between the two modules. `lib/lists.js` owns membership and is what
// Challenges queries; `lib/routeTags.js` owns presentation and must resolve through it rather
// than carrying a second vocabulary. #783 and #789 briefly shipped two resolvers over one
// column, which is the same drift that caused the original bug — so the check below proves a
// chip and a challenge answer from the same call.

import { routeTags, hasTag, LIST_TAGS, FEATURE_TAGS } from "../lib/routeTags.js";
import { LIST_ALIASES, routeInList } from "../lib/lists.js";

let fail = 0;
const t = [];
const ok = (label, cond, got) => { if (cond) t.push(`  ok    ${label}`); else { fail++; t.push(`  FAIL  ${label}  got=${JSON.stringify(got)}`); } };

// --- Verbatim from the live DB (WA, 2026-08-09). Do not "tidy" these strings. -----------
const REAL_PROSE = [
  ["Washington Top 100 (Bulger List)", "bulgers", ""],
  ["Washington Bulger List (100 highest peaks in Washington State)", "bulgers", ""],
  ["Washington Bulger List (100 Highest Peaks in Washington)", "bulgers", ""],
  ["Washington Bulger List (100 Highest) - #19", "bulgers", "#19"],
  ["Bulger List (Washington's 100 highest peaks)", "bulgers", ""],
  ["Bulger List (Washington's 100 highest peaks) - #48", "bulgers", "#48"],
  ["Washington Bulgers (100 Highest Peaks in Washington)", "bulgers", ""],
  ["Washington Bulgers (100 Highest Peaks) — tied for #51", "bulgers", "tied #51"],
  ["fifty_classics", "fifty", ""],
];
for (const [prose, key, detail] of REAL_PROSE) {
  const route = { lists: [prose] };
  ok(`${key} <- ${prose.slice(0, 48)}…`, routeInList(route, key), prose);
  const tag = routeTags(route).find(x => x.slug === key);
  ok(`  chip for ${key}${detail ? " " + detail : ""}`, !!tag && tag.detail === detail, tag && { slug: tag.slug, detail: tag.detail });
}

// Every key lists.js declares must produce a RENDERABLE chip — label, short, icon, colour.
// LIST_TAGS need not cover them all; the generic fallback must fill the gap, so a list added
// to lists.js can never render as a blank chip.
for (const key of Object.keys(LIST_ALIASES)) {
  const tag = routeTags({ lists: [key] }).find(x => x.slug === key);
  ok(`${key} renders a chip`, !!tag, key);
  if (tag) ok(`  ${key} chip is complete`, !!(tag.label && tag.short && tag.icon && tag.color), tag);
}
for (const [k, v] of Object.entries(LIST_TAGS)) {
  ok(`LIST_TAGS.${k} is a key lists.js knows`, !!LIST_ALIASES[k], Object.keys(LIST_ALIASES));
  ok(`LIST_TAGS.${k} complete`, !!(v.label && v.short && v.icon && v.color), v);
}

// THE SPLIT: routeTags must not answer differently from routeInList. If this ever diverges,
// a climber sees a chip a challenge does not count, or the reverse.
for (const key of Object.keys(LIST_ALIASES)) {
  for (const probe of [{ lists: [key] }, { lists: ["Washington Bulger List (100 Highest)"] }, { lists: [] }, {}]) {
    ok(`${key}: chip agrees with membership`, routeInList(probe, key) === routeTags(probe).some(x => x.slug === key), { key, probe });
  }
}

// --- composition -------------------------------------------------------------------------
const westRidge = { name: "West Ridge", classic: true, lists: ["fifty_classics"], features: ["Exposed", "Arête"],
  hazards: ["long exposed ridge"], approach: "Traverse the Quien Sabe Glacier to the notch." };
const tags = routeTags(westRidge), slugs = tags.map(x => x.slug);
ok("list membership present", slugs.includes("fifty"), slugs);
ok("classic present", slugs.includes("classic"), slugs);
ok("features carried through", slugs.includes("Exposed") && slugs.includes("Arête"), slugs);
ok("glacier travel derived", slugs.includes("glaciated"), slugs);
ok("lists render before features", slugs.indexOf("fifty") < slugs.indexOf("Exposed"), slugs);
ok("every tag renderable", tags.every(x => x.label && x.icon && x.color), tags.map(x => x.slug));
ok("hasTag agrees", hasTag(westRidge, "fifty") && !hasTag(westRidge, "bulgers"));

// The same list arriving twice — once as a slug, once as prose — is ONE chip, not two.
const dup = routeTags({ lists: ["bulger", "Washington Bulger List (100 Highest Peaks in Washington)"] });
ok("duplicate list collapses to one chip", dup.filter(x => x.slug === "bulgers").length === 1, dup.map(x => x.slug));

// A route with nothing renders nothing and must not throw.
ok("bare route -> no tags", routeTags({}).length === 0, routeTags({}));
ok("null route -> no tags", routeTags(null).length === 0);
ok("lists:null tolerated", routeTags({ lists: null, features: null }).length === 0);

// --- the four Washington peak lists, as the catalog actually stores them -------------------
// Real values, copied out of the live catalog. Each reached NO chip: routeTags iterates
// LIST_ALIASES keys, so a raw string matching none of them was never considered, and the
// membership was in the row and on no screen.
//
// Each must resolve to EXACTLY ONE key. Two keys matching one string would draw the same
// membership twice, which is the duplicate the "Regional classic" fix removed, arriving from
// the resolver end instead of the render end.
const REAL_LIST_VALUES = [
  ["Peakbagger 'Home Court' Top 100 Washington peaks by elevation – ranked #29", "wa_top100_elev", "#29"],
  ["Peakbagger Washington 400'+ clean-prominence steepest-peaks 'Master List' – ranked #93", "wa_prominence", "#93"],
  ["Washington Top 200 Peaks (elevation-based list of the ~200 highest Washington peaks with 400+ ft of prominence) - Buckskin Mountain is listed among the 'Extra 110' peaks needed to complete the Top 200, per Country Highpoints' tracked list.", "wa_top200", ""],
  ["Washington's Difficult 10 (\"Hardest Peaks\") — SummitPost list", "wa_difficult10", ""],
  // Regression: the Bulger spellings must NOT be captured by the new keys, and vice versa.
  ["Washington Top 100 (Bulger List)", "bulgers", ""],
  ["Bulger List (Washington's 100 highest peaks) - #48", "bulgers", "#48"],
  ["fifty_classics", "fifty", ""],
];
for (const [value, wantKey, wantRank] of REAL_LIST_VALUES) {
  const hits = Object.keys(LIST_ALIASES).filter(k => routeInList({ lists: [value] }, k));
  ok(`${wantKey}: resolves to exactly one key`, hits.length === 1 && hits[0] === wantKey, hits);
  const chip = routeTags({ lists: [value] }).find(x => x.slug === wantKey);
  ok(`${wantKey}: reaches a chip`, !!chip, chip);
  if (chip) ok(`${wantKey}: rank ${JSON.stringify(wantRank)} carried through`, (chip.detail || "") === wantRank, chip.detail);
}
// NO SOURCES. Every one of these values names the site it was read from. A chip repeating that
// would put a source on screen, which this app does not do anywhere - so the label, the short
// form and the blurb are checked, not just the label.
const PUBLISHERS = /peakbagger|summitpost|mountain\s*project|country\s+highpoints|wta\b|alltrails|gaia|caltopo/i;
for (const [key, def] of Object.entries(LIST_TAGS)) {
  ok(`${key}: names no publisher`, !PUBLISHERS.test([def.label, def.short, def.blurb].join(" ")), def);
}

// --- feature presentation ------------------------------------------------------------------
// A `features` value with no FEATURE_TAGS entry still renders, through routeTags own fallback
// - a grey bullet with an EMPTY blurb. That degrades QUIETLY: the chip is on screen, so no
// coverage check can see it carries none of the information its siblings carry. 383 of 1,216
// chip instances were in that state until the table was completed. So every entry must
// actually be presentable, and the fallback must stay a fallback rather than the common case.
for (const [name, def] of Object.entries(FEATURE_TAGS)) {
  ok(`feature ${name}: has an icon`, !!(def.icon && String(def.icon).trim()), def);
  ok(`feature ${name}: has a blurb`, !!(def.blurb && def.blurb.trim().length > 10), def);
  ok(`feature ${name}: names a colour`, !!(def.color && String(def.color).trim()), def);
  const chip = routeTags({ features: [name] }).find(x => x.slug === name);
  ok(`feature ${name}: reaches a chip carrying its own presentation`,
    !!chip && chip.icon === def.icon && chip.color === def.color && chip.blurb === def.blurb, chip);
}
// The fallback still has to work - a value the table has not learned yet must RENDER, not
// vanish. Losing the chip would be worse than losing its colour.
const unknownChip = routeTags({ features: ["Verglas"] }).find(x => x.slug === "Verglas");
ok("an unknown feature still renders a chip", !!unknownChip && unknownChip.label === "Verglas", unknownChip);

// Derived warnings must read the columns the closure actually lives in.
ok("raptor closure from access prose", hasTag({ access: { seasonal: "Peregrine falcon nesting closure Feb 1 - Jul 15." } }, "raptor_closure"));
ok("raptor closure from hazards", hasTag({ hazards: ["Seasonal raptor nesting closure on the upper wall"] }, "raptor_closure"));
ok("no false raptor tag", !hasTag({ overview: "A fine granite arete above the road." }, "raptor_closure"));

// --- the two derived chips, against strings copied VERBATIM from the catalog (2026-09-25) ------
// Both used to fire on a bare word anywhere in the prose. Glaciated sat on 659 routes and 328 of
// them — Vesper Peak's North Face, 96 boulder problems, 55 trad routes — cross no glacier. Raptor
// closure sat on 1,189 and 1,127 of those are closed by nothing. Each case below is one of the
// shapes that produced them; do not "tidy" the strings, they are what the enrichment writes.
const G = (route, want, label) => ok(`glaciated ${want ? "ON " : "off"}: ${label}`, hasTag(route, "glaciated") === want, route);
G({ discipline: "alpine", name: "North Face (Ragged Edge)",
  approach: "An alternative start via a small notch/col overlooking the Vesper Glacier is also used.",
  access: { rules: "Group size capped at 12 (people + stock combined) in Glacier Peak Wilderness; larger groups must split with 1-mile separation." } },
  false, "Vesper N Face: a view of a glacier and a wilderness's name");
G({ discipline: "sport", access: { rules: "Pack out human waste (blue bags) — no burial or glacier deposition." } }, false, "a sport route's access boilerplate (109 routes)");
G({ discipline: "scrambling", approach: "From Glacier, WA, drive Mt. Baker Highway (SR 542) east about 12.5 miles" }, false, "the town of Glacier");
G({ discipline: "scrambling", overview: "Mount Blum (7,685 ft) is a rugged, glacier-draped granite peak. Two small glaciers cling to its north flank." }, false, "scenery: glaciers that cling");
G({ discipline: "scrambling", overview: "is unrelated to Mount Olympus — don't plan a Hoh River/Blue Glacier approach for it" }, false, "a negated approach");
G({ discipline: "alpine", overview: "5.9 crux pitches and views of Rainier during the climb and Glacier, Baker, and Stuart from the top." }, false, "Glacier Peak in a list of volcanoes");
G({ discipline: "scrambling", hazards: ["Class 3 ridge with a brief Class 4 crux", "Steep drop-offs on the glacier side"], approach: "Cross the rock glacier in the amphitheater on a faint, cairned path" }, false, "a rock glacier, and a drop-off");
G({ discipline: "mountaineering", overview: "climbable to a true summit without ever setting foot on a glacier.", hazards: ["Rockfall and icefall in the three chutes climbers cross to reach the Success Glacier headwall"] }, false, "the route's own 'no glacier' outranks the rest");
G({ discipline: "bouldering", hazards: ["A persistent moat/crevasse crosses the approach roughly halfway between camp and the notch"] }, false, "a boulder problem never earns 'rope, crevasse rescue kit'");
G({ discipline: "scrambling", hazards: ["persistent steep snow and a possible bergschrund below the summit pass into August"] }, false, "a snowfield bergschrund on a scramble");
G({ discipline: "alpine", approach: "Stuart Pass to Goat Pass, then east across the Stuart Glacier to the North Ridge notch" }, true, "across the Stuart Glacier (not 'Stuart, and Glacier')");
G({ discipline: "mountaineering", hazards: ["Crevasse hazard on the shared Coleman Glacier approach"] }, true, "crevasses");
G({ discipline: "alpine", approach: "via Ruth Creek and Price Lake moraine, but instead of ascending toward Price Glacier, traverse to the East Nooksack Glacier." }, true, "the glacier the route does take, beside the one it does not");
G({ discipline: "mountaineering", name: "Squak Glacier", hazards: ["A bergschrund near the top can become difficult to navigate"] }, true, "a route named for its glacier");
G({ discipline: "mountaineering", hazards: ["Bergschrund below the Hogsback"] }, true, "a bergschrund on a mountaineering route");
G({ discipline: "ice", name: "Eliot Glacier Headwall" }, true, "a route with no prose, named for its glacier");
G({ discipline: "trad", name: "Glacier Geeks and Wombats" }, false, "a rock climb whose name starts with the word");
G({ discipline: "mixed", name: "Glacier Pons" }, false, "an ice climb whose name starts with the word");

const R = (route, want, label) => ok(`raptor ${want ? "ON " : "off"}: ${label}`, hasTag(route, "raptor_closure") === want, route);
R({ hazards: ["Basalt columns fracture in \"dinner-plate\" style; rattlesnakes are present roughly May-September, and raptor nesting closures are sometimes posted seasonally -- check the trailhead kiosk"] }, false, "a hedge (568 Frenchman Coulee routes)");
R({ hazards: ["some belay stations sit directly under the Iron Horse Trail trestle; a recurring peregrine falcon nesting closure (roughly Feb-Aug depending on nesting activity) affects parts of this area seasonally -- check current status before climbing"] }, false, "'parts of this area' (480 routes)");
const BEACON = "poison oak is present on several routes/faces (NW, W, SW); a seasonal peregrine falcon closure (roughly Feb 1 - Jul 15) affects the South Face and its access trail, and the East Face is closed year-round for a sensitive plant species";
R({ area_id: "wa_south_face_4", hazards: [BEACON] }, true, "Beacon Rock's closure, on its South Face");
R({ area_id: "wa_west_face_7", hazards: [BEACON] }, false, "Beacon Rock's closure, on its West Face");
R({ area_id: "co_main_wall", hazards: ["Raptor closure: Bridge Creek Wall area (1/2 mile buffer) closed January 1 - August 15 for golden eagle nesting"] }, false, "Bridge Creek Wall's closure pasted onto a Colorado route");
R({ area_id: "wa_bridge_creek_wall", hazards: ["Raptor closure: Bridge Creek Wall area (1/2 mile buffer) closed January 1 - August 15 for golden eagle nesting"] }, true, "Bridge Creek Wall's closure, on Bridge Creek Wall");
R({ hazards: ["No seasonal closure affects this route; the raptor closure at Bridge Creek Wall (January 1 - August 15, 1/2-mile buffer) is near mile 9 of Icicle Creek Road, well away from the Hook Creek approach"] }, false, "a closure the route says is elsewhere");
R({ access: { closures: "Hozomeen Lake (well north of this route) is closed April 1 - May 31 for loon nesting" } }, false, "loons");
R({ overview: "Bald Eagle Peak (6,259 ft) rises above the Foss River valley near Skykomish" }, false, "a peak named Eagle");

console.log(t.join("\n"));
if (fail) { console.error(`\ncheck:route-tags: ${fail} FAILED — a list no longer reaches its chip, or a derived chip (Glaciated / Raptor closure) claims what the route's own text does not.`); process.exit(1); }
console.log(`\ncheck:route-tags: ok — ${t.length} assertions; every real list string resolves, and every chip agrees with routeInList.`);

// ---------------------------------------------------------------------------
// Injection-tested 2026-08-09. Re-run after any change to LIST_ALIASES or routeTags.
//
//  1. Narrow a pattern:  /\bbulger/ -> /\bbulgerXX/  => the 8 real Bulger strings fail.
//  2. Give routeTags its OWN pattern table again (the #783/#789 duplication)
//     => the "chip agrees with membership" assertions fail as soon as the two disagree.
//  3. Delete a LIST_TAGS entry => must still PASS, via the generic fallback; a list is
//     allowed to have no bespoke presentation, it is not allowed to render blank.
//  4. Remove the `seen` de-duplication => "duplicate list collapses to one chip" fails.
//
// Case 2 is the one that matters: it is the shape of the original defect, where a consumer
// looked for a value the data never contained and reported 0 forever.
//
// Injection-tested 2026-09-25 for the derived chips:
//  5. Restore the bare-word glacier rule (`return /glacier/i.test(text)`) => 9 glaciated cases fail.
//  6. Restore the bare-word raptor rule => 6 fail: the hedge, 'parts of this area', West Face,
//     pasted Bridge Creek, 'well away' and Bald Eagle Peak. The loon case passes under the old
//     rule; it pins the clause rule, whose first draft counted bare "nesting" as a bird.