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

// ---------------------------------------------------------------------------------------------
// PEAK lists tick a SUMMIT, not a line — and that distinction is the whole reason this exists.
//
// The Fifty Classics is a ROUTE list: the book names a peak and a line, so a tag has an obvious
// home. Every other list here is a PEAK list — the Bulgers are Washington's 100 highest summits,
// the Colorado 14ers are summits. `lists` is a column on `routes`, so "tag the Bulgers" has no
// meaning until you say WHICH route on the peak carries it, and every answer is wrong:
//
//   * Tag one route and Mount Rainier is only ticked by that route. Rainier holds 20 lines in
//     this catalog; climbing Liberty Ridge would not count, which is false about the climber's
//     record and the sort of false claim this codebase exists not to make.
//   * Tag every route and the count runs past its own total — 20 Rainier routes against a list
//     of 100 peaks.
//
// So membership is resolved against the PEAK, and the roster is held here as area ids rather
// than written into `routes.lists`. That also sidesteps the state the column is actually in:
// 64 tagged routes carry 14 distinct spellings of two lists ("Washington Bulger List (100
// Highest Peaks in Washington)", "Washington Top 100 (Bulger List)", "...- #19"), so matching it
// needs the prose regexes above. A roster keyed on ids cannot drift that way.
//
// WHAT A PEAK ROSTER DOES NOT PROVE: that every route on the peak reaches the summit. A peak is
// counted as climbed when the climber has logged ANY route on it. For alpine peaks in this
// catalog that holds — the areas are summits and their routes are ways up — but it is an
// assumption, not a guarantee, and a crag route filed under a summit would tick it wrongly.
// `audit:distances` already reports non-alpine routes filed under a peak's area_id (6 in WA).

