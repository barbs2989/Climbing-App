// Route tags — what the route page renders as chips: the LISTS a route is on, and nothing else.
//
// This module is PRESENTATION. It deliberately owns no list vocabulary of its own:
// membership is asked of `lib/lists.js`, which is the single source of truth for "is this
// route on list X" and is what the Challenges screen already queries.
//
// That split exists because it was briefly violated. #783 and #789 answered the same request
// in parallel and each built a prose-to-slug resolver — this file had `LIST_PATTERNS`, and
// lists.js has `LIST_ALIASES`. Two resolvers over one column is exactly the drift that caused
// the original bug: Challenges asked `inList("fifty")` while the catalog tagged
// `"fifty_classics"`, so the screen read 0 of 50 with the data present. A second vocabulary
// would have re-created that gap the first time either side learned a spelling the other did
// not. So the patterns are gone from here, and a chip a climber sees is resolved by the same
// call a challenge counts with — they cannot disagree.
//
// What this file owns: how a list LOOKS (label, icon, colour, blurb), and the "Regional
// classic" chip that `routes.classic` earns.
//
// What it no longer draws (owner, 2026-11-05: "keep list membership tag and remove all the
// rest"): the character tags `routes.features` carried (Exposed, Sustained, Slab, Talus…) and
// the two derived warnings, Glacier travel and Raptor closure. The `features` column stays in
// the database and in SuggestFix's Style editor; it simply reaches no chip. #1940 removed the
// WHOLE row once and the lists were asked back the same day, so the lists are the one category
// that stays.

import { LIST_ALIASES, routeInList } from "./lists.js";

// Presentation per list key. Keys are lists.js keys, not slugs of our own. A list with no
// entry here still renders — with the generic chip below — so adding a list to lists.js can
// never make it silently invisible here.
export const LIST_TAGS = {
  fifty: { label: "Fifty Classic Climbs", short: "50 Classics", icon: "award", color: "amber",
    blurb: "One of the fifty routes in Steck & Roper's Fifty Classic Climbs of North America (1979)." },
  bulgers: { label: "Bulger List", short: "Bulger", icon: "mountain", color: "purple",
    blurb: "One of Washington's 100 highest peaks." },
  np_hp: { label: "National Park highpoint", short: "NP HP", icon: "map", color: "green",
    blurb: "The highest point in its national park." },
  cascade: { label: "Cascade volcano", short: "Volcano", icon: "mountain", color: "orange",
    blurb: "A glaciated Cascade stratovolcano." },
  ultra: { label: "Ultra-prominent peak", short: "Ultra", icon: "chart", color: "teal",
    blurb: "At least 1,500 m of clean prominence." },
  seven: { label: "Seven Summits", short: "7 Summits", icon: "globe", color: "amber",
    blurb: "The highest peak on its continent." },
  co14: { label: "Colorado 14ers", short: "CO 14er", icon: "mountain", color: "purple", blurb: "A Colorado peak above 14,000 ft." },
  ca14: { label: "California 14ers", short: "CA 14er", icon: "mountain", color: "purple", blurb: "A California peak above 14,000 ft." },
  co_cent: { label: "Colorado Centennials", short: "CO Centennial", icon: "mountain", color: "teal", blurb: "One of Colorado's hundred highest ranked peaks." },
  sps: { label: "Sierra Peaks Section", short: "SPS peak", icon: "mountain", color: "teal", blurb: "One of the 247 Sierra Nevada peaks on the Sierra Peaks Section list." },
  adk46: { label: "Adirondack 46", short: "ADK 46er", icon: "mountain", color: "green", blurb: "One of the 46 High Peaks of New York's Adirondacks." },
  desert: { label: "Desert towers", short: "Desert tower", icon: "mountain", color: "orange", blurb: "A classic desert tower." },
  triple: { label: "Triple Crown", short: "Triple Crown", icon: "award", color: "amber", blurb: "One of the Triple Crown objectives." },
  // Washington peak lists the catalog records but nothing could draw. Labels describe the list,
  // never the site it was read from - see the note beside their entries in lib/lists.js.
  wa_top100_elev: { label: "Washington Top 100 by elevation", short: "Top 100 by elev.", icon: "chart", color: "teal",
    blurb: "One of the hundred highest Washington summits, ranked by elevation." },
  wa_prominence: { label: "Washington prominence list", short: "Prominence", icon: "chart", color: "orange",
    blurb: "One of Washington's steepest peaks by clean prominence, at 400 ft or more." },
  wa_top200: { label: "Washington Top 200", short: "WA Top 200", icon: "map", color: "purple",
    blurb: "One of the roughly two hundred highest Washington peaks with at least 400 ft of prominence." },
  wa_difficult10: { label: "Washington's Difficult 10", short: "Difficult 10", icon: "award", color: "amber",
    blurb: "One of ten Washington summits widely reckoned the hardest to reach." },
  state_classics: { label: "State classic", short: "State classic", icon: "award", color: "amber",
    blurb: "One of the best-loved climbs in its state, across every discipline." },
};
const GENERIC_LIST = { icon: "doc", color: "purple", blurb: "" };

// A rank is real information the slug cannot carry — "#19", "tied for #51", "ranked #93" —
// so it is pulled off whichever raw entry matched and shown beside the label.
const RANK_RE = /(?:ranked\s*|tied\s+for\s*)?#\s*(\d+)/i;
function rankFor(route, key) {
  const raw = route && route.lists;
  if (!raw) return "";
  for (const e of (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(String)) {
    if (!routeInList({ lists: [e] }, key)) continue;
    const m = e.match(RANK_RE);
    if (m) return /tied/i.test(e) ? `tied #${m[1]}` : `#${m[1]}`;
  }
  return "";
}

function titleCase(k) { return String(k).replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase()); }

// ---------------------------------------------------------------------------
// The one entry point the UI uses. Flat, de-duplicated: the lists the route is on, in
// LIST_ALIASES order, then "Regional classic".
// ---------------------------------------------------------------------------
export function routeTags(route) {
  if (!route) return [];
  const out = [];
  const seen = new Set();
  const push = t => { if (t && !seen.has(t.slug)) { seen.add(t.slug); out.push(t); } };

  for (const key of Object.keys(LIST_ALIASES)) {
    if (!routeInList(route, key)) continue;
    const def = LIST_TAGS[key] || { ...GENERIC_LIST, label: titleCase(key), short: titleCase(key) };
    push({ kind: "list", slug: key, detail: rankFor(route, key), ...def });
  }

  if (route.classic) {
    // "Regional classic" rather than "Classic": RouteDetail used to draw a second, identical
    // amber chip with that wording immediately beside this one on all 56 classic routes. The
    // duplicate is gone and its wording — which is the more specific of the two — stays here.
    push({ kind: "list", slug: "classic", label: "Regional classic", short: "Regional classic", icon: "star", color: "amber",
      blurb: "A must-do line — one of the routes the area is known for." });
  }

  // `routes.features` and the derived warnings are deliberately NOT read here — see the header.
  return out;
}

// Challenges and Lists should call routeInList directly; this is for UI code that already
// holds a tag list and wants a yes/no without rebuilding it.
export function hasTag(route, slug) {
  return routeTags(route).some(t => t.slug === slug);
}
