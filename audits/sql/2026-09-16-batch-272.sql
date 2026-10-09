-- WA alpine route audit, pass 5, batch 272 (2026-09-16)
-- Scope: wa_mount_baker_north_ridge .. wa_mount_christie_west

-- wa_mount_baker_park_glacier_headwall: `watch_out` is stored as one
-- newline-joined string instead of a JSON array like every other route's
-- watch_out field (hazards on this same row is a correctly-shaped array).
-- lib/db.js's toArr() (dbRouteToCamel) only splits strings on commas, not
-- newlines, so the app renders this entire 4-item blob as one giant run-on
-- bullet instead of 4 distinct watch-out items -- the same schema defect
-- this audit has found and fixed on multiple other routes (e.g.
-- wa_mount_shuksan_fisher_chimneys, wa_chockstone_route). Converted to a
-- proper JSON array of the same 4 items, splitting on the existing
-- newlines; content unchanged.
UPDATE routes
SET watch_out = '[
  "Crevasses requiring navigation through crevasse fields",
  "Headwall section requiring careful route-finding",
  "Long, remote route on Baker''s northeast flank increases commitment and rescue difficulty",
  "Glacier gear essential - carries full objective hazard of glacier travel"
]'::jsonb
WHERE id = 'wa_mount_baker_park_glacier_headwall'
  AND watch_out = '"Crevasses requiring navigation through crevasse fields\nHeadwall section requiring careful route-finding\nLong, remote route on Baker''s northeast flank increases commitment and rescue difficulty\nGlacier gear essential - carries full objective hazard of glacier travel"'::jsonb;

-- wa_mount_blum_north_ridge: `road.status` and `access.closures` both state
-- the Baker Lake Road (FR-11) closure at Shannon Creek Bridge is "expected
-- through end of August 2026". This audit confirmed as correct and current
-- on 2026-08-26 (batch 143), but today's date is 2026-09-16 -- three weeks
-- past that stated end date. WebSearch of the U.S. Forest Service's own
-- alert page ("Baker Lake Road (FSR11) Closure at Shannon Creek Bridge",
-- fs.usda.gov) -- confirmed identically across three independent search
-- queries -- states the closure runs "beginning around July 15 through
-- mid-September" for bridge-deck replacement, not "end of August" as this
-- row states. WebFetch to fs.usda.gov itself returned EGRESS_BLOCKED (as on
-- every prior batch), so the exact current-as-of-today open/closed state
-- could not be directly confirmed; corrected the stated closure window to
-- match what the authoritative source actually says (mid-September, not
-- end of August) and added a caution that the window is now at or past its
-- end, rather than asserting an unconfirmed reopening date. A sibling route
-- on this same peak, wa_mount_blum_south_ridge, was noted in batch 143 as
-- carrying the identical (now similarly stale) closure text; out of scope
-- for this batch but worth the same fix when it next comes up.
UPDATE routes
SET road = jsonb_set(
  road,
  '{status}',
  '"Closed since ~July 15, 2026 at Shannon Creek Bridge (~MP 23.8) through the Baker River Trailhead for bridge-deck repair. The Forest Service''s own alert states the closure runs through mid-September 2026, not end of August as previously listed here, so check current Mt. Baker Ranger District conditions given this window is now at or past its stated end."'
)
WHERE id = 'wa_mount_blum_north_ridge'
  AND road->>'status' LIKE 'Closed as of ~July 15, 2026 at Shannon Creek Bridge%through end of August 2026.';

UPDATE routes
SET access = jsonb_set(
  access,
  '{closures}',
  '"Baker Lake Road (FR-11) closed at Shannon Creek Bridge roughly mid-July through mid-September 2026 per the Forest Service''s own alert, not end of August as previously stated here. Check current status, as this window is at or near its end."'
)
WHERE id = 'wa_mount_blum_north_ridge'
  AND access->>'closures' = 'Baker Lake Road (FR-11) closed at Shannon Creek Bridge roughly mid-July-end of August 2026.';
