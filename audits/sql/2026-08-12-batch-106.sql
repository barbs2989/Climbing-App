-- === wa_the_brothers_traverse (Brothers Traverse, The Brothers) ===

-- ice_grade claims "AI3 (Mountain Project: Ice 3)" but Mountain Project's actual published
-- grade for this route is III, 5.4, AI2 (Grade III overall, 5.4 rock, AI2 snow/ice up to 70
-- degrees) -- corroborated independently via Mountain Project's own route-page content and
-- echoed on The Mountaineers' page for the same climb. The stored value cites Mountain
-- Project as its source but reports a grade one full step harder than what Mountain Project
-- actually lists.
UPDATE routes
SET ice_grade = 'AI2 (Mountain Project)'
WHERE id = 'wa_the_brothers_traverse';

-- areas.elevation_ft (6868) matches no source found for The Brothers and disagrees with this
-- same route's own high_point_ft (6866). 6,866 ft is the figure used by the land manager
-- itself (USDA Forest Service, Brothers Wilderness page), WTA, and The Mountaineers -- all
-- independently agreeing. (An older NGS/NGVD29 survey figure of 6,842 ft is also in
-- circulation via Wikipedia/SummitPost -- a distinct, older-datum number, not 6,868; nothing
-- supports 6,868 specifically.) Correcting to 6,866 also resolves the in-row inconsistency
-- with routes.high_point_ft.
UPDATE areas
SET elevation_ft = 6866
WHERE id = 'wa_the_brothers';

-- === wa_the_chopping_block_south_route (South Route, The Chopping Block) ===

-- access.rules groups "Picket Range/Boston Basin/Eldorado approaches" together as examples
-- of the 6-person cross-country zone cap. Batch 104 of this audit already established, via
-- NPS-sourced primary confirmation (and this route's own now-corrected sibling row
-- wa_southwest_buttress at Eldorado/Dorado Needle), that Boston Basin and Eldorado are
-- actually Type I (high-occupancy) cross-country zones capped at 12, not 6 -- only "standard"
-- cross-country zones, which the Southern Pickets (this route's own zone) correctly are, cap
-- at 6. This row's parenthetical misfiles Boston Basin/Eldorado alongside the Picket Range as
-- both being 6-person zones. The route's own group_limit (6) is correct for its own
-- (Southern Pickets) zone and is not changed -- only the misleading parenthetical example.
UPDATE routes
SET access = jsonb_set(
  access,
  '{rules}',
  '"Group size capped at 6 in standard off-trail cross-country zones, including the Southern Pickets approach used here. High-occupancy cross-country zones such as Boston Basin and Eldorado are a separate category capped at 12 -- do not use them as an example of the 6-person cap. Bear canisters required in some zones -- free loaners at permit offices."',
  false
)
WHERE id = 'wa_the_chopping_block_south_route';

-- === wa_the_devils_club (The Devils Club, Southeast Mox Peak) ===

-- overview mischaracterizes the 2008 Larson/Wehrly ascent as a "second ascent"/"variation" of
-- this route. Independent sources (AAC Publications article titled "Lemolo Peak, First
-- Ascent, After Hours"; Alpinist "Hardest Mox Finally Climbed"; Klipsun Magazine "After
-- Hours: One of the Last Unclimbed Peaks in the North Cascades") agree: Rolf Larson and Eric
-- Wehrly made the first ascent of a distinct, previously unclimbed 8,501 ft summit east of
-- Southeast Mox (which they named Lemolo Peak), via a new route on the NE Buttress called
-- "After Hours" (V 5.10-, 2,500 ft) -- not a repeat or variation of this route's East Face
-- line, and not Southeast Mox's own summit.
UPDATE routes
SET overview = replace(
  overview,
  'A second-ascent party (reported by Eric Wehrly, 2008) climbed a variation.',
  'In 2008, Rolf Larson and Eric Wehrly made the first ascent of a separate, previously unclimbed summit just east of Southeast Mox (since named Lemolo Peak, 8,501 ft) via a new route, After Hours (V 5.10-) -- not a second ascent or variation of the Devils Club.'
)
WHERE id = 'wa_the_devils_club';

-- waypoints/gpx still carried 4 points (Depot Creek Falls, Ouzel Lake, Redoubt Glacier Camp,
-- Base of East Face Headwall) belonging to the Depot Creek/Chilliwack Lake BC-side approach
-- used by the unrelated West Ridge/Beckey route. This row's own approach text describes only
-- the Ross Lake / Little Beaver / Perry Creek US-side approach and never mentions Depot
-- Creek, Ouzel Lake, or Redoubt Glacier. Waypoint #5's own note already self-documents that
-- the Depot Creek trailhead was wrongly duplicated onto this route from the Southeast Rib
-- route, but the earlier fix only added the correct trailhead without removing the stale
-- points it was correcting. Trimming to the trailhead + summit, which are what this route's
-- own text supports, and dropping the now-resolved meta-commentary from the trailhead note.
UPDATE routes
SET waypoints = '[
  {"lat":48.9153,"lng":-121.075,"elev":1600,"name":"Little Beaver landing/trailhead, Ross Lake, WA (water-taxi access) via Perry Creek drainage","note":"US-side approach, opposite the Depot Creek approach used for the West Ridge/Beckey route. Climbers take a water taxi (or boat, portaging Diablo Lake to Ross Lake) up Ross Lake ~15 miles to the Little Beaver landing/dock, then hike/bushwhack up the Perry Creek drainage to reach the base of Southeast Mox Peak''s East Face.","type":"Trailhead","elevFt":1600},
  {"lat":48.9475,"lng":-121.2556,"elev":8504,"name":"Southeast Mox Peak (Hard Mox) summit / East Face high point","type":"Summit","elevFt":8504}
]'::jsonb,
    gpx = '[[48.9153,-121.075],[48.9475,-121.2556]]'::jsonb
WHERE id = 'wa_the_devils_club';

-- === wa_the_direct_north_ridge_w_gendarme (The Direct North Ridge w/ Gendarme, Mount Stuart) ===

-- waypoints[0].elev (Stuart Lake Trailhead) is stored as 3540, but the real Stuart Lake
-- Trailhead (end of FR-7601 off Icicle Creek Rd, same lat/lng already stored here) sits at
-- ~2,930 ft per WTA and USFS trail listings -- corroborated independently by WTA's own
-- stated 1,840 ft gain to Lake Stuart (~4,770 ft), which backs out to the same ~2,930 ft
-- trailhead. Off by ~610 ft (21%).
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,elev}', '2930', false)
WHERE id = 'wa_the_direct_north_ridge_w_gendarme';

