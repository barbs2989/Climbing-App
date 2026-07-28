-- WA alpine/mountaineering audit — batch 10 (pass 1)
-- Reviewed 2026-07-28. Each fix below was cross-checked against at least one authoritative
-- source (see audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for a
-- human to review and run — not yet applied. Continues the same scope/ordering as batches 1-9
-- (routes.discipline in ('alpine','mountaineering'), id like 'wa_%', area_type = 'peak').
-- Column types re-verified against supabase/migrations/*.sql before writing each statement
-- (areas.elevation_ft/prominence_ft are integer, areas.blurb is text; routes.high_point_ft is
-- integer, routes.grade is text).

-- Elephant Butte (area wa_elephant_butte, Picket Range): elevation_ft (7384) and prominence_ft
-- (1122) both disagreed with Wikipedia (7,380 ft elevation, 1,060 ft prominence) -- confirmed
-- independently by the area's own blurb text, which already correctly states "about 5,200 ft of
-- relief in roughly one mile" above McMillan Creek, matching Wikipedia's prominence writeup
-- verbatim. The route on this peak (wa_elephant_butte_standard_route) already stores the
-- correct 7,380 ft in both its own high_point_ft and its summit waypoint -- the area row was the
-- sole outlier. Fixing the area's elevation_ft/prominence_ft and the stale "7,384-foot" figure
-- in its blurb to match.
update areas set elevation_ft = 7380, prominence_ft = 1060
  where id = 'wa_elephant_butte';
update areas set blurb = replace(blurb, '7,384-foot summit', '7,380-foot summit')
  where id = 'wa_elephant_butte';

-- Eldorado Peak East Ridge (wa_eldorado_peak_east_ridge): high_point_ft (8876) was the sole
-- outlier against Wikipedia's precise USGS-derived figure (8,872.9 ft, i.e. 8,872 ft rounded),
-- this same peak's own area.elevation_ft (8872), and all three other Eldorado Peak routes
-- audited this batch (Eldorado Glacier NW Couloir, Northeast Face, West Arete), which all
-- already store high_point_ft = 8872. The Northeast Face route's own `corrections` field
-- already documents this exact 8,872-vs-8,876-vs-8,868 source spread and settles on 8,872 --
-- this route just never got the same fix applied.
update routes set high_point_ft = 8872
  where id = 'wa_eldorado_peak_east_ridge';

-- Thread of Ice (wa_east_twin_needle_thread_of_ice, East Twin Needle): top-level `grade` was
-- null despite grade_system ('yds') and grade_num (7) already being populated and matching this
-- same row's own rock_grade (5.7) exactly -- the same pattern as Kimchi Suicide Volcano's null
-- top-level grade fixed in batch 6, and matching the "5.X" text convention already used by every
-- other yds-graded route in this catalog (e.g. wa_east_ridge_8: grade '5.5', grade_num 5).
-- Filled `grade` from the row's own already-verified rock_grade/grade_num rather than leaving it
-- null.
update routes set grade = '5.7'
  where id = 'wa_east_twin_needle_thread_of_ice';
