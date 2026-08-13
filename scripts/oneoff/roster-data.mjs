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
