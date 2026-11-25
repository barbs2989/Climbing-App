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

import { routeTags, hasTag, LIST_TAGS } from "../lib/routeTags.js";
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
// LISTS ONLY (owner, 2026-11-05: "keep list membership tag and remove all the rest"). This
// route carries everything the row used to draw — character tags in `features` (including a
// value the old table never knew, the grey "Talus" chip), a crevasse hazard that earned
// "Glacier travel" and a closure that earned "Raptor closure" — and must render its two list
// chips and nothing else. #1940 removed the whole row and was reverted the same day; this pins
// the narrower cut so neither category can creep back through the fallback.
const westRidge = { name: "West Ridge", classic: true, lists: ["fifty_classics"], features: ["Exposed", "Arête", "Sustained", "Talus"],
  hazards: ["long exposed ridge", "Crevasse hazard on the Quien Sabe Glacier approach"], approach: "Traverse the Quien Sabe Glacier to the notch.",
  access: { seasonal: "Peregrine falcon nesting closure Feb 1 - Jul 15." } };
const tags = routeTags(westRidge), slugs = tags.map(x => x.slug);
ok("list membership present", slugs.includes("fifty"), slugs);
ok("classic present", slugs.includes("classic"), slugs);
ok("lists render before classic", slugs.indexOf("fifty") < slugs.indexOf("classic"), slugs);
ok("no character tag reaches a chip", !slugs.some(s => ["Exposed", "Arête", "Sustained", "Talus"].includes(s)), slugs);
ok("no derived warning reaches a chip", !slugs.includes("glaciated") && !slugs.includes("raptor_closure"), slugs);
ok("every chip is a list", tags.every(x => x.kind === "list"), tags.map(x => x.kind));
ok("only the two list chips", slugs.length === 2, slugs);
ok("every tag renderable", tags.every(x => x.label && x.icon && x.color), tags.map(x => x.slug));
ok("hasTag agrees", hasTag(westRidge, "fifty") && !hasTag(westRidge, "bulgers") && !hasTag(westRidge, "Exposed"));
// A route whose ONLY content is features renders no row at all (RouteTagRow returns null on []).
ok("features alone -> no tags", routeTags({ features: ["Exposed", "Talus"] }).length === 0, routeTags({ features: ["Exposed", "Talus"] }));

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

console.log(t.join("\n"));
if (fail) { console.error(`\ncheck:route-tags: ${fail} FAILED — a list no longer reaches its chip, or a chip that is not a list (a feature, a derived warning) is back on the row.`); process.exit(1); }
console.log(`\ncheck:route-tags: ok — ${t.length} assertions; every real list string resolves, every chip agrees with routeInList, and only lists are drawn.`);

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
// Injection-tested 2026-11-05 for the lists-only cut:
//  5. Restore the `route.features` loop => "no character tag reaches a chip", "every chip is a
//     list", "only the two list chips" and "features alone -> no tags" fail.
//  6. Push a derived chip again (any {kind:"derived"}) => "no derived warning reaches a chip"
//     and "every chip is a list" fail.
