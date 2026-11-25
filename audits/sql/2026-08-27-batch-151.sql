-- WA alpine audit — batch 151 (2026-08-27, pass 3)
-- Routes: wa_mount_sefrit_southeast_ridge, wa_mount_sefrit_southwest_ridge,
-- wa_mount_shuksan_fisher_chimneys, wa_mount_shuksan_hanging_glacier,
-- wa_mount_shuksan_north_face, wa_mount_shuksan_northeast_ridge,
-- wa_mount_shuksan_northwest_arete, wa_mount_shuksan_price_glacier.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. File is ~5.3KB, past the ~4000-byte soft limit
-- CLAUDE.md documents for the SQL Editor silently truncating a paste —
-- apply each UPDATE individually rather than pasting the whole file at once.

-- =========================================================================
-- Mount Sefrit (wa_mount_sefrit) — wa_mount_sefrit_southwest_ridge
-- (Southwest Ridge)
-- =========================================================================

-- approach_logistics.trailheadDirection was truncated mid-sentence to 23
-- characters ("From Glacier, drive Mt.") -- not a display artifact, the
-- live value itself cuts off there. Re-homed from this same row's own
-- (complete) `approach` field, which describes the identical drive and
-- trailhead in full, plus the disambiguating clause already used by this
-- row's own `corrections`/approach_variants text ("do not confuse with
-- the separate Hannegan Pass Trailhead further up FR 32").
UPDATE routes SET approach_logistics = jsonb_set(
  approach_logistics, '{trailheadDirection}',
  '"From Glacier, drive Mt. Baker Highway (SR 542) east about 12.5 miles, turn left on Hannegan Pass Road (FR 32), continue just over a mile to the junction with Nooksack Cirque Road (FR 34), and follow FR 34 one mile to its end at the Nooksack Cirque Trailhead (a different trailhead from the Hannegan Pass Trailhead further up FR 32), fording Ruth Creek right at the trailhead, as there is no bridge."'::jsonb
)
WHERE id = 'wa_mount_sefrit_southwest_ridge'
  AND approach_logistics->>'trailheadDirection' = 'From Glacier, drive Mt.';

-- =========================================================================
-- Mount Sefrit (wa_mount_sefrit) — wa_mount_sefrit_southeast_ridge
-- (Southeast Ridge)
-- =========================================================================

-- This row's own `approach` and `approach_logistics.trailheadDirection`
-- both give the shared Hannegan Campground trailhead as "about 2,950 ft",
-- while this row's OWN bivy[0] entry for the identical spot ("Hannegan
-- trailhead, end of the Ruth Creek road") reads 3,100 ft -- an in-row
-- contradiction. Batch 150's log already flagged this exact discrepancy
-- (found via sibling wa_mount_sefrit_bloody_head_couloir, which reads
-- "~3,120 ft") without fixing it, since southeast_ridge wasn't in that
-- batch. External sources (WTA/USFS-derived search results) put the
-- Hannegan trailhead at 3,120 ft, corroborating the row's own bivy figure
-- over its approach-text figure. Corrected both prose fields to "~3,100
-- ft" (matching the row's own bivy value exactly, rather than introducing
-- a third number).
UPDATE routes SET
  approach = replace(approach, 'Hannegan Campground (about 2,950 ft)', 'Hannegan Campground (about 3,100 ft)'),
  approach_logistics = jsonb_set(
    approach_logistics, '{trailheadDirection}',
    to_jsonb(replace(approach_logistics->>'trailheadDirection', '(~2,950 ft)', '(~3,100 ft)'))
  )
WHERE id = 'wa_mount_sefrit_southeast_ridge'
  AND approach LIKE '%Hannegan Campground (about 2,950 ft)%'
  AND approach_logistics->>'trailheadDirection' LIKE '%(~2,950 ft)%';

-- =========================================================================
-- Mount Shuksan (wa_mount_shuksan) — wa_mount_shuksan_hanging_glacier
-- (Hanging Glacier)
-- =========================================================================

