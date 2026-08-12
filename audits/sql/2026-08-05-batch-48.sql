-- WA alpine audit — batch 48 (2026-08-05)
-- Routes: wa_the_tooth_fairy, wa_the_tooth_r1, wa_the_tooth_south_face (The Tooth),
--         wa_the_triad_east_peak (The Triad), wa_the_west_face (North Early Winters Spire),
--         wa_three_fingers_r1, wa_three_fingers_r2, wa_three_fingers_south_peak_lookout
--         (Three Fingers), wa_three_queens_middle_peak, wa_three_queens_west_peak
--         (Three Queens)
-- Researched via 5 parallel agents, one peak-group each. Confirmed fixes below --
-- see audits/wa-alpine-audit-log.md for items independently verified as correct
-- and items flagged for human review rather than auto-fixed. All WHERE clauses
-- include the current (wrong) value as a safety check per project convention.
-- Every confirmed fix's "current value" was independently re-verified against a
-- fresh full-row fetch of the live DB before this file was written.

-- =========================================================================
-- The Tooth (wa_the_tooth)
-- =========================================================================

-- wa_the_tooth_fairy: alpine_grade held "II", a raw NCCS commitment grade
-- already correctly stored in this row's own `commitment` field, not the
-- French adjectival scale (F/PD/AD/D/TD/ED) the column is meant to hold per
-- migrations/0006_composite_grades.sql. No adjectival grade found published
-- for this line, so cleared rather than guessed.
UPDATE routes SET alpine_grade = NULL
WHERE id = 'wa_the_tooth_fairy' AND alpine_grade = 'II';

-- wa_the_tooth_r1 (Northeast Slabs): watch_out was a single newline-joined
-- string instead of a JSON array like its two sibling Tooth routes (the
-- recurring watch_out rendering bug). Converted to an array, content
-- unchanged.
UPDATE routes SET watch_out = '["Significant avalanche danger on approach to The Tooth; avoid summer path entirely due to high avalanche exposure","Second pitch protection difficulties; long run-outs on thin ice with inadequate screw/picket placement options; high consequences for protection failure","Balancy mixed slab climbing requiring precise footwork; exposed low 5th class/M3 pitch over east face; 50-70 degree ice sections","Early season ascents face steeper avalanche risk on approach gully; spring warming creates slough and slab hazards","Rime ice accumulation on exposed upper pitches reduces friction and increases slipping risk; direct north aspect can produce rime ice in winter storms","Weather exposure on approach valley; compressed daylight window for winter climbs increases risk of descent in darkness"]'::jsonb
WHERE id = 'wa_the_tooth_r1' AND jsonb_typeof(watch_out) = 'string';

-- wa_the_tooth_fairy: emergency.nearestHospital named Harborview (Seattle,
-- a Level I trauma *transport* destination) instead of the actually-nearest
-- Snoqualmie Valley Hospital, which both sibling Tooth routes (South Face,
-- Northeast Slabs) correctly list.
UPDATE routes SET emergency = jsonb_set(emergency, '{nearestHospital}',
  '"Snoqualmie Valley Hospital (24/7 ER), 9801 Frontier Ave SE, Snoqualmie, WA — approximately a 30-40 minute drive from the Alpental trailhead via I-90; serious trauma cases are typically transported or flown to Harborview Medical Center in Seattle."')
WHERE id = 'wa_the_tooth_fairy'
  AND emergency->>'nearestHospital' = 'Harborview Medical Center, Seattle (Level I trauma center; regional helicopter rescue destination)';

-- =========================================================================
-- The Triad (wa_the_triad) — wa_the_triad_east_peak
-- =========================================================================

-- gain_ft (3920) was just the naive trailhead-to-summit elevation delta;
-- this row's own loss_ft (5410) and itinerary.days[0].gainFt (5410) already
-- reflect the real undulating (Sibley Creek Pass + glacier) round-trip
-- total per the route's own sourceNote (Hidden Lake approach stats).
UPDATE routes SET gain_ft = 5410
WHERE id = 'wa_the_triad_east_peak' AND gain_ft = 3920;