-- === wa_the_hitchhiker (The Hitchhiker, South Early Winters Spire) ===

-- overview claims the route starts "about 100 yards right of The Passenger" (900 ft).
-- Independent secondary sourcing (search-indexed snippets of Wayne Wallace's 2012 SEWS trip
-- report and general Hitchhiker route descriptions) consistently places it "about 100 feet
-- to the right of The Passenger." This also matches the row's OWN approach text ("continuing
-- roughly another 100 ft") and timing.sectionBreakdown note ("about 100 ft right of
-- Passenger"), which "100 yards" contradicts internally as well as externally.
UPDATE routes
SET overview = 'A long, sustained mixed free/bolted line up the steep southeast face of SEWS, starting about 100 feet right of The Passenger. Established over three visits between July and September 2007 by Bryan Burdo and Scott Johnston.'
WHERE id = 'wa_the_hitchhiker';

-- grade/rock_grade are stored as "5.11-". Two independent route-database page titles
-- (returned verbatim by search, not summarized text) give the free-climbing grade as
-- "5.11b": SuperTopo's route page title is "The Hitchhiker IV 5.11b or 5.10d C1", and
-- theCrag's route page title is "5.11b IV The Hitchhiker, 270m". Nothing found supports
-- "5.11-". The row's own pro_tips field ("Can be climbed at IV 5.11 A0, or free ... at 5.10
-- A1") is consistent with a 5.11b free grade and was apparently sourced separately from
-- grade/rock_grade, which were never aligned to it. grade_num (11) is correct under either
-- notation and is not changed.
UPDATE routes
SET grade = '5.11b', rock_grade = '5.11b'
WHERE id = 'wa_the_hitchhiker';

-- === wa_the_monk_odine (The Monk - Odine, Cathedral Peak) ===

-- road.status describes Forest Road 51 as gravel for ~22 miles to the trailhead, and is even
-- self-contradictory within its own sentence ("then gravel Forest Road 51 ... to the
-- trailhead at the end of the pavement"). WTA- and USFS-sourced trailhead descriptions agree
-- the drive is paved essentially the entire ~28 miles from Winthrop to the Andrews Creek
-- Trailhead ("end of the paved road" = the trailhead itself) -- matching this row's own
-- `approach` field, which already correctly says "paved the whole way from Winthrop."
UPDATE routes
SET road = jsonb_set(road, '{status}', '"paved the entire way -- West Chewuch Road/County Rd 1213 for the first ~6 miles from Winthrop, then Forest Road 51 continues paved for another ~22 miles to the Andrews Creek Trailhead, where the pavement ends"', false)
WHERE id = 'wa_the_monk_odine';

-- Same error repeated in road.driveNote ("22 miles of gravel"), which also implies a rough,
-- high-clearance-only surface. See the road.status fix above for sourcing -- the drive is
-- paved and suitable for passenger cars in normal summer conditions.
UPDATE routes
SET road = jsonb_set(road, '{driveNote}', '"From Winthrop: WA-20 to West Chewuch Road (Okanogan County Rd 1213), follow it ~6 miles to Forest Road 51, then continue ~22 miles of pavement to the Andrews Creek Trailhead (el. 3,050 ft); from there it is a 15+ mile wilderness trail approach to Cathedral Peak. The road is paved the entire way and suitable for passenger cars in normal summer conditions."', false)
WHERE id = 'wa_the_monk_odine';

-- watch_out's first line still reads "5.8 route in The Monk complex" while grade, grade_num,
-- rock_grade and pitch_detail were all corrected to 5.9 (see this row's own `corrections`
-- field: "Mountain Project lists this route at 5.9, not 5.8"). The grade fields were fixed;
-- this text field was missed by that earlier pass.
UPDATE routes
SET watch_out = '5.9 route in The Monk complex
Weather exposure on extended climbing
Route-finding through multi-pitch terrain
Loose rock hazard in mixed sections
Descent rappel sequences'
WHERE id = 'wa_the_monk_odine';
