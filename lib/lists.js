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
  np_hp: { slugs: ["np_hp"], re: /\bnational\s+park\s+high\s*point/i },
  cascade: { slugs: ["cascade", "cascade_volcanoes", "volcano"], re: /\bcascade\s+volcano|\bvolcano\b/i },
  ultra: { slugs: ["ultra", "ultras"], re: /\bultra[- ]?prominen/i },
  seven: { slugs: ["seven", "seven_summits"], re: /\bseven\s+summits\b/i },
  co14: { slugs: ["co14", "colorado_14ers"], re: /\bcolorado\b[^.]{0,30}\b14(?:,?000)?\s*(?:ers|ft|feet)?\b/i },
  ca14: { slugs: ["ca14", "california_14ers"], re: /\bcalifornia\b[^.]{0,30}\b14(?:,?000)?\s*(?:ers|ft|feet)?\b/i },
  desert: { slugs: ["desert", "desert_towers"], re: /\bdesert\s+tower/i },
  triple: { slugs: ["triple", "triple_crown"], re: /\btriple\s+crown\b/i },
  // Peak lists defined by their ROSTERS below; the slugs only catch a route that names the list.
  co_cent: { slugs: ["co_cent", "co_centennials", "centennials"], re: /\bcolorado\s+centennials?\b/i },
  sps: { slugs: ["sps", "sierra_peaks_section"], re: /\bsierra\s+peaks\s+section\b/i },
  adk46: { slugs: ["adk46", "adk_46", "adirondack_46"], re: /\badirondack\s+(?:46|forty[- ]?six)|\b46ers?\b/i },
  // Four Washington peak lists the catalog records in prose and nothing could resolve, so the
  // membership sat in `routes.lists` and reached NO chip: routeTags iterates the keys here, and
  // a raw value matching none of them is never considered. The module's stated safety net -
  // "a list with no entry in LIST_TAGS still renders" - covers a KEY added to this file, not an
  // unrecognised VALUE, so it guarded the opposite direction.
  //
  // These add a CHIP and nothing else. The Challenges cards are a hand-written array in
  // ClimbMatchCore, not derived from these keys, so none of these becomes a tick-list card -
  // which matters, because twelve cards were removed once already for advertising totals the
  // catalog could never fill.
  //
  // The names are the LIST's, never the publisher's. Each stored value names the site it was
  // read from ("Peakbagger", "SummitPost", "per Country Highpoints"); a chip repeating that
  // would put a source on screen, which this app does not do anywhere. The label is built from
  // what the value says the list IS.
  wa_top100_elev: { slugs: ["wa_top100_elev"], re: /top\s*100\s+washington\s+peaks?\s+by\s+elevation/i },
  wa_prominence: { slugs: ["wa_prominence"], re: /clean[-\s]prominence|steepest[-\s]peaks/i },
  wa_top200: { slugs: ["wa_top200"], re: /washington\s+top\s+200|top\s+200\s+peaks/i },
  wa_difficult10: { slugs: ["wa_difficult10"], re: /difficult\s*10\b|hardest\s+peaks/i },
};

