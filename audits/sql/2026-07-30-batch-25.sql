-- WA Alpine Audit — Pass 1, Batch 25 — 2026-07-30
-- Peaks: Mount Custer (Standard), Mount Daniel (Daniel Glacier), Mount
--        Deception (Standard), Mount Degenhardt (Southwest Route), Mount
--        Despair (East Route), Mount Duckabush (Standard), Mount Ellinor
--        (Standard), Mount Fairchild (Standard), Mount Fernow (Southeast
--        Face), Mount Formidable (North/Ptarmigan)

-- =========================================================================
-- Mount Custer
-- =========================================================================

-- areas.wa_mount_custer: prominence_ft stored 1314, but Wikipedia gives
-- 1,230 ft for Mount Custer -- its elevation figure (8,630 ft) matches this
-- DB's own high_point_ft/waypoint/area.elevation_ft exactly, corroborating
-- it's the same peak and source family. Fixed to match.
UPDATE areas SET prominence_ft = 1230 WHERE id = 'wa_mount_custer';

-- wa_mount_custer_standard: data_quality.gaps claimed "No GPS/GPX waypoint
-- data available for the route line" and "No public GPS track found for
-- this route" -- directly contradicted by this same row's own `waypoints`
-- (8 populated lat/lng/elev points) and `gpx` (matching 8-point track).
-- Removed the two false gaps entries; left the unrelated prominence/
-- difficulty-estimate gap notes in place.
UPDATE routes SET data_quality = jsonb_set(
  data_quality, '{gaps}',
  '["Primary peak databases (Peakbagger, ListsOfJohn) were inaccessible for direct verification during this research pass — figures here rely on WTA and multiple consistent trip-report sources instead.", "Prominence figure (1,314 ft) could not be independently verified or refuted.", "Difficulty breakdown (physical/technical/exposure/commitment/routefinding) is a computed starting estimate derived from grade, pitch count, and route data on file -- not a researched or crowd-sourced rating. Users can blend in their own read via the UI."]'::jsonb
) WHERE id = 'wa_mount_custer_standard';

-- =========================================================================
-- Mount Daniel
-- =========================================================================

-- areas.wa_mount_daniel: elevation_ft stored 7977, but the route's own
-- high_point_ft (7960) and its own approach prose ("the true (West) summit
-- (7,960 ft)") already agree on 7,960 ft, matching Wikipedia/Peakbagger.
-- Only the area row and one waypoint (below) carried the stale 7977 figure.
UPDATE areas SET elevation_ft = 7960 WHERE id = 'wa_mount_daniel';

-- wa_mount_daniel_daniel_glacier: the "Mount Daniel (true/West Summit)"
-- waypoint's elevFt (7977) contradicted the row's own high_point_ft (7960)
-- and approach text -- fixed to match.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '7960'::jsonb) WHERE id = 'wa_mount_daniel_daniel_glacier';

-- wa_mount_daniel_daniel_glacier: access.land_manager said "Mt.
-- Baker-Snoqualmie National Forest (Snoqualmie Ranger District)", directly
-- contradicting this same row's own emergency.rangerStation ("Cle Elum
-- Ranger District, Okanogan-Wenatchee NF") -- Mount Daniel's Cathedral
-- Rock/Peggy's Pond approach is in the Alpine Lakes Wilderness, managed by
-- Okanogan-Wenatchee NF's Cle Elum Ranger District (confirmed via USFS/WTA).
-- Fixed to match the row's own correct field.
UPDATE routes SET access = jsonb_set(
  access, '{land_manager}',
  '"Okanogan-Wenatchee National Forest (Cle Elum Ranger District)"'
) WHERE id = 'wa_mount_daniel_daniel_glacier';

-- wa_mount_daniel_daniel_glacier: gain_ft/loss_ft stored 4600/4600, but the
-- row's own itinerary.days sum to 5,100 ft gain (2700+2400) and 5,100 ft
-- loss (0+5100), matching the itinerary's own totalNote ("about 5,100 ft
-- total gain"). Fixed to match the row's own itinerary data.
UPDATE routes SET gain_ft = 5100, loss_ft = 5100 WHERE id = 'wa_mount_daniel_daniel_glacier';

