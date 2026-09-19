-- WA alpine audit — batch 179 (2026-09-03, pass 4)
-- Routes: wa_baring_mountain_northwest_ridge, wa_baring_mountain_r1,
-- wa_bear_mountain_chilliwack_north_buttress, wa_beckey_davis, wa_beckey_tate,
-- wa_beyond_redlining, wa_big_four_mountain_northwest_ridge,
-- wa_big_four_mountain_spindrift_couloir.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. Apply each UPDATE individually rather than
-- pasting the whole file at once.

-- =========================================================================
-- Baring Mountain (wa_main_peak_3) — wa_baring_mountain_northwest_ridge
-- =========================================================================

-- Trailhead waypoint 0 ("Barclay Lake Trailhead (end of FS Road 6024)")
-- stored lat/lng 47.7954,-121.46434, which sits roughly 500m from the real
-- Barclay Lake Trailhead. This batch's sibling route on the same peak,
-- wa_baring_mountain_r1, stores 47.7923,-121.4592 for the identical
-- named trailhead -- which exactly matches the coordinates independently
-- confirmed via WTA/AllTrails/USFS web search for Barclay Lake Trailhead
-- (end of gravel FS Road 6024/Barclay Creek Road off US-2 near Baring,
-- Snohomish County). Corrected to match both the external source and the
-- sibling route's own value, rather than inventing a new coordinate.
UPDATE routes SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{0,lat}', '47.7923'),
  '{0,lng}', '-121.4592'
)
WHERE id = 'wa_baring_mountain_northwest_ridge'
  AND waypoints->0->>'name' = 'Barclay Lake Trailhead (end of FS Road 6024)'
  AND waypoints->0->>'type' = 'Trailhead'
  AND (waypoints->0->>'lat')::numeric = 47.7954
  AND (waypoints->0->>'lng')::numeric = -121.46434;

-- =========================================================================
-- Prusik Peak (wa_prusik_peak) — wa_beckey_davis (Beckey-Davis)
-- =========================================================================

-- Trailhead waypoint 0's own note is self-contradictory: it opens "Alternate
-- access only, used when the standard Stuart Lake Trailhead / Aasgard Pass
-- approach is closed" and then, in the same note, states "Stuart Lake
-- Trailhead is the standard/preferred access described in the approach
-- field" -- directly opposite characterizations of the same named
-- trailhead. This row's own `approach` field settles which is correct: it
-- opens "Standard access is via Aasgard Pass into the Core Enchantments:
-- Stuart Lake Trailhead -> Stuart Lake Trail..." and separately notes the
-- trailhead/pass "can close seasonally (e.g., wildfire closures have forced
-- parties onto the Snow Lakes Trail instead...)". Rewrote the note to state
-- that without contradicting itself, using only facts already present in
-- this row's own approach text (no external research needed or performed).
UPDATE routes SET waypoints = jsonb_set(
  waypoints, '{0,note}',
  '"Standard access, via Stuart Lake Trail -> Colchuck Lake Trail #1599A -> Aasgard Pass into the Enchantments Core. Can close seasonally (e.g. wildfire), forcing parties onto the longer Snow Lakes/Lake Viviane approach instead (~10 mi one-way, per this route’s own approach text)."'::jsonb
)
WHERE id = 'wa_beckey_davis'
  AND waypoints->0->>'name' = 'Stuart Lake Trailhead'
  AND waypoints->0->>'note' = 'Alternate access only, used when the standard Stuart Lake Trailhead / Aasgard Pass approach is closed (e.g. wildfire closures) -- longer route via Snow Lakes/Lake Viviane (~10 mi one-way, per this route''s own approach text). Stuart Lake Trailhead is the standard/preferred access described in the approach field.';

-- =========================================================================
-- Morning Star Peak (wa_morning_star_peak) — wa_beyond_redlining
-- =========================================================================