// Does this route belong to the named list? Accepts a slug the catalog already stores, or the
// prose it stores instead — "Washington Bulgers (100 Highest Peaks) — tied for #51" is a list
// membership, not a sentence, and the rank inside it is pulled out for display by routeTags.
export function routeInList(route, key) {
  const spec = LIST_ALIASES[key];
  // A PEAK list is defined by its roster, not by `routes.lists`, so a route sitting ON one of
  // its summits belongs to it even though the row carries no tag. Checking this here rather
  // than only in Challenges is the whole point of the one-resolver rule at the top of
  // lib/routeTags.js: that module asks THIS function what to draw as a chip, so without this
  // branch a climber could open a route on Mount Rainier, see no Bulgers chip, and be told by
  // the Challenges screen that the same peak is one of the hundred. The chip and the count
  // would disagree — exactly the drift the split was created to prevent.
  //
  // Peak lists still render their card from `peakObjectives`, which is keyed on the roster, so
  // this cannot double-count: the card never reaches `inList` for those keys.
  const peaks = PEAK_ROSTERS[key];
  if (peaks && route && route.mountainId != null) {
    const mid = String(route.mountainId);
    if (peaks.some(p => p.id === mid || (p.also && p.also.indexOf(mid) >= 0))) return true;
  }
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
//
// `id` is the catalog row each entry resolved to (2026-10-21: all fifty are in the catalog and
// tagged; each id was read back and its area checked against `peak`). The Challenges list draws
// its rows from THIS roster through those ids, in the book's order and under the book's names,
// so "West Ridge" names the peak it is on. A route that is re-imported under a new id must be
// re-pointed here, or its row reads as not in the catalog yet.
export const FIFTY_CLASSICS = [
  { n: 1, id: "ak_mount_saint_elias_abruzzi_ridge", route: "Abruzzi Ridge", peak: "Mount Saint Elias", region: "Alaska" },
  { n: 2, id: "ak_mount_fairweather_carpe_ridge", route: "Carpé Ridge", peak: "Mount Fairweather", region: "Alaska" },
  { n: 3, id: "ak_west_ridge_7", route: "West Ridge", peak: "Mount Hunter", region: "Alaska" },
  { n: 4, id: "ak_cassin_ridge", route: "Cassin Ridge", peak: "Denali", region: "Alaska" },
  { n: 5, id: "ak_moose_s_tooth_west_ridge", route: "West Ridge", peak: "The Moose's Tooth", region: "Alaska" },
  { n: 6, id: "ak_mt_huntington_west_face", route: "West Face", peak: "Mount Huntington", region: "Alaska" },
  { n: 7, id: "yt_mount_logan_hummingbird_ridge", route: "Hummingbird Ridge", peak: "Mount Logan", region: "Yukon" },
  { n: 8, id: "ak_middle_triple_peak_east_buttress", route: "East Buttress", peak: "Middle Triple Peak", region: "Alaska" },
  { n: 9, id: "bc_mount_sir_donald_northwest_arete", route: "Northwest Arete", peak: "Mount Sir Donald", region: "British Columbia" },
  { n: 10, id: "bc_bugaboo_spire_east_ridge", route: "East Ridge", peak: "Bugaboo Spire", region: "British Columbia" },
  { n: 11, id: "bc_south_howser_tower_west_buttress", route: "West Buttress", peak: "South Howser Tower", region: "British Columbia" },
  { n: 12, id: "bc_mount_robson_wishbone_arete", route: "Wishbone Arete", peak: "Mount Robson", region: "British Columbia" },
  { n: 13, id: "ab_mount_edith_cavell_north_face", route: "North Face", peak: "Mount Edith Cavell", region: "Alberta" },
  { n: 14, id: "ab_mount_alberta_japanese_route", route: "Japanese Route", peak: "Mount Alberta", region: "Alberta" },
  { n: 15, id: "ab_mount_temple_east_ridge", route: "East Ridge", peak: "Mount Temple", region: "Alberta" },
  { n: 16, id: "bc_mount_waddington_south_face", route: "South Face", peak: "Mount Waddington", region: "British Columbia" },
  // Straddles the Alaska-British Columbia border and is approached from Petersburg; the
  // catalog files it under Alaska, and with the region recorded as BC the audit rejected
  // its own correct match as a cross-region collision.
  { n: 17, id: "ak_east_ridge_via_southeast_face", route: "East Ridge", peak: "Devils Thumb", region: "Alaska" },
  { n: 18, id: "nt_lotus_flower_tower_southeast_face", route: "Lotus Flower Tower", peak: "Lotus Flower Tower", region: "Northwest Territories" },
  { n: 19, id: "wa_mount_rainier_liberty_ridge", route: "Liberty Ridge", peak: "Mount Rainier", region: "Washington" },
  { n: 20, id: "wa_forbidden_peak_west_ridge", route: "West Ridge", peak: "Forbidden Peak", region: "Washington" },
  { n: 21, id: "wa_mount_shuksan_price_glacier", route: "Price Glacier", peak: "Mount Shuksan", region: "Washington" },
  { n: 22, id: "bc_slesse_mountain_northeast_buttress", route: "Northeast Buttress", peak: "Slesse Mountain", region: "British Columbia" },
  { n: 23, id: "wa_mount_stuart_north_ridge", route: "North Ridge", peak: "Mount Stuart", region: "Washington" },
  { n: 24, id: "wa_liberty_crack", route: "Liberty Crack", peak: "Liberty Bell Mountain", region: "Washington" },
  { n: 25, id: "wy_durrance", route: "Durrance Route", peak: "Devils Tower", region: "Wyoming" },
  { n: 26, id: "wy_north_ridge_4", route: "North Ridge", peak: "Grand Teton", region: "Wyoming" },
  { n: 27, id: "wy_exum_ridge", route: "Direct Exum Ridge", peak: "Grand Teton", region: "Wyoming" },
  { n: 28, id: "wy_north_face_standard", route: "North Face", peak: "Grand Teton", region: "Wyoming" },
  { n: 29, id: "wy_direct_south_buttress", route: "Direct South Buttress", peak: "Mount Moran", region: "Wyoming" },
  { n: 30, id: "wy_northeast_face", route: "Northeast Face", peak: "Pingora", region: "Wyoming" },
  { n: 31, id: "wy_east_ridge_9", route: "East Ridge", peak: "Wolfs Head", region: "Wyoming" },
  { n: 32, id: "co_ellingwood_ledges", route: "Ellingwood Ledges", peak: "Crestone Needle", region: "Colorado" },
  { n: 33, id: "co_northcutt_carter", route: "Northcutt-Carter Route", peak: "Hallett Peak", region: "Colorado" },
  { n: 34, id: "co_south_face", route: "South Face", peak: "Petit Grepon", region: "Colorado" },
  { n: 35, id: "co_d1", route: "D1", peak: "Longs Peak", region: "Colorado" },
  { n: 36, id: "nm_regular_route_6", route: "Standard Route", peak: "Shiprock", region: "New Mexico" },
  { n: 37, id: "ut_kor_ingalls_route", route: "Kor-Ingalls Route", peak: "Castleton Tower", region: "Utah" },
  { n: 38, id: "ut_finger_of_fate", route: "Finger of Fate", peak: "The Titan", region: "Utah" },
  { n: 39, id: "ca_royal_arches_5_10_or_5_7_a0", route: "Royal Arches Route", peak: "Royal Arches", region: "California" },
  { n: 40, id: "ca_lost_arrow_tip", route: "Lost Arrow Spire Tip", peak: "Lost Arrow Spire", region: "California" },
  { n: 41, id: "ca_steck_salathe_2", route: "Steck-Salathé Route", peak: "Sentinel Rock", region: "California" },
  { n: 42, id: "ca_east_buttress_6", route: "East Buttress", peak: "Middle Cathedral Rock", region: "California" },
  { n: 43, id: "ca_regular_northwest_face_of_half_dome", route: "Northwest Face", peak: "Half Dome", region: "California" },
  { n: 44, id: "ca_the_nose_7", route: "The Nose", peak: "El Capitan", region: "California" },
  { n: 45, id: "ca_salathe_wall", route: "Salathé Wall", peak: "El Capitan", region: "California" },
  { n: 46, id: "ca_east_face_10", route: "East Face", peak: "Mount Whitney", region: "California" },
  { n: 47, id: "ca_regular_route_29", route: "North Face", peak: "Fairview Dome", region: "California" },
  { n: 48, id: "ca_southeast_face_4", route: "Southeast Face", peak: "Clyde Minaret", region: "California" },
  { n: 49, id: "ca_south_face_14", route: "South Face", peak: "Charlotte Dome", region: "California" },
  { n: 50, id: "ca_traveler_buttress", route: "Traveler Buttress", peak: "Lover's Leap", region: "California" },
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

// key -> the peak roster that defines it. Declared after routeInList, which references it:
// safe because routeInList is only called once the module has finished evaluating, never
// during evaluation.
// key -> the peak roster that defines it. A list with no entry here is a ROUTE list and is
// resolved through routeInList() against `routes.lists` as before.
// ---------------------------------------------------------------------------------------------
// Four more peak rosters, RESOLVED against the catalog rather than transcribed into it.
//
// Each is the published roster (researched) intersected with what this catalog actually holds,
// so every id here resolves to a real area that holds at least one route. They are DELIBERATELY
// PARTIAL, and the screen already says so: the expanded list panel renders
// "+ N more on the full list — fills in as the catalog grows", so a short roster understates
// nothing. A name with no area behind it would be worse than absent — it renders as an objective
// a climber can never tick.
//
// Coverage against what each list advertises (measured, scripts/oneoff/resolve-peak-rosters.mjs):
//
//     Cascade volcanoes   18 of 18      California 14ers    12 of 12
//     Colorado 14ers      52 of 53      Desert towers       27 of 27
//
// ALL SIX LISTS ARE NOW COMPLETE TO WHAT IS ACHIEVABLE. Colorado's 52 of 53 is not a gap left
// open: all 53 resolve to a real area, and the ONE without a route is MOUNT BROSS, whose SUMMIT
// IS STILL LEGALLY CLOSED — privately owned, and the March 2026 USFS acquisition covered the
// approach corridor, not the top, so standing on it is trespassing. `co_mount_bross` therefore
// exists holding 0 routes and looks exactly like the routeless peaks 0144 fixed. It is not one.
// A tick list invites people to go climb the thing, the same rule that keeps Eagle Rock Spire
// off Desert Towers for being on Navajo Nation land. DO NOT "FINISH" COLORADO — 52 IS THE
// CEILING.
//
// 0146 closed the last four (Crestone Peak, Crestone Needle, Mount Wilson, Maroon Peak) by ADDING
// the summits beside the combined crags that already held their technical routes, and moving
// nothing: co_crestones_the still holds its 11 routes and co_maroon_bells its 3. Re-filing those
// across four peaks is a separate operation — the Crestones Traverse and the Bells Traverse
// genuinely span TWO summits and belong to neither alone.
//
// COLORADO was 11 because its tree is a CRAG tree, not a peak tree — Longs Peak, Mount Elbert,
// Grays Peak and Pikes Peak had no area at all, a walk-up fourteener not being a rock-climbing
// area in the OpenBeta source. Migration 0137 created the 18 that were measurably absent (and
// only those; 35 name-variant candidates are left for per-peak adjudication rather than risking
// a duplicate mountain). 0138 did the same for the Cascades, where Middle Sister needed only a
// ROUTE — its area already existed carrying none. 0140 finished both lists with Mount Bachelor
// and White Mountain Peak, each taking the name from the strongest PUBLISHED ROUTE PAGE that
// exists for it, since neither has a land-manager name the way Lassen and McLoughlin do.
// STATE HIGHPOINTS are
// mostly not climbs — Britton Hill is 345 ft. Neither is fixable by better matching; both need a
// peak import of the kind Washington got.
//
// MATCHING IS EXACT ON THE NAME, after expanding abbreviations on both sides ("Mt. Hood" ->
// "mount hood"). The loose, stopword-stripped match that preceded it produced confident wrong
// answers: Colorado's Castle Peak (14,279 ft, Elk Mountains) resolved to "Castle, The", a granite
// crag in Buffalo Creek outside Denver, and Crestone Peak to a bare "Crestone". Colorado areas
// carry no elevation, so the height cross-check could not catch either. A wrong summit on a tick
// list is worse than a short list.
//
// Two more rules the resolver enforces, each after getting it wrong first:
//   * FAIL CLOSED on the state. Falling back to an out-of-state candidate sent Colorado's Mount
//     Lincoln to `ok_mt_lincoln`, New Mexico's Wheeler Peak to `vt_wheeler_mountain`, and
//     Missouri Mountain to the `missouri` STATE ROW.
//   * Two entries resolving to ONE area means distinct peaks were collapsed — Mount Wilson
//     (14,252) and Wilson Peak (14,023) are different San Juan fourteeners that both reduce to
//     "wilson". Both are dropped rather than one being guessed.
export const CO_14ER_PEAKS = [
  { id: "co_mount_elbert", name: "Mount Elbert", ft: 14440 },
  { id: "co_mount_massive", name: "Mount Massive", ft: 14428 },
  { id: "co_mount_harvard", name: "Mount Harvard", ft: 14421 },
  { id: "co_blanca_peak", name: "Blanca Peak", ft: 14351 },
  { id: "co_la_plata_peak", name: "La Plata Peak", ft: 14343 },
  { id: "co_uncompahgre_peak", name: "Uncompahgre Peak", ft: 14321 },
  { id: "co_crestone_peak", name: "Crestone Peak", ft: 14300 },
  { id: "co_mount_lincoln", name: "Mount Lincoln", ft: 14293 },
  { id: "co_castle_peak", name: "Castle Peak", ft: 14279 },
  { id: "co_grays_peak", name: "Grays Peak", ft: 14278 },
  { id: "co_mount_antero", name: "Mount Antero", ft: 14276 },
  { id: "co_torreys_peak", name: "Torreys Peak", ft: 14275 },
  { id: "co_quandary_peak", name: "Quandary Peak", ft: 14271 },
  { id: "co_mt_evans", name: "Mount Blue Sky", ft: 14271 },
  { id: "co_longs_peak", name: "Longs Peak", ft: 14259 },
  { id: "co_mount_wilson", name: "Mount Wilson", ft: 14252 },
  { id: "co_mount_shavano", name: "Mount Shavano", ft: 14231 },
  { id: "co_mount_princeton", name: "Mount Princeton", ft: 14204 },
  { id: "co_mt_belford", name: "Mount Belford", ft: 14203 },
  { id: "co_crestone_needle", name: "Crestone Needle", ft: 14203 },
  { id: "co_mount_yale", name: "Mount Yale", ft: 14200 },
  { id: "co_kit_carson_peak", name: "Kit Carson Mountain", ft: 14171 },
  { id: "co_maroon_peak", name: "Maroon Peak", ft: 14163 },
  { id: "co_tabeguache_peak", name: "Tabeguache Peak", ft: 14162 },
  { id: "co_mount_oxford", name: "Mount Oxford", ft: 14160 },
  { id: "co_mount_sneffels", name: "Mount Sneffels", ft: 14158 },
  { id: "co_mount_democrat", name: "Mount Democrat", ft: 14155 },
  { id: "co_capitol_peak", name: "Capitol Peak", ft: 14137 },
  { id: "co_pikes_peak", name: "Pikes Peak", ft: 14115 },
  { id: "co_snowmass_mountain", name: "Snowmass Mountain", ft: 14099 },
  { id: "co_windom_peak", name: "Windom Peak", ft: 14093 },
  { id: "co_mount_eolus", name: "Mount Eolus", ft: 14090 },
  { id: "co_challenger_point", name: "Challenger Point", ft: 14087 },
  { id: "co_mount_columbia", name: "Mount Columbia", ft: 14077 },
  { id: "co_missouri_mountain", name: "Missouri Mountain", ft: 14074 },
  { id: "co_humboldt_peak", name: "Humboldt Peak", ft: 14070 },
  { id: "co_mt_bierstadt", name: "Mount Bierstadt", ft: 14065 },
  { id: "co_sunlight_peak", name: "Sunlight Peak", ft: 14065 },
  { id: "co_handies_peak", name: "Handies Peak", ft: 14058 },
  { id: "co_culebra_peak", name: "Culebra Peak", ft: 14053 },
  { id: "co_ellingwood_point", name: "Ellingwood Point", ft: 14048 },
  { id: "co_mount_lindsey", name: "Mount Lindsey", ft: 14048 },
  { id: "co_little_bear_peak", name: "Little Bear Peak", ft: 14043 },
  { id: "co_mount_sherman", name: "Mount Sherman", ft: 14043 },
  { id: "co_redcloud_peak", name: "Redcloud Peak", ft: 14041 },
  { id: "co_pyramid_peak", name: "Pyramid Peak", ft: 14025 },
  { id: "co_wilson_peak", name: "Wilson Peak", ft: 14023 },
  { id: "co_san_luis_peak", name: "San Luis Peak", ft: 14022 },
  { id: "co_wetterhorn_peak", name: "Wetterhorn Peak", ft: 14021 },
  { id: "co_mount_of_the_holy_cross", name: "Mount of the Holy Cross", ft: 14011 },
  { id: "co_huron_peak", name: "Huron Peak", ft: 14010 },
  { id: "co_sunshine_peak", name: "Sunshine Peak", ft: 14007 },
];
export const CA_14ER_PEAKS = [
  { id: "ca_mt_whitney", name: "Mount Whitney", ft: 14505 },
  { id: "ca_mt_williamson", name: "Mount Williamson", ft: 14379 },
  { id: "ca_white_mountain_peak", name: "White Mountain Peak", ft: 14252 },
  { id: "ca_north_palisade", name: "North Palisade", ft: 14248 },
  { id: "ca_mt_shasta", name: "Mount Shasta", ft: 14179 },
  { id: "ca_mt_sill", name: "Mount Sill", ft: 14159 },
  { id: "ca_mt_russell", name: "Mount Russell", ft: 14094 },
  { id: "ca_split_mountain", name: "Split Mountain", ft: 14064 },
  { id: "ca_mt_langley", name: "Mount Langley", ft: 14032 },
  { id: "ca_mt_tyndall", name: "Mount Tyndall", ft: 14025 },
  { id: "ca_mt_muir", name: "Mount Muir", ft: 14018 },
  { id: "ca_middle_palisade", name: "Middle Palisade", ft: 14018 },
];
export const CASCADE_VOLCANO_PEAKS = [
  { id: "wa_mount_baker", name: "Mount Baker", ft: 10781 },
  { id: "wa_glacier_peak", name: "Glacier Peak", ft: 10541 },
  { id: "wa_mount_rainier", name: "Mount Rainier", ft: 14411 },
  { id: "wa_mount_st_helens", name: "Mount St. Helens", ft: 8363 },
  { id: "wa_mount_adams", name: "Mount Adams", ft: 12276 },
  { id: "or_mt_hood", name: "Mount Hood", ft: 11249 },
  { id: "or_mt_jefferson", name: "Mount Jefferson", ft: 10497 },
  { id: "or_three_fingered_jack", name: "Three Fingered Jack", ft: 7841 },
  { id: "or_mt_washington", name: "Mount Washington", ft: 7795 },
  { id: "or_north_sister", name: "North Sister", ft: 10090 },
  { id: "or_middle_sister", name: "Middle Sister", ft: 10047 },
  { id: "or_south_sister", name: "South Sister", ft: 10358 },
  { id: "or_broken_top", name: "Broken Top", ft: 9177 },
  { id: "or_mt_bachelor", name: "Mount Bachelor", ft: 9068 },
  { id: "or_mt_thielsen", name: "Mount Thielsen", ft: 9184 },
  { id: "or_mt_mcloughlin", name: "Mount McLoughlin", ft: 9495 },
  { id: "ca_mt_shasta", name: "Mount Shasta", ft: 14179 },
  { id: "ca_lassen_peak", name: "Lassen Peak", ft: 10457 },
];

// Named desert towers of Moab / Castle Valley / Fisher Towers / Indian Creek / Canyonlands.
// 27 of 30 resolve and ALL 27 hold routes — the best coverage of any list here, and the reason
// generalises: a desert tower IS a climbing formation, so it exists in the catalog as an area
// with routes on it. A walk-up fourteener is not, which is why Colorado needed migration 0137
// to reach 30 of 53 rather than resolving there on its own.
//
// The card advertises 27, which is this roster's length, because the three names that used to
// make up an advertised 30 were each researched and none is importable: "Determination Towers"
// is a USGS label for a GROUP of spires rather than a formation (MP holds no area or route by
// the name); "Corral Spire" could not be confirmed to exist in any source; and Eagle Rock Spire
// is real but stands in Monument Valley, where climbing is illegal on Navajo Nation land, so it
// must not appear on a list that invites people to go climb it. There was never a canonical 30.
export const DESERT_TOWER_PEAKS = [
  { id: "ut_castleton_tower", name: "Castleton Tower", ft: undefined },
  { id: "ut_the_rectory", name: "The Rectory", ft: undefined },
  { id: "ut_the_priest", name: "The Priest", ft: undefined },
  { id: "ut_sister_superior_group", name: "Sister Superior", ft: undefined },
  { id: "ut_lighthouse_tower", name: "Lighthouse Tower", ft: undefined },
  { id: "ut_titan_the", name: "The Titan", ft: undefined },
  { id: "ut_ancient_art", name: "Ancient Art", ft: undefined },
  { id: "ut_echo_tower", name: "Echo Tower", ft: undefined },
  { id: "ut_cottontail_tower", name: "Cottontail Tower", ft: undefined },
  { id: "ut_kingfisher", name: "The Kingfisher", ft: undefined },
  { id: "ut_north_six_shooter_peak", name: "North Six Shooter", ft: undefined },
  { id: "ut_south_sixshooter", name: "South Six Shooter", ft: undefined },
  { id: "ut_moses", name: "Moses", ft: undefined },
  { id: "ut_zeus", name: "Zeus", ft: undefined },
  { id: "ut_aphrodite", name: "Aphrodite", ft: undefined },
  { id: "ut_standing_rock", name: "Standing Rock", ft: undefined },
  { id: "ut_washer_woman", name: "Washer Woman", ft: undefined },
  { id: "ut_monster_tower", name: "Monster Tower", ft: undefined },
  { id: "ut_charlie_horse_needle", name: "Charlie Horse Needle", ft: undefined },
  { id: "ut_dark_angel", name: "Dark Angel", ft: undefined },
  { id: "ut_owl_rock", name: "Owl Rock", ft: undefined },
  { id: "ut_argon_tower", name: "Argon Tower", ft: undefined },
  { id: "ut_sunflower_tower", name: "Sunflower Tower", ft: undefined },
  { id: "ut_easter_island", name: "Easter Island", ft: undefined },
  { id: "ut_king_of_pain", name: "King of Pain", ft: undefined },
  { id: "ut_thumbelina", name: "Thumbelina", ft: undefined },
  { id: "ut_nuns_the", name: "The Nuns", ft: undefined },
];

// The highest point of each of the 63 US national parks — 12 of which this catalog holds with
// routes on them. Most of the rest are not climbs in any catalog: Everglades' highpoint is 10 ft,
// Gateway Arch's is 470 ft, and several are unnamed benchmarks. That is a property of the list,
// not a gap to fill.
//
// The ones that DO resolve are why this belongs in a climbing app: Goode Mountain (North
// Cascades) is a technical rock climb, and Mount Saint Elias and Mount Fairweather are glacier
// expeditions — both of which exist here only because the Fifty Classics work imported them.
//
// Two entries needed the catalog's own spelling, each read off the row: "Mount Goode" (the roster
// says Goode Mountain) and "Mount Olympus (West Peak)". Note ut_mount_olympus is a DIFFERENT
// Mount Olympus with 47 routes — the state filter is what keeps them apart.

// The COLORADO CENTENNIALS: the state's hundred highest RANKED summits (300 ft prominence), so the 53
// ranked fourteeners above and these 47 thirteeners. Thirty-eight of the thirteeners were measured
// absent from the catalog and added by 0344 with a standard route; the other nine already stood, filed
// as climbing areas, and 0344 gave eight of them their standard route (Jagged already had its own).
// Ranks 99 and 100 tie at 13,816 ft; this follows the order the standard list gives them.
export const CO_CENTENNIAL_13ER_PEAKS = [
  { id: "co_grizzly_peak", name: "Grizzly Peak", ft: 13997 },
  { id: "co_stewart_peak", name: "Stewart Peak", ft: 13988 },
  { id: "co_mount_ouray", name: "Mount Ouray", ft: 13979 },
  { id: "co_pigeon_peak", name: "Pigeon Peak", ft: 13977 },
  { id: "co_pacific_peak", name: "Pacific Peak", ft: 13965 },
  { id: "co_ice_mountain", name: "Ice Mountain", ft: 13960 },
  { id: "co_cathedral_peak", name: "Cathedral Peak", ft: 13952 },
  { id: "co_thunder_pyramid", name: "Thunder Pyramid", ft: 13944 },
  { id: "co_fletcher_mountain", name: "Fletcher Mountain", ft: 13943 },
  { id: "co_french_mountain", name: "French Mountain", ft: 13942 },
  { id: "co_mount_hope", name: "Mount Hope", ft: 13939 },
  { id: "co_mount_adams", name: "Mount Adams", ft: 13937 },
  { id: "co_gladstone_peak", name: "Gladstone Peak", ft: 13923 },
  { id: "co_horseshoe_mountain", name: "Horseshoe Mountain", ft: 13918 },
  { id: "co_emerald_peak", name: "Emerald Peak", ft: 13916 },
  { id: "co_mt_meeker", name: "Mount Meeker", ft: 13916 },
  { id: "co_red_mountain", name: "Red Mountain", ft: 13911 },
  { id: "co_vermilion_peak", name: "Vermilion Peak", ft: 13909 },
  { id: "co_casco_peak", name: "Casco Peak", ft: 13905 },
  { id: "co_phoenix_peak", name: "Phoenix Peak", ft: 13904 },
  { id: "co_cronin_peak", name: "Cronin Peak", ft: 13872 },
  { id: "co_mount_buckskin", name: "Mount Buckskin", ft: 13871 },
  { id: "co_north_apostle", name: "North Apostle", ft: 13869 },
  { id: "co_vestal_peak", name: "Vestal Peak", ft: 13867 },
  { id: "co_jones_mountain", name: "Jones Mountain", ft: 13867 },
  { id: "co_half_peak", name: "Half Peak", ft: 13866 },
  { id: "co_clinton_peak", name: "Clinton Peak", ft: 13866 },
  { id: "co_dyer_mountain", name: "Dyer Mountain", ft: 13861 },
  { id: "co_crystal_peak", name: "Crystal Peak", ft: 13860 },
  { id: "co_mount_edwards", name: "Mount Edwards", ft: 13860 },
  { id: "co_atlantic_peak", name: "Atlantic Peak", ft: 13856 },
  { id: "co_california_peak", name: "California Peak", ft: 13854 },
  { id: "co_holy_cross_ridge", name: "Holy Cross Ridge", ft: 13850 },
  { id: "co_hagerman_peak", name: "Hagerman Peak", ft: 13848 },
  { id: "co_mount_oklahoma", name: "Mount Oklahoma", ft: 13843 },
  { id: "co_un_13_838", name: "UN 13,838", ft: 13838 },
  { id: "co_jupiter_mountain", name: "Jupiter Mountain", ft: 13838 },
  { id: "co_turret_peak", name: "Turret Peak", ft: 13837 },
  { id: "co_huerfano_peak", name: "Huerfano Peak", ft: 13837 },
  { id: "co_jagged_mountain", name: "Jagged Mountain", ft: 13833 },
  { id: "co_mount_silverheels", name: "Mount Silverheels", ft: 13828 },
  { id: "co_lackawanna", name: "Lackawanna", ft: 13826 },
  { id: "co_rio_grande_pyramid", name: "Rio Grande Pyramid", ft: 13825 },
  { id: "co_un_13_820", name: "UN 13,820", ft: 13820 },
  { id: "co_arrow_peak", name: "Arrow Peak", ft: 13817 },
  { id: "co_trinity_peak", name: "Trinity Peak", ft: 13816 },
  { id: "co_niagara_peak", name: "Niagara Peak", ft: 13816 },
];
export const CO_CENTENNIAL_PEAKS = CO_14ER_PEAKS.concat(CO_CENTENNIAL_13ER_PEAKS);

// The ADIRONDACK 46: New York's High Peaks as the 1920s survey measured them, kept as the club list
// even where later surveys put four of them under 4,000 ft. Thirty-four were absent and were added by
// 0344, each with its standard trail or herd path; the twelve the catalog held as slide and ice
// climbing areas got their standard route too, so a hiker's log ticks them. MacNaughton, the
// "unofficial 47th", is deliberately absent. East Dix is Grace Peak since 2014.
export const ADK_46_PEAKS = [
  { id: "ny_mount_marcy", name: "Mount Marcy", ft: 5344 },
  { id: "ny_algonquin", name: "Algonquin Peak", ft: 5114 },
  { id: "ny_mount_haystack", name: "Mount Haystack", ft: 4960 },
  { id: "ny_mount_skylight", name: "Mount Skylight", ft: 4924 },
  { id: "ny_whiteface", name: "Whiteface Mountain", ft: 4867 },
  { id: "ny_dix_mtn", name: "Dix Mountain", ft: 4857 },
  { id: "ny_gray_peak", name: "Gray Peak", ft: 4840 },
  { id: "ny_iroquois_peak", name: "Iroquois Peak", ft: 4840 },
  { id: "ny_basin_mountain", name: "Basin Mountain", ft: 4827 },
  { id: "ny_gothics", name: "Gothics", ft: 4736 },
  { id: "ny_mt_colden", name: "Mount Colden", ft: 4714 },
  { id: "ny_giant_mountain", name: "Giant Mountain", ft: 4627 },
  { id: "ny_nipple_top", name: "Nippletop", ft: 4620 },
  { id: "ny_santanoni_peak", name: "Santanoni Peak", ft: 4607 },
  { id: "ny_mount_redfield", name: "Mount Redfield", ft: 4606 },
  { id: "ny_wright_peak", name: "Wright Peak", ft: 4580 },
  { id: "ny_saddleback_mountain", name: "Saddleback Mountain", ft: 4515 },
  { id: "ny_panther_peak", name: "Panther Peak", ft: 4442 },
  { id: "ny_table_top_mountain", name: "Table Top Mountain", ft: 4427 },
  { id: "ny_rocky_peak_ridge", name: "Rocky Peak Ridge", ft: 4420 },
  { id: "ny_macomb_mountain", name: "Macomb Mountain", ft: 4405 },
  { id: "ny_armstrong_mountain", name: "Armstrong Mountain", ft: 4400 },
  { id: "ny_hough_peak", name: "Hough Peak", ft: 4400 },
  { id: "ny_seward_mountain", name: "Seward Mountain", ft: 4361 },
  { id: "ny_mount_marshall", name: "Mount Marshall", ft: 4360 },
  { id: "ny_allen_mountain", name: "Allen Mountain", ft: 4340 },
  { id: "ny_big_slide_mtn", name: "Big Slide Mountain", ft: 4240 },
  { id: "ny_esther_mountain", name: "Esther Mountain", ft: 4240 },
  { id: "ny_upper_wolfjaw_mountain", name: "Upper Wolfjaw Mountain", ft: 4185 },
  { id: "ny_lower_wolfjaw", name: "Lower Wolfjaw Mountain", ft: 4175 },
  { id: "ny_street_mountain", name: "Street Mountain", ft: 4166 },
  { id: "ny_phelps_mountain", name: "Phelps Mountain", ft: 4161 },
  { id: "ny_donaldson_mountain", name: "Donaldson Mountain", ft: 4140 },
  { id: "ny_seymour_mountain", name: "Seymour Mountain", ft: 4120 },
  { id: "ny_sawteeth", name: "Sawteeth", ft: 4100 },
  { id: "ny_cascade_mountain", name: "Cascade Mountain", ft: 4098 },
  { id: "ny_south_dix", name: "South Dix", ft: 4060 },
  { id: "ny_porter_mountain", name: "Porter Mountain", ft: 4059 },
  { id: "ny_mount_colvin", name: "Mount Colvin", ft: 4057 },
  { id: "ny_mount_emmons", name: "Mount Emmons", ft: 4040 },
  { id: "ny_dial_mountain", name: "Dial Mountain", ft: 4020 },
  { id: "ny_grace_peak", name: "Grace Peak", ft: 4012 },
  { id: "ny_blake_peak", name: "Blake Peak", ft: 3960 },
  { id: "ny_cliff_mountain", name: "Cliff Mountain", ft: 3960 },
  { id: "ny_nye_mountain", name: "Nye Mountain", ft: 3895 },
  { id: "ny_couchsachraga_peak", name: "Couchsachraga Peak", ft: 3820 },
];

// The SIERRA PEAKS SECTION list (Sierra Club Angeles Chapter, 29th edition, 2025): 247 active peaks
// in list order — Pilot Knob (S), suspended, is not one. 155 were absent and were added by 0345; the
// list's own (S)/(N) stays on the NAME here so two Mount Stanfords can be told apart in the list.
//
// `also`: a peak whose climbs sit on FACE sub-areas (Half Dome's South Face, Cathedral's Southeast
// Slopes) is a container, and a climb logged on a face carries the face's id, not the peak's. Those
// sub-areas are listed here so peakClimbed() counts them; without it, Snake Dike could never tick
// Half Dome.
export const SPS_PEAKS = [
  { id: "ca_owens_peak", name: "Owens Peak", ft: 8453 },
  { id: "ca_spanish_needle", name: "Spanish Needle", ft: 7841 },
  { id: "ca_lamont_peak", name: "Lamont Peak", ft: 7429 },
  { id: "ca_sawtooth_peak_sierra", name: "Sawtooth Peak", ft: 8000 },
  { id: "ca_rockhouse_peak", name: "Rockhouse Peak", ft: 8360 },
  { id: "ca_taylor_dome", name: "Taylor Dome", ft: 8802 },
  { id: "ca_sirretta_peak", name: "Sirretta Peak", ft: 9977 },
  { id: "ca_crag_peak", name: "Crag Peak", ft: 9480 },
  { id: "ca_smith_mountain", name: "Smith Mountain", ft: 9533 },
  { id: "ca_kern_peak", name: "Kern Peak", ft: 11510 },
  { id: "ca_angora_mountain", name: "Angora Mountain", ft: 10198 },
  { id: "ca_coyote_peaks", name: "Coyote Peaks", ft: 10892 },
  { id: "ca_north_maggie_mountain", name: "North Maggie Mountain", ft: 10234 },
  { id: "ca_moses_mountain", name: "Moses Mountain", ft: 9331 },
  { id: "ca_homers_nose", name: "Homers Nose", ft: 9023 },
  { id: "ca_vandever_mountain", name: "Vandever Mountain", ft: 11947 },
  { id: "ca_florence_peak", name: "Florence Peak", ft: 12432 },
  { id: "ca_sawtooth_peak", name: "Sawtooth Peak (N)", ft: 12343 },
  { id: "ca_needham_mountain", name: "Needham Mountain", ft: 12520 },
  { id: "ca_olancha_peak", name: "Olancha Peak", ft: 12123 },
  { id: "ca_cartago_peak", name: "Cartago Peak", ft: 10480 },
  { id: "ca_muah_mountain", name: "Muah Mountain", ft: 11016 },
  { id: "ca_cirque_peak", name: "Cirque Peak", ft: 12900 },
  { id: "ca_mt_langley", name: "Mount Langley", ft: 14026 },
  { id: "ca_mount_guyot", name: "Mount Guyot", ft: 12300 },
  { id: "ca_joe_devel_peak", name: "Joe Devel Peak", ft: 13327 },
  { id: "ca_mount_pickering", name: "Mount Pickering", ft: 13474 },
  { id: "ca_mt_chamberlin", name: "Mount Chamberlin", ft: 13169 },
  { id: "ca_mount_newcomb", name: "Mount Newcomb", ft: 13422 },
  { id: "ca_mt_hitchcock", name: "Mount Hitchcock", ft: 13186 },
  { id: "ca_mount_corcoran", name: "Mount Corcoran", ft: 13714 },
  { id: "ca_mount_leconte", name: "Mount LeConte", ft: 13930 },
  { id: "ca_mount_mallory", name: "Mount Mallory", ft: 13845 },
  { id: "ca_mt_irvine", name: "Mount Irvine", ft: 13780 },
  { id: "ca_mount_mcadie", name: "Mount McAdie", ft: 13799 },
  { id: "ca_mt_muir", name: "Mount Muir", ft: 14012 },
  { id: "ca_mt_whitney", name: "Mount Whitney", ft: 14491 },
  { id: "ca_thor_peak", name: "Thor Peak", ft: 12306 },
  { id: "ca_lone_pine_peak", name: "Lone Pine Peak", ft: 12943 },
  { id: "ca_mount_young", name: "Mount Young", ft: 13176 },
  { id: "ca_mount_hale", name: "Mount Hale", ft: 13494 },
  { id: "ca_mt_russell", name: "Mount Russell", ft: 14088 },
  { id: "ca_mt_carillon", name: "Mount Carillon", ft: 13517 },
  { id: "ca_tunnabora_peak", name: "Tunnabora Peak", ft: 13563 },
  { id: "ca_mount_barnard", name: "Mount Barnard", ft: 13990 },
  { id: "ca_trojan_peak", name: "Trojan Peak", ft: 13947 },
  { id: "ca_mt_tyndall", name: "Mount Tyndall", ft: 14019 },
  { id: "ca_mt_williamson", name: "Mount Williamson", ft: 14370 },
  { id: "ca_alta_peak", name: "Alta Peak", ft: 11204 },
  { id: "ca_mount_silliman", name: "Mount Silliman", ft: 11188 },
  { id: "ca_mount_eisen", name: "Mount Eisen", ft: 12160 },
  { id: "ca_lippincott_mountain", name: "Lippincott Mountain", ft: 12265 },
  { id: "ca_eagle_scout_peak", name: "Eagle Scout Peak", ft: 12000 },
  { id: "ca_mount_stewart", name: "Mount Stewart", ft: 12200, also: ["ca_main_wall_21", "ca_west_pillar", "ca_mount_stewart_standard_route"] },
  { id: "ca_lion_rock", name: "Lion Rock", ft: 12360 },
  { id: "ca_mount_kaweah", name: "Mount Kaweah", ft: 13802 },
  { id: "ca_red_kaweah", name: "Red Kaweah", ft: 13720 },
  { id: "ca_black_kaweah_the", name: "Black Kaweah", ft: 13720 },
  { id: "ca_picket_guard_peak", name: "Picket Guard Peak", ft: 12303 },
  { id: "ca_kern_point", name: "Kern Point", ft: 12730 },
  { id: "ca_triple_divide_peak", name: "Triple Divide Peak", ft: 12634 },
  { id: "ca_glacier_ridge", name: "Glacier Ridge", ft: 12360 },
  { id: "ca_whaleback", name: "Whaleback", ft: 11717 },
  { id: "ca_milestone_mountain", name: "Milestone Mountain", ft: 13638 },
  { id: "ca_midway_mountain", name: "Midway Mountain", ft: 13665 },
  { id: "ca_table_mountain_sierra", name: "Table Mountain", ft: 13632 },
  { id: "ca_thunder_mountain_sierra", name: "Thunder Mountain", ft: 13517 },
  { id: "ca_south_guard", name: "South Guard", ft: 13232 },
  { id: "ca_mt_brewer", name: "Mount Brewer", ft: 13570 },
  { id: "ca_north_guard", name: "North Guard", ft: 13327 },
  { id: "ca_mount_jordan", name: "Mount Jordan", ft: 13320 },
  { id: "ca_mount_genevra", name: "Mount Genevra", ft: 13054 },
  { id: "ca_mount_ericsson", name: "Mount Ericsson", ft: 13583 },
  { id: "ca_mount_stanford_south", name: "Mount Stanford", ft: 13973 },
  { id: "ca_deerhorn_mountain", name: "Deerhorn Mountain", ft: 13281 },
  { id: "ca_east_vidette", name: "East Vidette", ft: 12356 },
  { id: "ca_west_vidette", name: "West Vidette", ft: 12533 },
  { id: "ca_junction_peak", name: "Junction Peak", ft: 13845 },
  { id: "ca_mount_keith", name: "Mount Keith", ft: 13976 },
  { id: "ca_mount_bradley", name: "Mount Bradley", ft: 13264 },
  { id: "ca_center_peak", name: "Center Peak", ft: 12730 },
  { id: "ca_caltech_peak", name: "Caltech Peak", ft: 13832 },
  { id: "ca_university_peak", name: "University Peak", ft: 13589 },
  { id: "ca_independence_peak", name: "Independence Peak", ft: 11742 },
  { id: "ca_kearsarge_peak", name: "Kearsarge Peak", ft: 12618 },
  { id: "ca_mt_gould", name: "Mount Gould", ft: 13005 },
  { id: "ca_mount_rixford", name: "Mount Rixford", ft: 12887 },
  { id: "ca_mount_bago", name: "Mount Bago", ft: 11870 },
  { id: "ca_mt_gardiner", name: "Mount Gardiner", ft: 12907 },
  { id: "ca_mount_cotter", name: "Mount Cotter", ft: 12713 },
  { id: "ca_mt_clarence_king", name: "Mount Clarence King", ft: 12907 },
  { id: "ca_dragon_peak", name: "Dragon Peak", ft: 12927 },
  { id: "ca_black_mountain_sierra", name: "Black Mountain", ft: 13291 },
  { id: "ca_diamond_peak", name: "Diamond Peak", ft: 13127 },
  { id: "ca_mount_baxter", name: "Mount Baxter", ft: 13136 },
  { id: "ca_colosseum_mountain", name: "Colosseum Mountain", ft: 12473 },
  { id: "ca_mount_perkins", name: "Mount Perkins", ft: 12566 },
  { id: "ca_mount_wynne", name: "Mount Wynne", ft: 13179 },
  { id: "ca_mount_pinchot", name: "Mount Pinchot", ft: 13494 },
  { id: "ca_pyramid_peak_south", name: "Pyramid Peak", ft: 12779 },
  { id: "ca_arrow_peak", name: "Arrow Peak", ft: 12959 },
  { id: "ca_striped_mountain", name: "Striped Mountain", ft: 13179 },
  { id: "ca_goodale_mountain", name: "Goodale Mountain", ft: 12772 },
  { id: "ca_cardinal_mountain", name: "Cardinal Mountain", ft: 13396 },
  { id: "ca_mount_ruskin", name: "Mount Ruskin", ft: 12920 },
  { id: "ca_marion_peak", name: "Marion Peak", ft: 12719 },
  { id: "ca_state_peak", name: "State Peak", ft: 12620 },
  { id: "ca_goat_mountain", name: "Goat Mountain", ft: 12207 },
  { id: "ca_kennedy_mountain", name: "Kennedy Mountain", ft: 11433 },
  { id: "ca_mount_harrington", name: "Mount Harrington", ft: 11009 },
  { id: "ca_tehipite_dome", name: "Tehipite Dome", ft: 7708 },
  { id: "ca_spanish_mountain", name: "Spanish Mountain", ft: 10051 },
  { id: "ca_three_sisters", name: "Three Sisters", ft: 10612 },
  { id: "ca_split_mountain", name: "Split Mountain", ft: 14042 },
  { id: "ca_mount_tinemaha", name: "Mount Tinemaha", ft: 12520 },
  { id: "ca_mount_prater", name: "Mount Prater", ft: 13471 },
  { id: "ca_mount_bolton_brown", name: "Mount Bolton Brown", ft: 13491 },
  { id: "ca_birch_mountain", name: "Birch Mountain", ft: 13602 },
  { id: "ca_the_thumb", name: "The Thumb", ft: 13356 },
  { id: "ca_disappointment_peak", name: "Disappointment Peak", ft: 13917 },
  { id: "ca_middle_palisade", name: "Middle Palisade", ft: 14012 },
  { id: "ca_norman_clyde_peak", name: "Norman Clyde Peak", ft: 13855 },
  { id: "ca_palisade_crest", name: "Palisade Crest", ft: 13553 },
  { id: "ca_observation_peak", name: "Observation Peak", ft: 12362 },
  { id: "ca_giraud_peak", name: "Giraud Peak", ft: 12608 },
  { id: "ca_devils_crag_1", name: "Devil's Crag #1", ft: 12400 },
  { id: "ca_wheel_mountain", name: "Wheel Mountain", ft: 12774 },
  { id: "ca_mount_mcduffie", name: "Mount McDuffie", ft: 13282 },
  { id: "ca_black_giant", name: "Black Giant", ft: 13330 },
  { id: "ca_charybdis", name: "Charybdis", ft: 13096 },
  { id: "ca_scylla", name: "Scylla", ft: 12956 },
  { id: "ca_mount_goddard", name: "Mount Goddard", ft: 13568 },
  { id: "ca_mount_reinstein", name: "Mount Reinstein", ft: 12586 },
  { id: "ca_finger_peak", name: "Finger Peak", ft: 12404 },
  { id: "ca_tunemah_peak", name: "Tunemah Peak", ft: 11894 },
  { id: "ca_temple_crag", name: "Temple Crag", ft: 12976 },
  { id: "ca_mt_gayley", name: "Mount Gayley", ft: 13510 },
  { id: "ca_mt_sill", name: "Mount Sill", ft: 14153 },
  { id: "ca_north_palisade", name: "North Palisade", ft: 14242 },
  { id: "ca_thunderbolt_peak", name: "Thunderbolt Peak", ft: 14003 },
  { id: "ca_mt_winchell", name: "Mount Winchell", ft: 13775 },
  { id: "ca_mt_agassiz", name: "Mount Agassiz", ft: 13893 },
  { id: "ca_mt_goode", name: "Mount Goode", ft: 13085 },
  { id: "ca_cloudripper", name: "Cloudripper", ft: 13525 },
  { id: "ca_mt_johnson", name: "Mount Johnson", ft: 12871 },
  { id: "ca_mt_gilbert", name: "Mount Gilbert", ft: 13106 },
  { id: "ca_mount_thompson", name: "Mount Thompson", ft: 13494 },
  { id: "ca_mount_powell", name: "Mount Powell", ft: 13360 },
  { id: "ca_mount_wallace", name: "Mount Wallace", ft: 13377 },
  { id: "ca_mt_haeckel", name: "Mount Haeckel", ft: 13418 },
  { id: "ca_mount_fiske", name: "Mount Fiske", ft: 13503 },
  { id: "ca_mount_huxley", name: "Mount Huxley", ft: 13086 },
  { id: "ca_mt_darwin", name: "Mount Darwin", ft: 13831 },
  { id: "ca_mount_mendel", name: "Mount Mendel", ft: 13710 },
  { id: "ca_mount_lamarck", name: "Mount Lamarck", ft: 13417 },
  { id: "ca_the_hermit", name: "The Hermit", ft: 12328 },
  { id: "ca_mount_mcgee", name: "Mount McGee", ft: 12944 },
  { id: "ca_emerald_peak", name: "Emerald Peak", ft: 12546 },
  { id: "ca_mount_henry", name: "Mount Henry", ft: 12196 },
  { id: "ca_mount_goethe", name: "Mount Goethe", ft: 13264 },
  { id: "ca_mt_emerson", name: "Mount Emerson", ft: 13204 },
  { id: "ca_mt_humphreys", name: "Mount Humphreys", ft: 13986 },
  { id: "ca_basin_mountain", name: "Basin Mountain", ft: 13181 },
  { id: "ca_four_gables_peak_12_801_peak_12_808", name: "Four Gables", ft: 12720 },
  { id: "ca_mt_tom", name: "Mount Tom", ft: 13652 },
  { id: "ca_pilot_knob", name: "Pilot Knob", ft: 12245 },
  { id: "ca_gemini", name: "Gemini", ft: 12880 },
  { id: "ca_seven_gables", name: "Seven Gables", ft: 13080 },
  { id: "ca_mount_senger", name: "Mount Senger", ft: 12286 },
  { id: "ca_mount_hooper", name: "Mount Hooper", ft: 12349 },
  { id: "ca_merriam_peak", name: "Merriam Peak", ft: 13103 },
  { id: "ca_royce_peak", name: "Royce Peak", ft: 13280 },
  { id: "ca_mt_julius_caesar", name: "Mount Julius Caesar", ft: 13200 },
  { id: "ca_mount_hilgard", name: "Mount Hilgard", ft: 13361 },
  { id: "ca_recess_peak", name: "Recess Peak", ft: 12813 },
  { id: "ca_mount_gabb", name: "Mount Gabb", ft: 13680 },
  { id: "ca_bear_creek_spire", name: "Bear Creek Spire", ft: 13720 },
  { id: "ca_mount_dade", name: "Mount Dade", ft: 13600 },
  { id: "ca_mount_abbot", name: "Mount Abbot", ft: 13704 },
  { id: "ca_mount_mills", name: "Mount Mills", ft: 13451 },
  { id: "ca_mt_morgan_south", name: "Mount Morgan (S)", ft: 13748 },
  { id: "ca_silver_peak", name: "Silver Peak", ft: 11878 },
  { id: "ca_mount_izaak_walton", name: "Mount Izaak Walton", ft: 12077 },
  { id: "ca_red_and_white_mountain", name: "Red and White Mountain", ft: 12816 },
  { id: "ca_red_slate_mountain", name: "Red Slate Mountain", ft: 13123 },
  { id: "ca_mount_stanford_north", name: "Mount Stanford", ft: 12838 },
  { id: "ca_mount_morgan_north", name: "Mount Morgan (N)", ft: 13002 },
  { id: "ca_mount_baldwin", name: "Mount Baldwin", ft: 12615 },
  { id: "ca_mt_morrison", name: "Mount Morrison", ft: 12277, also: ["ca_north_face_9", "ca_torre_de_mierda", "ca_mt_morrison_standard_route"] },
  { id: "ca_bloody_mountain_laurel_lakes_road", name: "Bloody Mountain", ft: 12552 },
  { id: "ca_iron_mountain", name: "Iron Mountain", ft: 11148 },
  { id: "ca_clyde_minaret", name: "Clyde Minaret", ft: 12264 },
  { id: "ca_mt_ritter", name: "Mount Ritter", ft: 13143 },
  { id: "ca_banner_peak", name: "Banner Peak", ft: 12936 },
  { id: "ca_mount_davis", name: "Mount Davis", ft: 12303 },
  { id: "ca_rodgers_peak", name: "Rodgers Peak", ft: 12978 },
  { id: "ca_electra_peak", name: "Electra Peak", ft: 12442 },
  { id: "ca_foerster_peak", name: "Foerster Peak", ft: 12057 },
  { id: "ca_san_joaquin_mountain", name: "San Joaquin Mountain", ft: 11598 },
  { id: "ca_merced_peak", name: "Merced Peak", ft: 11726 },
  { id: "ca_red_peak", name: "Red Peak", ft: 11699 },
  { id: "ca_gray_peak", name: "Gray Peak", ft: 11573 },
  { id: "ca_mt_clark", name: "Mount Clark", ft: 11522 },
  { id: "ca_mount_starr_king", name: "Mount Starr King", ft: 9092, also: ["ca_mount_starr_king_climbs", "ca_jackie_s_gem"] },
  { id: "ca_d_half_dome", name: "Half Dome", ft: 8840, also: ["ca_3_sunshine_buttress", "ca_1_northwest_face", "ca_4_south_face", "ca_2_porcelain_wall", "ca_3_southwest_face", "ca_d_half_dome_cables_route"] },
  { id: "ca_a_clouds_rest", name: "Clouds Rest", ft: 9926, also: ["ca_west_face_18", "ca_a_clouds_rest_trail"] },
  { id: "ca_cathedral_peak_2", name: "Cathedral Peak", ft: 10911, also: ["ca_cathedral_wall", "ca_panic_pillar", "ca_north_buttress_2", "ca_southeast_slopes"] },
  { id: "ca_vogelsang_peak", name: "Vogelsang Peak", ft: 11493 },
  { id: "ca_mount_florence", name: "Mount Florence", ft: 12561 },
  { id: "ca_mount_maclure", name: "Mount Maclure", ft: 12880 },
  { id: "ca_mt_lyell", name: "Mount Lyell", ft: 13114 },
  { id: "ca_koip_peak", name: "Koip Peak", ft: 12962 },
  { id: "ca_mount_gibbs", name: "Mount Gibbs", ft: 12773 },
  { id: "ca_mount_dana_2", name: "Mount Dana", ft: 13057 },
  { id: "ca_mount_warren", name: "Mount Warren", ft: 12327 },
  { id: "ca_mt_conness", name: "Mount Conness", ft: 12590 },
  { id: "ca_north_peak", name: "North Peak", ft: 12242 },
  { id: "ca_excelsior_mountain", name: "Excelsior Mountain", ft: 12446 },
  { id: "ca_dunderberg_peak", name: "Dunderberg Peak", ft: 12374 },
  { id: "ca_virginia_peak", name: "Virginia Peak", ft: 12001 },
  { id: "ca_twin_peaks_sierra", name: "Twin Peaks", ft: 12323 },
  { id: "ca_whorl_mt", name: "Whorl Mountain", ft: 12033 },
  { id: "ca_matterhorn_peak", name: "Matterhorn Peak", ft: 12279 },
  { id: "ca_pettit_peak", name: "Pettit Peak", ft: 10788 },
  { id: "ca_volunteer_peak", name: "Volunteer Peak", ft: 10481 },
  { id: "ca_piute_mountain", name: "Piute Mountain", ft: 10541 },
  { id: "ca_tower_peak", name: "Tower Peak", ft: 11755 },
  { id: "ca_black_hawk_mountain", name: "Black Hawk Mountain", ft: 10348 },
  { id: "ca_leavitt_peak", name: "Leavitt Peak", ft: 11569 },
  { id: "ca_stanislaus_peak", name: "Stanislaus Peak", ft: 11233 },
  { id: "ca_disaster_peak", name: "Disaster Peak", ft: 10047 },
  { id: "ca_highland_peak", name: "Highland Peak", ft: 10935 },
  { id: "ca_mokelumne_peak", name: "Mokelumne Peak", ft: 9334 },
  { id: "ca_round_top", name: "Round Top", ft: 10381 },
  { id: "ca_freel_peak", name: "Freel Peak", ft: 10881 },
  { id: "ca_pyramid_peak_north", name: "Pyramid Peak", ft: 9983 },
  { id: "ca_dicks_peak", name: "Dicks Peak", ft: 9974 },
  { id: "ca_mount_tallac", name: "Mount Tallac", ft: 9735, also: ["ca_ne_bowl", "ca_tallac_headwall", "ca_mount_tallac_trail"] },
  { id: "ca_granite_chief", name: "Granite Chief", ft: 9006 },
  { id: "ca_tinker_knob", name: "Tinker Knob", ft: 8949 },
  { id: "ca_castle_peak_summit", name: "Castle Peak", ft: 9103 },
  { id: "nv_mount_rose", name: "Mount Rose", ft: 10776 },
  { id: "ca_mount_lola", name: "Mount Lola", ft: 9148 },
  { id: "ca_english_mountain", name: "English Mountain", ft: 8373 },
  { id: "ca_sierra_buttes", name: "Sierra Buttes", ft: 8591 },
  { id: "ca_mount_elwell", name: "Mount Elwell", ft: 7818 },
  { id: "ca_adams_peak", name: "Adams Peak", ft: 8197 },
];

export const PEAK_ROSTERS = {
  bulgers: BULGER_PEAKS,
  co14: CO_14ER_PEAKS,
  co_cent: CO_CENTENNIAL_PEAKS,
  adk46: ADK_46_PEAKS,
  sps: SPS_PEAKS,
  ca14: CA_14ER_PEAKS,
  cascade: CASCADE_VOLCANO_PEAKS,
  desert: DESERT_TOWER_PEAKS,
};

// The roster for a named list, or null if it is not a peak list.
export function listPeaks(key) { return PEAK_ROSTERS[key] || null; }

// Has this climber summited the peak? True when ANY logged route sits on it. `mountainId` is the
// field both shapes use — seed routes carry it directly and dbRouteToCamel maps `area_id` onto
// it — so this works for a seed demo and a real catalog alike.
export function peakClimbed(peak, logged) {
  if (!peak || !logged || !logged.length) return false;
  const id = String(peak.id || peak);
  const also = peak.also || [];
  return logged.some(r => { const m = r && String(r.mountainId || ""); return !!m && (m === id || also.indexOf(m) >= 0); });
}
