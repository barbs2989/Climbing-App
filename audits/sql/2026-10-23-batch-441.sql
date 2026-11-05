-- WA alpine audit -- batch 441 (pass 7) -- 2026-10-23
-- Routes: wa_north_face_var_right_directisimo (area-level fix), wa_north_gardner_mountain_nw_couloir (clean),
--         wa_north_peak_north_ridge (flagged), wa_north_peak_southeast_buttress (flagged),
--         wa_north_ridge_3 (flagged), wa_north_ridge_4 (clean),
--         wa_north_star_mountain_east_route (clean), wa_northeast_buttress_4 (clean)

-- wa_concord_tower (area row, affects wa_north_face_var_right_directisimo and its siblings):
-- areas.elevation_ft stored 7,611 ft, but Mountain Project, SummitPost, and Mountaineers.org
-- independently give Concord Tower's summit as 7,560 ft -- which is also exactly what this
-- route's own high_point_ft already stores (and was itself corrected to 7,560 in a prior pass).
-- The area row is the outlier against both outside sources and the app's own route data.
UPDATE areas SET elevation_ft = 7560
WHERE id = 'wa_concord_tower' AND elevation_ft = 7611;

-- NOT FIXED, flagged for a human instead (see audits/wa-alpine-audit-log.md for detail):
-- wa_north_ridge_3 (Cutthroat Peak, North Ridge): stored fa credits "Fred Beckey, Jim Crooks,
-- and Ed Kenney, August 19, 1940." A University of Washington Earth & Space Sciences page
-- confirms Jim Crooks made the 1940 first ascent of Cutthroat's North Ridge but does not name
-- Beckey or Kenney as party members, and Wikipedia's own list of Beckey first ascents for 1940
-- does not include this route at all -- raising the possibility "Kenney" is a garbling of
-- "Kenneth" (Cutthroat's separate, earlier 1937 West Ridge FA credits a Kenneth Adam). Left
-- unaltered since no single source gives a clean, complete replacement party list; a human
-- check against Beckey's own Cascade Alpine Guide Vol. 2 is the right next step.
--
-- wa_north_peak_north_ridge and wa_north_peak_southeast_buttress (both on "North Peak," Gunsight
-- Range, Glacier Peak Wilderness): stored FAs ("Steve Risse and Donna McBain, Aug 14 1989" and
-- "Garrett Gardner and Bill Lingley, Aug 1971" respectively) could not be found in any AAJ,
-- SummitPost, or Mountain Project search -- but this is a genuinely obscure peak with almost no
-- indexed online climbing history, and neither claim is contradicted by anything found, so per
-- this audit's standing rule these are left as-is (noted, not flagged) rather than guessed at.
--
-- wa_northeast_buttress_4 (Colchuck Peak): stored fa "Mark Weigelt, Julie Brugger, 1970" could
-- not be corroborated by SummitPost, Mountain Project, or AAJ search -- sources confirm only
-- Colchuck's unrelated 1948 first ascent and reference this line only as "the Beckey route"
-- without naming first ascensionists. Not contradicted by anything found, so left as-is.
