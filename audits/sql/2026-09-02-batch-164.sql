-- WA alpine audit — batch 164 (2026-09-02, pass 3)
-- Routes: wa_sinister_peak_north_face, wa_sinister_peak_southwest_route,
-- wa_sitkum_spire_standard, wa_sloan_peak_corkscrew, wa_sloan_peak_r1,
-- wa_snowfield_peak_neve_glacier, wa_snowking_mountain_standard,
-- wa_south_arete.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. Apply each UPDATE individually rather than
-- pasting the whole file at once.

-- =========================================================================
-- South Early Winters Spire (wa_south_early_winters_spire) — wa_south_arete
-- (South Arete)
-- =========================================================================

-- Blue Lake Trailhead is stored at 5,200 ft in both the Trailhead waypoint
-- and the approach prose ("elev. ~5,200 ft"), but multiple independent
-- sources (AllTrails, WTA-derived trailhead listings, 10Adventures) put it
-- at 5,400 ft on SR-20 about a mile west of Washington Pass (itself
-- 5,477 ft) — consistent with this SAME row's own approach_logistics.
-- trailheadDirection, which already says "5,400 ft" and was left
-- unchanged when the waypoint/approach text weren't. It also matches this
-- row's own prior-pass correction: gain_ft was corrected 2000->2407
-- "to match... high_point_ft-minus-trailhead-elevation arithmetic"
-- (7,807 - 5,400 = 2,407 exactly; 7,807 - 5,200 = 2,607, which does not
-- match the stored gain_ft). That earlier fix updated gain_ft using the
-- correct 5,400 ft figure but never propagated it to the waypoint or
-- approach text, leaving the row internally inconsistent.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '5400')
WHERE id = 'wa_south_arete'
  AND waypoints->0->>'name' = 'Blue Lake Trailhead'
  AND (waypoints->0->>'elev')::numeric = 5200;

UPDATE routes SET approach = replace(approach, 'elev. ~5,200 ft', 'elev. ~5,400 ft')
WHERE id = 'wa_south_arete'
  AND approach LIKE '%elev. ~5,200 ft%';

-- =========================================================================
-- Snowking Mountain (wa_snowking_mountain) — wa_snowking_mountain_standard
-- (Standard Route / Snowking Glacier)
-- =========================================================================

-- best_season said "Mid-summer through early fall once the approach is
-- snow-free and the glacier is well-covered" — backwards from every
-- source found (WTA-derived trip-report synthesis, Mountaineers-derived
-- route descriptions): the Snowking Glacier/snowfield line this route
-- describes (its own name) is the SPRING/EARLY-SUMMER route, because the
-- glacier is best "well-covered" (bridged, low crevasse hazard) early in
-- the season; by high summer the south snowfield opens to exposed blue
-- ice and crevasses, which is when the separate West Ridge variant (not
-- this route) becomes the better late-season option. This also already
-- matches this SAME row's own season field ('May-Jul'), which the old
-- best_season text directly contradicted.
UPDATE routes SET best_season = 'Best in spring through early summer (roughly May-July) while the Snowking Glacier and summit snowfield are still well-covered and crevasses remain bridged. By mid-to-late summer the south snowfield opens to exposed blue ice and crevasses, adding difficulty and hazard on this line. (The separate West Ridge route is better suited to late-summer/fall conditions.)'
WHERE id = 'wa_snowking_mountain_standard'
  AND best_season = 'Mid-summer through early fall once the approach is snow-free and the glacier is well-covered.';

-- verify: should return 0 rows
select id from routes
where id in ('wa_south_arete', 'wa_snowking_mountain_standard')
and (
  (id = 'wa_south_arete' and (
    (waypoints->0->>'elev')::numeric = 5200
    or approach like '%elev. ~5,200 ft%'
  ))
  or (id = 'wa_snowking_mountain_standard' and best_season like '%Mid-summer through early fall once the approach is snow-free%')
);
