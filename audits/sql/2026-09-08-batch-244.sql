-- WA alpine audit — batch 244 (2026-09-08, pass 5)
-- Routes: wa_beckey_tate, wa_beyond_redlining, wa_big_four_mountain_northwest_ridge,
-- wa_big_four_mountain_spindrift_couloir, wa_big_kangaroo_west_face,
-- wa_big_snow_mountain_east_ridge_hardscrabble_route,
-- wa_big_snow_mountain_north_slope_dingford_route, wa_black_peak_east_buttress,
-- wa_black_peak_northeast_ridge, wa_bonanza_peak_mary_green_glacier.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. Apply each UPDATE individually rather than
-- pasting the whole file at once.
--
-- Every fix below was already proposed by an earlier batch (115 or 179) and
-- confirmed still unapplied in the live row as of this run; each has been
-- independently re-verified this session before being re-proposed here
-- (see audits/wa-alpine-audit-log.md for sourcing).

-- =========================================================================
-- Morning Star Peak (wa_morning_star_peak) — wa_beyond_redlining
-- =========================================================================

-- high_point_ft is still NULL. This route's own overview/descent_text state
-- it "tops out on the same summit as Mile High Club," and the sibling route
-- wa_mile_high_club (same peak, same Sunrise Mine Trailhead approach)
-- already stores high_point_ft = 5280 for that shared top. Re-verified this
-- session: wa_mile_high_club's own waypoints/notes independently confirm
-- the shared "Vegan/Vega Tower group" approach. Filling from the sibling's
-- already-recorded value; net rise from this route's own 2,350 ft trailhead
-- (2,930 ft) stays under the stored gain_ft (3,500), so no gain-floor issue
-- is introduced. (First proposed batch 179, still unapplied.)
UPDATE routes SET high_point_ft = 5280
WHERE id = 'wa_beyond_redlining' AND high_point_ft IS NULL;

-- =========================================================================
-- Big Four Mountain (wa_big_four_mountain) — wa_big_four_mountain_northwest_ridge
-- and wa_big_four_mountain_spindrift_couloir
-- =========================================================================

-- Both routes' trailhead waypoint 0 ("Big Four Picnic Area / Ice Caves
-- Trailhead") still stores elev/elevFt 1640. Re-verified this session via
-- independent web search: multiple sources (trail-guide aggregations citing
-- the USFS recreation-site page) converge on 1,750 ft for this trailhead,
-- with 1,700 ft as a secondary, less-common figure — 1,640 does not match
-- any source found. Corrected to 1,750. This also resolves a gain_ft floor
-- violation on both routes: net rise to the (externally corroborated,
-- unchanged) 6,170 ft summit was 4,530 ft against a stored gain_ft of 4,450
-- (impossible by 80 ft); with the corrected trailhead, net rise is 4,420 ft,
-- which the existing gain_ft of 4,450 satisfies, so gain_ft is left
-- untouched. (First proposed batch 179, still unapplied. Two more sibling
-- routes on this peak not in this batch, wa_big_four_mountain_tower_route
-- and wa_big_four_mountain_dry_creek_route, share the identical stale 1640
-- value per batch 179's note and will need the same fix on a future pass.)
UPDATE routes SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{0,elev}', '1750'),
  '{0,elevFt}', '1750'
)
WHERE id = 'wa_big_four_mountain_northwest_ridge'
  AND waypoints->0->>'name' = 'Big Four Picnic Area / Ice Caves Trailhead'
  AND waypoints->0->>'type' = 'Trailhead'
  AND (waypoints->0->>'elev')::numeric = 1640
  AND (waypoints->0->>'elevFt')::numeric = 1640;

UPDATE routes SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{0,elev}', '1750'),
  '{0,elevFt}', '1750'
)
WHERE id = 'wa_big_four_mountain_spindrift_couloir'
  AND waypoints->0->>'name' = 'Big Four Picnic Area / Ice Caves Trailhead'
  AND waypoints->0->>'type' = 'Trailhead'
  AND (waypoints->0->>'elev')::numeric = 1640
  AND (waypoints->0->>'elevFt')::numeric = 1640;

-- =========================================================================
-- Big Kangaroo (wa_big_kangaroo) — wa_big_kangaroo_west_face
-- =========================================================================

-- grade_num is still NULL despite this row's own rock_grade ("5.6") and
-- pitch_detail crux pitch (also 5.6, "a steep move past a single old, rusty
-- 1/4-inch bolt to the tiny summit"). The catalog's grade_num convention
-- (digits after the decimal) is independently confirmed this session by the
-- sibling route on the same peak, wa_beckey_tate (grade "5.9+" -> grade_num
-- 9), which already carries the correct value live. Corrected to 6.
-- (First proposed batch 115, still unapplied.)
UPDATE routes SET grade_num = 6
WHERE id = 'wa_big_kangaroo_west_face' AND grade_num IS NULL AND rock_grade = '5.6';

-- data_quality.gaps[0] is a STALE note: it says the row's id is
-- 'wa_big_kangaroo_southwest_rib' (a mismatch with a real, different route
-- of that name on South Early Winter Spire) and recommends renaming it to
-- 'wa_big_kangaroo_west_face'. This has already happened -- the row's live
-- id is 'wa_big_kangaroo_west_face' today (confirmed via direct query this
-- session) -- but the gaps entry describing the now-resolved problem was
-- never removed, so it still reads as an open data-quality issue on a row
-- whose id already matches what the note itself recommended. Removing the
-- resolved entry; the other four gaps entries (pitch-count source note,
-- unverified emergency-contact-by-phone note, GPS-track sourcing note,
-- computed-difficulty-breakdown note) are all still accurate and left in
-- place.
UPDATE routes SET data_quality = jsonb_set(
  data_quality, '{gaps}', (data_quality->'gaps') - 0
)
WHERE id = 'wa_big_kangaroo_west_face'
  AND data_quality->'gaps'->0 = '"Route ID mismatch: id = ''wa_big_kangaroo_southwest_rib'' (suggesting Southwest Rib route on South Early Winter Spire, a different peak) but row content correctly describes Big Kangaroo''s West Face/West Route. Recommend renaming id to ''wa_big_kangaroo_west_face'' after checking for any foreign-key or UI dependencies on the current id."'::jsonb;