-- fa was null despite this row's own overview already naming the 1949 FA
-- party in detail, corroborated by Wikipedia's "The Triad (mountain)".
UPDATE routes SET fa = 'Dick Eilertsen, Dick Lowery, Dick Scales, Don Wilde - 1949'
WHERE id = 'wa_the_triad_east_peak' AND fa IS NULL;

-- rappels said "2 rappels of ~30m" contradicting this row's own
-- pitch_detail/descent/descent_text/bail fields, which all agree on a
-- single ~20m rappel off the summit tower.
UPDATE routes SET rappels = '1 rappel of roughly 20m off a gear/sling anchor near the summit tower (single rope sufficient); some parties downclimb instead'
WHERE id = 'wa_the_triad_east_peak'
  AND rappels = 'Commonly 2 rappels of roughly 30m off anchors near the crux (rope + tagline useful); some parties downclimb instead';

-- approach_logistics.trailheadDirection was truncated mid-parenthesis; the
-- top-level `approach` field has the identical opening sentence in full,
-- giving an exact match to restore the missing tail.
UPDATE routes SET approach_logistics = jsonb_set(approach_logistics, '{trailheadDirection}',
  '"From Marblemount, drive Cascade River Road (FR-15) about 10.2 paved miles, then turn onto FR-1540 (Sibley Creek Road) and follow its rough gravel surface 4.5 miles to the small Hidden Lake Trailhead (~3,600 ft; Northwest Forest Pass required to park)."')
WHERE id = 'wa_the_triad_east_peak'
  AND approach_logistics->>'trailheadDirection' = 'From Marblemount, drive Cascade River Road (FR-15) about 10.2 paved miles, then turn onto FR-1540 (Sibley Creek Road) and follow its rough gravel surface 4.5 miles to the small Hidden Lake Trailhead (~3,600 ft;';

-- areas.prominence_ft (822) disagreed with Wikipedia/Peakbagger/Peakery,
-- which converge on 760 ft; elevation_ft (7,520+) was not disputed and left
-- unchanged.
UPDATE areas SET prominence_ft = 760
WHERE id = 'wa_the_triad' AND prominence_ft = 822;

-- =========================================================================
-- North Early Winters Spire (wa_north_early_winters_spire) — wa_the_west_face
-- =========================================================================

-- waypoints[0] (Blue Lake TH) carried a stale, ~1.3km-off coordinate/
-- elevation. This row's own approach_logistics.trailheadLat/Lng and
-- approach text already have the corrected value (48.518965/-120.67436,
-- 5,400 ft); a sibling route on this peak (wa_news_nw_corner) documents
-- having already caught and reverted this exact wrong pair, citing
-- Trailforks/WTA/The Mountaineers. This route's waypoints array was never
-- updated to match.
UPDATE routes SET waypoints = jsonb_set(jsonb_set(jsonb_set(waypoints, '{0,lat}', '48.518965'), '{0,lng}', '-120.67436'), '{0,elev}', '5400')
WHERE id = 'wa_the_west_face' AND area_id = 'wa_north_early_winters_spire'
  AND waypoints->0->>'name' = 'Blue Lake TH'
  AND (waypoints->0->>'lat')::numeric = 48.5168
  AND (waypoints->0->>'elev')::numeric = 5200;

-- gpx[0] mirrors the same stale Blue Lake TH coordinate; corrected to match.
UPDATE routes SET gpx = jsonb_set(gpx, '{0}', '[48.518965, -120.67436]'::jsonb)
WHERE id = 'wa_the_west_face' AND area_id = 'wa_north_early_winters_spire'
  AND gpx->0 = '[48.5168, -120.6573]'::jsonb;

