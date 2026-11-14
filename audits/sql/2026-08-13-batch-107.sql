-- === wa_the_monk_west_cracks_right_crack (The Monk - West Cracks - Right Crack, Cathedral Peak) ===

-- high_point_ft (8606) is identical to the parent area's own elevation_ft (8606) -- Cathedral
-- Peak's true summit -- but this route's own approach text states "The Monk is a distinct,
-- smaller detached tower/buttress leaning against Cathedral Peak's south/east flank, not part
-- of the main South Face wall," and this route's own waypoints already carry the correct
-- topout ("The Monk (tower top)") at 8300 ft. Same defect as most sibling Monk routes fixed in
-- the previous batch (2026-08-12): high_point_ft was evidently copied from the parent peak
-- rather than taken from this route's own recorded topout.
UPDATE routes
SET high_point_ft = 8300
WHERE id = 'wa_the_monk_west_cracks_right_crack';

-- === wa_the_pleiades_scramble (Glacier/Scramble Route, The Pleiades) ===

-- access.land_manager claims some upper routes cross into North Cascades National Park.
-- Mount Larrabee (which The Pleiades sit on the east ridge of) lies west of the NCNP
-- boundary, and this route's own permit field and landManager (camelCase twin) already
-- correctly describe this as entirely Mount Baker Wilderness / USFS land with no NPS permit
-- required -- land_manager (snake_case) is the sole outlier contradicting its own siblings.
UPDATE routes
SET access = jsonb_set(access, '{land_manager}',
  '"Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) -- Mount Baker Wilderness; entirely National Forest land, does not cross into North Cascades National Park."'::jsonb)
WHERE id = 'wa_the_pleiades_scramble';

-- approach_logistics.trailhead names "Tomyhoi Lake Trailhead," but this route's own
-- waypoints[0]/gpx[0]/approach text all start at Twin Lakes (end of FS-3065, 6.5 mi from
-- SR 542) -- Tomyhoi Lake Trailhead is only this route's own washout-contingency fallback
-- 4.5 miles down the same road, not the primary start.
UPDATE routes
SET approach_logistics = jsonb_set(approach_logistics, '{trailhead}', '"Twin Lakes Trailhead"'::jsonb)
WHERE id = 'wa_the_pleiades_scramble';

-- approach_logistics.trailheadDirection is truncated mid-word ("...SR 542 (Mt."). Restored
-- from this route's own untruncated `approach` field, which contains the identical sentence
-- in full.
UPDATE routes
SET approach_logistics = jsonb_set(approach_logistics, '{trailheadDirection}',
  '"From Glacier, WA, drive east about 12 miles on SR 542 (Mt. Baker Highway) to the WSDOT Shuksan maintenance facility, then turn onto Twin Lakes Road (FS-3065)."'::jsonb)
WHERE id = 'wa_the_pleiades_scramble';

-- partner_requirements and seasonal_hazards.{exposure,crevasses} describe "Ptarmigan Ridge,"
-- "Camp Kiser," roped glacier travel and crevasse rescue as required for this route -- that
-- beta belongs to an entirely different Mount Baker massif approach (Artist Point / Chain
-- Lakes / Ptarmigan Ridge Trail), not the Twin Lakes Road/FS-3065 approach this route's own
-- trailhead, gpx, and itinerary actually use. This directly contradicts this same route's own
-- rope_type ("none"), rack ([]), pro_needs ("no traditional rack needed"), gear/what_to_bring
-- (single 30-40m rope for one short section only), and itinerary (a single 9-11hr day with no
-- glacier legs in pitch_detail/waypoints/gpx). Enrichment prose contaminated from an unrelated
-- route -- the pattern CLAUDE.md already documents elsewhere. Replacement text is derived from
-- this same route's own already-sourced, internally-consistent fields (itinerary, gear,
-- hazards), not new claims.
UPDATE routes SET partner_requirements = '{
  "fitnessSpec": {
    "hiking": "strong single-day fitness for a long, sustained scramble - roughly 7.5 miles and 3,200 ft round trip via the Twin Lakes/High Pass Trail approach, at a deliberate pace on loose terrain",
    "packWeight": "day-trip kit - helmet, 30-40m rope and slings for Peak 1''s short roped section, layers, extra water; no glacier or overnight gear required"
  },
  "approachTime": "long single day - about 2 miles of trail (Twin Lakes to High Pass) plus cross-country basin/ridge travel to the Pleiades, typically 9-11 hours car-to-car; not a multi-day approach",
  "requiredSkills": [
    "Class 3-4 scrambling on loose, rotten rock",
    "route-finding on an exposed, unmarked ridge",
    "comfort with sustained exposure and no fixed retreat/rappel line",
    "judgment for fast-moving North Cascades weather"
  ],
  "experienceLevel": "experienced scrambler comfortable with sustained exposure on loose rock and a short roped section on Peak 1; not appropriate for a first alpine scramble"
}'::jsonb
WHERE id = 'wa_the_pleiades_scramble';

