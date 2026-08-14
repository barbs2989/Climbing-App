// Researched peak rosters, kept OUT of lib/lists.js until they are proven to resolve against the
// catalog. Names and elevations only — no route names, because these are PEAK lists and the tick
// is the summit (see the note in lib/lists.js).

// The 53 RANKED Colorado fourteeners: over 14,000 ft with at least 300 ft of topographic
// prominence. Colorado has 58 named 14,000 ft summits; the other five are subsummits and are
// deliberately excluded, because 53 is the number the Challenges card advertises.
export const CO_14ERS = [
  { name: "Mount Elbert", ft: 14440 }, { name: "Mount Massive", ft: 14428 },
  { name: "Mount Harvard", ft: 14421 }, { name: "Blanca Peak", ft: 14351 },
  { name: "La Plata Peak", ft: 14343 }, { name: "Uncompahgre Peak", ft: 14321 },
  { name: "Crestone Peak", ft: 14300 }, { name: "Mount Lincoln", ft: 14293 },
  { name: "Castle Peak", ft: 14279 }, { name: "Grays Peak", ft: 14278 },
  { name: "Mount Antero", ft: 14276 }, { name: "Torreys Peak", ft: 14275 },
  { name: "Quandary Peak", ft: 14271 }, { name: "Mount Blue Sky", ft: 14271 },
  { name: "Longs Peak", ft: 14259 }, { name: "Mount Wilson", ft: 14252 },
  { name: "Mount Shavano", ft: 14231 }, { name: "Mount Princeton", ft: 14204 },
  { name: "Mount Belford", ft: 14203 }, { name: "Crestone Needle", ft: 14203 },
  { name: "Mount Yale", ft: 14200 }, { name: "Mount Bross", ft: 14178 },
  { name: "Kit Carson Mountain", ft: 14171 }, { name: "Maroon Peak", ft: 14163 },
  { name: "Tabeguache Peak", ft: 14162 }, { name: "Mount Oxford", ft: 14160 },
  { name: "Mount Sneffels", ft: 14158 }, { name: "Mount Democrat", ft: 14155 },
  { name: "Capitol Peak", ft: 14137 }, { name: "Pikes Peak", ft: 14115 },
  { name: "Snowmass Mountain", ft: 14099 }, { name: "Windom Peak", ft: 14093 },
  { name: "Mount Eolus", ft: 14090 }, { name: "Challenger Point", ft: 14087 },
  { name: "Mount Columbia", ft: 14077 }, { name: "Missouri Mountain", ft: 14074 },
  { name: "Humboldt Peak", ft: 14070 }, { name: "Mount Bierstadt", ft: 14065 },
  { name: "Sunlight Peak", ft: 14065 }, { name: "Handies Peak", ft: 14058 },
  { name: "Culebra Peak", ft: 14053 }, { name: "Ellingwood Point", ft: 14048 },
  { name: "Mount Lindsey", ft: 14048 }, { name: "Little Bear Peak", ft: 14043 },
  { name: "Mount Sherman", ft: 14043 }, { name: "Redcloud Peak", ft: 14041 },
  { name: "Pyramid Peak", ft: 14025 }, { name: "Wilson Peak", ft: 14023 },
  { name: "San Luis Peak", ft: 14022 }, { name: "Wetterhorn Peak", ft: 14021 },
  { name: "Mount of the Holy Cross", ft: 14011 }, { name: "Huron Peak", ft: 14010 },
  { name: "Sunshine Peak", ft: 14007 },
];

// The 12 ranked California fourteeners. Note Mount Shasta is a Cascade volcano, not Sierra.
export const CA_14ERS = [
  { name: "Mount Whitney", ft: 14505 }, { name: "Mount Williamson", ft: 14379 },
  { name: "White Mountain Peak", ft: 14252 }, { name: "North Palisade", ft: 14248 },
  { name: "Mount Shasta", ft: 14179 }, { name: "Mount Sill", ft: 14159 },
  { name: "Mount Russell", ft: 14094 }, { name: "Split Mountain", ft: 14064 },
  { name: "Mount Langley", ft: 14032 }, { name: "Mount Tyndall", ft: 14025 },
  { name: "Mount Muir", ft: 14018 }, { name: "Middle Palisade", ft: 14018 },
];

