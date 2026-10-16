// Route tags — what the route page renders as chips.
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
// What this file still owns:
//   - how a list LOOKS (label, icon, colour, blurb)
//   - character tags from `routes.features`, which is already a clean vocabulary
//   - derived warnings that are true by virtue of other columns

import { LIST_ALIASES, routeInList } from "./lists.js";

// Presentation per list key. Keys are lists.js keys, not slugs of our own. A list with no
// entry here still renders — with the generic chip below — so adding a list to lists.js can
// never make it silently invisible here.
export const LIST_TAGS = {
  fifty: { label: "Fifty Classic Climbs", short: "50 Classics", icon: "🏛️", color: "amber",
    blurb: "One of the fifty routes in Steck & Roper's Fifty Classic Climbs of North America (1979)." },
  bulgers: { label: "Bulger List", short: "Bulger", icon: "🗻", color: "purple",
    blurb: "One of Washington's 100 highest peaks." },
  np_hp: { label: "National Park highpoint", short: "NP HP", icon: "🏞️", color: "green",
    blurb: "The highest point in its national park." },
  cascade: { label: "Cascade volcano", short: "Volcano", icon: "🌋", color: "orange",
    blurb: "A glaciated Cascade stratovolcano." },
  ultra: { label: "Ultra-prominent peak", short: "Ultra", icon: "📐", color: "teal",
    blurb: "At least 1,500 m of clean prominence." },
  seven: { label: "Seven Summits", short: "7 Summits", icon: "🌍", color: "amber",
    blurb: "The highest peak on its continent." },
  co14: { label: "Colorado 14ers", short: "CO 14er", icon: "⛰️", color: "purple", blurb: "A Colorado peak above 14,000 ft." },
  ca14: { label: "California 14ers", short: "CA 14er", icon: "⛰️", color: "purple", blurb: "A California peak above 14,000 ft." },
  desert: { label: "Desert towers", short: "Desert tower", icon: "🏜️", color: "orange", blurb: "A classic desert tower." },
  triple: { label: "Triple Crown", short: "Triple Crown", icon: "👑", color: "amber", blurb: "One of the Triple Crown objectives." },
  // Washington peak lists the catalog records but nothing could draw. Labels describe the list,
  // never the site it was read from - see the note beside their entries in lib/lists.js.
  wa_top100_elev: { label: "Washington Top 100 by elevation", short: "Top 100 by elev.", icon: "📏", color: "teal",
    blurb: "One of the hundred highest Washington summits, ranked by elevation." },
  wa_prominence: { label: "Washington prominence list", short: "Prominence", icon: "⬆️", color: "orange",
    blurb: "One of Washington's steepest peaks by clean prominence, at 400 ft or more." },
  wa_top200: { label: "Washington Top 200", short: "WA Top 200", icon: "🗺️", color: "purple",
    blurb: "One of the roughly two hundred highest Washington peaks with at least 400 ft of prominence." },
  wa_difficult10: { label: "Washington's Difficult 10", short: "Difficult 10", icon: "🔟", color: "amber",
    blurb: "One of ten Washington summits widely reckoned the hardest to reach." },
};
const GENERIC_LIST = { icon: "📋", color: "purple", blurb: "" };

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
// Character tags — what the climbing is LIKE. These live in routes.features with a settled
// vocabulary already; this only supplies presentation.
// ---------------------------------------------------------------------------
// The colour carries a meaning and is not decoration: RED is seriousness, AMBER is how hard
// the climbing works you, BLUE is the SHAPE of the rock, GREEN is reassuring. Runout (red) and
// Well-protected (green) are the same axis read from both ends.
//
// This table was 8 entries against the 19 values the catalog actually uses, so 383 of the 1,216
// chips rendered through the fallback below — a grey bullet with an EMPTY blurb, beside eight
// siblings that had an icon and a colour. Nothing was wrong on screen; the tag simply carried
// none of the information the other eight carry. Re-measure with
// scripts/oneoff/probe-feature-tag-coverage.mjs rather than trusting this comment.
export const FEATURE_TAGS = {
  Exposed: { icon: "🪂", color: "red", blurb: "Big drops right beside the climbing." },
  Runout: { icon: "〰️", color: "red", blurb: "Long gaps between protection." },
  Committing: { icon: "🔒", color: "red", blurb: "Retreat is hard once you start." },
  Sustained: { icon: "📊", color: "amber", blurb: "Holds its grade rather than one hard move." },
  Adventurous: { icon: "🧭", color: "amber", blurb: "Route-finding and the unknown are part of it." },
  Technical: { icon: "🎯", color: "amber", blurb: "Precise footwork and body position matter more than power." },
  Overhanging: { icon: "◤", color: "amber", blurb: "Steeper than vertical — strenuous on the arms." },
  Pumpy: { icon: "💪", color: "amber", blurb: "Continuous — your forearms tire before the moves get hard." },
  Bouldery: { icon: "💥", color: "amber", blurb: "Hinges on one or two hard, powerful moves." },
  Chimney: { icon: "🪟", color: "blue", blurb: "Chimney or squeeze climbing." },
  "Arête": { icon: "📐", color: "blue", blurb: "Climbs an arête or ridge crest." },
  Face: { icon: "🪨", color: "blue", blurb: "An open wall climbed on face holds rather than a crack." },
  Crack: { icon: "✋", color: "blue", blurb: "Follows a crack — jamming rather than face holds." },
  Slab: { icon: "◣", color: "blue", blurb: "Low-angle rock, climbed on friction." },
  // Climbers call a dihedral an open book, so the icon is the name.
  Dihedral: { icon: "📖", color: "blue", blurb: "An inside corner — stemming and laybacking." },
  Offwidth: { icon: "↔", color: "blue", blurb: "Too wide to jam, too narrow to chimney." },
  Vertical: { icon: "⏐", color: "blue", blurb: "Dead vertical and sustained." },
  "Well-protected": { icon: "🛡️", color: "green", blurb: "Protection is frequent and good where it counts." },
  Scenic: { icon: "🏔️", color: "green", blurb: "Climbed as much for the position as the moves." },
};

