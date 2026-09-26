-- WA alpine audit — batch 196 (pass 4)
-- Routes: wa_ingalls_peak_south_ridge, wa_inner_constance_northwest_buttress,
-- wa_inner_constance_standard, wa_inspiration_peak_west_ridge,
-- wa_jack_mountain_nohokomeen_headwall, wa_jack_mountain_northeast_glacier,
-- wa_jack_mountain_south_face, wa_johannesburg_mountain_cj_couloir

-- ============================================================================
-- wa_jack_mountain_south_face: high_point_ft was 9075, but this route's OWN
-- Summit waypoint gives 9,069 ft ("Jack Mountain summit", lat/lng
-- 48.77282,-120.95652 — the same point, to five decimals, as the summit
-- waypoint on the other two Jack Mountain routes in this catalog). The
-- area-level canonical record (areas.id = 'wa_jack_mountain') independently
-- states elevation_ft = 9069, agreeing with THIS route's own waypoint rather
-- than with the 9075 the route column had stored. External sources are split
-- (Wikipedia/PeakVisor give 9,075 ft; peakery.com and some prominence lists
-- give 9,066 ft) with no way to adjudicate the exact USGS figure from
-- secondary sources, so this fix does NOT resolve the external ambiguity —
-- it only brings this ROW's own high_point_ft column into agreement with
-- this row's own waypoint and with the catalog's own area record, all three
-- of which should describe the same summit and previously did not. The
-- other two Jack Mountain routes (Nohokomeen Headwall, Northeast Glacier)
-- still read 9075 and are internally self-consistent (column matches their
-- own waypoint) — see the log for why that 3-way, 9066/9069/9075 split is
-- flagged rather than swept to one number.
UPDATE routes
SET high_point_ft = 9069
WHERE id = 'wa_jack_mountain_south_face'
  AND high_point_ft = 9075;

-- ============================================================================
-- wa_jack_mountain_northeast_glacier: gain_ft was 4501 — below the physical
-- floor implied by this route's own two waypoints (East Bank Trailhead,
-- 1,800 ft -> Jack Mountain summit, 9,075 ft = 7,275 ft minimum net gain;
-- both elevations are this row's own stored values, and 9,075 ft additionally
-- matches high_point_ft). loss_ft was NULL. This route's `approach`/`overview`
-- text is a one-line stub ("North from May Creek; northeast face of mountain
-- via glacier approach") with no corroborating cumulative figure to source a
-- more precise number from (watch_out even states "there is effectively no
-- public beta for this line"), so both fields are corrected to the bare,
-- mathematically-forced floor (7,275 ft) rather than a researched/guessed
-- total — same floor value for both since nothing in the row suggests an
-- alternate lower-elevation descent, and it is an out-and-back on a glacier
-- route with no described walk-off.
UPDATE routes
SET gain_ft = 7275,
    loss_ft = 7275
WHERE id = 'wa_jack_mountain_northeast_glacier'
  AND gain_ft = 4501
  AND loss_ft IS NULL;

-- ============================================================================
-- wa_jack_mountain_nohokomeen_headwall: two corrections, both sourced from
-- this row's OWN `overview` text, which states as one sentence: "The round
-- trip is rated at 30 miles and 10,000 ft of gain."
--
-- (1) loss_ft was NULL. gain_ft (10000) already matches the overview's "10,000
--     ft of gain" exactly, and descent_text confirms the descent reverses the
--     ascent line back to the same trailhead ("the standard descent is to
--     downclimb what you climbed... From camp it is the 3-mile descent to May
--     Creek and 8 miles of flat trail back to the car") with no lower
--     alternate exit — so loss_ft is set equal to gain_ft (10000), consistent
--     with a round trip returning to the same point.
-- (2) dist_km was 17.7 (= 11.0 mi), which matches only the FIRST leg of the
--     approach as described in descent_text ("3-mile descent to May Creek and
--     8 miles of flat trail" = 11 mi one-way to CAMP), not the full route to
--     the summit and back that the app's own dist_km*2 rendering convention
--     is meant to describe. The row's own overview states the round trip is
--     30 miles total; 30 / 2 = 15 mi one-way = 24.14 km.
UPDATE routes
SET loss_ft = 10000,
    dist_km = 24.14
WHERE id = 'wa_jack_mountain_nohokomeen_headwall'
  AND loss_ft IS NULL
  AND gain_ft = 10000
  AND dist_km = 17.7;