-- wa_mount_daniel_daniel_glacier: approach prose gave Peggy's Pond's
-- elevation as "~5300 ft", contradicting this same row's own
-- itinerary.days[0].note and access.rules, which both independently say
-- "~5,560 ft" for the same camp (matching WTA/AllTrails). Fixed the outlier.
UPDATE routes SET approach = replace(
  approach,
  'Peggy''s Pond (~5300 ft, about 5-5.5 miles from the trailhead)',
  'Peggy''s Pond (~5,560 ft, about 5-5.5 miles from the trailhead)'
) WHERE id = 'wa_mount_daniel_daniel_glacier';

-- =========================================================================
-- Mount Deception
-- =========================================================================

-- wa_mount_deception_standard: gain_ft/loss_ft stored 6220/6220, but the
-- row's own itinerary.days sum to 5,500/5,500 (3200+2300+0 gain;
-- 0+2300+3200 loss), matching the itinerary's own totalNote ("~20 mi and
-- ~5,300 ft gain round trip") and corroborated by Mountaineers.org's
-- Royal Lake/Royal Basin approach mileage. Fixed to match.
UPDATE routes SET gain_ft = 5500, loss_ft = 5500 WHERE id = 'wa_mount_deception_standard';

-- wa_mount_deception_standard: alpine_grade held "II", identical to this
-- same row's own `commitment` field -- the known copy-paste bug where an
-- NCCS commitment numeral lands in the French-adjectival-scale column
-- (schema: supabase/migrations/0006_composite_grades.sql). No authoritative
-- source gives a French grade for this unroped Class 2-3 scramble (rope_type
-- = "none"), so nulled out rather than guessed.
UPDATE routes SET alpine_grade = NULL WHERE id = 'wa_mount_deception_standard';

-- =========================================================================
-- Mount Degenhardt
-- =========================================================================

-- wa_mount_degenhardt_southwest_route: itinerary day-2 objective text said
-- "Summit Mount Degenhardt (8,102 ft)", contradicting this same row's own
-- high_point_ft/area.elevation_ft/summit waypoint (all 8,107 ft, matching
-- listsofjohn.com/Peakbagger). Fixed the stale figure in the itinerary text.
UPDATE routes SET itinerary = jsonb_set(
  itinerary, '{days,1,objective}',
  '"Summit Mount Degenhardt (8,107 ft) and return to high camp"'
) WHERE id = 'wa_mount_degenhardt_southwest_route';