// ---------------------------------------------------------------------------
// Derived tags — true by virtue of other columns, so they cannot go stale against them.
// Kept deliberately few: a tag restating a number already on screen earns nothing.
// ---------------------------------------------------------------------------
// A raptor closure is judged CLAUSE by clause, and a clause must name both the bird and the
// closure. The bare word matched place names (Eagle Lakes, Bald Eagle Peak, "the Falcon Route"),
// and three crag-wide sentences chipped routes that no closure touches: a hedge copied to 568
// Frenchman Coulee routes ("closures are sometimes posted"), a closure that "affects parts of
// this area" on 480 Exit 38 routes, and Beacon Rock's South Face closure on its West and
// Northwest faces. A closure scoped to one face applies only to routes filed on that face.
// Not bare "nesting": Hozomeen Lake closes for nesting LOONS.
const RAPTOR_BIRD = /\b(raptors?|peregrines?|eagles?|falcons?|vultures?|osprey|hawks?|owls?)\b/i;
const RAPTOR_CLOSED = /\b(clos(ure|ures|ed|es)|nesting season)\b/i;
const RAPTOR_HEDGED = /\b(no (seasonal )?closures? (affects?|applies|apply)|sometimes|may (apply|be)|might|possible|possibly|parts of (this|the) area|broader|(well )?away from|does not affect|well (north|south|east|west) of)\b/i;
const FACE_SCOPE = /\baffects? (only )?the (north|south|east|west|northeast|northwest|southeast|southwest|n|s|e|w|ne|nw|se|sw) face\b/i;
const DIR = { n: "north", s: "south", e: "east", w: "west", ne: "northeast", nw: "northwest", se: "southeast", sw: "southwest" };

