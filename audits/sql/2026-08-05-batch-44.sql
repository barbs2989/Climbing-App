-- WA alpine route audit -- batch 44 (pass 1)
-- Peaks checked: Black Peak (South Ridge), Whatcom Peak (South Spur), South Twin Sister
-- (North Ridge, Olivine Scramble, West Ridge), Sharkfin Tower (Southeast Face), Southeast
-- Mox Peak (West Ridge, mislabeled 'Southeast Rib' in the DB), Mount Shuksan (Southeast
-- Ridge / SE Corner), South Early Winters Spire (Southern Man), Dorado Needle (Southwest
-- Buttress).
-- See audits/wa-alpine-audit-log.md for the full writeup of this batch, including items
-- flagged for human review that are NOT included in this file.

-- =========================================================================
-- Black Peak
-- =========================================================================

-- wa_south_ridge_3: top-level lat/lng were null. This row's own waypoints[7] (summit) and
-- approach_logistics.peakLat/peakLng already store 48.523611/-120.816193, matching Wikipedia's
-- Black Peak coordinates exactly -- populated the top-level columns to match.
UPDATE routes
SET lat = 48.523611,
    lng = -120.816193,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: top-level lat/lng populated (were null), matching this row''s own waypoints[]/approach_logistics summit coordinates and Wikipedia''s Black Peak location (48.52361, -120.81611).'
WHERE id = 'wa_south_ridge_3'
  AND lat IS NULL AND lng IS NULL;

