// The 18 WA alpine routes whose trailhead card does not render, adjudicated.
//
// RULE, and it is the whole reason this is safe: the trailhead IDENTITY comes from the
// route's OWN approach prose, never from its neighbours. `audit:trailhead-agreement`'s
// header records four times a peer-majority guess was wrong (Alpental/Rainier "Snow Lake",
// Esmeralda, Goodell Creek, wa_early_winter_couloir — whose own prose says the consensus
// trailhead is "the wrong side of the mountain for this route"). Kyes Peak below is a live
// instance: its NE Ridge starts at Quartz Creek while its only peer starts at Blanca Lake,
// and the peer is not wrong about ITS route.
//
// A COORDINATE may be borrowed from a peer, but only when that peer names the SAME trailhead
// the prose already named. That is a name -> lat/lng lookup for one physical place, not a
// guess about which place. `coordFrom` records which row it came from; entries without one
// write a name and no coordinate, which still renders the card (TrailheadCard returns null
// only when name AND coord are both absent).
//
// WE WRITE approach_logistics ONLY — never a waypoints[] pin. approach_logistics is
// prose-derived and the pin is independent, and that independence is exactly what
// audit:trailhead-agreement compares. Writing both from this one source would manufacture an
// agreement and blind the audit on these rows. None of these routes has a pin today, so
// there is nothing to disagree with and nothing to clobber.