export function raptorClosure(route) {
  if (!route) return false;
  const where = `${route.area_id || route.areaId || ""} ${route.name || ""}`.toLowerCase().replace(/_/g, " ");
  return haystack(route).split(/[.;!?]\s+|\n|\s--\s|\s—\s/).some(clause => {
    if (!RAPTOR_BIRD.test(clause) || !RAPTOR_CLOSED.test(clause) || RAPTOR_HEDGED.test(clause)) return false;
    // "Bridge Creek Wall area ... closed for golden eagle nesting" closes Bridge Creek Wall, and
    // was pasted verbatim onto routes in Colorado, California and Illinois.
    const wall = clause.match(/\b((?:[A-Z][\w'’]+ )+(?:Wall|Crag|Cliffs?|Buttress|Tower|Dome|Spires?))\b/);
    if (wall && !where.includes(wall[1].toLowerCase())) return false;
    const face = clause.match(FACE_SCOPE);
    if (!face) return true;
    const dir = face[2].toLowerCase();
    return where.includes(`${DIR[dir] || dir} face`);
  });
}

function haystack(route) {
  const ac = route.access || {};
  const bits = [route.season, ac.seasonal, ac.closures, ac.rules, route.permit, route.beta, route.overview];
  const arr = [].concat(route.hazards || [], route.objHaz || route.obj_haz || [], route.watchOut || route.watch_out || []);
  return [...bits, ...arr].filter(x => typeof x === "string").join(" \n ");
}

// "Glacier travel" is a claim about the ROUTE, so it reads only the prose that describes the
// route — never access rules, permits or season, which are regulations for a whole area.
// Reading those tagged 170 routes on a place name alone ("Glacier Peak Wilderness", the town of
// Glacier on SR 542) and 109 more — sport crags and boulder problems among them — on one
// boilerplate rule, "no burial or glacier deposition". Vesper Peak's North Face was one of them.
// Even there, MENTIONING a glacier is not crossing one: "a small glacier clings to its north
// slope" is scenery. So the word alone never decides — the prose must put the party ON the ice:
// crevasses or a bergschrund, "glacier travel/approach/crossing", or a travel verb or preposition
// landing on a glacier ("cross the Cache Glacier", "up the Emmons Glacier"). Names, views and
// negations are stripped first, so "overlooking the Vesper Glacier" cannot supply the verb.
const GLACIER_NOT_TRAVEL = new RegExp([
  String.raw`\bGlacier Peak\b`, String.raw`Glacier Public Service`, String.raw`Glacier National Park`,
  String.raw`\b(through|past|in|at|near|town of|to|from) Glacier\b(?! (travel|approach|route))`,
  String.raw`\bGlacier,? (WA|Washington|MT|Montana)\b`,
  String.raw`\bGlacier (Creek|Basin|Lakes?|Pass|View|Vista|Point|Gap|Meadows?|Bay|Ridge|Trail|Road|Rd|Divide|Gulch|Canyon|Falls|Springs?|Mountain|Wilderness|Gorge|Hut|Rim|Overlook)\b`,
  String.raw`\brock[- ]glaciers?\b`, String.raw`\bglacier[- ]lil(y|ies)\b`,
  String.raw`\bglacier[- ](carved|scoured|polished|fed|sculpted|smoothed|cut)\b`,
  String.raw`\bglacier (deposition|melt(water)?|water)\b`,
  String.raw`\b(no|non|not a|without( any)?|avoids?( the)?|free of|never (touches|crosses)( a| the)?)[- ](\w+ )?(glaciers?|crevass\w*)\b`,
  String.raw`\bglacier[- ]free\b`, String.raw`\bbergschrund-like\b`, String.raw`\bpocket glaciers?\b`,
  String.raw`\btowards? (the )?([\w'’.-]+ ){0,3}glaciers?\b`,
  // Glacier Peak named in a list of volcanoes: "views of Rainier ... and Glacier, Baker".
  // The comma or "and" is required: "the Stuart Glacier" is a glacier, "Stuart, and Glacier" is not.
  String.raw`\bGlacier(?=(,| and|, and) (Baker|Rainier|Adams|Shuksan|Stuart|Olympus|Hood|St\.? Helens)\b)`,
  String.raw`\b(Baker|Rainier|Adams|Shuksan|Stuart)(,| and|, and) Glacier\b`,
  // A fall, or somebody else's route, ending on a glacier is not this party crossing one.
  String.raw`\b(fall|falls|falling|exposure|drop(s|-offs?)?|shedding)\b[^.;]{0,50}?\bglaciers?\b`,
  String.raw`\b(don'?t|do not|never|than|alternative to|instead of|rather than)\b[^.;,]{0,60}?\bglaciers?\b( (route|approach|travel))?`,
  String.raw`\b(overlook(ing|s)?|views?( of| over| across| down( on| to)?)?|visible|look(s|ing)? (down|out|across)( on| at| over| to)?)( onto| of)? (the )?([\w'’.]+[ -]){0,2}glaciers?\b`,
].join("|"), "gi");

// The chip promises "rope, crevasse rescue kit and partners" — never true of a sport route, a
// top-rope or a boulder problem, even one whose walk-in passes ice (Top Gun at Pinto Rock carried a
// pasted alpine hazard line; a V3 on Goliath Boulder sits under a remnant glacier).
const CRAG_ONLY = new Set(["sport", "bouldering", "toprope"]);

export function crossesGlacier(route) {
  if (!route || CRAG_ONLY.has(route.discipline)) return false;
  const text = [route.approach, route.overview,
    ...[].concat(route.hazards || [], route.objHaz || route.obj_haz || [], route.watchOut || route.watch_out || [])]
    .filter(x => typeof x === "string").join(" \n ");
  // The route's own word that it has no glacier outranks every other sentence in it
  // ("Point Success ... without ever setting foot on a glacier").
  if (NO_GLACIER.test(text)) return false;
  const t = text.replace(GLACIER_NOT_TRAVEL, " ");
  // A route NAMED for a glacier ("Squak Glacier", "Eliot Glacier Headwall") climbs it — 22 such
  // routes carry no prose at all. Not a rock or ice climb whose name merely STARTS with the word
  // ("Glacier Geeks and Wombats", "Glacier Pons").
  const named = !/^(trad|aid)$/.test(route.discipline || "") &&
    /\b[A-Z][\w'’.-]* Glaciers?\b/.test(String(route.name || "").replace(GLACIER_NOT_TRAVEL, " "));
  if (named || GLACIER_TRAVEL.test(t)) return true;
  // A bergschrund also opens under a permanent snowfield or at the head of a scramble's couloir,
  // so on its own it is steep snow — it counts on a mountaineering route or beside a named glacier.
  return /\b(berg)?schrund\b/i.test(t) && (route.discipline === "mountaineering" || /\bglaciers?\b/i.test(t));
}
const NO_GLACIER = /\b(no glacier travel|non-?glaciated|without (ever )?(setting foot on|crossing|touching) (a|any) glacier|no glaciers? (is|are) (involved|crossed|needed|required)|has no glaciers?)\b/i;
const GLACIER_TRAVEL = new RegExp([
  String.raw`\bcrevass\w*\b`, String.raw`\bglaciers?\b[^.;]{0,40}\bsnow ?bridges?\b`,
  String.raw`\bglaciers?[- ]?(travel|crossing|approach|route|climb|camp|terrain|hazards?|gear|skills|rescue|kit|slog|traverse|descent)\b`,
  String.raw`\bglaciers?( [\w'’-]+){1,2} (crossing|descent)\b`, String.raw`\bapproach glaciers?\b`,
  String.raw`\bglacier ?\/ ?(snow|ice|crevasse|moat)`,
  String.raw`\b(cross(es|ed|ing)?|travers(e|es|ed|ing)|ascend(s|ed|ing)?|climb(s|ed|ing)?|descend(s|ed|ing)?|follow(s|ed|ing)?|skirt(s|ed|ing)?|rope up|onto|on|up|across|over|via|gain(s|ed|ing)?|reach(es|ed|ing)?|toe of|edge of|margin of|snout of|terminus of|along|head(s|ed|ing)? up|same as|as for)\s+(the\s+)?([\w'’.()\/-]+\s+){0,4}glaciers?\b`,
  // "rising directly from the LeConte Glacier" is travel; "from the notch above Stuart Glacier" is not.
  String.raw`\bfrom\s+(the\s+)?([\w'’.-]+\s+)?glaciers?\b`,
].join("|"), "i");

export function derivedTags(route) {
  if (!route) return [];
  const out = [];
  if (raptorClosure(route)) {
    out.push({ kind: "derived", slug: "raptor_closure", label: "Raptor closure", short: "Raptor closure",
      icon: "🦅", color: "red", blurb: "Seasonal wildlife closure — check dates before you go." });
  }
  if (crossesGlacier(route)) {
    out.push({ kind: "derived", slug: "glaciated", label: "Glacier travel", short: "Glaciated",
      icon: "🧊", color: "blue", blurb: "Crosses a glacier — rope, crevasse rescue kit and partners." });
  }
  return out;
}

// ---------------------------------------------------------------------------
// The one entry point the UI uses. Flat, de-duplicated, ordered: list membership first (it is
// why someone is here), then what the climbing is like, then the derived warnings.
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
    push({ kind: "list", slug: "classic", label: "Regional classic", short: "Regional classic", icon: "★", color: "amber",
      blurb: "A must-do line — one of the routes the area is known for." });
  }

  for (const f of (Array.isArray(route.features) ? route.features : [])) {
    const def = FEATURE_TAGS[f];
    push({ kind: "feature", slug: f, label: f, short: f, icon: def?.icon || "•",
      color: def?.color || "textSub", blurb: def?.blurb || "" });
  }

  for (const d of derivedTags(route)) push(d);
  return out;
}

// Challenges and Lists should call routeInList directly; this is for UI code that already
// holds a tag list and wants a yes/no without rebuilding it.
export function hasTag(route, slug) {
  return routeTags(route).some(t => t.slug === slug);
}
