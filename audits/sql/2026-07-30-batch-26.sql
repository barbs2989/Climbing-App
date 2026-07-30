-- WA Alpine Audit — Pass 1, Batch 26 — 2026-07-30
-- Peaks: Mount Formidable (South Face), Mount Fury East/West (Mongo Ridge,
--        West Ridge, Southeast Glaciers), Mount Goode (Northeast Buttress),
--        Mount Hardy (Southwest Slopes), Mount Hinman (Hinman Glacier),
--        Mount Howard (South Slope), Mount Index (North Norwegian Buttress,
--        North Peak Traverse)

-- =========================================================================
-- Mount Formidable
-- =========================================================================

-- wa_mount_formidable_south_face: fa misspelled two of the four 1938 FA
-- climbers' names ("Calder Bessler" / "Ralph Clough") -- the same row's own
-- area (wa_mount_formidable.blurb) already spells them correctly ("Calder
-- Bressler, Ray Clough"), confirmed via the Alpine Institute's Ptarmigan
-- Traverse history page and a UC Academic Senate in-memoriam for Ray W.
-- Clough. Fixed to match.
UPDATE routes SET fa = replace(
  fa,
  'Calder Bessler, Ralph Clough, Bill Cox, and Tom Myers',
  'Calder Bressler, Ray Clough, Bill Cox, and Tom Myers'
) WHERE id = 'wa_mount_formidable_south_face';

-- wa_mount_formidable_south_face: approach text gave Cascade Pass's
-- elevation as "5,560 ft", contradicting this same row's own `waypoints`
-- entry for "Cascade Pass" (elev 5392) and Wikipedia's Cascade Pass
-- infobox (5,392 ft / 1,643 m). Fixed the outlier prose figure.
UPDATE routes SET approach = replace(
  approach,
  'Cascade Pass (5,560 ft)',
  'Cascade Pass (5,392 ft)'
) WHERE id = 'wa_mount_formidable_south_face';

-- wa_mount_formidable_south_face: approach text gave Cache Col's elevation
-- as "~6,600 ft", contradicting this same row's own `waypoints` entry for
-- "Cache Col" (elev 6903) and Wikipedia's Cache Col figure (6,903 ft /
-- 2,104 m). Fixed the outlier prose figure.
UPDATE routes SET approach = replace(
  approach,
  'Cache Col (~6,600 ft)',
  'Cache Col (~6,903 ft)'
) WHERE id = 'wa_mount_formidable_south_face';

-- =========================================================================
-- Mount Goode
-- =========================================================================

-- wa_mount_goode_northeast_buttress: fa dated the Pilling/Mascioli first
-- winter ascent to "March 3-5, 1985" -- AAC Publications' report of this
-- climb appears in the 1985 American Alpine Journal, but documents a climb
-- that took place in winter 1984 (party dropped at the Stehekin River road
-- Feb 26, 1984; summited ~Mar 5, 1984, per independent trip-report/summary
-- sources). The DB's "1985" looks like a mix-up with the AAJ's publication
-- year rather than the climb year. Fixed to 1984.
UPDATE routes SET fa = replace(
  fa,
  'March 3-5, 1985',
  'March 3-5, 1984'
) WHERE id = 'wa_mount_goode_northeast_buttress';

-- =========================================================================
-- Mount Fury (East Peak / West Peak)
-- =========================================================================

-- areas.wa_mount_fury_east: elevation_ft stored 8326, a stale figure that
-- matches neither this same area's own blurb (which already settles on the
-- 2022 Gilbertson theodolite survey figure of 8,356+-8 ft for East Fury) nor
-- the peak's own route (wa_mount_fury_east_southeast_glaciers.high_point_ft
-- = 8356, fixed below to match). Fixed the area row to match its own
-- already-researched blurb text and route data.
UPDATE areas SET elevation_ft = 8356 WHERE id = 'wa_mount_fury_east';

-- wa_mount_fury_east_southeast_glaciers: the "East Fury Summit" waypoint's
-- elev (8326) contradicted this same row's own high_point_ft (8356) and the
-- area's settled 2022 theodolite figure (8,356+-8 ft, Eric Gilbertson
-- survey) -- looks like a leftover from the older ~2019 GPS estimate (area
-- blurb cites 8,322 ft) that was never updated when high_point_ft was.
-- Fixed to match.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{7,elev}', '8356'::jsonb) WHERE id = 'wa_mount_fury_east_southeast_glaciers';