// The principal Cascade stratovolcanoes, north to south. The Challenges card advertises 18, but
// that number is not canonical — the arc holds roughly 20 major volcanoes plus ~2,900 minor
// features, and no published roster fixes it at 18. This is the set climbers actually tick: the
// named stratovolcanoes with a summit worth climbing. Recorded as a judgement, not as a citation.
export const CASCADE_VOLCANOES = [
  { name: "Mount Baker", state: "washington", ft: 10781 },
  { name: "Glacier Peak", state: "washington", ft: 10541 },
  { name: "Mount Rainier", state: "washington", ft: 14411 },
  { name: "Mount St. Helens", state: "washington", ft: 8363 },
  { name: "Mount Adams", state: "washington", ft: 12276 },
  { name: "Mount Hood", state: "oregon", ft: 11249 },
  { name: "Mount Jefferson", state: "oregon", ft: 10497 },
  { name: "Three Fingered Jack", state: "oregon", ft: 7841 },
  { name: "Mount Washington", state: "oregon", ft: 7795 },
  { name: "North Sister", state: "oregon", ft: 10090 },
  { name: "Middle Sister", state: "oregon", ft: 10047 },
  { name: "South Sister", state: "oregon", ft: 10358 },
  { name: "Broken Top", state: "oregon", ft: 9177 },
  { name: "Mount Bachelor", state: "oregon", ft: 9068 },
  { name: "Mount Thielsen", state: "oregon", ft: 9184 },
  { name: "Mount McLoughlin", state: "oregon", ft: 9495 },
  { name: "Mount Shasta", state: "california", ft: 14179 },
  { name: "Lassen Peak", state: "california", ft: 10457 },
];

// Named desert towers of the Moab / Castle Valley / Fisher Towers / Indian Creek / Canyonlands
// area. The Challenges card advertises 30, and like the Cascade 18 that number is NOT canonical —
// no published roster fixes it. These are the named formations that are actually climbed, so the
// tick is "have you summited this tower", exactly as for a peak list.
//
// Unlike the fourteener lists, this one plays to the catalog's strength: a desert tower IS a
// climbing formation, so it exists as an area with routes rather than being absent the way a
// walk-up fourteener is.
export const DESERT_TOWERS = [
  { name: "Castleton Tower", state: "utah" }, { name: "The Rectory", state: "utah" },
  { name: "The Priest", state: "utah" }, { name: "Sister Superior", state: "utah" },
  { name: "Lighthouse Tower", state: "utah" }, { name: "The Titan", state: "utah" },
  { name: "Ancient Art", state: "utah" }, { name: "Echo Tower", state: "utah" },
  { name: "Cottontail Tower", state: "utah" }, { name: "The Kingfisher", state: "utah" },
  { name: "North Six Shooter", state: "utah" }, { name: "South Six Shooter", state: "utah" },
  { name: "Moses", state: "utah" }, { name: "Zeus", state: "utah" },
  { name: "Aphrodite", state: "utah" }, { name: "Standing Rock", state: "utah" },
  { name: "Washer Woman", state: "utah" }, { name: "Monster Tower", state: "utah" },
  { name: "Charlie Horse Needle", state: "utah" }, { name: "Dark Angel", state: "utah" },
  { name: "Owl Rock", state: "utah" }, { name: "Argon Tower", state: "utah" },
  { name: "Determination Tower", state: "utah" }, { name: "Sunflower Tower", state: "utah" },
  { name: "Easter Island", state: "utah" }, { name: "King of Pain", state: "utah" },
  { name: "Thumbelina", state: "utah" }, { name: "Eagle Rock Spire", state: "utah" },
  { name: "The Nuns", state: "utah" }, { name: "Corral Spire", state: "utah" },
];

// The 46 Adirondack High Peaks (New York) and the New England 4,000-footers are both canonical
// rosters, but they are NOT included here. Measured first, as the Colorado lesson requires: the
// eastern trees in this catalog are crag trees too, so a hiking-peak roster would resolve to
// almost nothing and would ship a list of names with no climbs behind them. Left for a peak
// import rather than filled badly.

