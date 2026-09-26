-- wa_hourglass_gully_winter: approach text names Mount Index's Main Peak (this route's own
-- summit, per high_point_ft=6002 and its own summit waypoint at 5,979 ft) as "(~5,502 ft)".
-- 5,502 ft is not Main Peak's elevation -- it is close to Mount Index's separate MIDDLE Peak
-- (listsofjohn.com: "Mount Index-Middle Peak" 5,527 ft). External sources (Wikipedia, PeakVisor)
-- converge on 5,991 ft for Main/South Peak, matching this row's own stored figures far more
-- closely than 5,502 ft does. Corrected the approach text's parenthetical to the externally-
-- sourced Main Peak elevation.
UPDATE routes SET approach = replace(approach, 'the massif''s highest and most technical summit (~5,502 ft)', 'the massif''s highest and most technical summit (~5,991 ft)') WHERE id = 'wa_hourglass_gully_winter';

-- wa_icy_peak_southwest_route: same three findings as audits/sql/2026-08-07-batch-69.sql,
-- re-verified independently this pass and still unapplied in the live row (season is still
-- "Jun-Aug", high_point_ft/summit waypoint are still 7073, overview still says this route
-- reaches the Southeast summit). Re-proposing all three fixes verbatim.
--
-- 1) season ("Jun-Aug") excludes September despite this row's own seasonal_guidance.
--    monthBreakdown rating September "good" ("still climbable with cooling, more variable
--    weather") and rating June "risky" ("Full winter/spring snowpack still typical... road
--    often still gated"); the row's own seasonal_guidance.optimalWindow and best_season text
--    both independently say "Mid-July through September."
UPDATE routes SET season = 'Jul-Sep' WHERE id = 'wa_icy_peak_southwest_route';

-- 2) high_point_ft (7073) and the final summit waypoint both claim this route reaches Icy
--    Peak's true, higher Southeast summit -- but this same row's own approach text says the
--    described 100-ft summit gully "leads to the northwest summit" and that "the true high
--    point is a separate southeast tower about 11 ft higher... many parties only tag the
--    northwest summit, which holds the register." Beckey's Cascade Alpine Guide (via search
--    corroboration) gives the Northwest Peak at 7,062 ft -- exactly matching this row's own
--    stated "11 ft" gap from 7,073 ft. As described, the route as documented tops out at the
--    NW/register summit, not the true high point.
UPDATE routes SET high_point_ft = 7062 WHERE id = 'wa_icy_peak_southwest_route';
UPDATE routes SET waypoints = jsonb_set(waypoints, '{7,elev}', '7062') WHERE id = 'wa_icy_peak_southwest_route';

-- 3) overview claimed this specific route reaches the true Southeast summit; corrected to
--    state it reaches the lower Northwest/register summit instead, consistent with fix #2.
UPDATE routes SET overview = replace(overview, 'the true, higher Southeast summit (7,073 ft) reached by this route', 'the true, higher Southeast summit (7,073 ft); this route reaches the lower, more-visited Northwest summit (7,062 ft) where the register sits') WHERE id = 'wa_icy_peak_southwest_route';
