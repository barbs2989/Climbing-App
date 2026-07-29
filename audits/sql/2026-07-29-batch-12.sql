-- WA alpine/mountaineering audit — batch 12 (pass 1)
-- Reviewed 2026-07-29. Each fix below was cross-checked against at least one authoritative
-- source / the row's own internal data (see audits/wa-alpine-audit-log.md for the summary).
-- These are PROPOSED fixes for a human to review and run -- not yet applied. Continues the
-- same scope/ordering as batches 1-11 (routes.discipline in ('alpine','mountaineering'),
-- id like 'wa_%', area_type = 'peak'). Column types re-verified against
-- supabase/migrations/*.sql before writing each statement (routes.grade_num is numeric,
-- routes.fa/routes.high_point_ft are text/integer, areas.elevation_ft is integer).

-- Forbidden Peak Northeast Face (wa_forbidden_peak_northeast_face): fa stored "Fred Beckey,
-- Ron Burgner, Tom Nephew — 1972" -- but that party/route is documented (Mountain Project,
-- SummitPost, stephabegg.com) as the FA of Dragontail Peak's Northeast Buttress (1971), a
-- completely different peak. This route's own account is instead the 1961 American Alpine
-- Journal report "Forbidden Peak, Northeast Face" by Ed Cooper and Stuart Ferguson, which
-- matches this exact row pitch-for-pitch: "300 feet of grade III climbing" to a "300-foot,
-- 50° ice patch," then "the remaining 600 feet... due to the unusual nature of the rock
-- (upslab) it was easier" -- an almost verbatim match to this row's own pitch_detail (Lower
-- face ~300 ft minimal pitons; Ice patch ~300 ft ~50° ice; Upper face ~600 ft upslab rock).
-- Same corruption family as the approach/access overwrite already documented and fixed on this
-- row in this same batch's predecessor pass (see this row's own `corrections` field, PR #324).
-- Exact year is inferred from the AAJ volume's 1960-1961 publication cycle (climbs reported are
-- typically from the preceding season) and not independently reconfirmed to the day.
update routes set fa = 'Ed Cooper and Stuart Ferguson — 1960'
  where id = 'wa_forbidden_peak_northeast_face';

-- Forbidden Peak Northeast Face (wa_forbidden_peak_northeast_face): grade_num stored 7
-- (grade_system 'yds'), implying a 5.7 YDS rock grade -- but this row's own rock_grade field
-- is "Class 3-4" (no 5th-class rock at all) and its ice_grade is AI3, consistent with the
-- corrected FA account above describing only 3rd/4th-class rock and a 50-degree ice/snow face.
-- 7 exactly matches the YDS grade (5.7) of the misattributed Dragontail Peak Northeast Buttress
-- route removed above, indicating this is the same cross-contamination rather than a real value
-- for this row. No sourced YDS class exists for this route to fill in its place, so clearing it
-- rather than guessing.
update routes set grade_num = null
  where id = 'wa_forbidden_peak_northeast_face';

-- Fortress Mountain (area wa_fortress_mountain) and its three routes: elevation is reported
-- inconsistently across sources (Wikipedia: 8,679 ft; Peakbagger/ListsOfJohn: 8,684 ft).
-- wa_fortress_mountain_east_ridge's own `corrections` field already researched this exact
-- conflict and settled on "8,679 ft is used as the best cross-corroborated value" -- but the
-- area row and all three routes actually store 8,684 ft, contradicting that row's own recorded
-- decision. Aligning the stored values with the already-settled, sourced figure (Wikipedia).
update areas set elevation_ft = 8679
  where id = 'wa_fortress_mountain';

update routes set high_point_ft = 8679
  where id = 'wa_fortress_mountain_east_ridge';

update routes set waypoints = jsonb_set(waypoints, '{1,elevFt}', '8679'::jsonb)
  where id = 'wa_fortress_mountain_east_ridge';

update routes set high_point_ft = 8679
  where id = 'wa_fortress_mountain_southwest_face';

update routes set waypoints = jsonb_set(waypoints, '{1,elevFt}', '8679'::jsonb)
  where id = 'wa_fortress_mountain_southwest_face';

-- wa_fortress_mountain_northeast_face's own summit waypoint already stores 8679 (it was the
-- sole internally-consistent row); only its separate high_point_ft column needed the same fix.
update routes set high_point_ft = 8679
  where id = 'wa_fortress_mountain_northeast_face';

-- Fortress Mountain, all three routes (wa_fortress_mountain_east_ridge, _northeast_face,
-- _southwest_face): access.land_manager names a nonexistent "Chiwawa/Entiat Ranger Districts" --
-- the same error already found and fixed for Bonanza Peak (batch 4) and Chiwawa Mountain
-- (batch 5), both immediately adjacent peaks on the same Trinity Trailhead/Buck Creek approach.
-- Each of these rows' own access.landManager (camelCase) field already correctly names the
-- real district ("Wenatchee River Ranger District"); aligning land_manager to match.
update routes set access = jsonb_set(
  access, '{land_manager}',
  '"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District) — Glacier Peak Wilderness"'::jsonb
) where id = 'wa_fortress_mountain_east_ridge';

update routes set access = jsonb_set(
  access, '{land_manager}',
  '"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District) — Glacier Peak Wilderness"'::jsonb
) where id = 'wa_fortress_mountain_northeast_face';

update routes set access = jsonb_set(
  access, '{land_manager}',
  '"Okanogan-Wenatchee National Forest (Wenatchee River Ranger District) — Glacier Peak Wilderness"'::jsonb
) where id = 'wa_fortress_mountain_southwest_face';

-- Fortune Peak, both routes (wa_fortune_peak_east_slope, wa_fortune_peak_standard_route):
-- access.land_manager names "Mt. Baker-Snoqualmie National Forest (Snoqualmie Ranger
-- District)" -- wrong forest and district. The Esmeralda Trailhead/Esmeralda Basin/Ingalls Way
-- approach to Fortune Peak is confirmed (USFS trail pages for Ingalls Way Trail and Esmeralda
-- Basin Trail) to sit in the Okanogan-Wenatchee National Forest, Cle Elum Ranger District --
-- matching each row's own access.landManager (camelCase) field already on file. Fixing
-- land_manager to match.
update routes set access = jsonb_set(
  access, '{land_manager}',
  '"Okanogan-Wenatchee National Forest, Cle Elum Ranger District (Alpine Lakes Wilderness)"'::jsonb
) where id = 'wa_fortune_peak_east_slope';

update routes set access = jsonb_set(
  access, '{land_manager}',
  '"Okanogan-Wenatchee National Forest, Cle Elum Ranger District (Alpine Lakes Wilderness)"'::jsonb
) where id = 'wa_fortune_peak_standard_route';

-- Fortune Peak East Slope (wa_fortune_peak_east_slope): corrections field claims "the listed
-- parentArea 'Snoqualmie Pass' appears geographically mismatched — see hierarchyNote", but this
-- row has no `hierarchyNote` field in the current schema, and the area's actual parent_id/path
-- (wa_teanaway, "usa.washington.wa_centraleast.wa_teanaway.wa_fortune_peak") is already
-- correctly under Teanaway/Ingalls, not Snoqualmie Pass -- confirmed against Wikipedia's
-- description of Fortune Peak as the Teanaway/Wenatchee Mountains area. The stale claim
-- describes a problem that no longer exists in the data; trimming it so this row's own note
-- doesn't contradict its own (already-correct) area placement.
update routes set corrections = 'The peak''s given coordinates (47.462695, -120.953075) match Wikipedia''s summit location (47.462804, -120.953167) closely, confirming correct peak identity.'
  where id = 'wa_fortune_peak_east_slope';
