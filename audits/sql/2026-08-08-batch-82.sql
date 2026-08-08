-- WA alpine audit -- batch 82 (pass 2) -- 2026-08-08
-- Routes: wa_mount_fury_east_southeast_glaciers, wa_mount_fury_west_west_ridge,
--         wa_mount_goode_northeast_buttress (clean), wa_mount_hardy_snow_scramble,
--         wa_mount_hinman_hinman_glacier, wa_mount_howard_south_slope (clean),
--         wa_mount_index_north_norwegian_buttress, wa_mount_index_north_peak_traverse

-- wa_mount_hardy (area) + wa_mount_hardy_snow_scramble (route): three fields for the same
-- summit disagreed -- routes.high_point_ft already had 8099, but areas.elevation_ft and the
-- route's own "Mount Hardy summit" waypoint both said 8097. The route's own overview text
-- rationalizes the gap as "within normal survey variance," but Wikipedia, Peakbagger and
-- PeakVisor all independently give 8,099 ft, and Wikipedia's summit coordinates are an exact
-- match to this row's own waypoint -- so it's a data-entry slip, not survey variance. Same
-- three sources give prominence 1,519 ft (parent Golden Horn, 1.75 mi -- both already correct
-- in this row) against the DB's 1,512 ft.
UPDATE areas SET elevation_ft = 8099 WHERE id = 'wa_mount_hardy' AND elevation_ft = 8097;

UPDATE areas SET prominence_ft = 1519 WHERE id = 'wa_mount_hardy' AND prominence_ft = 1512;

UPDATE routes SET waypoints = jsonb_set(waypoints, '{7,elev}', '8099')
WHERE id = 'wa_mount_hardy_snow_scramble'
  AND waypoints->7->>'name' = 'Mount Hardy summit'
  AND (waypoints->7->>'elev')::int = 8097;

-- wa_mount_hinman (area): prominence_ft (1306) contradicted by Wikipedia, PeakVisor,
-- Peakery, and listsofjohn.com, which all independently converge on 1,252 ft; elevation
-- itself (7,492 ft) is correct and untouched.
UPDATE areas SET prominence_ft = 1252 WHERE id = 'wa_mount_hinman' AND prominence_ft = 1306;

-- wa_mount_hinman (area): blurb cites neighboring Mount Daniel's elevation as 7,899 ft --
-- that's Daniel's lower East Peak. Mount Daniel's main/true (West) summit -- the one
-- officially recognized as the King/Kittitas county highpoint -- is 7,960 ft per Wikipedia
-- and guidebook sources, matching the figure this app's OWN route overview for Mount Daniel
-- already uses elsewhere in the catalog. Direction ("west of Daniel") is already correct.
UPDATE areas SET blurb = replace(blurb, 'Mount Daniel (7,899 ft)', 'Mount Daniel (7,960 ft)')
WHERE id = 'wa_mount_hinman' AND blurb LIKE '%Mount Daniel (7,899 ft)%';

-- wa_mount_fury_east_southeast_glaciers: fa credited "Don Keller, Joan Firey, and Joe
-- Firey, 1960," but AAC Publications' obituary for Helmy Beckey and The Mountaineers' own
-- "Remembering Mountaineer Helmy Beckey" blog both state Fred and (14-year-old) Helmy Beckey
-- made first ascents through the Picket Range in 1940 including explicitly "Mt. Fury's East
-- Peak" -- 20 years earlier than the DB's claim. (A secondary, lower-tier thread of trip
-- reports instead credits an unnamed 1930s Ptarmigan Climbing Club summit-register note;
-- sources disagree on Beckey-1940 vs. Ptarmigan-1930s, but neither supports the 1960
-- Keller/Firey credit in the row, so that part is fixed with medium-high confidence -- flagged
-- in the audit log for a human to double check against Beckey's guide/AAJ archives.)
UPDATE routes SET fa = 'Fred Beckey and Helmy Beckey, 1940 -- first ascent of East Fury during their 1940 Picket Range exploration'
WHERE id = 'wa_mount_fury_east_southeast_glaciers'
  AND fa = 'Don Keller, Joan Firey, and Joe Firey, 1960 -- first ascent of East Fury via the southeast glacier';

