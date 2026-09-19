-- WA alpine audit -- batch 155 (2026-08-27, pass 3)
-- Routes: wa_mount_triumph_northeast_ridge, wa_ne_ridge,
-- wa_needle_peak_north_ridge, wa_neve_glacier_west_ridge,
-- wa_news_nw_corner, wa_nooksack_tower_beckey_route,
-- wa_nooksack_tower_south_face, wa_north_face_3.
-- All WHERE clauses include the current (wrong) value as a safety check
-- per project convention. Apply each UPDATE individually rather than
-- pasting the whole file at once.

-- =========================================================================
-- Nooksack Tower -- North Face (Beckey-Schmidtke Route), wa_nooksack_tower_beckey_route
-- =========================================================================

-- (1) gain_ft is physically impossible against the route's own waypoints.
-- Its 8 stored waypoints climb monotonically from the trailhead (2200 ft)
-- to the summit (8285 ft, matching areas.wa_nooksack_tower.elevation_ft and
-- this row's own high_point_ft) with no recorded descent anywhere in the
-- sequence: 2200->2600->3911->5900->6300->7300->7900->8285. Summing those
-- ascending segments gives a net-rise floor of 6085 ft (400+1311+1989+400
-- +1000+600+385), computed purely from the row's own recorded elevations --
-- yet gain_ft was stored as 5735 ft, 350 ft below what the row's own data
-- says is the minimum possible. A party cannot gain less than the net rise
-- its own waypoints record. Corrected to 6085 ft, the exact floor derivable
-- from this row alone (not an invented or borrowed figure); loss_ft is
-- corrected to match since descent_text confirms this is a there-and-back
-- route that reverses the same line back to the glacier/camp.
--
-- (2) overview names the wrong route for its own row. It reads "The East
-- Ridge (Beckey-Schmidtke) route is the classic line" -- but this row's own
-- name ("North Face (Beckey-Schmidtke Route)"), face ("North Face / NE
-- Face"), beta (an 800-ft ice couloir "on the north face" into a "north
-- arete"), and all 10 pitch_detail entries (snow/ice couloir, then "4th
-- class... on the north arete") are unanimous that this is the North Face /
-- north arete route, never an East Ridge. Corroborated externally: AAC
-- Publications' first-ascent account and Wikipedia both describe Beckey and
-- Schmidtke's July 5, 1946 climb as the north-face ice couloir into the
-- north arete, and the route is universally referred to as the "North Face"
-- or "Beckey-Schmidtke" route on Nooksack Tower -- never an "East Ridge."
-- Corrected the one clause to match the rest of this row and the external
-- record; nothing else in the sentence is touched.
UPDATE routes
SET gain_ft = 6085,
    loss_ft = 6085
WHERE id = 'wa_nooksack_tower_beckey_route'
  AND gain_ft = 5735
  AND loss_ft = 5735
  AND high_point_ft = 8285;

UPDATE routes
SET overview = replace(
      overview,
      'The East Ridge (Beckey-Schmidtke) route is the classic line, first climbed in 1946 by Fred Beckey and Cliff Schmidtke.',
      'The North Face (Beckey-Schmidtke) route is the classic line, first climbed in 1946 by Fred Beckey and Cliff Schmidtke.'
    )
WHERE id = 'wa_nooksack_tower_beckey_route'
  AND overview LIKE '%The East Ridge (Beckey-Schmidtke) route is the classic line%';
