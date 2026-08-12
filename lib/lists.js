// Named tick-lists, and the single answer to "is this route on one?".
//
// The Challenges screen asks inList("fifty"), inList("bulgers") and so on. The routes table
// answers with `lists`, and the two were never speaking the same language: the Fifty Classics
// routes are tagged "fifty_classics" while the challenge asks for "fifty", and the Bulger
// peaks carry whole sentences in eleven different wordings. Every one of those challenges
// rendered 0 of N with the data sitting in the column — nothing failed, the answer was just
// always zero.
//
// This module is the ONE resolver over that column. lib/routeTags.js owns presentation — how
// a list looks as a chip — and asks routeInList() for membership, so a chip a climber sees and
// a challenge that counts it come from the same call and cannot drift apart. Do not add a
// second prose-to-slug table anywhere; that drift IS the bug this exists to fix.
//
// Every key here must have a matching entry in routeTags' LIST_TAGS, and check:route-tags
// asserts both directions.

export const LIST_ALIASES = {
  fifty: {
    slugs: ["fifty", "fifty_classics", "50_classics", "fifty-classics"],
    re: /\b(?:fifty|50)\s+classic|steck\s*(?:&|and)?\s*roper|roper\s*(?:&|and)\s*steck/i,
  },
  // Ordered ahead of any generic "100 highest" reading: "Washington Top 100 (Bulger List)"
  // is the Bulger list under another name, and the catalog spells it eleven ways.
  bulgers: {
    slugs: ["bulgers", "bulger", "bulger_list"],
    re: /\bbulger|washington(?:'s)?\s+(?:top\s+)?100\s+(?:highest|peaks)|100\s+highest\s+peaks\s+in\s+washington|washington\s+top\s+100/i,
  },
  state_hp: { slugs: ["state_hp", "state_highpoints"], re: /\bstate\s+high\s*point|highpoint\s+of\s+the\s+state/i },
  np_hp: { slugs: ["np_hp"], re: /\bnational\s+park\s+high\s*point/i },
  cascade: { slugs: ["cascade", "cascade_volcanoes", "volcano"], re: /\bcascade\s+volcano|\bvolcano\b/i },
  ultra: { slugs: ["ultra", "ultras"], re: /\bultra[- ]?prominen/i },
  seven: { slugs: ["seven", "seven_summits"], re: /\bseven\s+summits\b/i },
  co14: { slugs: ["co14", "colorado_14ers"], re: /\bcolorado\b[^.]{0,30}\b14(?:,?000)?\s*(?:ers|ft|feet)?\b/i },
  ca14: { slugs: ["ca14", "california_14ers"], re: /\bcalifornia\b[^.]{0,30}\b14(?:,?000)?\s*(?:ers|ft|feet)?\b/i },
  adk46: { slugs: ["adk46"], re: /\badirondack\s+46|46er/i },
  desert: { slugs: ["desert", "desert_towers"], re: /\bdesert\s+tower/i },
  gunks: { slugs: ["gunks"], re: /\bgunks\b|shawangunk/i },
  beckey: { slugs: ["beckey"], re: /\bbeckey(?:'s)?\s+100\b/i },
  mp_classics: { slugs: ["mp_classics"], re: /\bmountain\s*project\b[^.]{0,20}\bclassic/i },
  triple: { slugs: ["triple", "triple_crown"], re: /\btriple\s+crown\b/i },
};

// Does this route belong to the named list? Accepts a slug the catalog already stores, or the
// prose it stores instead — "Washington Bulgers (100 Highest Peaks) — tied for #51" is a list
// membership, not a sentence, and the rank inside it is pulled out for display by routeTags.
export function routeInList(route, key) {
  const spec = LIST_ALIASES[key];
  const raw = route && route.lists;
  if (!raw) return false;
  const entries = (Array.isArray(raw) ? raw : [raw]).filter(Boolean).map(String);
  if (!entries.length) return false;
  if (!spec) return entries.some(e => e.trim().toLowerCase() === String(key).toLowerCase());
  const slugs = spec.slugs.map(x => x.toLowerCase());
  return entries.some(e => {
    const t = e.trim().toLowerCase();
    if (slugs.indexOf(t) >= 0) return true;
    return spec.re ? spec.re.test(e) : false;
  });
}

// The canonical roster of Steck & Roper's Fifty Classic Climbs of North America (1979), used
// to tag the catalog and to report which of the fifty it does not yet hold. Stored as
// (route, formation, region) rather than as route ids, because ~91% of route ids in this
// catalog are derived from the route NAME and are not peak-scoped — "North Ridge" alone
// identifies nothing. See CLAUDE.md on route identity.
export const FIFTY_CLASSICS = [
  { n: 1, route: "Abruzzi Ridge", peak: "Mount Saint Elias", region: "Alaska" },
  { n: 2, route: "Carpé Ridge", peak: "Mount Fairweather", region: "Alaska" },
  { n: 3, route: "West Ridge", peak: "Mount Hunter", region: "Alaska" },
  { n: 4, route: "Cassin Ridge", peak: "Denali", region: "Alaska" },
  { n: 5, route: "West Ridge", peak: "The Moose's Tooth", region: "Alaska" },
  { n: 6, route: "West Face", peak: "Mount Huntington", region: "Alaska" },
  { n: 7, route: "Hummingbird Ridge", peak: "Mount Logan", region: "Yukon" },
  { n: 8, route: "East Buttress", peak: "Middle Triple Peak", region: "Alaska" },
  { n: 9, route: "Northwest Arete", peak: "Mount Sir Donald", region: "British Columbia" },
  { n: 10, route: "East Ridge", peak: "Bugaboo Spire", region: "British Columbia" },
  { n: 11, route: "West Buttress", peak: "South Howser Tower", region: "British Columbia" },
  { n: 12, route: "Wishbone Arete", peak: "Mount Robson", region: "British Columbia" },
  { n: 13, route: "North Face", peak: "Mount Edith Cavell", region: "Alberta" },
  { n: 14, route: "Japanese Route", peak: "Mount Alberta", region: "Alberta" },
  { n: 15, route: "East Ridge", peak: "Mount Temple", region: "Alberta" },
  { n: 16, route: "South Face", peak: "Mount Waddington", region: "British Columbia" },
  // Straddles the Alaska-British Columbia border and is approached from Petersburg; the
  // catalog files it under Alaska, and with the region recorded as BC the audit rejected
  // its own correct match as a cross-region collision.
  { n: 17, route: "East Ridge", peak: "Devils Thumb", region: "Alaska" },
  { n: 18, route: "Lotus Flower Tower", peak: "Lotus Flower Tower", region: "Northwest Territories" },
  { n: 19, route: "Liberty Ridge", peak: "Mount Rainier", region: "Washington" },
  { n: 20, route: "West Ridge", peak: "Forbidden Peak", region: "Washington" },
  { n: 21, route: "Price Glacier", peak: "Mount Shuksan", region: "Washington" },
  { n: 22, route: "Northeast Buttress", peak: "Slesse Mountain", region: "British Columbia" },
  { n: 23, route: "North Ridge", peak: "Mount Stuart", region: "Washington" },
  { n: 24, route: "Liberty Crack", peak: "Liberty Bell Mountain", region: "Washington" },
  { n: 25, route: "Durrance Route", peak: "Devils Tower", region: "Wyoming" },
  { n: 26, route: "North Ridge", peak: "Grand Teton", region: "Wyoming" },
  { n: 27, route: "Direct Exum Ridge", peak: "Grand Teton", region: "Wyoming" },
  { n: 28, route: "North Face", peak: "Grand Teton", region: "Wyoming" },
  { n: 29, route: "Direct South Buttress", peak: "Mount Moran", region: "Wyoming" },
  { n: 30, route: "Northeast Face", peak: "Pingora", region: "Wyoming" },
  { n: 31, route: "East Ridge", peak: "Wolfs Head", region: "Wyoming" },
  { n: 32, route: "Ellingwood Ledges", peak: "Crestone Needle", region: "Colorado" },
  { n: 33, route: "Northcutt-Carter Route", peak: "Hallett Peak", region: "Colorado" },
  { n: 34, route: "South Face", peak: "Petit Grepon", region: "Colorado" },
  { n: 35, route: "D1", peak: "Longs Peak", region: "Colorado" },
  { n: 36, route: "Standard Route", peak: "Shiprock", region: "New Mexico" },
  { n: 37, route: "Kor-Ingalls Route", peak: "Castleton Tower", region: "Utah" },
  { n: 38, route: "Finger of Fate", peak: "The Titan", region: "Utah" },
  { n: 39, route: "Royal Arches Route", peak: "Royal Arches", region: "California" },
  { n: 40, route: "Lost Arrow Spire Tip", peak: "Lost Arrow Spire", region: "California" },
  { n: 41, route: "Steck-Salathé Route", peak: "Sentinel Rock", region: "California" },
  { n: 42, route: "East Buttress", peak: "Middle Cathedral Rock", region: "California" },
  { n: 43, route: "Northwest Face", peak: "Half Dome", region: "California" },
  { n: 44, route: "The Nose", peak: "El Capitan", region: "California" },
  { n: 45, route: "Salathé Wall", peak: "El Capitan", region: "California" },
  { n: 46, route: "East Face", peak: "Mount Whitney", region: "California" },
  { n: 47, route: "North Face", peak: "Fairview Dome", region: "California" },
  { n: 48, route: "Southeast Face", peak: "Clyde Minaret", region: "California" },
  { n: 49, route: "South Face", peak: "Charlotte Dome", region: "California" },
  { n: 50, route: "Traveler Buttress", peak: "Lover's Leap", region: "California" },
];
