-- WA alpine audit — batch 166 (pass 3)
-- wa_south_face_5 (Inspiration Peak, South Face): stored fa carried a self-hedged year
-- ("June 18 (year unconfirmed — likely 1969, not independently corroborated)"). Two
-- independent secondary sources both corroborate 1969 for this exact climb (Michael Heath
-- and Bill Sumner, South Face, Grade III 5.8): Wikipedia's Inspiration Peak (Washington)
-- article, and an aggregated Mountain Project/SummitPost route-guide result. Removing the
-- hedge now that the year is independently corroborated; day/month (June 18) already agreed
-- with the AAC Publications article title snippet and is unchanged.
UPDATE routes SET fa = 'Bill Sumner and Mike Heath, June 18, 1969' WHERE id = 'wa_south_face_5';
