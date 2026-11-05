-- WA alpine audit — batch 374 (2026-10-02, pass 6)
-- Routes: wa_the_tooth_fairy, wa_the_tooth_indentured_servant, wa_the_tooth_r1
-- (Northeast Slabs), wa_the_tooth_south_face (The Tooth); wa_the_triad_east_peak,
-- wa_the_triad_traverse (The Triad); wa_the_west_face (North Early Winters Spire);
-- wa_this_my_friend (Dragontail Peak); wa_three_fingers_r1, wa_three_fingers_r2
-- (Three Fingers).
-- All WHERE clauses include the current (wrong) value as a safety check per
-- project convention, so each statement is a no-op if the row has already changed.

-- =========================================================================
-- Three Fingers — North Peak (wa_three_fingers_r1)
-- =========================================================================

-- high_point_ft is 6870, but the North Peak subsummit's own USGS 7.5' topo
-- elevation (via Peakbagger, citing the Whitehorse Mountain quad) is 6,832 ft,
-- independently corroborated by a LiDAR-derived figure of 6,833 ft
-- (listsofjohn.com) -- two independent sources converging within 1 ft of each
-- other, both well clear of the stored 6870. (The main/South Peak lookout
-- summit, stored separately as areas.elevation_ft = 6865 on wa_three_fingers,
-- is correct per Peakbagger's 6865.4 ft and is not touched here.)
UPDATE routes SET high_point_ft = 6832
WHERE id = 'wa_three_fingers_r1' AND high_point_ft = 6870;

-- This row's own summit waypoint ("North Peak, Three Fingers", index 7) carries
-- the same wrong 6870 figure -- correct it to match the fix above.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{7,elev}', '6832'::jsonb)
WHERE id = 'wa_three_fingers_r1'
  AND waypoints->7->>'name' = 'North Peak, Three Fingers'
  AND (waypoints->7->>'elev')::int = 6870;

-- =========================================================================
-- North Early Winters Spire — The West Face (wa_the_west_face)
-- =========================================================================

-- fa misspells the first ascensionist's surname as "Beckstad". Three independent
-- sources (SummitPost, TheCrag, SuperTopo) all give "Dave Beckstead" for the
-- June 17, 1965 first ascent with Fred Beckey; none give "Beckstad".
UPDATE routes
SET fa = 'Fred Beckey and Dave Beckstead, 1965 (FFA: Steve Risse and Dave Tower, 1985)'
WHERE id = 'wa_the_west_face'
  AND fa = 'Fred Beckey and Dave Beckstad, 1965 (FFA: Steve Risse and Dave Tower, 1985)';
