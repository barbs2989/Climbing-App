-- WA Alpine Audit — Pass 1, Batch 32 — 2026-07-31
-- Peaks: Mount Shuksan (White Salmon Glacier), Mount Spickard (Southwest
--        Route), Mount St. Helens (Monitor Ridge, Worm Flows), Mount Steel
--        (First Divide Route), Mount Stuart (Girth Pillar, Ice Cliff
--        Glacier, North Face, North Ridge Complete, Stuart Glacier Couloir)

-- =========================================================================
-- Mount Shuksan
-- =========================================================================

-- wa_mount_shuksan_white_salmon_glacier: watch_out was stored as a single
-- newline-joined string instead of a JSON array like every other route's
-- watch_out field -- the same rendering bug already fixed on Fisher
-- Chimneys (batch 31): lib/db.js's toArr() only splits strings on commas,
-- not newlines, so the app would render all 5 items as one run-on bullet.
-- Converted to a proper 5-item JSON array, splitting on the existing
-- newlines. Also stripped the "Mount Tom area, North Cascades." DB-wide
-- junk clause (first identified batch 15, confirmed on 3 more Shuksan
-- routes in batch 31) from access.notes.
UPDATE routes
SET watch_out = '[
  "Glacier climbing with crevasse hazard present",
  "Serac exposure creates objective hazard",
  "Route-finding through glacier terrain critical",
  "Altitude weather hazard (9,100+ ft)",
  "Early turnaround essential - sun softening increases hazard"
]'::jsonb
WHERE id = 'wa_mount_shuksan_white_salmon_glacier'
  AND watch_out = '"Glacier climbing with crevasse hazard present\nSerac exposure creates objective hazard\nRoute-finding through glacier terrain critical\nAltitude weather hazard (9,100+ ft)\nEarly turnaround essential - sun softening increases hazard"'::jsonb;

UPDATE routes
SET access = jsonb_set(access, '{notes}', '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."', false)
WHERE id = 'wa_mount_shuksan_white_salmon_glacier'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit. Mount Tom area, North Cascades.';

-- =========================================================================
-- Mount Spickard
-- =========================================================================

-- wa_mount_spickard_southwest: `corrections` claims "this page uses 8,980
-- ft" for the summit elevation, but the row's own `high_point_ft` actually
-- stores 8979 -- a plain self-contradiction between the row's documented
-- reasoning and its actual data, same never-propagated-correction pattern
-- as batches 12/15/30/31. External sources genuinely conflict on this
-- summit's exact elevation (8978 lidar-revised, 8979 traditional Wikipedia
-- figure, 8980 PeakVisor, 8983 older listsofjohn.com/area-row figure), so
-- this fix only makes the corrections text match what is actually stored
-- (8979, the "traditional" pre-lidar figure) rather than picking a winner
-- among the conflicting external numbers. The area row's separate
-- elevation_ft (8983) still disagrees with the route and is left for human
-- review below rather than guessed.
UPDATE routes
SET corrections = 'Sources vary slightly on summit elevation (8,979-8,983 ft across Wikipedia, WTA, and listsofjohn.com) — this page uses 8,979 ft, the traditional Wikipedia figure (matches the given coordinates closely). The mountain''s overall first ascent (1904, Walter B. Reaburn) is well documented, but the first ascent of this specific southwest line is not clearly established — a 1941 Beckey brothers ascent ''from the southwest'' (after their Mox Peaks first ascents) is mentioned in secondary sources but is not confirmed as this route''s first ascent, so ''fa'' has been left null rather than guessed. Approach distance/gain figures also vary by source (5.5 mi/~3,400 ft to Ouzel Lake in older reports vs. ~8 mi/~7,000 ft total in a 2022 report) likely reflecting recent road-access degradation forcing earlier parking — this page uses the more recent (2022) total-route figures.'
WHERE id = 'wa_mount_spickard_southwest'
  AND high_point_ft = 8979
  AND corrections LIKE '%this page uses 8,980 ft, the most commonly cited figure%';

-- =========================================================================
-- Mount Stuart
-- =========================================================================

-- wa_mount_stuart_north_ridge: `fa` read "Mead Hargis & Jay Ossiander,
-- 1963" -- correct climbers, wrong year. Independently corroborated across
-- multiple sources (American Alpine Institute's route-history profile,
-- cross-checked via separate search queries) that 1963 was Fred Beckey &
-- Steve Marts's first complete ascent via a lower-ridge variation (seven
-- years after Don Claunch & John Rupley first climbed the upper ridge alone
-- in 1956, bypassing the Great Gendarme); Hargis & Ossiander's toe-to-summit
-- line over the Great Gendarme -- the one this row actually describes and
-- the route most parties climb today -- dates to 1970, not 1963. Fixed the
-- year and added the earlier-ascents context so the one fa field doesn't
-- collapse three distinct historical ascents into one.
UPDATE routes
SET fa = 'Mead Hargis & Jay Ossiander, 1970 (toe-to-summit line over the Great Gendarme — Don Claunch & John Rupley first climbed the upper ridge alone in 1956, and Fred Beckey & Steve Marts completed an earlier full ascent via a lower-ridge variation in 1963)'
WHERE id = 'wa_mount_stuart_north_ridge'
  AND fa = 'Mead Hargis & Jay Ossiander, 1963 (toe-to-summit line over the Great Gendarme)';

-- wa_mount_stuart_ice_cliff_glacier: same watch_out newline-string bug as
-- White Salmon Glacier above, plus the same "Mount Tom area, North
-- Cascades." junk clause in access.notes.
UPDATE routes
SET watch_out = '[
  "Alpine ice terrain with technical climbing",
  "Crevasse hazards inherent to glacier climbing",
  "Bergschrund crossing required"
]'::jsonb
WHERE id = 'wa_mount_stuart_ice_cliff_glacier'
  AND watch_out = '"Alpine ice terrain with technical climbing\nCrevasse hazards inherent to glacier climbing\nBergschrund crossing required"'::jsonb;

UPDATE routes
SET access = jsonb_set(access, '{notes}', '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."', false)
WHERE id = 'wa_mount_stuart_ice_cliff_glacier'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit. Mount Tom area, North Cascades.';

-- wa_mount_stuart_stuart_glacier_couloir: same watch_out newline-string bug,
-- plus the same "Mount Tom area, North Cascades." junk clause.
UPDATE routes
SET watch_out = '[
  "Water ice pitches up to 60 degrees - hardest ice conditions",
  "Most of route at 40-50 degree angles (unstable snow/ice)",
  "Crux: approximately 100 feet of water ice up to 60 degrees requiring ice climbing technique",
  "Mixed terrain transitions between ice and rock - protection quality variable",
  "Alpine ice climbing requiring strong technical skills"
]'::jsonb
WHERE id = 'wa_mount_stuart_stuart_glacier_couloir'
  AND watch_out = '"Water ice pitches up to 60 degrees - hardest ice conditions\nMost of route at 40-50 degree angles (unstable snow/ice)\nCrux: approximately 100 feet of water ice up to 60 degrees requiring ice climbing technique\nMixed terrain transitions between ice and rock - protection quality variable\nAlpine ice climbing requiring strong technical skills"'::jsonb;

UPDATE routes
SET access = jsonb_set(access, '{notes}', '"Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit."', false)
WHERE id = 'wa_mount_stuart_stuart_glacier_couloir'
  AND access->>'notes' = 'Northwest Forest Pass required ($5/day or $30/annual). No specific climbing permit. Mount Tom area, North Cascades.';
