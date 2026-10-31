-- WA alpine audit, pass 7, batch 384 (2026-10-07)
-- Routes checked: wa_big_kangaroo_going_down_under, wa_big_kangaroo_kearney_thomas,
-- wa_big_kangaroo_skinny_start, wa_big_kangaroo_walkabout, wa_big_kangaroo_west_face,
-- wa_big_snagtooth_west_ridge, wa_big_snow_mountain_east_buttress,
-- wa_big_snow_mountain_east_ridge_hardscrabble_route

BEGIN;

-- wa_big_kangaroo_kearney_thomas: FA was long documented as "Kearney and Thomas
-- (first names and date unknown)", but SuperTopo and AAC Publications (AAJ) both
-- name the party and date: Alan Kearney and Jeff Thomas (joined by Jeff's father
-- Bill Thomas), August 1984.
UPDATE routes
SET fa = 'Alan Kearney and Jeff Thomas (joined by Jeff''s father, Bill Thomas), August 1984'
WHERE id = 'wa_big_kangaroo_kearney_thomas'
  AND fa = 'Kearney and Thomas (first names and date unknown)';

-- wa_big_snagtooth (areas row): stored elevation_ft (8379) matches no source.
-- The route row's own high_point_ft (8374) already carries the correct current
-- figure: a 2023 Country High Points resurvey measured 8,374.3 ft (the old USGS
-- quad value, 8,330 ft, was 44 ft low); Wikipedia's "Snagtooth Ridge" infobox now
-- uses the corrected 8,374 ft. Bring the area row into agreement with its own
-- route row and the current authoritative figure.
UPDATE areas
SET elevation_ft = 8374
WHERE id = 'wa_big_snagtooth'
  AND elevation_ft = 8379;

COMMIT;

-- Flagged for human review, not fixed this batch:
--
-- wa_big_kangaroo_kearney_thomas: pitch count stored as 7, but SuperTopo/AAC
-- snippets describe 8 pitches. Lower confidence than the FA fix above (a
-- secondary trip-report detail, not independently cross-confirmed) -- left
-- alone pending a clearer source.
--
-- wa_big_kangaroo_west_face: grade stored 5.6, but Mountaineers.org and
-- SummitPost both grade the same Beckey 1942 line (there called "West Route")
-- 5.5. May be a naming/edition convention difference rather than an error;
-- the row's own data_quality/corrections fields already document a separate,
-- deliberately-not-renamed id mismatch for this row (reviewed 2026-07-28) --
-- this grade note is new and distinct from that.
--
-- wa_big_snagtooth_west_ridge: stored fa text reads "...September 29, 1946
-- (first ascent of the peak)". AAJ 1948 ("United States, First Ascents in the
-- Cascades") confirms that date/party for the PEAK, but describes a southwest-
-- face line (scree/gully/ribs/chimney/final slab), not the ridge-gain-at-a-
-- saddle line this row's own beta describes as "West Ridge (Standard Route)".
-- The stored hedge ("first ascent of the peak", not "of this route") is not
-- technically false, but invites conflating peak-FA with route-FA. Worth a
-- rewrite for precision, not a factual correction, so left to a human call.
--
-- wa_big_snow_mountain_east_buttress: aid grade (A1), pitch count (10), and the
-- claimed later free ascent at 5.10 could not be corroborated against any
-- source found (SummitPost independently confirms FA party/date/III-5.7 only).
-- Not contradicted by any source either -- unverifiable, not a confirmed error.