-- wa_mount_degenhardt_southwest_route: emergency.rangerStation gave the
-- North Cascades NP Headquarters/Visitor Center address in Sedro-Woolley
-- (810 State Route 20, 360-854-7200) mislabeled as the Wilderness
-- Information Center -- the actual backcountry permit office (referenced
-- elsewhere in this row's own permit/access fields) is at 7280 Ranger
-- Station Road, Marblemount, WA 98267, (360) 854-7245 per NPS listings.
UPDATE routes SET emergency = jsonb_set(
  emergency, '{rangerStation}',
  '"North Cascades National Park - Wilderness Information Center, 7280 Ranger Station Road, Marblemount, WA 98267 (360-854-7245)"'
) WHERE id = 'wa_mount_degenhardt_southwest_route';

-- wa_mount_degenhardt_southwest_route: route-level lat/lng were null despite
-- this same row's own area.lat/area.lng and approach_logistics.peakLat/
-- peakLng already holding the correct summit coordinates (matching
-- Wikipedia within normal rounding). Backfilled from the row's own data.
UPDATE routes SET lat = 48.771537, lng = -121.2945036 WHERE id = 'wa_mount_degenhardt_southwest_route';

-- =========================================================================
-- Mount Despair
-- =========================================================================

-- areas.wa_mount_despair: elevation_ft stored 7299, but this row's own
-- `corrections` field already says "Wikipedia gives 7,296 ft, which is the
-- value used here" -- a fix that was decided but never applied to the area
-- row. Matches the route's own high_point_ft and the sibling Northeast
-- Buttress route's high_point_ft (both 7296). Fixed.
UPDATE areas SET elevation_ft = 7296 WHERE id = 'wa_mount_despair';

-- wa_mount_despair_east_route: the summit waypoint's elev (7299) carried the
-- same stale figure as the area row above -- fixed to match the route's own
-- high_point_ft (7296) and Wikipedia/Peakbagger.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{7,elev}', '7296'::jsonb) WHERE id = 'wa_mount_despair_east_route';

-- wa_mount_despair_east_route: gain_ft/loss_ft stored 6000/6000 -- exactly
-- half of what this same row's own itinerary.totalNote ("roughly 10,000-
-- 12,000 ft of cumulative gain/loss") and approach text ("trip reports...
-- log roughly 24 miles and 12,000+ ft of cumulative gain and loss")
-- independently state, and half of what the row's own cited primary source
-- (trailcatjim.com) is reported to log. dist_km (38.62 km = 24 mi) already
-- matches the full round-trip mileage these citations describe. Fixed the
-- top-level total to match; the itinerary's day-by-day split (which also
-- only sums to 6000/6000) still needs a human re-derivation once the
-- primary trip report is reachable -- see audit log.
UPDATE routes SET gain_ft = 12000, loss_ft = 12000 WHERE id = 'wa_mount_despair_east_route';

-- =========================================================================
-- Mount Duckabush
-- =========================================================================

-- wa_mount_duckabush_standard: approach_logistics.trailhead/trailheadLat/
-- trailheadLng/trailheadDirection described the Dosewallips Road washout
-- parking (47.740259, -123.06576 -- confirmed via USFS's "Dosewallips Road
-- Washout" project page as the Anderson Pass/Mt. Anderson/Mt. Steel
-- trailhead), while this route's own waypoints[0], `approach`, and `road`
-- fields all consistently describe the actual Duckabush Trailhead at the
-- end of FS Rd 2510-060 (47.685162, -123.039683). Cross-route contamination
-- -- fixed to match the row's own correct fields.
UPDATE routes SET approach_logistics = approach_logistics || jsonb_build_object(
  'trailhead', 'Duckabush Trailhead (end of FS Road 2510-060)',
  'trailheadLat', 47.685162,
  'trailheadLng', -123.039683,
  'trailheadDirection', 'From Quilcene, drive south on US-101 about 15 miles to the Duckabush Recreation Area; turn west onto Duckabush River Road/FS Rd 2510 for 6 miles, then follow FS Rd 2510-060 to the Duckabush Trailhead.'
) WHERE id = 'wa_mount_duckabush_standard';

-- wa_mount_duckabush_standard: gain_ft/loss_ft stored 5814/5814, but the
-- row's own itinerary.days sum to 8,100 ft gain / 7,900 ft loss
-- (2500+3200+1800+600 gain; 250+1200+1800+4650 loss). Fixed to match.
UPDATE routes SET gain_ft = 8100, loss_ft = 7900 WHERE id = 'wa_mount_duckabush_standard';

-- wa_mount_duckabush_standard: approach prose gave the FS Rd 2510 trailhead
-- elevation as "~900 ft", contradicting this same row's own waypoints[0]
-- ("Duckabush Trailhead", elev 440) and external Hiking Project/USFS
-- listings (~440 ft). Fixed the outlier.
UPDATE routes SET approach = replace(approach, '~900 ft', '~440 ft') WHERE id = 'wa_mount_duckabush_standard';

-- =========================================================================
-- Mount Ellinor
-- =========================================================================