-- rack[4] said "Single 60m dynamic rope", contradicting this row's own
-- rope_length_m (70) and rope_note ("~710ft across 6 pitches makes 70m
-- practical").
UPDATE routes SET rack = jsonb_set(rack, '{4}', '"Single 70m dynamic rope"'::jsonb)
WHERE id = 'wa_the_west_face' AND area_id = 'wa_north_early_winters_spire'
  AND rack->4 = '"Single 60m dynamic rope"'::jsonb AND rope_length_m = 70;

-- fa misspelled FA partner's surname "Beckstad"; multiple external sources
-- (theCrag route title "West Face (Beckey-Beckstead)", aggregated guide
-- pages) consistently spell it "Beckstead".
UPDATE routes SET fa = replace(fa, 'Beckstad', 'Beckstead')
WHERE id = 'wa_the_west_face' AND area_id = 'wa_north_early_winters_spire'
  AND fa LIKE '%Dave Beckstad%' AND fa NOT LIKE '%Beckstead%';

-- overview repeats the same misspelling and also states "roughly 500 ft
-- (152 m)", contradicting this row's own length_m (201m = 660ft) and its
-- own pitch_detail (5 pitches summing to ~610 ft); external sources
-- (theCrag) corroborate ~660 ft / 200m.
UPDATE routes SET overview = replace(replace(overview, 'Beckstad', 'Beckstead'), 'roughly 500 ft (152 m)', 'roughly 660 ft (201 m)')
WHERE id = 'wa_the_west_face' AND area_id = 'wa_north_early_winters_spire'
  AND overview LIKE '%Beckstad%' AND overview LIKE '%500 ft (152 m)%';

-- alpine_grade duplicated the NCCS commitment grade ("III", already
-- correctly stored in `commitment`) instead of the French adjectival scale
-- migration 0006 defines for this column. No sourced adjectival grade
-- found, cleared rather than guessed.
UPDATE routes SET alpine_grade = NULL
WHERE id = 'wa_the_west_face' AND area_id = 'wa_north_early_winters_spire'
  AND alpine_grade = 'III' AND commitment = 'III';

-- watch_out was a newline-joined string instead of a JSON array (the
-- recurring rendering bug). Converted, content unchanged.
UPDATE routes SET watch_out = '["Sustained 5.11- climbing on west-facing terrain","High exposure with serious consequences for falls","Weather exposure throughout; afternoon electrical activity creates hazard","Route-finding complexity requiring confident line choice","Loose rock on mixed terrain transitions"]'::jsonb
WHERE id = 'wa_the_west_face' AND area_id = 'wa_north_early_winters_spire'
  AND jsonb_typeof(watch_out) = 'string';

-- =========================================================================
-- Three Fingers (wa_three_fingers)
-- =========================================================================

-- wa_three_fingers_r1 (North Peak): five fields carried South-Peak-lookout
-- content, contradicting this route's own overview ("There is no
-- maintained trail, no ladders, and no register cabin" on the North Peak —
-- the fixed ladders belong to the separate South Peak lookout route,
-- wa_three_fingers_south_peak_lookout). Removes the ladder references and
-- the leaked "South Peak lookout ladders" waypoint; shortens the summit
-- waypoint's descent note to match.
UPDATE routes SET
  pro_tips = '["Carry an ice axe for the upper snow even in summer"]'::jsonb,
  watch_out = '["lingering snow","long day"]'::jsonb,
  rope_note = 'Standard route crosses the Queest-Alb Glacier before a roped scramble up the North Peak''s chimney/ramp system. Ice axe/crampons required whenever the glacier headwall/steep snow slope below the summit is present.',
  ascender = 'crevasse-rescue kit for the glacier crossing; no ascenders needed on this route',
  waypoints = (jsonb_set(waypoints, '{7,note}', '"True summit (Class 4, 5.4 variation), topped out via the West Couloir and South Face above the col; descend by reversing the snow slopes and trail."') - 4)