-- Summit waypoint elev/elevFt (9127) contradicted this same row's own
-- high_point_ft (9131), the parent area's elevation_ft (9131, per
-- areas.wa_mount_shuksan), and all four other Shuksan routes in this
-- batch that carry a summit waypoint (Fisher Chimneys, North Face,
-- NE Ridge, Price Glacier all read 9131). 9,131 ft is also the
-- consistently cited official figure externally (Wikipedia/USGS-derived).
UPDATE routes SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{3,elev}', '9131'),
  '{3,elevFt}', '9131'
)
WHERE id = 'wa_mount_shuksan_hanging_glacier'
  AND waypoints->3->>'name' = 'Mount Shuksan summit pyramid'
  AND (waypoints->3->>'elev')::numeric = 9127
  AND (waypoints->3->>'elevFt')::numeric = 9127;

-- Trailhead waypoint ("White Salmon Road (hairpin) TH") carried no
-- elevation at all, while this batch's sibling wa_mount_shuksan_north_face
-- records elev=3500 for the identical coordinates (lat 48.8595,
-- lng -121.648) on the same shared trailhead. Externally corroborated:
-- the White Salmon base area at Mt. Baker Ski Area is published at
-- 3,500 ft (mtbaker.us / jollyturns.com).
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '3500')
WHERE id = 'wa_mount_shuksan_hanging_glacier'
  AND waypoints->0->>'name' = 'White Salmon Road (hairpin) TH'
  AND NOT (waypoints->0 ? 'elev');

-- =========================================================================
-- Mount Shuksan (wa_mount_shuksan) — wa_mount_shuksan_northwest_arete
-- (Northwest Arête)
-- =========================================================================

-- Same summit-elevation defect as Hanging Glacier above: waypoints[1]
-- (the summit) read 9127 against the area's 9131 and every sibling
-- route's 9131. This row's own high_point_ft was null (no in-row
-- contradiction to catch it) -- filled to 9131 alongside the waypoint fix
-- since five sibling routes on this identical summit already agree on it.
UPDATE routes SET
  waypoints = jsonb_set(
    jsonb_set(waypoints, '{1,elev}', '9131'),
    '{1,elevFt}', '9131'
  ),
  high_point_ft = 9131
WHERE id = 'wa_mount_shuksan_northwest_arete'
  AND waypoints->1->>'name' = 'Mount Shuksan summit pyramid'
  AND (waypoints->1->>'elev')::numeric = 9127
  AND (waypoints->1->>'elevFt')::numeric = 9127
  AND high_point_ft IS NULL;

-- Same missing-trailhead-elevation defect as Hanging Glacier above, same
-- shared waypoint, same fix.
UPDATE routes SET waypoints = jsonb_set(waypoints, '{0,elev}', '3500')
WHERE id = 'wa_mount_shuksan_northwest_arete'
  AND waypoints->0->>'name' = 'White Salmon Road (hairpin) TH / lower White Salmon lodge'
  AND NOT (waypoints->0 ? 'elev');

-- verify: should return 0 rows (no more 9127 summits or truncated
-- trailheadDirection among this batch's routes)
select id, waypoints from routes
where id in (
  'wa_mount_sefrit_southeast_ridge', 'wa_mount_sefrit_southwest_ridge',
  'wa_mount_shuksan_fisher_chimneys', 'wa_mount_shuksan_hanging_glacier',
  'wa_mount_shuksan_north_face', 'wa_mount_shuksan_northeast_ridge',
  'wa_mount_shuksan_northwest_arete', 'wa_mount_shuksan_price_glacier'
)
and (
  waypoints::text like '%9127%'
  or approach_logistics->>'trailheadDirection' = 'From Glacier, drive Mt.'
  or approach like '%2,950 ft%'
  or approach_logistics->>'trailheadDirection' like '%2,950 ft%'
);