-- wa_mount_ellinor_standard: top-level `permit` field claimed a "Free
-- self-issue Mount Skokomish Wilderness permit at the trailhead" was
-- required, directly contradicted by this same row's own access.permit/
-- access.rules fields ("no wilderness permit needed for day hiking") and by
-- WTA/USFS/AllTrails descriptions of this popular day hike, which mention
-- only the Northwest Forest Pass. Fixed to match the row's own correct
-- sub-field.
UPDATE routes SET permit = 'Northwest Forest Pass (or equivalent Interagency/America the Beautiful pass) required to park at the upper trailhead; no separate wilderness permit needed for this day hike.' WHERE id = 'wa_mount_ellinor_standard';

-- =========================================================================
-- Mount Fairchild
-- =========================================================================

-- wa_mount_fairchild_standard: gain_ft/loss_ft stored 8000/8000, but the
-- row's own itinerary.days sum to 9,300 ft gain / 9,200 ft loss
-- (4500+2200+1900+700 gain; 200+900+1900+6200 loss) -- a 1,200-1,300 ft
-- mismatch well beyond rounding. Fixed to match the row's own itinerary.
-- NOTE: this row's itinerary itself appears to blend two different,
-- separately-documented approaches to Mount Fairchild (Sol Duc/Appleton
-- Pass vs. Whiskey Bend/Fitzhenry) -- flagged in the audit log for a human
-- rewrite/split decision; this fix only corrects the numeric mismatch.
UPDATE routes SET gain_ft = 9300, loss_ft = 9200 WHERE id = 'wa_mount_fairchild_standard';

-- =========================================================================
-- Mount Fernow
-- =========================================================================

-- wa_mount_fernow_southeast_face: gain_ft/loss_ft stored 6750/1000, but the
-- row's own itinerary.days sum to 8,100 ft gain / 8,100 ft loss
-- (2700+5400+0 gain; 0+5400+2700 loss), matching the itinerary's own
-- totalNote ("about 8,100 ft of cumulative gain") and sourceNote (citing a
-- trip report with ~2,708 + ~5,428 ft day gains). Fixed to match.
UPDATE routes SET gain_ft = 8100, loss_ft = 8100 WHERE id = 'wa_mount_fernow_southeast_face';

-- =========================================================================
-- Mount Formidable
-- =========================================================================

-- wa_mount_formidable_north_ptarmigan: top-level `grade` said "Alpine I-II,
-- Class 2-3", contradicting this same row's own rock_grade ("Class 3-4...
-- occasional low-5th-class moves") -- a Steph Abegg trip report titles this
-- exact line "Mt. Formidable, South Route (3rd/4th)" and multiple other
-- reports describe 4th-class/low-5th moves in the summit gully. Fixed the
-- top-level grade's rock-class figure to match the row's own corroborated
-- rock_grade.
UPDATE routes SET grade = 'Alpine I-II, Class 3-4' WHERE id = 'wa_mount_formidable_north_ptarmigan';

-- =========================================================================
-- Verify afterward:
-- =========================================================================
select id, elevation_ft, prominence_ft from areas where id = 'wa_mount_custer';
select id, data_quality from routes where id = 'wa_mount_custer_standard';
select id, elevation_ft from areas where id = 'wa_mount_daniel';
select id, waypoints, access, gain_ft, loss_ft, approach from routes where id = 'wa_mount_daniel_daniel_glacier';
select id, gain_ft, loss_ft, alpine_grade from routes where id = 'wa_mount_deception_standard';
select id, itinerary, emergency, lat, lng from routes where id = 'wa_mount_degenhardt_southwest_route';
select id, elevation_ft from areas where id = 'wa_mount_despair';
select id, waypoints, gain_ft, loss_ft from routes where id = 'wa_mount_despair_east_route';
select id, approach_logistics, gain_ft, loss_ft, approach from routes where id = 'wa_mount_duckabush_standard';
select id, permit from routes where id = 'wa_mount_ellinor_standard';
select id, gain_ft, loss_ft from routes where id = 'wa_mount_fairchild_standard';
select id, gain_ft, loss_ft from routes where id = 'wa_mount_fernow_southeast_face';
select id, grade from routes where id = 'wa_mount_formidable_north_ptarmigan';