-- wa_south_ridge_3: approach_logistics.trailhead/trailheadLat/trailheadLng held "Lake Ann
-- Trailhead (SR-542)" at 48.8500241/-121.6861633 -- that is the Lake Ann Trailhead near Mount
-- Baker/Mount Shuksan off SR-542, confirmed via USFS/PNT.org coordinates (48.850470/-121.686210,
-- within 5 decimal places), a completely different trailhead ~90 miles from Black Peak. Black
-- Peak is actually reached via the Rainy Pass Picnic Area/Lake Ann Trail #740 on SR-20 -- a
-- same-named-trailhead collision. This row's own waypoints[0] and approach text already
-- correctly describe the SR-20 trailhead (48.5156/-120.7362, elev 4850); aligned
-- approach_logistics to match.
UPDATE routes
SET approach_logistics = jsonb_set(
      jsonb_set(
        jsonb_set(approach_logistics, '{trailhead}', '"Rainy Pass Picnic Area / Lake Ann Trailhead (SR-20)"', false),
        '{trailheadLat}', '48.5156', false
      ),
      '{trailheadLng}', '-120.7362', false
    ),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: approach_logistics.trailhead/trailheadLat/trailheadLng corrected -- held the Lake Ann Trailhead on SR-542 near Mount Baker (confirmed via USFS/PNT coordinates, exact match), a different trailhead ~90mi away. Black Peak''s real trailhead (Rainy Pass/Lake Ann Trail #740 on SR-20) was already correct in this row''s own waypoints[0]/approach text.'
WHERE id = 'wa_south_ridge_3'
  AND approach_logistics->>'trailhead' = 'Lake Ann Trailhead (SR-542)'
  AND (approach_logistics->>'trailheadLat')::numeric = 48.8500241;

-- wa_south_ridge_3: alpine_grade ('II') duplicated the commitment field ('II', an NCCS/Roman-
-- numeral commitment grade) instead of holding a French-adjectival grade -- the recurring
-- alpine_grade-vs-commitment bug pattern seen repeatedly in this dataset. No verified French-
-- scale rating was found for this scramble route to substitute, so the duplicate is cleared
-- rather than guessed.
UPDATE routes
SET alpine_grade = NULL,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: alpine_grade cleared -- duplicated the commitment grade (''II'', NCCS/Roman-numeral scale) rather than holding a French-adjectival value; no sourced replacement found.'
WHERE id = 'wa_south_ridge_3'
  AND alpine_grade = 'II' AND commitment = 'II';

-- wa_south_ridge_3: loss_ft was null despite being derivable. This row's own itinerary.days
-- gives day1 lossFt=100 + day2 lossFt=4170 = 4270 ft, consistent with a route that dips to
-- Lewis Lake then descends back to the trailhead.
UPDATE routes
SET loss_ft = 4270,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: loss_ft populated (was null) from this row''s own itinerary.days lossFt sum (100 + 4170).'
WHERE id = 'wa_south_ridge_3'
  AND loss_ft IS NULL;

-- wa_south_ridge_3: access.rules cited Boston Basin-specific camping rules ("Low Camp ~5,300
-- ft, High Camp ~6,400 ft") -- Boston Basin is a real but unrelated North Cascades NP zone
-- near Eldorado/Forbidden Peak, reached via a different drainage (Cascade River Road), and its
-- camp elevations don't match this route's own Wing Lake (6,900 ft)/Lewis Lake (5,700 ft)
-- camps. Copy-paste contamination from an unrelated area's record; replaced with the general
-- group-size policy only, since site-specific rules for this route's actual camps weren't
-- independently confirmed.
UPDATE routes SET access = jsonb_set(
  access, '{rules}',
  '"Group size capped at 6 in off-trail cross-country zones, 12 in on-trail corridors (general NCNP policy). Site-specific Wing Lake/Lewis Lake camping rules not confirmed in sources checked -- needs re-research."'::jsonb
),
corrections = COALESCE(corrections, '') || ' 2026-08-05: access.rules corrected -- cited Boston Basin-specific camp elevations/rules (Low Camp ~5,300 ft, High Camp ~6,400 ft), an unrelated NCNP zone near Eldorado/Forbidden Peak that doesn''t match this route''s own Wing Lake/Lewis Lake camps; replaced with general policy pending site-specific research.'
WHERE id = 'wa_south_ridge_3'
  AND access->>'rules' LIKE '%Boston Basin camping restricted to two designated sites%';

-- =========================================================================
-- Whatcom Peak
-- =========================================================================

-- wa_south_spur: top-level lat/lng were null. This row's own waypoints[1] (48.8561/-121.3825)
-- matches Wikipedia's Whatcom Peak coordinates (48.85611/-121.38250) almost exactly --
-- populated the top-level columns to match.
UPDATE routes
SET lat = 48.8561,
    lng = -121.3825,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: top-level lat/lng populated (were null), matching this row''s own waypoints[] and Wikipedia''s Whatcom Peak location (48.85611, -121.38250).'
WHERE id = 'wa_south_spur'
  AND lat IS NULL AND lng IS NULL;

-- wa_south_spur: top-level gain_ft/loss_ft (6700/1374) contradicted this row's own itinerary
-- day-by-day sums (gainFt 4600+3200+300+2900=11000; lossFt 300+2600+4400+2000=9300) and the
-- loop-closure logic expected of a closed 4-day loop back to the same trailhead -- 1374 ft of
-- total loss is implausible against ~9,300 ft of stored day-by-day descent. itinerary.totalNote
-- independently states "over 10,000 ft of cumulative gain," agreeing with the day-sum.
UPDATE routes
SET gain_ft = 11000,
    loss_ft = 9300,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: gain_ft corrected from 6700 to 11000 and loss_ft from 1374 to 9300, matching this row''s own itinerary.days gain/loss sums for this closed 4-day loop (which should roughly balance) and itinerary.totalNote''s independent "over 10,000 ft of cumulative gain" claim.'
WHERE id = 'wa_south_spur'
  AND gain_ft = 6700 AND loss_ft = 1374;

-- =========================================================================
-- South Twin Sister
-- =========================================================================

-- wa_south_twin_sister_north_ridge: access.land_manager claimed "...with some upper routes
-- crossing into North Cascades National Park." Twin Sisters Mountain sits entirely within
-- Mount Baker Wilderness (Wikipedia); the North Cascades NP boundary is roughly 40 miles away
-- along the wilderness's eastern edge -- no route here approaches NCNP. Likely boilerplate
-- copy-paste from an unrelated peak's record.
UPDATE routes SET access = jsonb_set(
  access, '{land_manager}',
  '"Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) -- Mount Baker Wilderness"'::jsonb
),
corrections = COALESCE(corrections, '') || ' 2026-08-05: access.land_manager corrected -- falsely claimed some routes cross into North Cascades NP; Twin Sisters Mountain is entirely within Mount Baker Wilderness, ~40mi from the NCNP boundary (Wikipedia: Mount Baker Wilderness).'
WHERE id = 'wa_south_twin_sister_north_ridge'
  AND access->>'land_manager' = 'Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) -- Mount Baker Wilderness, with some upper routes crossing into North Cascades National Park';

-- wa_south_twin_sister_north_ridge: access.parking_pass claimed a Northwest Forest Pass is
-- required ($30/year or $5/day). Outside sourcing (mountainproject.com/cascadeclimbers.com)
-- states no permits or parking passes are required in the Sisters Range, and this contradicts
-- the sibling West Ridge route's own access.passRequired field on the same FR 38 trailhead,
-- which correctly says no pass is required at that undeveloped pullout.
UPDATE routes SET access = jsonb_set(
  access, '{parking_pass}',
  '"No developed fee trailhead here -- FR 38 gate/pullout is an undeveloped roadside parking spot; no Northwest Forest Pass required (see access.passRequired on the sibling West Ridge route, same trailhead)."'::jsonb
),
corrections = COALESCE(corrections, '') || ' 2026-08-05: access.parking_pass corrected -- wrongly claimed a Northwest Forest Pass is required; contradicts the sibling West Ridge route''s own access.passRequired field for the same FR 38 trailhead and outside sourcing (mountainproject.com/cascadeclimbers.com: no permits/passes required in the Sisters Range).'
WHERE id = 'wa_south_twin_sister_north_ridge'
  AND access->>'parking_pass' = 'Northwest Forest Pass required at most trailheads -- $30/year or $5/day.';

-- wa_south_twin_sister_west_ridge: access.land_manager carried the same false North Cascades
-- NP claim as the sibling North Ridge route (see above) -- same fix.
UPDATE routes SET access = jsonb_set(
  access, '{land_manager}',
  '"Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) -- Mount Baker Wilderness"'::jsonb
),
corrections = COALESCE(corrections, '') || ' 2026-08-05: access.land_manager corrected -- falsely claimed some routes cross into North Cascades NP; Twin Sisters Mountain is entirely within Mount Baker Wilderness, ~40mi from the NCNP boundary (Wikipedia: Mount Baker Wilderness).'
WHERE id = 'wa_south_twin_sister_west_ridge'
  AND access->>'land_manager' = 'Mt. Baker-Snoqualmie National Forest (Mt. Baker Ranger District) -- Mount Baker Wilderness, with some upper routes crossing into North Cascades National Park';

-- wa_south_twin_sister_west_ridge: access.parking_pass directly contradicted this same row's
-- own access.passRequired field, which already correctly states "No Northwest Forest Pass
-- required at the FR 38 quarry-road pullouts (not a developed recreation site)."
UPDATE routes SET access = jsonb_set(
  access, '{parking_pass}',
  '"No developed fee trailhead here -- FR 38 gate/pullout is an undeveloped roadside parking spot; no Northwest Forest Pass required (see access.passRequired on this same route)."'::jsonb
),
corrections = COALESCE(corrections, '') || ' 2026-08-05: access.parking_pass corrected -- directly contradicted this row''s own access.passRequired field, which already correctly says no pass is required at the FR 38 pullouts.'
WHERE id = 'wa_south_twin_sister_west_ridge'
  AND access->>'parking_pass' = 'Northwest Forest Pass required at most trailheads -- $30/year or $5/day.'
  AND access->>'passRequired' = 'No Northwest Forest Pass required at the FR 38 quarry-road pullouts (not a developed recreation site)';

-- wa_south_twin_sister_west_ridge: gain_ft/loss_ft (3000/5400) are asymmetric for a car-to-car
-- out-and-back (gain should roughly equal loss) and contradict this row's own
-- itinerary.days[0] (gainFt/lossFt: 6100/6100) and totalNote ("~6,100 ft gain"), which cite a
-- real trailcatjim.com trip report (6,102 ft measured gain).
UPDATE routes
SET gain_ft = 6100,
    loss_ft = 6100,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: gain_ft corrected from 3000 to 6100 and loss_ft from 5400 to 6100, matching this row''s own itinerary.days[0] (gainFt/lossFt: 6100) and totalNote ("~6,100 ft gain"), sourced to a real trailcatjim.com trip report (6,102 ft measured). Was asymmetric for a car-to-car out-and-back, where gain should roughly equal loss.'
WHERE id = 'wa_south_twin_sister_west_ridge'
  AND gain_ft = 3000 AND loss_ft = 5400;

-- =========================================================================
-- Sharkfin Tower
-- =========================================================================

-- wa_southeast_face: watch_out was stored as one newline-joined string instead of a JSON array
-- -- the recurring toArr() rendering bug (lib/db.js's toArr() only splits on commas). Text
-- content unchanged, just reshaped into an array.
UPDATE routes
SET watch_out = '["SIGNIFICANT ROCKFALL HAZARD from above and within approach gully—signs of rockfall damage visible; gully floor contains numerous 10-50 pound rocks precariously balanced in fine sand; traverse quickly and watch continuously for falling rocks", "Critical route-finding to identify correct approach gully—documented cases of parties entering wrong gully, leading to complex traverses and tragic accidents (2005 incident with 3 fatalities); study photos and topos carefully; may want to hire guide for first ascent", "Exposed 5.10 alpine rock climbing with limited protection in some sections—high run-out potential on compact slab pitches; requires confident climbing and solid judgment on when to place protection vs. accept exposure", "Rappel anchor quality variable—fixed slings/bolts wear over time and may have reduced holding power; always back up rappel anchors or build new ones; inspect carefully before committing full weight", "Gully system loose and unstable—rockfall debris accumulation indicates ongoing hazard; potential for rockfall triggered by climbing party or weather changes; stay aware of partner locations", "Weather exposure on open face—afternoon clouds common; thunderstorm potential in summer; electric storms with rock climbing exposure is extremely dangerous; start early and retreat if weather deteriorates", "Descending gully in darkness—route-finding becomes difficult without daylight; headlamps not fully sufficient for gully route-finding; strongly consider camping at base if climb extends past early afternoon", "Altitude and sustained climbing (5000+ vertical from trailhead)—technical grade combined with elevation can cause dehydration and altitude effects; start well-hydrated and maintain energy intake"]'::jsonb,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: watch_out reshaped from a newline-joined string into a JSON array (known toArr() rendering bug); text content unchanged.'
WHERE id = 'wa_southeast_face'
  AND watch_out = 'SIGNIFICANT ROCKFALL HAZARD from above and within approach gully—signs of rockfall damage visible; gully floor contains numerous 10-50 pound rocks precariously balanced in fine sand; traverse quickly and watch continuously for falling rocks
Critical route-finding to identify correct approach gully—documented cases of parties entering wrong gully, leading to complex traverses and tragic accidents (2005 incident with 3 fatalities); study photos and topos carefully; may want to hire guide for first ascent
Exposed 5.10 alpine rock climbing with limited protection in some sections—high run-out potential on compact slab pitches; requires confident climbing and solid judgment on when to place protection vs. accept exposure
Rappel anchor quality variable—fixed slings/bolts wear over time and may have reduced holding power; always back up rappel anchors or build new ones; inspect carefully before committing full weight
Gully system loose and unstable—rockfall debris accumulation indicates ongoing hazard; potential for rockfall triggered by climbing party or weather changes; stay aware of partner locations
Weather exposure on open face—afternoon clouds common; thunderstorm potential in summer; electric storms with rock climbing exposure is extremely dangerous; start early and retreat if weather deteriorates
Descending gully in darkness—route-finding becomes difficult without daylight; headlamps not fully sufficient for gully route-finding; strongly consider camping at base if climb extends past early afternoon
Altitude and sustained climbing (5000+ vertical from trailhead)—technical grade combined with elevation can cause dehydration and altitude effects; start well-hydrated and maintain energy intake';

-- =========================================================================
-- Southeast Mox Peak
-- =========================================================================

-- wa_southeast_mox_peak_se_rib: name field said "Southeast Rib / Standard", but every source
-- found (Mountain Project's "Beckey Route (West Ridge)", the AAC winter-FA report, Country
-- Highpoints trip reports) identifies this exact line -- Col of the Wild, Ridge of Gendarmes,
-- gully system, notch, white-column feature, FA Beckey 1941 -- as the West Ridge route. This
-- row's own face ("West ridge / summit tower above the Col of the Wild"), aspect ("W"), and
-- overview ("west-ridge line... standard route") already contradicted the name field.
UPDATE routes
SET name = 'West Ridge (Beckey Route)',
    corrections = COALESCE(corrections, '') || ' 2026-08-05: name corrected from "Southeast Rib / Standard" to "West Ridge (Beckey Route)" -- this row''s own face/aspect/overview fields and every external source (Mountain Project, AAC winter-FA report, Country Highpoints) identify this as the West Ridge route, not a southeast rib.'
WHERE id = 'wa_southeast_mox_peak_se_rib'
  AND name = 'Southeast Rib / Standard';

-- wa_southeast_mox_peak_se_rib: alpine_grade ('III-IV') is NCCS/commitment-grade notation, not
-- the French adjectival scale this field represents, and conflicts with the separate
-- commitment field ('II') -- the same recurring alpine_grade-vs-commitment bug pattern. No
-- verified French-scale value was found to substitute.
UPDATE routes
SET alpine_grade = NULL,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: alpine_grade cleared -- ''III-IV'' was NCCS/commitment-grade notation, not a French adjectival value, and conflicted with this row''s own commitment field (''II''); no sourced replacement found.'
WHERE id = 'wa_southeast_mox_peak_se_rib'
  AND alpine_grade = 'III-IV';

-- wa_southeast_mox_peak_se_rib: waypoints[0].note contained a leaked AI-research-session
-- artifact ("Reused coordinate from this session's own Devil's Club (Southeast Mox Peak)
-- research...") instead of a real route note. The coordinate itself is left unchanged (it is
-- geographically plausible for the Depot Creek/Chilliwack Lake Road trailhead but was not
-- independently re-verified this batch); only the note text is replaced.
UPDATE routes
SET waypoints = jsonb_set(waypoints, '{0,note}', '"Standard Depot Creek/Chilliwack Lake Road (Canada) trailhead for Mox Peaks/Redoubt approaches, via Depot Creek Falls and Ouzel Lake."', false),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: waypoints[0].note replaced -- contained a leaked AI-research-session artifact ("Reused coordinate from this session''s own Devil''s Club research...") instead of a real route note. Coordinate value left unchanged (plausible but not independently re-verified this batch).'
WHERE id = 'wa_southeast_mox_peak_se_rib'
  AND waypoints->0->>'note' LIKE 'Reused coordinate from this session%';

-- =========================================================================
-- Mount Shuksan
-- =========================================================================

-- wa_southeast_ridge_se_corner: watch_out was stored as one newline-joined string instead of a
-- JSON array -- same toArr() rendering bug as Sharkfin Tower above. Text content unchanged.
UPDATE routes
SET watch_out = '["5.3 ridge climbing with altitude exposure (9,100+ ft)", "Weather exposure on exposed ridge", "Weather hazard - afternoon electrical activity", "Loose rock hazard throughout ridge", "Route-finding on descent"]'::jsonb,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: watch_out reshaped from a newline-joined string into a JSON array (known toArr() rendering bug); text content unchanged.'
WHERE id = 'wa_southeast_ridge_se_corner'
  AND watch_out = '5.3 ridge climbing with altitude exposure (9,100+ ft)
Weather exposure on exposed ridge
Weather hazard - afternoon electrical activity
Loose rock hazard throughout ridge
Route-finding on descent';

-- =========================================================================
-- South Early Winters Spire
-- =========================================================================

-- wa_southern_man: fa named "Kevin Falley" -- wrong first name. The correct climber is
-- Leighan Falley (Talkeetna, AK-based alpinist/glacier pilot), confirmed via multiple
-- independent bios and by this row's own overview field, which already correctly reads
-- "Leaghan Falley".
UPDATE routes
SET fa = 'Mark Allen, Leighan Falley, Joel Kauffman (aid, 2008); free ascent Blake Matthews and Bryan Burdo (2010)',
    corrections = COALESCE(corrections, '') || ' 2026-08-05: fa corrected -- "Kevin Falley" was the wrong first name; the climber is Leighan Falley, confirmed via independent bios and this row''s own overview field (which already correctly said "Leaghan Falley").'
WHERE id = 'wa_southern_man'
  AND fa = 'Mark Allen, Kevin Falley, Joel Kauffman (aid, 2008); free ascent Blake Matthews and Bryan Burdo (2010)';

-- wa_southern_man: aspect ('E') contradicted this row's own text, which repeatedly (overview,
-- approach, itinerary.sourceNote, timing.sectionBreakdown[0].note) describes the route as
-- climbing SEWS's south-facing headwall; 5 of this route's 9 pitches (per pitch_detail) are on
-- that headwall, with only pitches 1-4 on the shared east-facing lower section.
UPDATE routes
SET aspect = 'S',
    corrections = COALESCE(corrections, '') || ' 2026-08-05: aspect corrected from "E" to "S" -- this row''s own overview/approach/itinerary text repeatedly describes the route as climbing SEWS''s south-facing headwall (5 of 9 pitches per pitch_detail); only the shared lower 4 pitches are east-facing.'
WHERE id = 'wa_southern_man'
  AND aspect = 'E';

-- wa_southern_man: timing.sectionBreakdown[0].note was truncated mid-word ("...South Arete
-- downclimb/ra…"). The full text already exists verbatim in this same row's
-- itinerary.days[0].note.
UPDATE routes
SET timing = jsonb_set(timing, '{sectionBreakdown,0,note}', '"One of the harder, more sustained lines on SEWS''s south face (5.12a free, or 5.11 C1) — 9 pitches make for a long, technical day with the same approach and South Arete downclimb/rappel descent as its neighbors."', false),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: timing.sectionBreakdown[0].note completed -- was truncated mid-word ("...South Arete downclimb/ra…"); full text recovered verbatim from this row''s own itinerary.days[0].note.'
WHERE id = 'wa_southern_man'
  AND timing->'sectionBreakdown'->0->>'note' = 'One of the harder, more sustained lines on SEWS''s south face (5.12a free, or 5.11 C1) — 9 pitches make for a long, technical day with the same approach and South Arete downclimb/ra…';

-- wa_southern_man: watch_out was stored as one newline-joined string instead of a JSON array --
-- same toArr() rendering bug as above. Text content unchanged.
UPDATE routes
SET watch_out = '["High-grade 5.11d sustained climbing with serious exposure", "Committed line with complex route-finding on ascent and descent", "Weather sensitivity - afternoon storms make climbing dangerous", "Loose rock on mixed terrain sections", "Electrical hazard on exposed pitches during thunderstorm activity"]'::jsonb,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: watch_out reshaped from a newline-joined string into a JSON array (known toArr() rendering bug); text content unchanged.'
WHERE id = 'wa_southern_man'
  AND watch_out = 'High-grade 5.11d sustained climbing with serious exposure
Committed line with complex route-finding on ascent and descent
Weather sensitivity - afternoon storms make climbing dangerous
Loose rock on mixed terrain sections
Electrical hazard on exposed pitches during thunderstorm activity';

-- =========================================================================
-- Dorado Needle
-- =========================================================================

-- wa_southwest_buttress: waypoints[0] ("Eldorado Creek Trailhead") stored lat/lng
-- 48.5136/-121.1964 -- the real Eldorado Trailhead (Cascade River Road mile 20, elev 2,100 ft)
-- is 48.4926/-121.1176 per WTA trip-report data, which matches this same row's own
-- approach_logistics.trailheadLat/trailheadLng (48.49261/-121.11761) almost exactly. The
-- waypoint was roughly 6 km off in the wrong spot.
UPDATE routes
SET waypoints = jsonb_set(jsonb_set(waypoints, '{0,lat}', '48.49261', false), '{0,lng}', '-121.11761', false),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: waypoints[0] lat/lng corrected from 48.5136/-121.1964 to 48.49261/-121.11761 (~6km fix) -- matches this row''s own approach_logistics.trailheadLat/Lng and WTA''s real Eldorado Trailhead coordinates.'
WHERE id = 'wa_southwest_buttress'
  AND (waypoints->0->>'lat')::numeric = 48.5136 AND (waypoints->0->>'lng')::numeric = -121.1964;

-- wa_southwest_buttress: gpx[0] carried the same wrong trailhead coordinate as waypoints[0]
-- above -- same fix.
UPDATE routes
SET gpx = jsonb_set(jsonb_set(gpx, '{0,0}', '48.49261', false), '{0,1}', '-121.11761', false),
    corrections = COALESCE(corrections, '') || ' 2026-08-05: gpx[0] corrected from 48.5136/-121.1964 to 48.49261/-121.11761, matching the waypoints[0] fix above.'
WHERE id = 'wa_southwest_buttress'
  AND (gpx->0->>0)::numeric = 48.5136 AND (gpx->0->>1)::numeric = -121.1964;

-- wa_southwest_buttress: access._raw.parking_pass_cost/parking_pass_required and top-level
-- access.passRequired all claimed an entrance-fee pass ("$30/vehicle" / "America the Beautiful
-- $80 or entrance fee"). North Cascades National Park (complex) charges no entrance fee and
-- has no fee station or day-use pass -- well-established NPS policy.
UPDATE routes SET access = jsonb_set(
  jsonb_set(
    jsonb_set(access, '{_raw,parking_pass_cost}', '"N/A - North Cascades NP has no entrance fee"'),
    '{_raw,parking_pass_required}', '"None - no entrance fee at North Cascades NP"'
  ),
  '{passRequired}', '"None - North Cascades NP has no entrance fee"'
),
corrections = COALESCE(corrections, '') || ' 2026-08-05: access parking-pass/entrance-fee fields corrected -- North Cascades National Park has no entrance fee, fee station, or day-use pass (confirmed NPS policy); previous fields wrongly claimed a $30/vehicle or America the Beautiful pass requirement.'
WHERE id = 'wa_southwest_buttress'
  AND access->>'passRequired' = 'America the Beautiful Annual ($80) or per-vehicle entrance fee';

-- wa_southwest_buttress: dist_km (9.7) is inconsistent with this row's own approach text,
-- which states "the on-file round-trip distance is about 25.75 km," and with itinerary
-- day-miles (5.7+4+5.7=15.4 mi ~ 24.8 km) plus totalNote ("~16 mi round trip"), both of which
-- agree with a ~25.75 km round trip. Per this app's distKm*2 display convention, the stored
-- one-way value should be ~12.88 km, not 9.7.
UPDATE routes
SET dist_km = 12.88,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: dist_km corrected from 9.7 to 12.88 (one-way) -- this row''s own approach text states a ~25.75km round trip, matching itinerary day-miles (5.7+4+5.7=15.4mi) and totalNote ("~16 mi round trip"); per this app''s distKm*2 display convention the one-way value should be ~12.88km.'
WHERE id = 'wa_southwest_buttress'
  AND dist_km = 9.7;

-- wa_southwest_buttress: alpine_grade ('III') duplicated the commitment field ('III') instead
-- of holding a French-adjectival grade -- same recurring bug pattern. No verified French-scale
-- value was found to substitute.
UPDATE routes
SET alpine_grade = NULL,
    corrections = COALESCE(corrections, '') || ' 2026-08-05: alpine_grade cleared -- duplicated the commitment grade (''III'', NCCS/Roman-numeral scale) rather than holding a French-adjectival value; no sourced replacement found.'
WHERE id = 'wa_southwest_buttress'
  AND alpine_grade = 'III' AND commitment = 'III';