export const WRITE = [
  { id: "wa_icy_peak_ruth_icy_traverse", area: "Icy Peak",
    trailhead: "Hannegan Trailhead / Campground (Hannegan Pass Road, FR 32)",
    direction: "From the Hannegan Trailhead and campground at the end of Ruth Creek Road (FR 32, ~3,100 ft), reached off the Mt. Baker Highway (SR 542); the Hannegan Pass Trail climbs about 4 miles to Hannegan Pass before the traverse over Ruth Mountain begins.",
    must: ["Hannegan", "Ruth Creek", "32", "3,100"],
    coord: [48.91049444, -121.5894222], coordFrom: "wa_icy_peak_southwest_route" },

  { id: "wa_mount_sefrit_southeast_ridge", area: "Mount Sefrit",
    trailhead: "Hannegan Campground (Ruth Creek Road, FS 32)",
    direction: "From the Hannegan Campground pullout at the end of Ruth Creek Road (~2,950 ft), off Hannegan Pass Road (FS 32) from the Mt. Baker Highway; the route crosses Ruth Creek and bushwhacks to the base of the Wall Street couloir rather than following the pass trail.",
    must: ["Hannegan", "Ruth Creek", "32", "2,950", "Wall Street"],
    coord: [48.91049444, -121.5894222], coordFrom: "wa_mount_sefrit_bloody_head_couloir" },

  { id: "wa_spider_mountain_north_ridge", area: "Spider Mountain",
    trailhead: "Cascade Pass Trailhead (end of Cascade River Road)",
    direction: "From the Cascade Pass Trailhead at ~3,600 ft, at the end of the 23.1-mile Cascade River Road from Marblemount; the approach runs over Cascade Pass and Cache Col into the Kool-Aid Lake basin.",
    must: ["Cascade Pass", "3,600", "23.1", "Marblemount", "Cache Col", "Kool-Aid"],
    coord: [48.475497, -121.075031], coordFrom: "wa_spider_mountain_north_face" },

  { id: "wa_mount_daniel_lynch_glacier", area: "Mount Daniel",
    trailhead: "Deception Pass Trailhead",
    direction: "From the Deception Pass Trailhead, via Marmot and Jade Lakes to Dip Top Gap, then west to the shoulder above the Foss River drainage.",
    must: ["Deception Pass", "Marmot", "Jade", "Dip Top"],
    coord: [47.5435, -121.0966], coordFrom: "wa_mount_daniel_daniel_glacier" },

  { id: "wa_tenpeak_mountain_north_couloir", area: "Tenpeak Mountain",
    trailhead: "White River Trailhead (FR-6400, Lake Wenatchee)",
    direction: "From the White River Trailhead, as for the Southeast Route, reaching the Honeycomb Glacier via the PCT and the upper Whitechuck/Suiattle basin.",
    must: ["White River", "Honeycomb", "PCT"],
    coord: [47.9628, -120.94501], coordFrom: "wa_tenpeak_mountain_southeast" },

  { id: "wa_austera_peak_chockstone_route", area: "Austera Peak",
    trailhead: "Eldorado Creek trailhead (Cascade River Road)",
    direction: "From the Cascade River Road trailhead, roughly 7 miles and 6,000 ft of gain to a high camp on the East Ridge of Eldorado, then across the Inspiration, McAllister and Klawatti Glaciers to the rock tower.",
    must: ["Cascade River Road", "Eldorado", "Inspiration", "Klawatti"],
    coord: [48.49261, -121.11761], coordFrom: "wa_austera_peak_southwest_ridge" },

  { id: "wa_dark_side_of_liberty", area: "Liberty Bell Mountain",
    trailhead: "SR-20 hairpin / pond pullout (east of Washington Pass)",
    direction: "Park at the hairpin turn on WA-20 east of Washington Pass and follow the cairned path from the pond toward the East Face, then contour onto the northeast aspect — the shortest approach of the major Liberty Bell lines.",
    must: ["hairpin", "Washington Pass", "pond", "East Face", "northeast"],
    coord: [48.51454, -120.64332], coordFrom: "wa_liberty_crack" },

  { id: "wa_live_free_or_die", area: "Liberty Bell Mountain",
    trailhead: "SR-20 hairpin / pond pullout (east of Washington Pass)",
    direction: "The East Face approach as for Liberty Crack: park at the hairpin turn on WA-20 east of Washington Pass, walk back to the pond, and follow the cairned climbers' path about a mile to the talus below the East Face.",
    must: ["hairpin", "Washington Pass", "pond", "Liberty Crack", "East Face"],
    coord: [48.51454, -120.64332], coordFrom: "wa_liberty_crack" },

  { id: "wa_silver_star_ne_ridge", area: "Silver Star Mountain",
    trailhead: "SR-20 pullout near milepost 165-166 (Silver Star / Wine Spires)",
    direction: "As for the Silver Star Glacier route — see that route for the full trailhead-to-glacier detail — to Burgundy Col and onto the glacier, then trending to the northeast side of the west summit.",
    must: ["Silver Star Glacier", "Burgundy Col", "northeast"],
    coord: [48.549, -120.630965], coordFrom: "wa_silver_star_glacier" },

  { id: "wa_mount_shuksan_northeast_ridge", area: "Mount Shuksan",
    trailhead: "White Salmon Day-Lodge area (FR-3075, Mt. Baker Ski Area)",
    direction: "No independent start: the ridge is typically gained after climbing the North Face or Hanging Glacier route to the upper mountain, or via the NW Rib — both of those start from the White Salmon day-lodge area.",
    must: ["North Face", "Hanging Glacier", "NW Rib"],
    coord: [48.8595, -121.648], coordFrom: "wa_mount_shuksan_north_face" },

  // --- name only: the prose names a trailhead no peer on this peak shares, so there is no
  // --- coordinate to borrow without guessing. The card renders on the name alone.
  { id: "wa_kyes_peak_northeast_ridge", area: "Kyes Peak",
    trailhead: "North Fork Sauk River / Quartz Creek Trailhead",
    direction: "From the North Fork Sauk River / Quartz Creek Trailhead (Darrington Ranger District), about 4 miles and 1,450 ft up the Quartz Creek Trail to Curry Gap, then southwest along the ridge and across the Pride Glacier. Note this is NOT the Blanca Lake approach used by the peak's scramble route.",
    must: ["Quartz Creek", "Curry Gap", "Pride Glacier", "1,450"],
    coord: null, coordFrom: null },

  { id: "wa_booker_mountain_northeast_face", area: "Booker Mountain",
    trailhead: "Colonial Creek Campground (Thunder Creek Trail)",
    direction: "A multi-day approach from the Thunder Creek Trail out of Colonial Creek Campground toward Park Creek Pass, camping near the base of the face for an alpine start.",
    must: ["Thunder Creek", "Colonial Creek", "Park Creek Pass"],
    coord: null, coordFrom: null },

  { id: "wa_phantom_peak_west_ridge", area: "Phantom Peak",
    trailhead: "Hannegan Pass Trailhead",
    direction: "A two-day approach: about 10 miles over Hannegan Pass, wading the Chilliwack River, along Easy Ridge and the Imperfect Impasse, through Perfect Pass and over the Challenger Glacier to a bivy under Ghost Peak.",
    must: ["Hannegan Pass", "Chilliwack", "Easy Ridge", "Perfect Pass", "Challenger"],
    coord: null, coordFrom: null },
];

// Left alone, each for a reason ON THE ROW. These stay gaps, and the app already says so
// with its "No approach description" / absent-card state rather than inventing one.
export const LEAVE = [
  { id: "wa_east_twin_needle_thread_of_ice",
    why: "Its own prose says it outright: 'specific trailhead-to-base beta beyond the first-ascent account has not been published.' The peer's Goodell Creek start is the SOUTH approach this route explicitly does not use." },
  { id: "wa_dome_peak_indian_summer",
    why: "Prose describes a western Ptarmigan Traverse approach toward Spire Point; the only peer names Downey Creek. Those are different trailheads and the prose names none, so any pick is a guess." },
  { id: "wa_mount_spickard_silver_glacier",
    why: "Prose gives TWO real starts — a Ross Lake water-taxi drop at Silver Creek, and the Depot Creek approach. Pinning one would assert a choice the route does not make." },
  { id: "wa_american_border_peak_northeast_face",
    why: "Zero approach prose. Only a peer (Twin Lakes) suggests a start, and a peer alone is the hypothesis that has already been wrong four times." },
  { id: "wa_old_guard_peak_east_side_route",
    why: "Zero approach prose. Same as above — only a peer (Cascade Pass) to go on." },
];
