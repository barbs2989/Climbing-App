-- WA alpine audit -- batch 86 (pass 2) -- 2026-08-09
-- Routes: wa_mount_rainier_fuhrer_thumb, wa_mount_rainier_gibraltar_ledges,
--         wa_mount_rainier_ingraham_direct, wa_mount_rainier_kautz_glacier,
--         wa_mount_rainier_kautz_headwall, wa_mount_rainier_liberty_ridge,
--         wa_mount_rainier_mowich_face, wa_mount_rainier_nisqually_icefall
-- Researched via 3 parallel agents grouped by peak (all 8 are Mount Rainier routes).

-- wa_mount_rainier_fuhrer_thumb: access.permit said "Free climbing permit at Paradise WIC",
-- contradicting this same row's access.fees ($82 cost-recovery fee), access.notes ("$82 per
-- person through Pay.gov"), and top-level permit field -- and every sibling Rainier route in
-- this table says access.permit = "Mount Rainier Climbing Permit". NPS climbing-fee pages
-- confirm the fee is paid, not free. Corrected to match the sibling routes' wording.
UPDATE routes SET access = jsonb_set(access, '{permit}', '"Mount Rainier Climbing Permit"')
WHERE id = 'wa_mount_rainier_fuhrer_thumb'
  AND access->>'permit' = 'Free climbing permit at Paradise WIC';

-- wa_mount_rainier_gibraltar_ledges: waypoints[0] ("Paradise") elevFt was 5420, contradicting
-- this row's own approach text ("From Paradise (5,400 ft)...") and NPS's official Paradise
-- visitor-center elevation (5,400 ft).
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '5400')
WHERE id = 'wa_mount_rainier_gibraltar_ledges'
  AND waypoints->0->>'name' = 'Paradise'
  AND (waypoints->0->>'elevFt')::int = 5420;

-- wa_mount_rainier_ingraham_direct: same defect as Gibraltar Ledges -- waypoints[0] ("Paradise")
-- elevFt was 5420, contradicting this row's own approach text (5,400 ft) and its own
-- approach_logistics.trailhead_elevation_ft (5400), both already correct.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elevFt}', '5400')
WHERE id = 'wa_mount_rainier_ingraham_direct'
  AND waypoints->0->>'name' = 'Paradise'
  AND (waypoints->0->>'elevFt')::int = 5420;

-- wa_mount_rainier_kautz_glacier: waypoints "Camp Hazard" elev was 12500 ft, contradicting this
-- row's own approach text and itinerary (both said 10,800 ft) and external sources
-- (Mountaineers.org, willhiteweb, SummitPost, Mountain Project converge on ~11,100-11,300 ft;
-- no source supports either 12,500 or 10,800). Approach text and itinerary corrected alongside
-- it to the same externally-supported figure rather than to their own mutually-agreeing-but-
-- still-wrong 10,800 ft.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{3,elev}', '11300')
WHERE id = 'wa_mount_rainier_kautz_glacier'
  AND waypoints->3->>'name' = 'Camp Hazard'
  AND (waypoints->3->>'elev')::int = 12500;

UPDATE routes SET approach = replace(approach,
  'Camp Hazard (10,800 ft, at the base of the Turtle Snowfield',
  'Camp Hazard (~11,100-11,300 ft, at the base of the Turtle Snowfield')
WHERE id = 'wa_mount_rainier_kautz_glacier'
  AND approach LIKE '%Camp Hazard (10,800 ft, at the base of the Turtle Snowfield%';

UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,objective}', '"Reach Camp Hazard (~11,100 ft)"')
WHERE id = 'wa_mount_rainier_kautz_glacier'
  AND itinerary->'days'->0->>'objective' = 'Reach Camp Hazard (~10,800 ft)';

-- wa_mount_rainier_kautz_glacier: fa credited guide Wapowety and "four soldiers" with reaching
-- the 1857 high point. Two independent historical accounts (historylink.org; Kautz biographical
-- sources) agree only Kautz, Dr. Craig, and Pvt. Nicholas Dogue continued to the high point --
-- guide Wapowety and Pvt. Carroll turned back earlier from fatigue and snow blindness. The high
-- point's exact elevation is contested across sources (~12,000 ft vs. near the crater rim), so
-- recorded as a range instead of re-asserting a single unverified figure. The 1920 first-full-
-- ascent party/year were independently confirmed and left unchanged; the specific "June 26-28"
-- dates could not be independently corroborated but were also not contradicted, so were left as-is.
UPDATE routes SET fa = 'First approached via this line to a contested high point (cited variously between ~12,000 ft and near the crater rim) by August V. Kautz, Dr. O.R. Craig, and Pvt. Nicholas Dogue, July 1857 -- guide Wapowety and Pvt. Carroll turned back earlier from fatigue and snow blindness, and the party did not reach the true summit; first full ascent to the summit via this route completed June 26-28, 1920 by Hans Fuhrer, Heinie Fuhrer, Roger Toll, and Harry Myers.'
WHERE id = 'wa_mount_rainier_kautz_glacier'
  AND fa = 'Peak first approached via this line to ~12,000 ft by Wapowety, August V. Kautz, Dr. O.R. Craig and four soldiers, July 1857 (did not reach the true summit); first full ascent to the summit via this route completed June 26-28, 1920 by Hans Fuhrer, Heinie Fuhrer, Roger Toll, and Harry Myers.';

