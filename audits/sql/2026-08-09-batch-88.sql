-- WA alpine audit -- batch 88 (pass 2) -- 2026-08-09
-- Routes: wa_mount_sefrit_southeast_ridge, wa_mount_sefrit_southwest_ridge,
--         wa_mount_shuksan_beckey_schmidtke, wa_mount_shuksan_fisher_chimneys,
--         wa_mount_shuksan_hanging_glacier, wa_mount_shuksan_north_face,
--         wa_mount_shuksan_northeast_ridge, wa_mount_shuksan_northwest_arete
-- Researched via 3 parallel agents grouped by peak (Sefrit x2; Shuksan x3; Shuksan x3).
-- Fisher Chimneys: no confirmed errors -- FA party/year has zero external corroboration and is
-- flagged for human review only, nothing here to fix.

-- wa_mount_sefrit_southeast_ridge: approach cited Hannegan Campground trailhead elevation as
-- "about 2,950 ft", but two independent sources (The Mountaineers' Hannegan Pass route page and
-- Trailforks' Hannegan Pass trail page) both give ~3,110-3,120 ft, ~5% higher than stored.
UPDATE routes SET approach = 'Drive Mt. Baker Highway (SR 542) to Hannegan Pass Road (FS 32); at 1.3 miles bear left onto Ruth Creek Road and continue to its end at Hannegan Campground (about 3,120 ft). From the pullout/campground, cross Ruth Creek (a log crossing has been used) and bushwhack roughly 45 minutes through slide alder and devil''s club to the base of the Wall Street couloir.'
WHERE id = 'wa_mount_sefrit_southeast_ridge'
  AND approach LIKE '%Hannegan Campground (about 2,950 ft)%';

-- wa_mount_sefrit_southwest_ridge: dist_km (9.3km / 5.8mi) contradicted this row's own
-- corrections field, which documents the stats as derived from a ~10.5 mi round trip
-- (peakery.com) -- the derivation note and the stored number disagree.
UPDATE routes SET dist_km = 16.9
WHERE id = 'wa_mount_sefrit_southwest_ridge'
  AND dist_km = 9.3;

-- wa_mount_sefrit_southwest_ridge: gain_ft/loss_ft (4500/4500) contradicted this row's own
-- itinerary.days[0].gainFt/lossFt (5000/5000), peakery.com ("about 5,000 feet of elevation
-- gain"), and simple arithmetic from this row's own sourced trailhead (2,140 ft) and summit
-- (7,191 ft) elevations (5,051 ft) -- all three agree on ~5,000, none support 4,500. The wrong
-- values match the sibling Southeast Ridge route's gain/loss exactly, suggesting a copy/paste.
UPDATE routes SET gain_ft = 5000, loss_ft = 5000
WHERE id = 'wa_mount_sefrit_southwest_ridge'
  AND gain_ft = 4500 AND loss_ft = 4500;

-- wa_mount_sefrit_southwest_ridge: itinerary.days[0].miles (5.8) and the totalNote's "~5.8 mi
-- round trip" both disagree with this same row's corrections field (~10.5 mi round trip,
-- peakery.com) -- same underlying error as the dist_km fix above, applied inside the itinerary.
UPDATE routes SET itinerary = jsonb_set(
    jsonb_set(itinerary, '{days,0,miles}', '10.5'),
    '{totalNote}',
    '"A long single day car-to-car: roughly 10-14 hours, ~5,000 ft gain, ~10.5 mi round trip - no camp, done entirely in a day like the other standard routes on this peak."'
  )
WHERE id = 'wa_mount_sefrit_southwest_ridge'
  AND (itinerary->'days'->0->>'miles')::numeric = 5.8;

-- wa_mount_sefrit_southwest_ridge: access.permit described a paid North Cascades National Park
-- backcountry-permit regime ($10/person + $6 fee, Recreation.gov, Glacier PSC issuing NCNP
-- permits only Thu/Fri) that contradicts this row's own top-level `permit` field (free self-issue
-- Mount Baker Wilderness permit, no fee) and the sibling Southeast Ridge route's identical land
-- manager. This route's own approach beta leaves the trail at ~1.7 mi, well short of where
-- independent sources place the actual Mount Baker Wilderness/NCNP boundary near the Nooksack
-- Cirque -- the NCNP fee language reads as contamination from an adjacent area's record.
-- Replaced with the same free self-issue permit text already verified correct on this row's own
-- `permit` field.
UPDATE routes SET access = jsonb_set(access, '{permit}',
  '"Free self-issue Mount Baker Wilderness permit or trailhead registration; no quota or fee. Northwest Forest Pass at developed trailheads."')
WHERE id = 'wa_mount_sefrit_southwest_ridge'
  AND access->>'permit' LIKE '%$10/person plus a non-refundable $6 fee%';