UPDATE routes SET seasonal_hazards = jsonb_set(
  jsonb_set(seasonal_hazards, '{exposure}',
    '"Moderate-high: the on-file hazards combine friable, rotten rock on the sustained Class 3-4 ridge scramble with no fixed retreat line - a slip on loose rock is the primary risk, compounded by the on-file risk of rapid weather changes. No glacier travel is involved on this route."'::jsonb),
  '{crevasses}',
  '"Not applicable - this route involves no glacier travel; the approach and climb are entirely on trail, scree, and rock."'::jsonb
)
WHERE id = 'wa_the_pleiades_scramble';

-- === wa_the_rake_traverse_route (Ridge Traverse Route, The Rake) ===

-- areas.lat/lng (48.768, -121.288) places The Rake east of Mount Terror -- the wrong side of
-- the Southern Pickets ridgeline. Confirmed west-to-east ridge order (Terror -> The Rake ->
-- Twin Needles -> Himmelhorn -> Ottohorn) plus Wikipedia/USGS-sourced neighbor coordinates
-- (Terror 48.7743/-121.2996, Twin Needles 48.7767/-121.3125) put the true summit between
-- those two longitudes. This route's own GPX track's final vertex and its own "The Rake"
-- summit waypoint (48.7755, -121.3067, elev 7840, sourced per data_quality.gaps to a public
-- CalTopo map) already land in exactly that gap -- the more precise, geometrically-corroborated
-- point already exists on this row, just never propagated to the area's own placeholder
-- lat/lng (source: "approx-picket-range").
UPDATE areas
SET lat = 48.7755, lng = -121.3067
WHERE id = 'wa_the_rake';

-- === wa_the_roof (The Roof, Unicorn Peak) ===

-- length_m (122, ~400 ft) is internally contradicted by this same route's own pitch_detail[0]
-- (15 m), rappels text ("one rappel of about 50 ft / 15 m"), and descent_text (30-50 ft
-- rappel). Unicorn Peak's summit tower is independently sourced (willhiteweb.com / Mountaineers
-- trip-report snippets, via WebSearch) at only 50-70 ft tall with routes of 40-50 ft -- a 122 m
-- route is not physically possible on this formation. 15 m matches both this route's own
-- pitch_detail and the sourced 40-50 ft figure.
UPDATE routes
SET length_m = 15
WHERE id = 'wa_the_roof';

-- === wa_the_tooth_fairy (The Tooth Fairy, The Tooth) ===