// Washington's 100 highest peaks. DERIVED from the catalog's own `elevation_ft` (peaks with at
// least 400 ft of clean prominence, which is the Bulger qualifier), NOT transcribed from the
// published roster — so treat it as this catalog's best reading of that list rather than as the
// list itself. It is checked where checking is possible: 11 peaks already carried a hand-written
// Bulger tag from an earlier enrichment pass, and all 11 fall inside this 100. The cutoff lands
// at 8,323 ft, which is where the published list's hundredth peak sits.
//
// Generated by scripts/oneoff/generate-bulger-roster.mjs — every id came out of `areas`, so none
// of them can fail to resolve. Do not hand-edit; a mistyped id is invisible, since a roster entry
// matching no area simply never becomes an objective.
export const BULGER_PEAKS = [
  { id: "wa_mount_rainier", name: "Mount Rainier", ft: 14406 },
  { id: "wa_liberty_cap", name: "Liberty Cap", ft: 14097 },
  { id: "wa_mount_adams", name: "Mount Adams", ft: 12276 },
  { id: "wa_little_tahoma", name: "Little Tahoma Peak", ft: 11138 },
  { id: "wa_mount_baker", name: "Mount Baker", ft: 10781 },
  { id: "wa_glacier_peak", name: "Glacier Peak", ft: 10541 },
  { id: "wa_bonanza_peak", name: "Bonanza Peak", ft: 9516 },
  { id: "wa_colfax_peak", name: "Colfax Peak", ft: 9440 },
  { id: "wa_mount_stuart", name: "Mount Stuart", ft: 9415 },
  { id: "wa_mount_fernow", name: "Mount Fernow", ft: 9249 },
  { id: "wa_mount_goode", name: "Mount Goode", ft: 9220 },
  { id: "wa_mount_shuksan", name: "Mount Shuksan", ft: 9131 },
  { id: "wa_buckner_mountain", name: "Buckner Mountain", ft: 9114 },
  { id: "wa_mount_logan", name: "Mount Logan", ft: 9087 },
  { id: "wa_lincoln_peak", name: "Lincoln Peak", ft: 9085 },
  { id: "wa_mount_maude", name: "Mount Maude", ft: 9082 },
  { id: "wa_jack_mountain", name: "Jack Mountain", ft: 9069 },
  { id: "wa_mount_spickard", name: "Mount Spickard", ft: 8983 },
  { id: "wa_black_peak", name: "Black Peak", ft: 8970 },
  { id: "wa_mount_redoubt", name: "Mount Redoubt", ft: 8969 },
  { id: "wa_copper_peak", name: "Copper Peak", ft: 8965 },
  { id: "wa_north_gardner_mountain", name: "North Gardner Mountain", ft: 8956 },
  { id: "wa_dome_peak", name: "Dome Peak", ft: 8926 },
  { id: "wa_gardner_mountain", name: "Gardner Mountain", ft: 8902 },
  { id: "wa_boston_peak", name: "Boston Peak", ft: 8894 },
  { id: "wa_silver_star_mountain_okanogan", name: "Silver Star Mountain", ft: 8876 },
  { id: "wa_eldorado_peak", name: "Eldorado Peak", ft: 8872 },
  { id: "wa_main_peak", name: "Main Peak", ft: 8872 },
  { id: "wa_dragontail_peak", name: "Dragontail Peak", ft: 8840 },
  { id: "wa_forbidden_peak", name: "Forbidden Peak", ft: 8815 },
  { id: "wa_oval_peak", name: "Oval Peak", ft: 8800 },
  { id: "wa_mesahchie_peak", name: "Mesahchie Peak", ft: 8795 },
  { id: "wa_mount_lago", name: "Mount Lago", ft: 8745 },
  { id: "wa_robinson_mountain", name: "Robinson Mountain", ft: 8729 },
  { id: "wa_colchuck_peak", name: "Colchuck Peak", ft: 8705 },
  { id: "wa_star_peak_sawtooth", name: "Star Peak", ft: 8693 },
  { id: "wa_remmel_mountain", name: "Remmel Mountain", ft: 8688 },
  { id: "wa_katsuk_peak", name: "Katsuk Peak", ft: 8683 },
  { id: "wa_fortress_mountain", name: "Fortress Mountain", ft: 8679 },
  { id: "wa_cannon_mountain", name: "Cannon Mountain", ft: 8652 },
  { id: "wa_kimtah_peak", name: "Kimtah Peak", ft: 8649 },
  { id: "wa_mount_custer", name: "Mount Custer", ft: 8630 },
  { id: "wa_sherpa_peak", name: "Sherpa Peak", ft: 8630 },
  { id: "wa_ptarmigan_peak_pasayten", name: "Ptarmigan Peak", ft: 8614 },
  { id: "wa_cathedral_peak_pasayten", name: "Cathedral Peak", ft: 8606 },
  { id: "wa_clark_mountain", name: "Clark Mountain", ft: 8602 },
  { id: "wa_monument_peak_pasayten", name: "Monument Peak", ft: 8597 },
  { id: "wa_cardinal_peak", name: "Cardinal Peak", ft: 8596 },
  { id: "wa_mount_carru", name: "Mount Carru", ft: 8595 },
  { id: "wa_osceola_peak", name: "Osceola Peak", ft: 8587 },
  { id: "wa_raven_ridge", name: "Raven Ridge", ft: 8572 },
  { id: "wa_storm_king", name: "Storm King", ft: 8565 },
  { id: "wa_enchantment_peak", name: "Enchantment Peak", ft: 8538 },
  { id: "wa_buck_mountain", name: "Buck Mountain", ft: 8534 },
  { id: "wa_reynolds_peak", name: "Reynolds Peak", ft: 8517 },
  { id: "wa_cashmere_mountain", name: "Cashmere Mountain", ft: 8514 },
  { id: "wa_martin_peak", name: "Martin Peak", ft: 8509 },
  { id: "wa_primus_peak", name: "Primus Peak", ft: 8508 },
  { id: "wa_southeast_mox_peak", name: "Southeast Mox Peak", ft: 8504 },
  { id: "wa_klawatti_peak", name: "Klawatti Peak", ft: 8485 },
  { id: "wa_big_craggy_peak", name: "Big Craggy Peak", ft: 8478 },
  { id: "wa_hoodoo_peak_sawtooth", name: "Hoodoo Peak", ft: 8475 },
  { id: "wa_lost_peak_pasayten", name: "Lost Peak", ft: 8464 },
  { id: "wa_chiwawa_mountain", name: "Chiwawa Mountain", ft: 8459 },
  { id: "wa_argonaut_peak", name: "Argonaut Peak", ft: 8457 },
  { id: "wa_luahna_peak", name: "Luahna Peak", ft: 8450 },
  { id: "wa_mount_bigelow", name: "Mount Bigelow", ft: 8449 },
  { id: "wa_azurite_peak", name: "Azurite Peak", ft: 8445 },
  { id: "wa_tower_mountain", name: "Tower Mountain", ft: 8445 },
  { id: "wa_sinister_peak", name: "Sinister Peak", ft: 8444 },
  { id: "wa_dorado_needle", name: "Dorado Needle", ft: 8440 },
  { id: "wa_emerald_peak_entiat", name: "Emerald Peak", ft: 8422 },
  { id: "wa_dumbell_mountain", name: "Dumbell Mountain", ft: 8416 },
  { id: "wa_greenwood_mountain", name: "Greenwood Mountain", ft: 8413 },
  { id: "wa_northwest_mox_peak", name: "Northwest Mox Peak", ft: 8407 },
  { id: "wa_saska_peak", name: "Saska Peak", ft: 8404 },
  { id: "wa_blackcap_mountain", name: "Blackcap Mountain", ft: 8402 },
  { id: "wa_pinnacle_mountain_entiat", name: "Pinnacle Mountain", ft: 8400 },
  { id: "wa_courtney_peak", name: "Courtney Peak", ft: 8394 },
  { id: "wa_spectacle_buttes", name: "Spectacle Buttes", ft: 8392 },
  { id: "wa_devore_peak", name: "Devore Peak", ft: 8382 },
  { id: "wa_big_snagtooth", name: "Big Snagtooth", ft: 8379 },
  { id: "wa_lake_mountain_pasayten", name: "Lake Mountain", ft: 8377 },
  { id: "wa_chalangin_peak", name: "Chalangin Peak", ft: 8371 },
  { id: "wa_mount_ballard", name: "Mount Ballard", ft: 8371 },
  { id: "wa_mcclellan_peak", name: "McClellan Peak", ft: 8367 },
  { id: "wa_golden_horn", name: "Golden Horn", ft: 8366 },
  { id: "wa_west_craggy_peak", name: "West Craggy Peak", ft: 8366 },
  { id: "wa_mount_st_helens", name: "Mount St. Helens", ft: 8363 },
  { id: "wa_amphitheater_mountain", name: "Amphitheater Mountain", ft: 8358 },
  { id: "wa_mount_fury_east", name: "Mount Fury (East Peak)", ft: 8356 },
  { id: "wa_snowfield_peak", name: "Snowfield Peak", ft: 8351 },
  { id: "wa_tupshin_peak", name: "Tupshin Peak", ft: 8348 },
  { id: "wa_castle_peak_pasayten", name: "Castle Peak", ft: 8343 },
  { id: "wa_austera_peak", name: "Austera Peak", ft: 8339 },
  { id: "wa_windy_peak", name: "Windy Peak", ft: 8335 },
  { id: "wa_cosho_peak", name: "Cosho Peak", ft: 8332 },
  { id: "wa_big_kangaroo", name: "Big Kangaroo", ft: 8326 },
  { id: "wa_mount_formidable", name: "Mount Formidable", ft: 8325 },
  { id: "wa_flora_mountain", name: "Flora Mountain", ft: 8323 },
];

// key -> the peak roster that defines it. A list with no entry here is a ROUTE list and is
// resolved through routeInList() against `routes.lists` as before.
export const PEAK_ROSTERS = { bulgers: BULGER_PEAKS };

// The roster for a named list, or null if it is not a peak list.
export function listPeaks(key) { return PEAK_ROSTERS[key] || null; }

// Has this climber summited the peak? True when ANY logged route sits on it. `mountainId` is the
// field both shapes use — seed routes carry it directly and dbRouteToCamel maps `area_id` onto
// it — so this works for a seed demo and a real catalog alike.
export function peakClimbed(peak, logged) {
  if (!peak || !logged || !logged.length) return false;
  const id = String(peak.id || peak);
  return logged.some(r => r && String(r.mountainId || "") === id);
}
