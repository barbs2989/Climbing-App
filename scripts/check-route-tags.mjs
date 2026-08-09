// Assert lib/routeTags.js turns the catalog's REAL list prose into slugs.
//
// Static and fast (no DB, no browser), so it sits in `npm run build`.
//
// The defect this exists to stop is not a crash — it is the one already on record. The
// Leaderboards badge asked `(route.lists||[]).includes("state_hp")`, an exact match on a
// slug that appeared NOWHERE in the data, so it scored zero forever and looked like a
// climber who had simply not been anywhere. Nothing failed. The column was populated, the
// consumer ran, and the answer was quietly always 0.
//
// So the assertions below are deliberately built from the ACTUAL strings in the live
// `routes.lists` column, not from invented examples. An invented fixture would keep passing
// through exactly the change that breaks the real data — a new enrichment phrasing, or a
// tightened pattern. When the catalog gains a list, add its real prose here.
//
// The other half is de-duplication: the same list can arrive twice, once as prose and once
// as a slug, and a route page showing "50 Classics 50 Classics" is the visible form of a
// challenge counting it twice.

import { routeTags, listSlug, hasTag, LIST_TAGS } from "../lib/routeTags.js";

let fail = 0;
const t = [];
const ok = (label, cond, got) => { if (cond) t.push(`  ok    ${label}`); else { fail++; t.push(`  FAIL  ${label}  got=${JSON.stringify(got)}`); } };

// --- Verbatim from the live DB (WA, 2026-08-09). Do not "tidy" these strings. -----------
const REAL_PROSE = [
  ["Washington Top 100 (Bulger List)", "bulger", ""],
  ["Washington Bulger List (100 highest peaks in Washington State)", "bulger", ""],
  ["Washington Bulger List (100 Highest Peaks in Washington)", "bulger", ""],
  ["Washington Bulger List (100 Highest) - #19", "bulger", "#19"],
  ["Bulger List (Washington's 100 highest peaks)", "bulger", ""],
  ["Bulger List (Washington's 100 highest peaks) - #48", "bulger", "#48"],
  ["Washington Bulgers (100 Highest Peaks in Washington)", "bulger", ""],
  ["Washington Bulgers (100 Highest Peaks) — tied for #51", "bulger", "tied #51"],
  ["Peakbagger 'Home Court' Top 100 Washington peaks by elevation – ranked #29", "wa_top_100", "#29"],
  ["Peakbagger Washington 400'+ clean-prominence steepest-peaks 'Master List' – ranked #93", "wa_prominence", "#93"],
  ["Washington's Difficult 10 (\"Hardest Peaks\") — SummitPost list", "wa_difficult_10", ""],
  ["Washington Top 200 Peaks (elevation-based list of the ~200 highest Washington peaks with 400+ ft of prominence) - Buckskin Mountain is listed among the 'Extra 110' peaks needed to complete the Top 200, per Country Highpoints' tracked list.", "wa_top_200", ""],
];
for (const [prose, slug, detail] of REAL_PROSE) {
  const r = listSlug(prose);
  ok(`${slug}${detail ? " " + detail : ""}  <-  ${prose.slice(0, 52)}…`, r && r.slug === slug && r.detail === detail, r);
}

// Every slug a pattern can produce must have a definition, or the tag renders blank.
const produced = new Set(REAL_PROSE.map(x => x[1]).concat(["fifty_classics", "state_hp", "volcano"]));
for (const s of produced) ok(`LIST_TAGS defines "${s}"`, !!LIST_TAGS[s], Object.keys(LIST_TAGS));
for (const [k, v] of Object.entries(LIST_TAGS)) ok(`${k} has label+short+icon+color`, !!(v.label && v.short && v.icon && v.color), v);

// Idempotence: normalising already-normalised data must not lose it.
ok("an existing slug passes through", listSlug("fifty_classics")?.slug === "fifty_classics");
ok("unmodelled prose -> null (not a bogus tag)", listSlug("Some list we do not model yet") === null);
ok("empty/null -> null", listSlug("") === null && listSlug(null) === null && listSlug(undefined) === null);

// --- routeTags composition ---------------------------------------------------------------
const westRidge = { name: "West Ridge", classic: true, lists: ["fifty_classics"], features: ["Exposed", "Arête"],
  hazards: ["long exposed ridge"], approach: "Traverse the Quien Sabe Glacier to the notch." };
const tags = routeTags(westRidge), slugs = tags.map(x => x.slug);
ok("list membership present", slugs.includes("fifty_classics"), slugs);
ok("classic present", slugs.includes("classic"), slugs);
ok("features carried through", slugs.includes("Exposed") && slugs.includes("Arête"), slugs);
ok("glacier travel derived", slugs.includes("glaciated"), slugs);
ok("lists render before features", slugs.indexOf("fifty_classics") < slugs.indexOf("Exposed"), slugs);
ok("every tag renderable (label+icon+color)", tags.every(x => x.label && x.icon && x.color), tags.map(x => x.slug));
ok("hasTag agrees with routeTags", hasTag(westRidge, "fifty_classics") && !hasTag(westRidge, "bulger"));

// The same list arriving twice — once as a slug, once as prose — is ONE tag, not two.
const dup = routeTags({ lists: ["bulger", "Washington Bulger List (100 Highest Peaks in Washington)"] });
ok("duplicate list collapses to one chip", dup.filter(x => x.slug === "bulger").length === 1, dup.map(x => x.slug));

// A route with nothing must render nothing, and must not throw.
ok("bare route -> no tags", routeTags({}).length === 0, routeTags({}));
ok("null route -> no tags", routeTags(null).length === 0);
ok("lists:null tolerated", routeTags({ lists: null, features: null }).length === 0);

// Derived warnings must read the columns the closure actually lives in, not just hazards.
ok("raptor closure from access prose", hasTag({ access: { seasonal: "Peregrine falcon nesting closure Feb 1 - Jul 15." } }, "raptor_closure"));
ok("raptor closure from hazards", hasTag({ hazards: ["Seasonal raptor nesting closure on the upper wall"] }, "raptor_closure"));
ok("no false raptor tag", !hasTag({ overview: "A fine granite arete above the road." }, "raptor_closure"));

console.log(t.join("\n"));
if (fail) { console.error(`\ncheck:route-tags: ${fail} FAILED — list prose is no longer reaching a slug, so tags and challenges disagree.`); process.exit(1); }
console.log(`\ncheck:route-tags: ok — ${t.length} assertions, every real list string resolves to a defined tag.`);

// ---------------------------------------------------------------------------
// Injection-tested 2026-08-09. Re-run these after any change to listSlug or LIST_PATTERNS.
//
//  1. Narrow a pattern so it stops matching:  [/bulger/i] -> [/bulgerXX/i]
//     => 9 assertions fail (the 8 real Bulger strings + duplicate-collapse). VERIFIED.
//  2. Delete a LIST_TAGS entry that a pattern can still produce
//     => the "LIST_TAGS defines …" assertion fails, catching a tag that would render blank.
//  3. Drop the rank capture (return detail:"" always)
//     => the three ranked cases (#19, tied #51, #29) fail.
//  4. Remove the `seen` de-duplication in routeTags()
//     => "duplicate list collapses to one chip" fails — the visible form of a challenge
//        double-counting one list.
//
// Case 1 is the one that matters: it is exactly the shape of the original defect, where a
// consumer looked for a value the data never contained and reported 0 forever.