-- wa_mount_fury_east_southeast_glaciers: access.fees quoted the pre-2024 NPS backcountry
-- rate ($5/person/night). NPS North Cascades restructured fees in March 2024 to
-- $10/person/night (confirmed via nps.gov/noca, National Parks Traveler, AP/goskagit.com
-- coverage) -- the $6 Recreation.gov reservation fee already on file is unchanged/correct.
UPDATE routes SET access = jsonb_set(access, '{fees}',
  '"$10 per person per night backcountry camping fee; $6 non-refundable Recreation.gov reservation fee if booking in advance (not charged for walk-up permits, subject to same-day availability)."')
WHERE id = 'wa_mount_fury_east_southeast_glaciers'
  AND access->>'fees' = '$5 per person per night backcountry camping fee; $6 non-refundable Recreation.gov reservation fee if booking in advance (not charged for walk-up permits, subject to same-day availability).';

-- wa_mount_fury_east_southeast_glaciers: loss_ft (13000) contradicts this row's own 4-day
-- itinerary, which sums to gain ~6900 ft / loss ~7200 ft for a round trip that starts and
-- ends at the same Ross Dam trailhead (gain_ft=6200 is already in the right range). 13000
-- looks like the row's own "~13,000 ft cumulative gain+loss" total (quoted elsewhere in
-- itinerary.totalNote/descent_text) got stored in the loss-only field instead.
UPDATE routes SET loss_ft = 7200 WHERE id = 'wa_mount_fury_east_southeast_glaciers' AND loss_ft = 13000 AND gain_ft = 6200;