-- wa_mount_shuksan_north_face: climate.forecastZone ("NWAC Mt. Baker zone") is not one of
-- NWAC's actual zone names and contradicts this same row's own seasonal_hazards.avalanche.zone,
-- which already correctly reads "West Slopes North (NWAC)".
UPDATE routes SET climate = jsonb_set(climate, '{forecastZone}', '"West Slopes North (NWAC)"')
WHERE id = 'wa_mount_shuksan_north_face'
  AND climate->>'forecastZone' = 'NWAC Mt. Baker zone';

-- wa_mount_shuksan_northeast_ridge: same defect as North Face above -- "NWAC/NWS Mt. Baker
-- zone" is not an NWAC zone name; the correct name for this area is "West Slopes North (NWAC)".
UPDATE routes SET climate = jsonb_set(climate, '{forecastZone}', '"West Slopes North (NWAC)"')
WHERE id = 'wa_mount_shuksan_northeast_ridge'
  AND climate->>'forecastZone' = 'NWAC/NWS Mt. Baker zone';

-- wa_mount_shuksan_northwest_arete: waypoints[1] (the Mount Shuksan summit) gave elevFt 9127,
-- disagreeing with this row's own high_point_ft, the parent area's elevation_ft, and the North
-- Face/Fisher Chimneys routes' own summit waypoints, all of which use 9131 -- the well-
-- established figure for Mount Shuksan.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,elevFt}', '9131')
WHERE id = 'wa_mount_shuksan_northwest_arete'
  AND (waypoints->1->>'elevFt')::int = 9127;

-- wa_mount_shuksan_beckey_schmidtke: high_point_ft (8268) disagreed with this row's own
-- overview text ("8,285 ft rock spire") and its own "Nooksack Tower summit" waypoint (8285), and
-- with Wikipedia/USGS GNIS (Feature ID 1523716), which both give 8,285 ft for Nooksack Tower.
-- 8268 traces to a single NWHikers.net trip-report title, not an elevation authority.
UPDATE routes SET high_point_ft = 8285
WHERE id = 'wa_mount_shuksan_beckey_schmidtke'
  AND high_point_ft = 8268;

-- wa_mount_shuksan_beckey_schmidtke: access.notes described the Lake Ann Trail / Sulphide
-- Glacier / Fisher Chimneys approach -- a different Mount Shuksan route/trailhead entirely (that
-- text is accurate on the sibling Fisher Chimneys route, where it isn't touched here). Beckey-
-- Schmidtke's own approach field and waypoints instead describe Ruth Creek Road / Nooksack
-- Cirque Trail #750, crossing the Mount Baker Wilderness boundary ~3 mi in and the North
-- Cascades NP boundary ~4 mi in (per this row's own approach text) -- replaced access.notes to
-- match the approach this row actually documents.
UPDATE routes SET access = jsonb_set(access, '{notes}',
  '"Dual land manager: the approach follows Ruth Creek Road (FS-32) and Nooksack Cirque Trail #750 on Mount Baker-Snoqualmie National Forest (Mount Baker Wilderness) for roughly the first 3-4 miles; the North Cascades National Park boundary is crossed about 4 miles in, placing Price Lake, the bivy basin, and Nooksack Tower''s north face within the Park."')
WHERE id = 'wa_mount_shuksan_beckey_schmidtke'
  AND access->>'notes' LIKE '%Lake Ann Trail, Sulphide Glacier forest approach%';

-- wa_mount_shuksan_hanging_glacier: rope_note claimed the route is "used as an AMGA guide exam
-- route" -- sources instead identify Mount Shuksan's North Face (a sibling route in this same
-- batch) as the route commonly used for AMGA Alpine Guide exams; no source connects Hanging
-- Glacier to AMGA exams. Removed the misattributed clause, kept the sourced physical description.
UPDATE routes SET rope_note = '~3,000 ft of 40-50 deg snow/glacial ice to gain the upper Hanging Glacier, then 4th-5th class rock to the summit pyramid.'
WHERE id = 'wa_mount_shuksan_hanging_glacier'
  AND rope_note LIKE '%used as an AMGA guide exam route%';

-- wa_mount_shuksan_hanging_glacier: top-level season ("Jul-Aug") contradicted this same row's
-- own best_season ("May to June") and seasonal_guidance.monthBreakdown (May optimal, June good,
-- July marked risky, no August entry at all). Independent sources describe this as a spring
-- alpine-ice line climbed before the glacier goes out of condition, consistent with May-June.
UPDATE routes SET season = 'May-Jun'
WHERE id = 'wa_mount_shuksan_hanging_glacier'
  AND season = 'Jul-Aug';