WHERE id = 'wa_three_fingers_r1'
  AND pro_tips::text LIKE '%fixed ladders to the lookout%'
  AND waypoints->4->>'name' = 'South Peak lookout ladders'
  AND waypoints->7->>'name' = 'North Peak, Three Fingers';

-- wa_three_fingers_r2 (Middle Peak): summit waypoint's own note claimed its
-- elevation "matches the record's own high_point_ft (6,797 ft)" but both
-- the waypoint's elev and the route's actual high_point_ft are 6,800 ft.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{1,note}',
  '"Corrected 2026-07-16: this waypoint previously pointed to the South Peak fire lookout, a different, real summit. Middle Peak''s own summit coordinates are approximate (no dedicated GPS track found for this route); elevation matches the record''s own high_point_ft (6,800 ft)."')
WHERE id = 'wa_three_fingers_r2' AND waypoints->1->>'note' LIKE '%6,797 ft%';

-- wa_three_fingers_r2: approach_logistics.peakLat/peakLng pointed at
-- 48.169895/-121.687865 — the North/South Peak summit coordinate used
-- elsewhere in this dataset — instead of this route's own documented
-- Middle Peak summit location, which appears in this same row's own
-- waypoints array (48.175/-121.688).
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(approach_logistics, '{peakLat}', '48.175'), '{peakLng}', '-121.688')
WHERE id = 'wa_three_fingers_r2' AND approach_logistics->>'peakLat' = '48.169895';

-- wa_three_fingers_south_peak_lookout: gain_ft (5750) didn't match this
-- out-and-back route's own loss_ft (4200, matching both the simple net
-- elevation change and the sum of itinerary.days[].lossFt) or the sum of
-- itinerary.days[].gainFt (4200).
UPDATE routes SET gain_ft = 4200
WHERE id = 'wa_three_fingers_south_peak_lookout' AND gain_ft = 5750;

-- =========================================================================
-- Three Queens (wa_three_queens)
-- =========================================================================

-- wa_three_queens_middle_peak: access.notes named the Snoqualmie Ranger
-- District ((425) 888-1421, a different Mt. Baker-Snoqualmie NF district
-- near North Bend) instead of the Cle Elum Ranger District this same row's
-- own landManager and emergency.rangerStation fields correctly name;
-- confirmed against the live USFS "Three Queens Fire" closure alert, which
-- directs inquiries to Cle Elum at (509) 852-1100.
UPDATE routes SET access = jsonb_set(access, '{notes}',
  to_jsonb(replace(access->>'notes', 'Snoqualmie Ranger District: (425) 888-1421', 'Cle Elum Ranger District: (509) 852-1100')))
WHERE id = 'wa_three_queens_middle_peak'
  AND access->>'notes' LIKE '%Snoqualmie Ranger District: (425) 888-1421%';

-- wa_three_queens_middle_peak: dist_km (4.3, meant to be one-way per the
-- app's roundTripKm=distKm*2 convention) doubles to only ~8.6 km (~5.3 mi),
-- contradicting this row's own itinerary text ("roughly 10 miles round
-- trip") and the underlying source trip report (trailcatjim.com: "10 miles
-- traveled"). Corrected to 8.05 km one-way (~16.1 km / 10 mi round trip).
UPDATE routes SET dist_km = 8.05
WHERE id = 'wa_three_queens_middle_peak' AND dist_km = 4.3;

-- wa_three_queens_west_peak: approach_logistics.trailheadLat/Lng were null;
-- this route's own approach text says it starts from the same Mineral
-- Creek Trailhead as sibling wa_three_queens_middle_peak, whose
-- approach_logistics already stores the corroborated coordinate.
UPDATE routes SET approach_logistics = jsonb_set(jsonb_set(approach_logistics, '{trailheadLat}', '47.4176', true), '{trailheadLng}', '-121.2373', true)
WHERE id = 'wa_three_queens_west_peak' AND approach_logistics->>'trailheadLat' IS NULL;
