-- WA alpine route audit -- batch 305 (2026-09-19, pass 5)
-- Human-reviewable fixes. Nothing here is applied automatically.

-- =========================================================================
-- Vasiliki Ridge (Ares Tower) -- wa_vasiliki_ridge_standard
-- =========================================================================

-- high_point_ft stored the OLDER of two elevations this row itself already
-- resolved. The row's own `corrections` field says outright: "the more
-- precise 8,203 ft figure is used here as highPointFt, with the older
-- 8,190 ft figure noted as the commonly cited rounded value" -- but the
-- high_point_ft column still held 8190, the value the correction says was
-- superseded. A third independent record agrees with 8203 rather than
-- 8190: this row's own waypoint chain (Wine Spires pullout 4300 -> Early
-- Winters Creek 4080 -> The Ledge bivy 6000 -> The Bench 6460 -> Burgundy
-- Col 7800 -> summit) sums its cumulative ascent to exactly 4123 ft, which
-- is precisely the stored gain_ft (4123) -- and that arithmetic only
-- reconstructs if the final leg (Burgundy Col 7800 -> summit) ends at 8203
-- (403 ft), not 8190 (390 ft). Corrected to match the row's own resolved
-- decision, its own summit waypoint (elev 8203, "surveyed 8,202.8 ft"),
-- and its own gain_ft arithmetic.
UPDATE routes SET high_point_ft = 8203
  WHERE id = 'wa_vasiliki_ridge_standard'
  AND high_point_ft = 8190
  AND gain_ft = 4123;