// The highest point of each of the 50 states. `state` is the ltree label the catalog uses, so it
// can disambiguate the many repeated names (Black Mountain, Castle Peak).
//
// Many of these are NOT climbs — Britton Hill is 345 ft and Ebright Azimuth is a roadside marker.
// They are kept in the roster because the list is "the highest point of each state" and dropping
// the flat ones would misstate it; whether the catalog holds them is a separate question this
// resolver answers rather than assumes.
export const STATE_HIGHPOINTS = [
  { name: "Cheaha Mountain", state: "alabama", ft: 2405 }, { name: "Denali", state: "alaska", ft: 20310 },
  { name: "Humphreys Peak", state: "arizona", ft: 12637 }, { name: "Mount Magazine", state: "arkansas", ft: 2753 },
  { name: "Mount Whitney", state: "california", ft: 14505 }, { name: "Mount Elbert", state: "colorado", ft: 14440 },
  { name: "Mount Frissell", state: "connecticut", ft: 2386 }, { name: "Ebright Azimuth", state: "delaware", ft: 449 },
  { name: "Britton Hill", state: "florida", ft: 345 }, { name: "Brasstown Bald", state: "georgia", ft: 4784 },
  { name: "Mauna Kea", state: "hawaii", ft: 13803 }, { name: "Borah Peak", state: "idaho", ft: 12668 },
  { name: "Charles Mound", state: "illinois", ft: 1235 }, { name: "Hoosier Hill", state: "indiana", ft: 1257 },
  { name: "Hawkeye Point", state: "iowa", ft: 1671 }, { name: "Mount Sunflower", state: "kansas", ft: 4041 },
  { name: "Black Mountain", state: "kentucky", ft: 4139 }, { name: "Driskill Mountain", state: "louisiana", ft: 535 },
  { name: "Mount Katahdin", state: "maine", ft: 5270 }, { name: "Hoye-Crest", state: "maryland", ft: 3370 },
  { name: "Mount Greylock", state: "massachusetts", ft: 3489 }, { name: "Mount Arvon", state: "michigan", ft: 1979 },
  { name: "Eagle Mountain", state: "minnesota", ft: 2302 }, { name: "Woodall Mountain", state: "mississippi", ft: 807 },
  { name: "Taum Sauk Mountain", state: "missouri", ft: 1772 }, { name: "Granite Peak", state: "montana", ft: 12807 },
  { name: "Panorama Point", state: "nebraska", ft: 5432 }, { name: "Boundary Peak", state: "nevada", ft: 13147 },
  { name: "Mount Washington", state: "new_hampshire", ft: 6285 }, { name: "High Point", state: "new_jersey", ft: 1802 },
  { name: "Wheeler Peak", state: "new_mexico", ft: 13167 }, { name: "Mount Marcy", state: "new_york", ft: 5343 },
  { name: "Mount Mitchell", state: "north_carolina", ft: 6684 }, { name: "White Butte", state: "north_dakota", ft: 3506 },
  { name: "Campbell Hill", state: "ohio", ft: 1548 }, { name: "Black Mesa", state: "oklahoma", ft: 4975 },
  { name: "Mount Hood", state: "oregon", ft: 11249 }, { name: "Mount Davis", state: "pennsylvania", ft: 3213 },
  { name: "Jerimoth Hill", state: "rhode_island", ft: 811 }, { name: "Sassafras Mountain", state: "south_carolina", ft: 3554 },
  { name: "Black Elk Peak", state: "south_dakota", ft: 7244 }, { name: "Kuwohi", state: "tennessee", ft: 6643 },
  { name: "Guadalupe Peak", state: "texas", ft: 8751 }, { name: "Kings Peak", state: "utah", ft: 13534 },
  { name: "Mount Mansfield", state: "vermont", ft: 4395 }, { name: "Mount Rogers", state: "virginia", ft: 5711 },
  { name: "Mount Rainier", state: "washington", ft: 14411 }, { name: "Spruce Knob", state: "west_virginia", ft: 4862 },
  { name: "Timms Hill", state: "wisconsin", ft: 1951 }, { name: "Gannett Peak", state: "wyoming", ft: 13809 },
];

