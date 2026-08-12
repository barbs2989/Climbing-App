-- WA alpine audit -- batch 87 (pass 2) -- 2026-08-09
-- Routes: wa_mount_rainier_ptarmigan_ridge, wa_mount_rainier_sunset_ridge,
--         wa_mount_rainier_tahoma_glacier, wa_mount_rainier_willis_wall,
--         wa_mount_redoubt_south_face, wa_mount_seattle_noyes_basin,
--         wa_mount_seattle_seattle_creek, wa_mount_sefrit_bloody_head_couloir
-- Researched via 3 parallel agents grouped by peak (Rainier x4; Redoubt+Sefrit; Seattle x2).

-- wa_mount_rainier_sunset_ridge: gpx held a fabricated 2-point straight line between the
-- trailhead and Liberty Cap, contradicting this same row's own data_quality.gaps ("No public
-- GPS track found for this route as of this research pass"). Cleared rather than left in place,
-- pending a real GPS track, matching the precedent set for Liberty Ridge in batch 86.
UPDATE routes SET gpx = NULL
WHERE id = 'wa_mount_rainier_sunset_ridge'
  AND gpx = '[[46.7424,-121.8995],[46.8658,-121.7817]]'::jsonb;

-- wa_mount_rainier_tahoma_glacier: access.notes described "Northwest Forest Pass required...
-- Mount Tom area, North Cascades" -- Mount Tom is an unrelated North Cascades peak, and this
-- route is on Mount Rainier (confirmed by every other field in this same access block:
-- land_manager, landManager, permit, fees). Clear copy/paste contamination from a different
-- route's data. Replaced with the standard Rainier registration text used verbatim by the
-- other 3 Rainier routes in this batch.
UPDATE routes SET access = jsonb_set(access, '{notes}',
  '"How to get it: pay online in advance (pay.gov / recreation.gov), then register in person. Winter (Sept 16-May 21): self-issue at the Paradise Old Station kiosk after paying online. Summer (May 22-Sept 30): no self-issue -- register at a Wilderness Information Center (Longmire, Paradise, or White River); roughly half of summer registration slots are held for walk-up, up to 24 hrs ahead. No timed-entry vehicle reservation is in effect for the 2026 season, so park entry itself is first-come, first-served."')
WHERE id = 'wa_mount_rainier_tahoma_glacier'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit. Mount Tom area, North Cascades.';

-- wa_mount_rainier_tahoma_glacier: gain_ft (5007) contradicted this row's own itinerary, whose
-- three days sum to 3300+3700+5000 = 12,000 ft, matching the itinerary's own totalNote
-- ("~12,000 ft gain").
UPDATE routes SET gain_ft = 12000
WHERE id = 'wa_mount_rainier_tahoma_glacier'
  AND gain_ft = 5007;

-- wa_mount_rainier_tahoma_glacier: loss_ft (9500) contradicted this row's own itinerary, whose
-- descent days sum to 5000+7000 = 12,000 ft, mirroring the corrected gain_ft for a there-and-back
-- glacier route.
UPDATE routes SET loss_ft = 12000
WHERE id = 'wa_mount_rainier_tahoma_glacier'
  AND loss_ft = 9500;

-- wa_mount_rainier_tahoma_glacier: timing.approachTimeHrs (6) undercounted this row's own two
-- approach legs in timing.sectionBreakdown (6.5 + 5 = 11.5 hrs); totalHrs (26.5) only reconciles
-- as 11.5 + 8 (summit) + 7 (descent), not 6 + 8 + 7.
UPDATE routes SET timing = jsonb_set(timing, '{approachTimeHrs}', '11.5')
WHERE id = 'wa_mount_rainier_tahoma_glacier'
  AND (timing->>'approachTimeHrs')::numeric = 6;

-- wa_mount_rainier_tahoma_glacier: gpx held a fabricated 2-point straight line between the
-- trailhead and Columbia Crest, contradicting this same row's own data_quality.gaps ("No public
-- GPS track found for this route as of this research pass").
UPDATE routes SET gpx = NULL
WHERE id = 'wa_mount_rainier_tahoma_glacier'
  AND gpx = '[[46.7424,-121.8995],[46.8517,-121.7603]]'::jsonb;

-- wa_mount_rainier_willis_wall: gpx held a fabricated 3-point track that was just straight lines
-- connecting the row's own 3 waypoints, contradicting this same row's own data_quality.gaps
-- ("No public GPS track found for this route as of this research pass").
UPDATE routes SET gpx = NULL
WHERE id = 'wa_mount_rainier_willis_wall'
  AND gpx = '[[46.9003,-121.6581],[46.9778,-121.8317],[46.8658,-121.7817]]'::jsonb;