-- wa_mount_fury_east_mongo_ridge (Mongo Ridge, West Peak -- see audit log
-- for a separate id/area-mismatch flag on this route, not fixed here):
-- gain_ft/loss_ft stored 11000/4000, contradicting this same row's own
-- itinerary.days sum (10,000 gain / 10,700 loss) and its own totalNote
-- ("roughly 10,000+ ft of cumulative gain each way" -- implying loss should
-- also be ~10,000+, not 4,000). Fixed to match the row's own itinerary.
UPDATE routes SET gain_ft = 10000, loss_ft = 10700 WHERE id = 'wa_mount_fury_east_mongo_ridge';

-- wa_mount_fury_west_west_ridge: gain_ft/loss_ft stored 7000/6640,
-- contradicting this same row's own itinerary.days sum (9,100/9,100) and
-- its own totalNote ("~41 miles round trip with roughly 9,000+ ft of
-- cumulative gain"). Fixed to match the row's own itinerary.
UPDATE routes SET gain_ft = 9100, loss_ft = 9100 WHERE id = 'wa_mount_fury_west_west_ridge';

-- =========================================================================
-- Mount Hinman
-- =========================================================================

-- wa_mount_hinman_hinman_glacier: gain_ft/loss_ft stored 3500/7800, an
-- implausible ~4,300 ft imbalance for a route this row's own descent_text
-- describes as a there-and-back via the same trail. This same row's own
-- itinerary.days sum to 6,100 ft gain / 6,300 ft loss (4200+1900+0 gain;
-- 200+1900+4200 loss), closely matching its own descent_text ("5,700-9,000
-- ft of cumulative gain/loss"). Fixed to match the row's own itinerary.
UPDATE routes SET gain_ft = 6100, loss_ft = 6300 WHERE id = 'wa_mount_hinman_hinman_glacier';

-- wa_mount_hinman_hinman_glacier: access.land_manager said "Mt.
-- Baker-Snoqualmie National Forest (Snoqualmie Ranger District)", directly
-- contradicting this same row's own emergency.rangerStation ("Skykomish
-- Ranger District") -- the Necklace Valley/East Fork Foss approach used by
-- this route is entirely on the US-2/Skykomish side (confirmed via the
-- USFS Necklace Valley Trailhead page), not the I-90/Snoqualmie side.
-- Fixed to match the row's own correct field.
UPDATE routes SET access = jsonb_set(
  access, '{land_manager}',
  '"Mt. Baker-Snoqualmie National Forest (Skykomish Ranger District)"'
) WHERE id = 'wa_mount_hinman_hinman_glacier';

-- areas.wa_mount_hinman: blurb opened by calling Hinman "the second-highest
-- summit in the Alpine Lakes Wilderness" -- false; Mount Stuart (9,415 ft)
-- is the wilderness's actual high point, and several Stuart Range summits
-- (Colchuck, Dragontail, Sherpa, Argonaut, etc.) plus Mount Daniel's own
-- higher (West/true) summit all exceed Hinman's 7,492 ft too, confirmed via
-- Wikipedia/SummitPost. Removed the false superlative rather than guess a
-- specific correct rank.
UPDATE areas SET blurb = replace(
  blurb,
  'The second-highest summit in the Alpine Lakes Wilderness, a broad glaciated dome',
  'A broad glaciated dome'
) WHERE id = 'wa_mount_hinman';

-- =========================================================================
-- Mount Howard
-- =========================================================================

-- wa_mount_howard_south_slope: grade/grade_system/grade_num/alpine_grade/
-- disciplines were all null despite this same row's own overview/
-- pitch_detail text and the parent area's own blurb both already describing
-- it as a "Class 2-3" / "long, non-technical but strenuous scramble" --
-- confirmed via SummitPost.org's Mount Howard page, a trailcatjim.com trip
-- report ("scrambling is no more than class 2-3"), and Mountaineers.org
-- Alpine Scramble trip listings for this peak. This is a genuine enrichment
-- gap (row is manually enriched, auto_generated=false), not a fact error --
-- filled from the row's own already-correct prose and sourced externally,
-- matching the sibling non-technical-scramble route in this same batch
-- (wa_mount_hardy_snow_scramble) field-for-field. rock_grade/ice_grade left
-- null (not applicable, same as the Hardy precedent).
UPDATE routes SET
  grade = 'Class 2-3',
  grade_system = 'class',
  grade_num = 2,
  alpine_grade = 'Class 2-3',
  disciplines = '["mountaineering","scrambling"]'::jsonb
WHERE id = 'wa_mount_howard_south_slope';

-- =========================================================================
-- Mount Index
-- =========================================================================

-- wa_mount_index_north_norwegian_buttress: high_point_ft stored 5991 (Mount
-- Index's Main Peak elevation), but this route climbs to Middle Peak, not
-- Main Peak -- confirmed both externally (Mountain Project pages for the
-- Jotnar and Bluebell lines on this buttress both state directly that the
-- route tops out on Middle Peak) and internally: this same row's own
-- `waypoints` array already lists "Mount Index Middle Peak" at elevFt 5527
-- as the route's Summit waypoint, and its own overview text says the
-- buttress is separated from Main Peak "by a deep cleft" (i.e. does not
-- reach it). Fixed high_point_ft to match the row's own correct waypoint.
UPDATE routes SET high_point_ft = 5527 WHERE id = 'wa_mount_index_north_norwegian_buttress';

-- wa_mount_index_north_norwegian_buttress: gain_ft/loss_ft stored 2200/5000,
-- contradicting this same row's own itinerary.days sum (5,000 ft gain:
-- 2800+1700+500; 5,491 ft loss: 0+0+5491) -- the stored loss_ft (5000)
-- exactly equals the itinerary's gain total instead of its own loss total,
-- suggesting a copy/swap bug. Fixed to match the row's own itinerary.
UPDATE routes SET gain_ft = 5000, loss_ft = 5491 WHERE id = 'wa_mount_index_north_norwegian_buttress';

-- wa_mount_index_north_peak_traverse: commitment stored "I" for a 3-day,
-- bivy-required, roped 5.7 traverse over three summits -- directly
-- contradicted by this same row's own access.notes ("a serious Grade III+
-- alpine objective") and by SummitPost/Beckey-sourced descriptions that
-- rate the North Face segment alone "Grade III, 5.7". Fixed to the value
-- the row's own text and external sourcing agree on; the full multi-summit
-- traverse may warrant higher still, left as a floor rather than guessed
-- further (see audit log).
UPDATE routes SET commitment = 'III' WHERE id = 'wa_mount_index_north_peak_traverse';

-- wa_mount_index_north_peak_traverse: gain_ft stored 3991, contradicting
-- this same row's own itinerary.days sum (5,800 ft: 2500+2000+1300) --
-- which already exactly matches the row's own (already-correct) loss_ft of
-- 5800, as expected for a route that returns to its own trailhead. Fixed
-- gain_ft to match.
UPDATE routes SET gain_ft = 5800 WHERE id = 'wa_mount_index_north_peak_traverse';

-- =========================================================================
-- Verify afterward:
-- =========================================================================
select id, fa, approach from routes where id = 'wa_mount_formidable_south_face';
select id, fa from routes where id = 'wa_mount_goode_northeast_buttress';
select id, elevation_ft from areas where id = 'wa_mount_fury_east';
select id, waypoints, gain_ft, loss_ft from routes where id = 'wa_mount_fury_east_southeast_glaciers';
select id, gain_ft, loss_ft from routes where id = 'wa_mount_fury_east_mongo_ridge';
select id, gain_ft, loss_ft from routes where id = 'wa_mount_fury_west_west_ridge';
select id, gain_ft, loss_ft, access from routes where id = 'wa_mount_hinman_hinman_glacier';
select id, blurb from areas where id = 'wa_mount_hinman';
select id, grade, grade_system, grade_num, alpine_grade, disciplines from routes where id = 'wa_mount_howard_south_slope';
select id, high_point_ft, gain_ft, loss_ft from routes where id = 'wa_mount_index_north_norwegian_buttress';
select id, commitment, gain_ft from routes where id = 'wa_mount_index_north_peak_traverse';