// The highest point of each of the 63 US national parks.
//
// Many are not climbs at all — Everglades' highpoint is 10 ft, Gateway Arch's is 470 ft — and
// several are unnamed benchmarks ("Billings Benchmark Southeast", "BCG Public Land highpoint")
// that no climbing catalog will ever hold. They stay in the roster because the list is "the
// highest point of each national park" and dropping the flat ones would misstate it; whether the
// catalog holds them is the resolver's question, not the roster's.
//
// A handful ARE serious objectives, and they are why this list belongs in a climbing app at all:
// Goode Mountain (North Cascades) is a technical rock climb, Mt Fairweather and Mt St Elias are
// glacier expeditions.
export const NP_HIGHPOINTS = [
  { name: "Denali", state: "alaska", ft: 20310 }, { name: "Mount Saint Elias", state: "alaska", ft: 18008 },
  { name: "Mount Fairweather", state: "alaska", ft: 15325 }, { name: "Mount Whitney", state: "california", ft: 14498 },
  { name: "Mount Rainier", state: "washington", ft: 14411 }, { name: "Longs Peak", state: "colorado", ft: 14255 },
  { name: "North Palisade", state: "california", ft: 14242 }, { name: "Grand Teton", state: "wyoming", ft: 13770 },
  { name: "Mauna Loa", state: "hawaii", ft: 13679 }, { name: "Mount Lyell", state: "california", ft: 13114 },
  { name: "Wheeler Peak", state: "nevada", ft: 13063 }, { name: "Eagle Peak", state: "wyoming", ft: 11367 },
  { name: "Telescope Peak", state: "california", ft: 11048 }, { name: "Mount Cleveland", state: "montana", ft: 10466 },
  { name: "Lassen Peak", state: "california", ft: 10457 }, { name: "Redoubt Volcano", state: "alaska", ft: 10197 },
  { name: "Haleakala", state: "hawaii", ft: 10023 }, { name: "Goode Mountain", state: "washington", ft: 9200 },
  { name: "Rainbow Point", state: "utah", ft: 9115 }, { name: "Mount Scott", state: "oregon", ft: 8929 },
  { name: "Guadalupe Peak", state: "texas", ft: 8749 }, { name: "Horse Ranch Mountain", state: "utah", ft: 8726 },
  { name: "Mica Mountain", state: "arizona", ft: 8664 }, { name: "Mount Igikpak", state: "alaska", ft: 8276 },
  { name: "Mount Olympus", state: "washington", ft: 7969 }, { name: "Emory Peak", state: "texas", ft: 7825 },
  { name: "Mount Griggs", state: "alaska", ft: 7600 }, { name: "Clingmans Dome", state: "tennessee", ft: 6643 },
  { name: "McCarty Peak", state: "alaska", ft: 6400 }, { name: "Pilot Rock", state: "arizona", ft: 6234 },
  { name: "Quail Mountain", state: "california", ft: 5813 }, { name: "Elephant Butte", state: "utah", ft: 5653 },
  { name: "Rankin Ridge", state: "south_dakota", ft: 5013 }, { name: "Mount Angayukaqsraq", state: "alaska", ft: 4700 },
  { name: "Hawksbill", state: "virginia", ft: 4050 }, { name: "Red Shirt Table", state: "south_dakota", ft: 3340 },
  { name: "North Chalone Peak", state: "california", ft: 3304 }, { name: "Lata Mountain", state: "american_samoa", ft: 3169 },
  { name: "Peck Hill", state: "north_dakota", ft: 2860 }, { name: "Grandview", state: "west_virginia", ft: 2517 },
  { name: "El Montanon", state: "california", ft: 1808 }, { name: "Cadillac Mountain", state: "maine", ft: 1528 },
  { name: "Music Mountain", state: "arkansas", ft: 1400 }, { name: "Mount Desor", state: "michigan", ft: 1394 },
  { name: "Bordeaux Mountain", state: "virgin_islands", ft: 1286 }, { name: "Cave Ridge", state: "kentucky", ft: 920 },
  { name: "Grossman Hammock", state: "florida", ft: 10 },
];