-- wa_mount_redoubt_south_face: gain_ft (5000) contradicted this row's own itinerary (day 1:
-- 3100 ft + day 2: 3300 ft = 6,400 ft) and its own itinerary totalNote ("~17 miles and ~6,400 ft
-- round trip"); also close to the raw trailhead(2,600 ft)-to-summit(8,969 ft) delta of 6,369 ft.
UPDATE routes SET gain_ft = 6400
WHERE id = 'wa_mount_redoubt_south_face'
  AND gain_ft = 5000;

-- wa_mount_redoubt_south_face: itinerary.days[1].note cited the true summit at "8,963 ft",
-- contradicting this same row's own high_point_ft (8969), summit waypoint elevation (8969), and
-- its own corrections field (which documents 8,969 ft as the deliberately-chosen figure over a
-- rejected 8,603 ft Mountain Project number and an 8,958 ft LiDAR revision). 8,963 matches none
-- of the candidates this row itself already settled on.
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,1,note}',
  '"From camp, cross Depot Creek and scramble the broken buttress southwest of the lake to gain the Redoubt Glacier, then rope up for a mostly gentle glacier walk (a few crevassed/icy sections) around to the south side. Exit the glacier at the low point near the flying buttress (~7,800 ft), kick steps up a steepening snow gully to short class 2-3 rock ribs and chimneys, and finish through the summit block''s chimneys/notches (some parties belay or rappel a short section) to the true summit at 8,969 ft."')
WHERE id = 'wa_mount_redoubt_south_face'
  AND itinerary->'days'->1->>'note' LIKE '%true summit at 8,963 ft.%';

-- wa_mount_redoubt_south_face: approach_logistics.trailheadLat/Lng (49.0217, -121.2542) sat
-- ~11 km from this row's own actual described trailhead -- waypoints[0] ("Depot Creek Road
-- washout", the real start of the route per this row's own approach/itinerary text) is at
-- 49.033, -121.4025. The stored coordinate placed the "trailhead" further east than even Ouzel
-- Lake (-121.2633), geographically incoherent for a route that starts on the BC roadside and
-- travels southeast to the summit.
UPDATE routes SET approach_logistics = jsonb_set(
    jsonb_set(approach_logistics, '{trailheadLat}', '49.033'),
    '{trailheadLng}', '-121.4025')
WHERE id = 'wa_mount_redoubt_south_face'
  AND (approach_logistics->>'trailheadLat')::numeric = 49.0217
  AND (approach_logistics->>'trailheadLng')::numeric = -121.2542;

-- wa_mount_seattle_noyes_basin: approach_logistics.trailheadDirection cited "~16 miles" from
-- the North Fork Quinault Trailhead to Low Divide. Multiple corroborating sources (Mountaineers.org
-- route page, echoed by Hiking Project and Komoot trail summaries) put this leg at ~9.2 miles
-- one-way; 16 miles appears to conflate it with a round-trip or unrelated longer figure.
UPDATE routes SET approach_logistics = jsonb_set(approach_logistics, '{trailheadDirection}',
  '"From the North Fork Quinault Trailhead (525 ft, end of North Shore Road off US-101): ~9 miles up the North Fork Quinault Trail to Low Divide (river fords at Wild Rose, Elip, and 16-Mile creeks can be hazardous in high water), then the Noyes Basin scramble route"')
WHERE id = 'wa_mount_seattle_noyes_basin'
  AND approach_logistics->>'trailheadDirection' LIKE '%~16 miles up the North Fork Quinault Trail to Low Divide%';

-- wa_mount_seattle_seattle_creek: same defect as Noyes Basin -- approach_logistics.trailheadDirection
-- cited "~16 miles" from the North Fork Quinault Trailhead to Low Divide against corroborating
-- sources putting the leg at ~9.2 miles one-way.
UPDATE routes SET approach_logistics = jsonb_set(approach_logistics, '{trailheadDirection}',
  '"From the North Fork Quinault Trailhead (525 ft, end of North Shore Road off US-101): ~9 miles up the North Fork Quinault Trail toward Low Divide, then the Seattle Creek Basin scramble route"')
WHERE id = 'wa_mount_seattle_seattle_creek'
  AND approach_logistics->>'trailheadDirection' LIKE '%~16 miles up the North Fork Quinault Trail toward Low Divide%';
