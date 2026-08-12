-- WA alpine/mountaineering audit — batch 65 (pass 2, continuing from wa_forbidden_peak_north_ridge)
-- Reviewed 2026-08-07. Routes: wa_forbidden_peak_northeast_face, wa_forbidden_peak_northwest_face,
-- wa_forbidden_peak_west_ridge, wa_fortress_mountain_east_ridge, wa_fortress_mountain_northeast_face,
-- wa_fortress_mountain_southwest_face, wa_fortune_peak_east_slope, wa_fortune_peak_standard_route,
-- wa_free_mojo, wa_frenzel_spitz_south_route. This is the same route ordering as pass-1 batch 12;
-- most of that batch's findings (Forbidden NE Face's FA/grade contamination, Fortress Mountain's
-- 8684-vs-8679 elevation, the "Chiwawa/Entiat Ranger Districts" nonexistent-district error, Fortune
-- Peak's wrong-forest land_manager) are already applied and holding on the live data -- this pass
-- verified they stuck and looked for NEW drift instead of re-flagging solved problems.
--
-- These are PROPOSED fixes for a human to review and run -- not yet applied.

-- wa_forbidden_peak_northeast_face: gain_ft stored as 4600, but this row's own waypoints array
-- climbs monotonically from Boston Basin Trailhead (3200 ft) straight through to the summit
-- (8815 ft) with zero recorded elevation loss along the way (3200 -> 6400 -> 7000 -> 7300 -> 8000
-- -> 8815) -- a net gain of 5615 ft is the mathematical floor for this profile, so 4600 is
-- self-contradicted by the row's own data. loss_ft (5200) is short of the same 5615 ft floor for
-- a return to the same trailhead, which this row's own summit waypoint says happens via "the West
-- Ridge couloir into Boston Basin" (i.e. back to the same Boston Basin drainage/trailhead, not a
-- different exit). The sibling route below (Northwest Face) shares this exact trailhead/summit
-- pair and already has a correct loss_ft of 5615 -- corroborating 5615 as the right net figure.
update routes set gain_ft = 5615, loss_ft = 5615
  where id = 'wa_forbidden_peak_northeast_face';

-- wa_forbidden_peak_northwest_face: same floor violation as above -- gain_ft stored as 4800, but
-- this row's own waypoints climb monotonically from the same Boston Basin Trailhead (3200 ft) to
-- the same Forbidden Peak summit (8815 ft) with no recorded loss along the approach, so the
-- mathematical floor is 5615 ft. This row's own loss_ft is already correctly 5615 -- only gain_ft
-- was inconsistent with it and with the row's own waypoint elevations.
update routes set gain_ft = 5615
  where id = 'wa_forbidden_peak_northwest_face';

-- wa_free_mojo: gain_ft/loss_ft both stored as 2200, but this row's own two waypoints (Blue Lake
-- Trailhead 5200 ft -> South Early Winters Spire summit 7807 ft) imply a 2607 ft net elevation
-- gain with no intermediate point recording a loss -- 2200 is below that floor. Corrected to the
-- net figure implied by the row's own waypoint elevations for this out-and-back day climb.
update routes set gain_ft = 2607, loss_ft = 2607
  where id = 'wa_free_mojo';