-- fa field ("Rad Roberts and Kurt Hicks, May 2020") contradicts this same
-- row's own `overview` field ("Established by Rad Roberts and Kurt Hicks
-- in July 2020"). External sourcing (AAC Publications: "On July 11, 2020,
-- the team set off to attempt an all-free team ascent of Beyond Redlining"
-- -- the first free ascent, published in the 2021 American Alpine Journal)
-- confirms July, not May, is correct. Corrected fa to match both the row's
-- own overview text and the external source.
UPDATE routes SET fa = 'Rad Roberts and Kurt Hicks, July 11, 2020'
WHERE id = 'wa_beyond_redlining' AND fa = 'Rad Roberts and Kurt Hicks, May 2020';

-- high_point_ft was NULL despite this row's own overview and descent_text
-- both stating the route tops out on the "same summit as Mile High Club" --
-- a sibling route on this same peak (wa_mile_high_club, not in this batch)
-- which stores high_point_ft = 5280 for that shared top, and whose own
-- trailhead waypoint note independently confirms it is "approach to
-- Vegan/Vega Tower group" -- the same tower group this route's approach
-- text names. Filled from the sibling's own already-recorded value rather
-- than inventing a new figure; the resulting net rise from this route's own
-- trailhead waypoint (2,350 ft) to 5,280 ft (2,930 ft) stays below the
-- stored gain_ft (3,500), so this does not introduce a gain-floor
-- violation.
UPDATE routes SET high_point_ft = 5280
WHERE id = 'wa_beyond_redlining' AND high_point_ft IS NULL;

-- =========================================================================
-- Big Four Mountain (wa_big_four_mountain) — wa_big_four_mountain_northwest_ridge
-- and wa_big_four_mountain_spindrift_couloir
-- =========================================================================

-- Both routes' trailhead waypoint 0 ("Big Four Picnic Area / Ice Caves
-- Trailhead") stores elev/elevFt 1640, which multiple independent external
-- sources (Washington Trails Association-derived figures, The Mountaineers,
-- hikeoftheweek.com) converge on as 1,750 ft for this well-documented,
-- popular trailhead. The same wrong 1640 value is also shared verbatim by
-- two sibling routes on this peak not in this batch (wa_big_four_mountain_tower_route,
-- wa_big_four_mountain_dry_creek_route), confirming it is one stale
-- area-level default rather than route-specific data -- those two will
-- need the identical fix when they come up in a future pass. Correcting
-- the trailhead also resolves a gain_ft floor violation on both routes in
-- this batch: net rise from trailhead to summit (6170 ft, externally
-- corroborated and left unchanged) was 4,530 ft against a stored gain_ft
-- of 4,450 -- a violation of the route's own physical floor. With the
-- corrected trailhead (1,750 ft) net rise becomes 4,420 ft, which the
-- stored gain_ft of 4,450 now satisfies without needing to also change
-- gain_ft.
UPDATE routes SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{0,elev}', '1750'),
  '{0,elevFt}', '1750'
)
WHERE id = 'wa_big_four_mountain_northwest_ridge'
  AND waypoints->0->>'name' = 'Big Four Picnic Area / Ice Caves Trailhead'
  AND waypoints->0->>'type' = 'Trailhead'
  AND (waypoints->0->>'elev')::numeric = 1640;

UPDATE routes SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{0,elev}', '1750'),
  '{0,elevFt}', '1750'
)
WHERE id = 'wa_big_four_mountain_spindrift_couloir'
  AND waypoints->0->>'name' = 'Big Four Picnic Area / Ice Caves Trailhead'
  AND waypoints->0->>'type' = 'Trailhead'
  AND (waypoints->0->>'elev')::numeric = 1640;

-- verify: should return 0 rows
select id from routes
where id in (
  'wa_baring_mountain_northwest_ridge', 'wa_beckey_davis', 'wa_beyond_redlining',
  'wa_big_four_mountain_northwest_ridge', 'wa_big_four_mountain_spindrift_couloir'
)
and (
  (id = 'wa_baring_mountain_northwest_ridge' and (waypoints->0->>'lat')::numeric = 47.7954)
  or (id = 'wa_beckey_davis' and waypoints->0->>'note' like 'Alternate access only%')
  or (id = 'wa_beyond_redlining' and (fa = 'Rad Roberts and Kurt Hicks, May 2020' or high_point_ft is null))
  or (id in ('wa_big_four_mountain_northwest_ridge','wa_big_four_mountain_spindrift_couloir')
      and (waypoints->0->>'elev')::numeric = 1640)
);