// The Adirondack 46 High Peaks (New York) — the Marshall/Marshall/Clark roster the Adirondack
// Forty-Sixers recognise. CANONICAL: the list has never been revised, and two independent sources
// agree on all 46 names.
//
// Three traps a matcher must not fall into, each from the source rather than assumed:
//   * DO NOT FILTER BY ELEVATION. Four of the 46 — Blake, Cliff, Nye, Couchsachraga — are BELOW
//     4,000 ft by modern survey and are still on the list, because the list is historical rather
//     than a live elevation query.
//   * MacNaughton Mountain (4,000 ft) is NOT one of the 46 despite being higher than those four.
//     It is widely called the "unofficial 47th". If the catalog holds it, it must not tick this.
//   * East Dix was officially renamed GRACE PEAK in 2014, so a catalog built from older data holds
//     the old name. Handled by ALIASES in the resolver, not by weakening the matcher.
export const ADK_46 = [
  { name: "Mount Marcy", state: "new_york", ft: 5344 }, { name: "Algonquin Peak", state: "new_york", ft: 5114 },
  { name: "Mount Haystack", state: "new_york", ft: 4960 }, { name: "Mount Skylight", state: "new_york", ft: 4924 },
  { name: "Whiteface Mountain", state: "new_york", ft: 4867 }, { name: "Dix Mountain", state: "new_york", ft: 4857 },
  { name: "Gray Peak", state: "new_york", ft: 4840 }, { name: "Iroquois Peak", state: "new_york", ft: 4840 },
  { name: "Basin Mountain", state: "new_york", ft: 4827 }, { name: "Gothics", state: "new_york", ft: 4736 },
  { name: "Mount Colden", state: "new_york", ft: 4714 }, { name: "Giant Mountain", state: "new_york", ft: 4627 },
  { name: "Nippletop", state: "new_york", ft: 4620 }, { name: "Santanoni Peak", state: "new_york", ft: 4607 },
  { name: "Mount Redfield", state: "new_york", ft: 4606 }, { name: "Wright Peak", state: "new_york", ft: 4580 },
  { name: "Saddleback Mountain", state: "new_york", ft: 4515 }, { name: "Panther Peak", state: "new_york", ft: 4442 },
  { name: "Table Top Mountain", state: "new_york", ft: 4427 }, { name: "Rocky Peak Ridge", state: "new_york", ft: 4420 },
  { name: "Macomb Mountain", state: "new_york", ft: 4405 }, { name: "Armstrong Mountain", state: "new_york", ft: 4400 },
  { name: "Hough Peak", state: "new_york", ft: 4400 }, { name: "Seward Mountain", state: "new_york", ft: 4361 },
  { name: "Mount Marshall", state: "new_york", ft: 4360 }, { name: "Allen Mountain", state: "new_york", ft: 4340 },
  { name: "Big Slide Mountain", state: "new_york", ft: 4240 }, { name: "Esther Mountain", state: "new_york", ft: 4240 },
  { name: "Upper Wolfjaw Mountain", state: "new_york", ft: 4185 }, { name: "Lower Wolfjaw Mountain", state: "new_york", ft: 4175 },
  { name: "Street Mountain", state: "new_york", ft: 4166 }, { name: "Phelps Mountain", state: "new_york", ft: 4161 },
  { name: "Donaldson Mountain", state: "new_york", ft: 4140 }, { name: "Seymour Mountain", state: "new_york", ft: 4120 },
  { name: "Sawteeth", state: "new_york", ft: 4100 }, { name: "Cascade Mountain", state: "new_york", ft: 4098 },
  { name: "South Dix", state: "new_york", ft: 4060 }, { name: "Porter Mountain", state: "new_york", ft: 4059 },
  { name: "Mount Colvin", state: "new_york", ft: 4057 }, { name: "Mount Emmons", state: "new_york", ft: 4040 },
  { name: "Dial Mountain", state: "new_york", ft: 4020 }, { name: "Grace Peak", state: "new_york", ft: 4012 },
  { name: "Blake Peak", state: "new_york", ft: 3960 }, { name: "Cliff Mountain", state: "new_york", ft: 3960 },
  { name: "Nye Mountain", state: "new_york", ft: 3895 }, { name: "Couchsachraga Peak", state: "new_york", ft: 3820 },
];

// The Idaho 12ers — CANONICAL. "The nine Idaho 12ers" is a fixed phrase; Tom Lopez's IDAHO: A
// Climbing Guide (the standard reference) and idahotwelvers.com give the same nine names in the
// same order. Seven are in the Lost River Range, one Lemhi (Diamond), one Pioneer (Hyndman).
//
// Two matcher traps: Old Hyndman Peak (11,775 ft) is a SEPARATE adjacent summit and is not a
// 12er, so a fuzzy match must not reach it; and Donaldson Peak here collides by name with
// Donaldson Mountain in ADK_46 above, which is exactly why the resolver's state gate is
// fail-closed rather than falling back to an out-of-state candidate.
export const IDAHO_12ERS = [
  { name: "Borah Peak", state: "idaho", ft: 12662 }, { name: "Leatherman Peak", state: "idaho", ft: 12228 },
  { name: "Mount Church", state: "idaho", ft: 12200 }, { name: "Diamond Peak", state: "idaho", ft: 12197 },
  { name: "Mount Breitenbach", state: "idaho", ft: 12140 }, { name: "Lost River Mountain", state: "idaho", ft: 12078 },
  { name: "Mount Idaho", state: "idaho", ft: 12065 }, { name: "Donaldson Peak", state: "idaho", ft: 12023 },
  { name: "Hyndman Peak", state: "idaho", ft: 12009 },
];
