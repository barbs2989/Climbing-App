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
  state_hp: { label: "State highpoint", short: "State HP", icon: "🇺🇸", color: "green",
    blurb: "The highest point in its state." },
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
  adk46: { label: "Adirondack 46", short: "ADK 46", icon: "🌲", color: "green", blurb: "One of the Adirondack High Peaks." },
  desert: { label: "Desert towers", short: "Desert tower", icon: "🏜️", color: "orange", blurb: "A classic desert tower." },
  gunks: { label: "Gunks classics", short: "Gunks", icon: "🧗", color: "blue", blurb: "A Shawangunks classic." },
  beckey: { label: "Beckey's 100", short: "Beckey 100", icon: "📖", color: "amber", blurb: "On Fred Beckey's hundred favourites." },
  mp_classics: { label: "Mountain Project classics", short: "MP classic", icon: "⭐", color: "amber", blurb: "A Mountain Project classic tick." },
  triple: { label: "Triple Crown", short: "Triple Crown", icon: "👑", color: "amber", blurb: "One of the Triple Crown objectives." },
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
export const FEATURE_TAGS = {
  Exposed: { icon: "🪂", color: "red", blurb: "Big drops right beside the climbing." },
  Runout: { icon: "〰️", color: "red", blurb: "Long gaps between protection." },
  Committing: { icon: "🔒", color: "red", blurb: "Retreat is hard once you start." },
  Sustained: { icon: "📊", color: "amber", blurb: "Holds its grade rather than one hard move." },
  Adventurous: { icon: "🧭", color: "amber", blurb: "Route-finding and the unknown are part of it." },
  Chimney: { icon: "🪟", color: "blue", blurb: "Chimney or squeeze climbing." },
  "Arête": { icon: "📐", color: "blue", blurb: "Climbs an arête or ridge crest." },
  Scenic: { icon: "🏔️", color: "green", blurb: "Climbed as much for the position as the moves." },
};

// ---------------------------------------------------------------------------
// Derived tags — true by virtue of other columns, so they cannot go stale against them.
// Kept deliberately few: a tag restating a number already on screen earns nothing.
// ---------------------------------------------------------------------------
const RAPTOR_RE = /raptor|nesting\s+closure|nesting\s+season|peregrine|eagle|falcon|vulture/i;

function haystack(route) {
  const ac = route.access || {};
  const bits = [route.season, ac.seasonal, ac.closures, ac.rules, route.permit, route.beta, route.overview];
  const arr = [].concat(route.hazards || [], route.objHaz || route.obj_haz || [], route.watchOut || route.watch_out || []);
  return [...bits, ...arr].filter(x => typeof x === "string").join(" ");
}

export function derivedTags(route) {
  if (!route) return [];
  const out = [];
  const hay = haystack(route);
  if (RAPTOR_RE.test(hay)) {
    out.push({ kind: "derived", slug: "raptor_closure", label: "Raptor closure", short: "Raptor closure",
      icon: "🦅", color: "red", blurb: "Seasonal wildlife closure — check dates before you go." });
  }
  if (/glacier/i.test(hay + " " + (route.approach || ""))) {
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
    push({ kind: "list", slug: "classic", label: "Classic", short: "Classic", icon: "★", color: "amber",
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