-- emergency.nearestHospital names Harborview Medical Center (downtown Seattle, ~54-56 mi /
-- ~1 hr from Alpental) as the "nearest" hospital. Both sibling routes at this same peak
-- (Northeast Slabs, South Face) correctly list Snoqualmie Valley Hospital (~25 mi / 30-40 min
-- from Alpental via I-90) as nearest, reserving Harborview as the trauma-transfer destination
-- -- this row conflates the two. Snoqualmie Valley Hospital is a real 24/7 ER facility
-- (9801 Frontier Ave SE, Snoqualmie, WA).
UPDATE routes
SET emergency = jsonb_set(emergency, '{nearestHospital}',
  '"Snoqualmie Valley Hospital (24/7 ER), 9801 Frontier Ave SE, Snoqualmie, WA -- roughly 30-40 minutes'' drive from Alpental via I-90"'::jsonb)
WHERE id = 'wa_the_tooth_fairy';

-- === wa_the_triad_east_peak (East Peak / Standard Route, The Triad) ===

-- areas.prominence_ft (822) matches no external source. Peakbagger and Wikipedia's infobox
-- for The Triad both give 760 ft (230 m), corroborated identically across independent
-- WebSearch queries.
UPDATE areas
SET prominence_ft = 760
WHERE id = 'wa_the_triad';

-- routes.grade_num is stored as 0 for a route whose own grade string ("Grade III, Class 4 to
-- 5.4") and rock_grade/pitch_detail both confirm 5.4 as the hardest technical grade. Per this
-- catalog's own grade_num convention (numeric YDS decimal, e.g. 5.4 -> 4 -- see gradeNum() in
-- scripts/pipeline/import-alpine.mjs), this parses to 4, not 0; 0 here is not a deliberate
-- "5.0" sentinel (live grade_num=0 rows elsewhere in the catalog are genuinely graded 5.0/V0).
UPDATE routes
SET grade_num = 4
WHERE id = 'wa_the_triad_east_peak';

-- routes.gain_ft (3920) and loss_ft (5410) disagree on what is an out-and-back car-to-car
-- climb that explicitly reverses the same route back to the same trailhead (per this route's
-- own descent_text) -- accumulated gain must equal accumulated loss on a reversed round trip.
-- This route's own itinerary.days[0] already carries the correct, trip-report-sourced pair
-- (gainFt: 5410, lossFt: 5410, citing a named TR with matching start time and car-to-car
-- duration, independently corroborated via WebSearch). 3920 is simply the straight elevation
-- delta (trailhead 3,600 ft -> summit 7,520 ft), not the accumulated total over Sibley Creek
-- Pass and the glacier crossing -- the top-level column was never synced when the itinerary
-- was corrected.
UPDATE routes
SET gain_ft = 5410
WHERE id = 'wa_the_triad_east_peak';

-- routes.fa is null even though the FA party and year are already stated in prose in this
-- route's own overview/the area's own blurb ("Dick Eilertsen, Dick Lowery, Dick Scales, and
-- Don Wilde, 1949"), independently corroborated via WebSearch (Wikipedia-derived: same four
-- names, same year, "three climbers all named Dick"). Populating the dedicated fa column to
-- match this catalog's normal "Name(s), Year" convention.
UPDATE routes
SET fa = 'Dick Eilertsen, Dick Lowery, Dick Scales, and Don Wilde, 1949'
WHERE id = 'wa_the_triad_east_peak';

-- NOTE: a fifth Triad finding -- areas.parent_peak (null) -> 'wa_eldorado_peak' -- is
-- deliberately NOT included here. Live DB read access degraded partway through this run
-- (every areas query timed out for the second half of this batch, including retries of a
-- previously-working pattern), so the claim that wa_eldorado_peak exists as a row could not
-- be independently confirmed before this file was committed. Writing an unverified area-id
-- reference risks the exact "duplicate flag is a hypothesis" mistake CLAUDE.md already warns
-- against for a different case. See wa-alpine-audit-log.md for the full sourcing (Peakbagger/
-- Wikipedia agree Eldorado Peak is The Triad's line parent) -- flagged for human confirmation
-- that wa_eldorado_peak is a live area id before writing:
--   UPDATE areas SET parent_peak = 'wa_eldorado_peak' WHERE id = 'wa_the_triad';
