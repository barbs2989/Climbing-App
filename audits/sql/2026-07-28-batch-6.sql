-- WA alpine/mountaineering audit — batch 6 (pass 1)
-- Reviewed 2026-07-28. Each fix below was cross-checked against at least one authoritative
-- source (see audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for a
-- human to review and run — not yet applied. Continues the same scope/ordering as batches 1-5
-- (routes.discipline in ('alpine','mountaineering'), id like 'wa_%', area_type = 'peak').

-- Kimchi Suicide Volcano (wa_colfax_peak_kimchi_suicide_volcano): top-level grade/grade_system
-- are null even though this same row's ice_grade ("AI4+") and rock_grade ("M5") are already
-- populated and verified (Colin Haley's own trip report at colinhaley.com and AAC Publications
-- both give "M5 R AI4+", matching this row's length_m of 300 exactly). Every sibling route on
-- Colfax Peak (Cosley-Houston, Polish Route) has a populated top-level grade string built from
-- its own ice/rock grade fields — Kimchi is the sole outlier with a blank grade despite having
-- the underlying verified data on file. Filling grade from the row's own already-verified
-- ice_grade/rock_grade fields (not inventing new information).
update routes set grade = 'M5 AI4+', grade_system = 'yds'
  where id = 'wa_colfax_peak_kimchi_suicide_volcano';

-- Colonial Peak West Ridge/Colonial Glacier (wa_colonial_peak_northeast): corrections field
-- claims "the source area record listed elevationFt as null... should be filled in" — but the
-- parent area row (wa_colonial_peak) already has elevation_ft = 7771 populated (matches
-- Wikipedia/Peakbagger/PeakVisor, and this route's own summit waypoint). That part of the note
-- is stale/already resolved. Keeping the still-valid id/name-mismatch observation (see
-- audits/wa-alpine-audit-log.md — flagged separately for a human rename decision) and dropping
-- only the resolved elevation claim so corrections doesn't contradict the row's own data.
update routes set corrections = 'The routeId ''wa_colonial_peak_northeast'' does not match the route''s actual west-facing aspect/name (West Ridge / Colonial Glacier) -- flagging in case the id is a legacy naming artifact, but it was used exactly as given per instructions.'
  where id = 'wa_colonial_peak_northeast';

-- Complete South Buttress (wa_complete_south_buttress): the row's own high_point_ft (8066 ft,
-- matching Wikipedia's USGS-derived figure for Cutthroat Peak) contradicts its own "Cutthroat
-- Peak Summit" waypoint, which is stamped elevFt 8050 (the older WTA/SummitPost figure). Same
-- row, two different elevations for the same summit. Aligning the waypoint to the row's own
-- high_point_ft, consistent with every sibling route in this batch where the summit waypoint,
-- high_point_ft, and parent area's elevation_ft all agree.
update routes set waypoints = jsonb_set(
  waypoints, '{2,elevFt}', '8066'::jsonb
) where id = 'wa_complete_south_buttress';