-- outing_shape was NULL despite descent_text describing a same-trailhead
-- round trip ("reverse the standard descent route... back to Early
-- Winters Creek and the SR-20 pullout") -- the trailhead is the same one
-- named in waypoints[0] and approach_logistics.
UPDATE routes SET outing_shape = 'outback'
  WHERE id = 'wa_vasiliki_ridge_standard'
  AND outing_shape IS NULL;

-- bivy carried 6 entries; 3 are regional Kangaroo Ridge corridor
-- contamination reached from "the hairpin" pullout, which this row's OWN
-- bivy[0] entry says serves Kangaroo Temple/Half Moon/Big Kangaroo/Poster
-- Peak -- NOT this route, which uses "the broad pullout further east"
-- (the Wine Spires pullout) per that same entry's own text. "Blue Lake
-- trailhead roadside parking" (fallback for "the Kangaroo Ridge and
-- roadside objectives"), "Kangaroo Pass and the upper Early Winters Creek
-- meadows" ("most parties simply do Kangaroo Temple in a day"), and
-- "Upper Cedar Creek basin, east of Big Kangaroo" ("the usual way in is to
-- follow the Half Moon north-ridge approach from the hairpin") all
-- explicitly serve Kangaroo Ridge objectives via the wrong pullout. Kept:
-- the two Wine Spires/Vasiliki-specific camps (SR-20 pullouts, Bench Camp)
-- and the general Early Winters corridor campgrounds (Lone Fir/Klipchuck/
-- Early Winters), which serve the whole SR-20 corridor including this
-- route and name no conflicting trailhead.
UPDATE routes SET bivy = jsonb_build_array(bivy->0, bivy->1, bivy->5)
  WHERE id = 'wa_vasiliki_ridge_standard'
  AND jsonb_array_length(bivy) = 6
  AND bivy->2->>'name' = 'Blue Lake trailhead roadside parking'
  AND bivy->3->>'name' = 'Kangaroo Pass and the upper Early Winters Creek meadows'
  AND bivy->4->>'name' = 'Upper Cedar Creek basin, east of Big Kangaroo';

-- FLAGGED, not fixed: loss_ft is NULL, and gain_ft (4123, matching this
-- row's own waypoint-chain arithmetic exactly) disagrees by a wide margin
-- with the sum of this row's own itinerary day-by-day gainFt/lossFt
-- figures (day1 4400/200 + day2 1400/6000 = 5800 gain-to-summit one-way /
-- 6200 round-trip loss). Both readings are internally self-consistent on
-- their own terms but disagree with each other by ~1,700-2,100 ft (roughly
-- 30-40%). Per CLAUDE.md's documented caution against bulk-normalizing
-- gain_ft/loss_ft on multi-day/high-camp itineraries, this needs a human
-- call on which figure -- or a third value -- is right, rather than a
-- mechanical pick between the two internal candidates.

-- =========================================================================
-- Vesper Peak (North Face / Ragged Edge) -- wa_vesper_peak_north_face_ragged_edge
-- =========================================================================

-- bivy carried 6 entries; 4 are regional Mountain Loop Highway corridor
-- contamination self-identifying as serving other peaks entirely: "Sloan
-- Peak high camp" (Sloan Peak, North Fork Sauk approach -- "EVERYTHING
-- ABOVE THE TRAILHEAD DEPENDS ON THE NORTH FORK SAUK FORD", a different
-- trailhead than this route's Sunrise Mine Trailhead), "Foggy Lake, Gothic
-- Basin" (Del Campo and Gothic peaks, reached from Barlow Pass), "Monte
-- Cristo townsite" (explicitly: "Climbers use it mainly as a jumping-off
-- point deeper into the Monte Cristo group rather than for Vesper or
-- Sloan"), and "Bedal Campground" (explicitly "The closest road camp to
-- the Sloan Peak and Bedal Creek trailheads... for a Sloan attempt").
-- Kept: "Vesper Creek basin and Lake Elan" (explicitly "The working base
-- camp for Vesper Peak's north side") and "Verlot corridor campgrounds"
-- (explicitly "the fallback base for Vesper, Morning Star, Sperry and the
-- Big Four side of the valley... closer to the Sunrise Mine and Big Four
-- trailheads", matching this route's own Sunrise Mine Trailhead).
UPDATE routes SET bivy = jsonb_build_array(bivy->1, bivy->5)
  WHERE id = 'wa_vesper_peak_north_face_ragged_edge'
  AND jsonb_array_length(bivy) = 6
  AND bivy->0->>'name' = 'Sloan Peak high camp — heather benches above Cougar Creek'
  AND bivy->2->>'name' = 'Foggy Lake, Gothic Basin'
  AND bivy->3->>'name' = 'Monte Cristo townsite, walk-in from Barlow Pass'
  AND bivy->4->>'name' = 'Bedal Campground, Mountain Loop Highway';

-- =========================================================================
-- Warrior Peak -- wa_warrior_peak_standard
-- =========================================================================

-- rock_grade said "3rd class (YDS) scrambling", flatly disagreeing with
-- three other fields on this same row that all converge on "Class 4 / low
-- 5th": the `grade` column itself ("Class 4 / low 5th"), the `description`
-- field ("a short, exposed, poor-quality-rock step (Class 4 to low 5th)"),
-- and `pitch_detail`'s own crux entry ("Class 4, low 5th (5.0-5.2)... 20-50
-- ft of exposed, poor-quality rock"). rock_grade omitted the documented
-- technical crux entirely. Corrected to match the majority reading,
-- phrased from this row's own pitch_detail wording.
UPDATE routes SET rock_grade = 'Class 4 to low 5th class (5.0-5.2), with 3rd-class scrambling on the approach terrain'
  WHERE id = 'wa_warrior_peak_standard'
  AND rock_grade = '3rd class (YDS) scrambling'
  AND grade = 'Class 4 / low 5th';

-- bivy carried 6 entries; 4 are regional Olympics corridor contamination
-- for other peaks entirely, reached via a different trailhead/trail system
-- (the Upper Big Quilcene/Tubal Cain corridor rather than this route's own
-- Upper Dungeness Trailhead): "Camp Mystery" and "Marmot Pass" (both
-- explicitly "The standard base for Buckhorn Mountain" / "for anyone whose
-- objective is Buckhorn Mountain"), "Buckhorn Lake" (explicitly "the base
-- for Mount Worthington"), and "Camp Windy" (explicitly "The only real
-- camp on Mount Townsend"). Kept: "Boulder Shelter" (explicitly "The
-- working base for Warrior Peak") and "Home Lake" (explicitly "The high
-- camp for both Warrior Peak and the northwest side of Inner Constance"),
-- both of which also match this row's own waypoints by name and elevation.
UPDATE routes SET bivy = jsonb_build_array(bivy->4, bivy->5)
  WHERE id = 'wa_warrior_peak_standard'
  AND jsonb_array_length(bivy) = 6
  AND bivy->0->>'name' = 'Camp Mystery — the last water below Marmot Pass'
  AND bivy->1->>'name' = 'Marmot Pass — high dry bivy on the crest'
  AND bivy->2->>'name' = 'Buckhorn Lake — the base for Mount Worthington'
  AND bivy->3->>'name' = 'Camp Windy, below Mount Townsend';

-- =========================================================================
-- Mount Washington / Mount Ellinor Traverse (Ridge) -- wa_washington_ellinor_traverse_ridge
-- =========================================================================

-- bivy carried 8 entries; 6 are regional Hamma Hamma corridor
-- contamination for The Brothers, Mount Stone and Mount Skokomish (a
-- different road/trailhead system entirely -- Hamma Hamma River Road
-- rather than this route's own North Lake Cushman Road/FR-2419): "Lena
-- Lake designated sites" and "The Brothers climbers camp" (both explicitly
-- for The Brothers), "Upper Lena Lake" (explicitly "The high camp for the
-- northern approach to Mount Stone"), "Lake of the Angels" (explicitly
-- "The base for Mount Skokomish and for the south side of Mount Stone"),
-- "Hamma Hamma River road campgrounds" (explicitly staging for "Lena Lake
-- and The Brothers, the Putvin trail... for Mount Skokomish and Mount
-- Stone, and the Jefferson Creek spur for Mount Pershing" -- no mention of
-- Washington/Ellinor), and "Jefferson Creek roadside pull-outs"
-- (explicitly "the staging spot for MOUNT PERSHING and effectively nothing
-- else"). This is the same corridor-contamination class already fixed on
-- the sibling Mount Washington route wa_se_ridge_aka_shield_wall (see
-- audits/sql/2026-09-01-batch-162.sql), recurring on this route with the
-- identical bivy list. Kept: "Big Creek Campground" (explicitly "The
-- obvious roadside base for MOUNT ELLINOR AND MOUNT WASHINGTON... anyone
-- linking the Washington–Ellinor ridge traverse") and "Staircase
-- Campground" (explicitly a fallback "further from the Ellinor and
-- Washington trailheads than Big Creek").
UPDATE routes SET bivy = jsonb_build_array(bivy->6, bivy->7)
  WHERE id = 'wa_washington_ellinor_traverse_ridge'
  AND jsonb_array_length(bivy) = 8
  AND bivy->0->>'name' = 'Lena Lake designated sites'
  AND bivy->6->>'name' = 'Big Creek Campground, Lake Cushman'
  AND bivy->7->>'name' = 'Staircase Campground, North Fork Skokomish';

-- =========================================================================
-- West Craggy Peak -- wa_west_craggy_peak_standard_route
-- =========================================================================

-- bivy carried 8 entries; 7 are regional Harts Pass/Pasayten crest
-- contamination for entirely different peaks (Osceola, Blackcap, Castle,
-- Blizzard, Robinson Mountain, Ptarmigan, Dot, Monument, Lake Mountain),
-- all reached via Forest Road 5400 from Mazama -- a completely different
-- drive from this route's own Copper Glance Trailhead (off Eightmile Road
-- from Winthrop). The row's OWN kept entry says so outright: "Copper
-- Glance Lake... is the only camp that serves Big Craggy and West Craggy,
-- and it belongs to a different drive from everything else in this zone...
-- Nothing here connects to Harts Pass on foot."
UPDATE routes SET bivy = jsonb_build_array(bivy->7)
  WHERE id = 'wa_west_craggy_peak_standard_route'
  AND jsonb_array_length(bivy) = 8
  AND bivy->0->>'name' = 'Harts Pass and Meadows campgrounds'
  AND bivy->7->>'name' = 'Copper Glance Lake';

-- =========================================================================
-- North Peak / Gunsight Range (West Face) -- wa_west_face_2
-- =========================================================================

-- access.parking_pass named a DIFFERENT mountain outright: "Northwest
-- Forest Pass required at Mountain Loop Highway trailheads (e.g. Sunrise
-- Mine TH for Vesper Peak)" -- Vesper Peak's own trailhead, cross-
-- contaminated into this row (Downey Creek Trailhead off Suiattle River
-- Road, nowhere near the Mountain Loop Highway). Corrected to name this
-- route's own trailhead.
UPDATE routes SET access = jsonb_set(access, '{parking_pass}',
  '"Northwest Forest Pass required at the Downey Creek Trailhead (Suiattle River Road) — no separate climbing fee."')
  WHERE id = 'wa_west_face_2'
  AND access->>'parking_pass' = 'Northwest Forest Pass required at Mountain Loop Highway trailheads (e.g. Sunrise Mine TH for Vesper Peak) — $5/day or $30/year.';

-- road described a WRONG approach entirely: "Barlow Pass Trailhead, then
-- the gated Monte Cristo Road... toward the Gunsight Range" -- the Barlow
-- Pass/Monte Cristo corridor accesses the Monte Cristo peak group, not the
-- Gunsight Range. This contradicts five other fields on this same row,
-- all of which consistently describe the Downey Creek Trailhead / Suiattle
-- River Road / Bachelor Creek / Itswoot Ridge approach instead:
-- waypoints[0] ("Downey Creek Trailhead"), approach ("The genuine standard
-- approach is from the Downey Creek Trailhead (off Suiattle River Road)"),
-- approach_logistics ("Downey Creek Trailhead (Trail #768, Suiattle River
-- Road)"), approach_variants[0] ("From the Downey Creek Trailhead follow
-- the valley trail to the Bachelor Creek crossing..."), descent_text
-- ("follow the Downey Creek trail back to the trailhead"), and itinerary
-- ("Hike Downey Creek and Bachelor Creek trails..."). Corrected to match,
-- using only facts already stated elsewhere on this row (no new mileage
-- or driving detail invented) plus this row's own access.seasonal note on
-- Suiattle River Road closures.
UPDATE routes SET road = '{"name": "Suiattle River Road (Forest Road 26) to the Downey Creek Trailhead (Trail #768)", "status": "Gravel Forest Service road; the standard access to this side of the Glacier Peak Wilderness.", "driveNote": "Reaches the Downey Creek Trailhead (~1,450 ft), the start of Trail #768, per this route''s own approach and approach_logistics fields.", "seasonalGate": "Suiattle River Road (FSR 26) has had storm-damage closures in the past — check current Mt. Baker-Snoqualmie National Forest conditions before a trip."}'::jsonb
  WHERE id = 'wa_west_face_2'
  AND road->>'name' = 'Barlow Pass Trailhead, then the gated Monte Cristo Road (foot/bike only) toward the Gunsight Range';

-- approach opened with a self-flagged note claiming "this area's stored
-- coordinates place it at Washington Pass on SR-20" -- checked against the
-- live areas table: wa_north_peak's stored coordinate is 48.3068,-120.994,
-- which is roughly 35 km from Washington Pass (48.531,-120.660) and only
-- ~8 km from the well-documented neighboring Dome Peak (48.2777,-121.0894)
-- -- i.e. in the right neighborhood for the Gunsight Range, not "at
-- Washington Pass". This reads as a stale leftover from an EARLIER pass,
-- before the area's coordinate was corrected; the geocoding-error claim
-- no longer matches the live data. Trimmed to remove the stale sentence,
-- keeping the substantive (and independently corroborated) approach
-- description.
UPDATE routes SET approach = 'The genuine standard approach is from the Downey Creek Trailhead (off Suiattle River Road) via the southern end of the Ptarmigan Traverse — a rugged, largely off-trail alpine route over Itswoot Ridge/Cub Lake and Bachelor Creek involving glacier travel and significant bushwhacking. Climbers typically budget a full day (or two) of approach before reaching the base of South Peak''s granite faces; this is an experienced-mountaineers-only objective, not a roadside crag.'
  WHERE id = 'wa_west_face_2'
  AND approach LIKE 'Note: this area''s stored coordinates place it at Washington Pass%';

-- bivy carried 8 entries; 3 name peaks with no Gunsight Range connection
-- ("Kool-Aid Lake" and "Yang Yang Lakes" are explicitly for Old Guard Peak
-- and Sentinel Peak on the NORTHERN Ptarmigan Traverse near Cascade Pass;
-- "Spire Col bivouac" is explicitly "the highest useful bivouac for Spire
-- Point", with even Dome-bound parties said to prefer camps "further
-- east"). Kept 5 entries that explicitly connect to this route's own
-- Downey Creek/Itswoot Ridge/Chickamin approach or name the Gunsight Range
-- itself: "White Rock Lakes" ("the Chickamin and Dome glaciers are the way
-- to Sinister and to the Gunsight Range"), "Itswoot Ridge" (named in this
-- row's own approach_variants), "Cub Lake" ("everything on the Chickamin
-- side including Sinister Peak and the Gunsight [Range]", matching this
-- row's own waypoint distances), "Bachelor Creek forest and meadow camps"
-- (matches this row's own trailhead/trail), and "Dome Glacier and
-- Dome-Chickamin col high bivouacs" (matches this row's own waypoint names
-- "Chikamin-Dome Col" / "Dome-Chickamin Col" almost exactly).
UPDATE routes SET bivy = jsonb_build_array(bivy->2, bivy->3, bivy->4, bivy->5, bivy->7)
  WHERE id = 'wa_west_face_2'
  AND jsonb_array_length(bivy) = 8
  AND bivy->0->>'name' = 'Kool-Aid Lake'
  AND bivy->1->>'name' = 'Yang Yang Lakes'
  AND bivy->6->>'name' = 'Spire Col bivouac';

-- =========================================================================
-- West Twin Needle (South Route) -- wa_west_twin_needle_south_route
-- =========================================================================

-- FLAGGED, not fixed: gain_ft/loss_ft (7336/7336, an exact match to this
-- row's own waypoint-chain cumulative one-way ascent) disagrees with the
-- sum of this row's own 3-day itinerary's day-by-day gainFt/lossFt figures
-- (day1 5800/400 + day2 2400/2400 + day3 800/6200 = 9000 gain / 9000 loss)
-- by 1,664 ft (~18.5%). Both readings are internally self-consistent
-- (gain=loss in each) but disagree with each other. Per CLAUDE.md's
-- documented caution against bulk-normalizing gain_ft/loss_ft on multi-day
-- itineraries and its guidance to prefer a human judgment call over a
-- mechanical average, this is left for review rather than auto-fixed.

-- =========================================================================
-- Whatcom Peak (Southwest Route / Whatcom Glacier) -- wa_whatcom_peak_southwest_route
-- =========================================================================

-- FLAGGED, not fixed: the `approach` field states the Chilliwack River
-- "is crossed via a hand-pulled cable car near US Cabin Camp rather than a
-- ford" at the same point along the route (between Hannegan Pass at 4.6 mi
-- and Graybeal Camp at 9 mi) where this row's OWN `waypoints` array places
-- a waypoint named "Chilliwack River ford" (type Hazard, elev 2700, distMi
-- 7) with ford-specific hazard language ("reported thigh-deep at typical
-- mid-summer flow"), and where `hazards` independently lists "Chilliwack
-- River ford — thigh-deep and swift in midsummer" as a hazard. A cable-car
-- crossing and an unbridged ford are not the same hazard, and this row
-- describes both, in the same place, without reconciling them. This is
-- safety-relevant (a party planning around a cable car and finding an
-- unbridged ford, or vice versa, is a real mismatch) and needs a human
-- research pass rather than a guess at which is current.

-- FLAGGED, not fixed: dist_km (13.7 km / 8.5 mi) appears far too low.
-- Multiple fields on this row independently describe a much longer round
-- trip: the itinerary's own totalNote states "roughly 36-39 mi round trip"
-- and the approach text gives cumulative one-way mileages (~17+ trail
-- miles just to reach Whatcom Pass) that alone exceed dist_km. This route
-- carries TWO documented itinerary variants (a simpler out-and-back via
-- Whatcom Pass, whose gain_ft/loss_ft of 6840/6840 already matches this
-- row's own waypoint-chain arithmetic exactly and is NOT flagged here; and
-- a longer Easy-Ridge-in/Whatcom-Pass-out loop described in the itinerary
-- field), so there is no single obviously-correct replacement value for
-- dist_km without knowing which plan it is meant to describe. Left for
-- human review.

-- bivy carried 13 entries; 8 are regional Northern Pickets/Ross Lake
-- corridor contamination for peaks reached from the opposite (east/south)
-- side of the range via Ross Lake and the Big Beaver/Wiley Ridge trail
-- system -- a different approach entirely from this route's own Hannegan
-- Pass Trailhead: "Luna Camp" and "Luna Col bivy" (both explicitly for
-- Mount Fury's west peak and Luna Peak), "Beaver Pass Camp" (jumping-off
-- point for Wiley Ridge "onto the Challenger Glacier from the east"),
-- "Challenger Arm camp", "Eiley Lake benches" and "East Wiley Basin" (all
-- explicitly for Poltergeist Pinnacle/Challenger via the eastern Wiley
-- Ridge approach), "Improvised bivouacs on the Challenger Glacier" (for
-- Spectre Peak/Poltergeist Pinnacle specifically), and "Luna Cirque floor"
-- (beneath Luna Peak). Kept 5 entries that explicitly name Whatcom Peak or
-- match this row's own documented Hannegan Pass/Easy Ridge/Whatcom Pass
-- approaches: "Perfect Pass" (explicitly "The classic high camp for Mount
-- Challenger and for WHATCOM PEAK... reached either over Whatcom Pass from
-- the Brush Creek side or along Easy Ridge" -- naming both variants this
-- row documents), "Whatcom Camp" (explicitly "serves the Hannegan Pass and
-- Chilliwack River approach to WHATCOM PEAK"), "Twin Rocks and Stillwell
-- Camps" (explicitly "walk up to Whatcom Pass for WHATCOM PEAK and
-- Challenger"), "Easy Ridge bivouac ground below Easy Peak" (matches this
-- row's own itinerary day-1/day-2 camp on Easy Ridge), and "Tapto Lakes
-- cross-country zone" (reached from Whatcom Pass, matching this row's own
-- waypoint note "junction with the Tapto Lakes path").
UPDATE routes SET bivy = jsonb_build_array(bivy->3, bivy->4, bivy->5, bivy->10, bivy->11)
  WHERE id = 'wa_whatcom_peak_southwest_route'
  AND jsonb_array_length(bivy) = 13
  AND bivy->0->>'name' = 'Luna Camp, Big Beaver Trail'
  AND bivy->3->>'name' = 'Perfect Pass, Perfect Pass cross-country zone'
  AND bivy->4->>'name' = 'Whatcom Camp, Brush Creek below Whatcom Pass'
  AND bivy->5->>'name' = 'Twin Rocks and Stillwell Camps, Little Beaver'
  AND bivy->10->>'name' = 'Easy Ridge bivouac ground below Easy Peak'
  AND bivy->11->>'name' = 'Tapto Lakes cross-country zone';