-- wa_mount_rainier_kautz_headwall: length_m (259, ~850 ft) contradicted this row's own
-- overview/pitch_detail ("roughly 300-foot wall... climbed in two pitches", 55m+35m=90m) and
-- external sources (Mountaineers.org, Mountain Project, engineeredforadventure.com all describe
-- a ~300 ft, two-pitch, 60m-rope headwall).
UPDATE routes SET length_m = 91
WHERE id = 'wa_mount_rainier_kautz_headwall'
  AND length_m = 259;

-- wa_mount_rainier_kautz_headwall: approach text's Camp Hazard elevation (10,800 ft) contradicted
-- this same row's own itinerary (~11,100 ft, already correct) and the external sources above.
UPDATE routes SET approach = replace(approach,
  'Camp Hazard (10,800 ft, at the top of the snowfield)',
  'Camp Hazard (~11,100 ft, at the top of the snowfield)')
WHERE id = 'wa_mount_rainier_kautz_headwall'
  AND approach LIKE '%Camp Hazard (10,800 ft, at the top of the snowfield)%';

-- wa_mount_rainier_liberty_ridge: waypoints and gpx held coordinates for Mowich Lake and the
-- Puyallup Glacier (Rainier's NW side), contradicting this row's own approach, descent_text,
-- bail, timing.sectionBreakdown, itinerary.days, and approach_logistics fields, which all
-- correctly describe the real White River / Glacier Basin / St. Elmo Pass / Carbon Glacier (NE
-- side) approach -- independently confirmed via Mountaineers.org, SummitPost, and trip-report
-- cross-corroboration. No reliable replacement track was found this pass (the row's own
-- data_quality.gaps cites a CalTopo URL this audit could not fetch to verify); cleared rather
-- than left in place, pending a real GPS track for the actual line.
UPDATE routes SET waypoints = NULL, gpx = NULL
WHERE id = 'wa_mount_rainier_liberty_ridge'
  AND waypoints->0->>'name' = 'Mowich Lake Parking';

-- wa_mount_rainier_nisqually_icefall: itinerary.days[0].note and timing.sectionBreakdown[0].note
-- (identical text in both) described the Kautz Glacier route's Wilson Glacier/Turtle
-- Snowfield/"the Fan" approach -- near-verbatim to Mountaineers.org's Kautz page -- contradicting
-- this row's own approach text and the 1948 first-ascent account, both of which climb directly
-- up the Nisqually Glacier alongside Wapowety Cleaver and never touch the Wilson Glacier.
-- Corrected to match this row's own approach text; the day's hours/miles/gainFt were left as-is
-- since they weren't independently sourced for the corrected line (flagged in the audit log).
UPDATE routes SET itinerary = jsonb_set(itinerary, '{days,0,note}',
  '"Hike from Paradise via the Skyline Trail past Glacier Vista, descend onto the Nisqually Glacier, and ascend it directly alongside Wapowety Cleaver toward a high camp near the lower bergschrund of the icefall."')
WHERE id = 'wa_mount_rainier_nisqually_icefall'
  AND itinerary->'days'->0->>'note' = 'Hike from Paradise to the Nisqually Moraine, descend and cross the Nisqually Glacier, then ascend the Wilson Glacier (via the Fan) to a high camp near the Turtle Snowfield.';

UPDATE routes SET timing = jsonb_set(timing, '{sectionBreakdown,0,note}',
  '"Hike from Paradise via the Skyline Trail past Glacier Vista, descend onto the Nisqually Glacier, and ascend it directly alongside Wapowety Cleaver toward a high camp near the lower bergschrund of the icefall."')
WHERE id = 'wa_mount_rainier_nisqually_icefall'
  AND timing->'sectionBreakdown'->0->>'note' = 'Hike from Paradise to the Nisqually Moraine, descend and cross the Nisqually Glacier, then ascend the Wilson Glacier (via the Fan) to a high camp near the Turtle Snowfield.';
