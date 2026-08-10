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

// Derived warnings must read the columns the closure actually lives in.
ok("raptor closure from access prose", hasTag({ access: { seasonal: "Peregrine falcon nesting closure Feb 1 - Jul 15." } }, "raptor_closure"));
ok("raptor closure from hazards", hasTag({ hazards: ["Seasonal raptor nesting closure on the upper wall"] }, "raptor_closure"));
ok("no false raptor tag", !hasTag({ overview: "A fine granite arete above the road." }, "raptor_closure"));

console.log(t.join("\n"));
if (fail) { console.error(`\ncheck:route-tags: ${fail} FAILED — list prose no longer reaches a key, so chips and challenges disagree.`); process.exit(1); }
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