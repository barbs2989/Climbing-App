-- WA alpine audit — batch 371 (2026-10-01, pass 6)
-- Routes: wa_tenpeak_mountain_north_couloir, wa_tenpeak_mountain_southeast
-- (Tenpeak Mountain), wa_tepeh_towers, wa_the_brothers_south_couloir,
-- wa_the_brothers_traverse (The Brothers), wa_the_cave_route (Concord Tower),
-- wa_the_chopping_block_northeast_ridge, wa_the_chopping_block_northwest_route,
-- wa_the_chopping_block_south_route (The Chopping Block / Pinnacle Peak),
-- wa_the_devils_club (Southeast Mox Peak).
-- All WHERE clauses include the current (wrong) value as a safety check per
-- project convention, so each statement is a no-op if the row has already changed.

-- =========================================================================
-- Concord Tower (wa_concord_tower) — wa_the_cave_route
-- =========================================================================

-- high_point_ft (7569) contradicts this row's own summit waypoint ("Concord Tower
-- Summit", elev 7560) and is the same stray value already found and corrected on a
-- different Concord Tower route in batch 35 (wa_north_face_var_right_directisimo,
-- 7569 -> 7560), where independent search-synthesized SummitPost/Mountain
-- Project/StephAbegg results also consistently gave 7,560 ft. Corrected to match
-- this row's own waypoint and that same external consensus. (Note: a *different*
-- Concord Tower route, wa_concord_tower_north_face, was separately corrected in
-- batch 121 to 7611 to match *its own* waypoint -- the two routes' waypoints
-- disagree with each other on which of the two competing external figures
-- (7,560 ft per Mountain Project/WTA/StephAbegg vs ~7,611-7,612 ft per
-- ListsOfJohn/Peakbagger LiDAR) to use, and that cross-route disagreement is not
-- adjudicated here; this fix only resolves wa_the_cave_route's own internal
-- self-contradiction.)
UPDATE routes SET high_point_ft = 7560
WHERE id = 'wa_the_cave_route' AND high_point_ft = 7569;

-- =========================================================================
-- The Brothers (wa_the_brothers) — area row + wa_the_brothers_south_couloir
-- =========================================================================

-- areas.elevation_ft is currently 6868, but batch 106 (2026-08-12) already
-- researched and corrected this exact field to 6866, citing the land manager
-- itself (USDA Forest Service Brothers Wilderness page), WTA, and The
-- Mountaineers all independently agreeing on 6,866 ft (re-confirmed again this
-- run via WTA and the Brothers Wilderness Wikipedia page) -- and found no
-- source supporting 6,868 specifically. The live value has since reverted to
-- the old 6868 figure that batch 106 corrected away from. Re-applying that
-- already-researched fix.
UPDATE areas SET elevation_ft = 6866
WHERE id = 'wa_the_brothers' AND elevation_ft = 6868;

-- wa_the_brothers_south_couloir: this row's own high_point_ft (6866) already
-- matches the land-manager-sourced figure above, but its own summit waypoint
-- ("The Brothers - South Peak (Mount Edward)") stores elev/elevFt 6868 --
-- the same reverted figure, not 6866. Corrected the waypoint to match this
-- row's own already-correct high_point_ft and the area fix above.
UPDATE routes SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{2,elev}', '6866'::jsonb),
  '{2,elevFt}', '6866'::jsonb
)
WHERE id = 'wa_the_brothers_south_couloir'
  AND waypoints->2->>'name' = 'The Brothers - South Peak (Mount Edward)'
  AND (waypoints->2->>'elev')::int = 6868;

-- =========================================================================
-- The Chopping Block / Pinnacle Peak (wa_the_chopping_block) — wa_the_chopping_block_south_route
-- =========================================================================

-- pitches is currently 2, but batch 46 (2026-08-05) already researched and set
-- this exact field to 5 (sourced to Mountaineers.org's route description,
-- corroborated by references to Beckey's Cascade Alpine Guide) in the same
-- statement that set grade/grade_num/rock_grade to "Grade II, 5.5"/5/"5.5" --
-- those three fields still correctly reflect that fix, but pitches alone has
-- since reverted back to the pre-fix value of 2. Re-applying the pitches part
-- of that already-researched fix; this row's own pitch_detail array still only
-- enumerates 2 of the 5 documented pitches, as batch 46 already noted.
UPDATE routes SET pitches = 5
WHERE id = 'wa_the_chopping_block_south_route' AND pitches = 2;

-- =========================================================================
-- Southeast Mox Peak (wa_southeast_mox_peak) — wa_the_devils_club
-- =========================================================================

-- length_m (732 m / ~2,402 ft) does not match the sum of this row's own
-- 25-entry pitch_detail array's lengthM fields, which totals 780 m (~2,559 ft).
-- That self-summed figure is corroborated by Climbing.com's independent
-- reporting on the 2005 FA ("2,500-foot East Face"); it does not match Mountain
-- Project's "2,000 ft" figure, which neither this row's own pitch-by-pitch data
-- nor the Climbing.com account supports. Corrected length_m to match this row's
-- own more granular pitch_detail total.
UPDATE routes SET length_m = 780
WHERE id = 'wa_the_devils_club' AND length_m = 732;