-- wa_mount_fury_west_west_ridge: descent_text's closing note misattributed Wayne Wallace's
-- 2006 solo first ascent of Mongo Ridge (West Fury's separate south-buttress route, VI 5.10,
-- 4 days, 12 rappels -- confirmed via AAC Publications and Wallace's own trip report) to a
-- nonexistent "1981 solo first ascent of the full connecting West Ridge." Same
-- Mongo-Ridge-bleeding-into-a-neighboring-route pattern flagged in batch 81 for the East
-- Peak's Mongo Ridge route itself; here it contaminated the West Ridge route's descent note.
UPDATE routes SET descent_text = replace(descent_text,
  'Note: the original 1981 solo first ascent of the full connecting West Ridge (a much longer multi-day traverse over several gendarmes, not a standalone summit-day descent) used twelve rappels across four days - that figure describes the entire ridge project, not what a typical party rappels descending from West Peak alone.',
  'Note: Mongo Ridge (VI 5.10), a separate, much longer route on West Fury''s south buttress, was first climbed solo by Wayne Wallace over four days in August 2006 using twelve rappels -- that figure describes a different climb entirely, not what a typical party rappels descending from West Peak via this route.')
WHERE id = 'wa_mount_fury_west_west_ridge'
  AND descent_text LIKE '%the original 1981 solo first ascent of the full connecting West Ridge%';

-- wa_mount_fury_west_west_ridge: waypoints/gpx arrays are out of distance order -- the West
-- Fury summit waypoint (distMi 23.3, the route's actual endpoint) sits at array index 1,
-- immediately after the trailhead, instead of last after East Fury (distMi 23). A consumer
-- plotting the track in array order would jump straight from the trailhead to the summit and
-- back. Reordered here to ascending distMi (Trailhead, Big Beaver Landing, Luna Camp, Access
-- Creek crossing, Access Creek headwaters, Luna Col, East Fury, West Fury); gpx mirrors the
-- same fix since its points are the same 8, in the same original (wrong) order.
UPDATE routes SET waypoints = jsonb_build_array(waypoints->0, waypoints->2, waypoints->3, waypoints->4, waypoints->5, waypoints->6, waypoints->7, waypoints->1)
WHERE id = 'wa_mount_fury_west_west_ridge' AND waypoints->1->>'name' = 'West Fury (Mount Fury, West Peak)';

UPDATE routes SET gpx = jsonb_build_array(gpx->0, gpx->2, gpx->3, gpx->4, gpx->5, gpx->6, gpx->7, gpx->1)
WHERE id = 'wa_mount_fury_west_west_ridge' AND (gpx->1->0)::numeric = 48.8119818;

-- wa_mount_index_north_peak_traverse: top-level pitches (4) contradicts this same row's own
-- itinerary.days[1].note and timing.sectionBreakdown, both of which describe "~12 pitches"
-- for the North Face climb -- and Mountain Project / CascadeClimbers.com corroborate the
-- standard North Face Route on North Peak as a 12-pitch, Grade III line.
UPDATE routes SET pitches = 12 WHERE id = 'wa_mount_index_north_peak_traverse' AND pitches = 4;

-- wa_mount_index_north_norwegian_buttress: pro_needs called the original 1980s Pete Doorish
-- solo aid line "easier, roughly A2." AAC Publications and a CascadeClimbers.com trip report
-- both identify the Doorish Route as VI 5.9 A3 -- comparable to the modern Jotnar A3+ line,
-- not easier than it.
UPDATE routes SET pro_needs = replace(pro_needs,
  'the original 1980s Doorish solo line was easier, roughly A2',
  'the original 1980s Doorish solo line (VI 5.9 A3) was comparable in aid difficulty, not easier')
WHERE id = 'wa_mount_index_north_norwegian_buttress'
  AND pro_needs LIKE '%the original 1980s Doorish solo line was easier, roughly A2%';

-- wa_mount_goode_northeast_buttress: fully audited, no confirmed errors. Elevation,
-- prominence, coordinates, both first-ascent records, first winter ascent, grade, descent
-- sequence, permit fees, and the 2026 SR-20 reopening note all checked out. Flagged (not
-- fixed, see audit log): pitches (6 vs the row's own pitch_detail's ~5 vs external ~6-10, all
-- within normal counting-convention variance) and an unresolved internal disagreement between
-- obj_haz ("low on the route") and pitch_detail ("mid buttress, ~8,000 ft") on where the
-- unprotectable 5.7 slab sits.

-- wa_mount_howard_south_slope: fully audited, no confirmed errors. This is the Nason Ridge
-- Mount Howard (Chelan County, near Lake Wenatchee) -- not the Wallowa Lake, OR peak of the
-- same name -- confirmed via near-exact coordinate match to Wikipedia. Elevation, prominence,
-- both trailheads, land manager, and permit-free status (north of the Alpine Lakes Wilderness
-- boundary) all checked out. Flagged (not fixed): gain_ft/loss_ft (4600) may understate the
-- longer Rock Mountain TH approach option vs. the shorter Merritt Lake TH approach the route
-- also describes; timing.descentTimeHrs + other legs don't sum cleanly against
-- timing.totalHrs; fa is null and unverifiable (Beckey's guide, the likely source, wasn't
-- accessible).

-- NEEDS HUMAN VERIFICATION, not fixed here (see audits/wa-alpine-audit-log.md for detail):
-- wa_mount_fury_east_southeast_glaciers area elevation_ft (8356): matches a 2022 theodolite
--   survey (and this row's own overview), but a more precise Oct 2024 GPS resurvey by the same
--   group measured 8,321.5 ft -- two legitimate surveys disagree by ~34 ft; not resolved.
-- wa_mount_fury_west_west_ridge: East Fury waypoint sits only ~40m from West Fury's own
--   waypoint, implausibly close for a 0.25-0.5 mi connecting-ridge traverse per trip reports --
--   could not obtain an independently confirmed East Fury summit coordinate to correct it.
-- wa_mount_fury_west_west_ridge: three different round-trip mileage figures appear across
--   itinerary.days (28.5 mi), itinerary.totalNote ("~41 miles"), and dist_km*2 (~46.6 mi) --
--   could not determine which, if any, is authoritative.
-- wa_mount_index_north_peak_traverse: fa names "Bill (Wolf) Schoening" alongside Beckey for
--   the 1950 first ascent, but every source found (Pete Schoening's AAC/Wikipedia obituary,
--   an Archives West finding aid, AAC's own "Traverse of Mt. Index" article snippets) points
--   to Pete Schoening, Beckey's regular 1950s Cascades partner -- no source uses "Bill" or
--   "Wolf." Full primary text (AAC article) was egress-blocked, so not changed without a human
--   confirming against the primary source.
-- wa_mount_index_north_peak_traverse: fa also claims Middle Peak was "unclimbed until this
--   ascent" (1950), but one secondary source snippet describes Middle Peak's summit being
--   reached via a traverse from North Peak "eight years after" this climb -- directly
--   contradicts the DB's claim; primary source (AAC/Beckey) not accessible to resolve.
