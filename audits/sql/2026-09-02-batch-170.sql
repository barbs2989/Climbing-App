-- WA alpine audit — batch 170 (pass 3)
-- Routes: wa_tepeh_towers, wa_the_brothers_south_couloir, wa_the_brothers_traverse,
-- wa_the_cave_route, wa_the_chopping_block_south_route, wa_the_devils_club,
-- wa_the_direct_north_ridge_w_gendarme, wa_the_hitchhiker.
-- WHERE clause includes the current (wrong) value as a safety check per project
-- convention, so this is a no-op if the row has already changed.

-- wa_the_cave_route (Concord Tower, Washington Pass): stored fa credits
-- "Ron Burgner & Don McPherson, 1968" -- but that FA belongs to a DIFFERENT,
-- neighboring route on Concord Tower's north side: the Tunnel Route (5.8, four
-- pitches, described as starting "well west of the North Face route" and
-- topping out via the west face, per SuperTopo/CascadeClimbers trip-report
-- sourcing). Three independent searches (SummitPost's dedicated "Cave Route"
-- page, Concord Tower's own SummitPost overview page, and Mountain Project's
-- route listing for "The Cave Route") consistently attribute the Cave Route
-- itself -- 5.8 R, three pitches, starting ~50 ft down the gully from the
-- Liberty Bell/Concord notch at two diagonal cracks -- to Fred Beckey and
-- John Parrott, June 12, 1956. That grade and pitch count match this row's
-- own stored `grade` ("5.8 R") and `pitches` (3) exactly, while the Tunnel
-- Route is a distinct four-pitch line. No source found attributes the Cave
-- Route itself to Burgner/McPherson.
UPDATE routes
SET fa = 'Fred Beckey and John Parrott, June 12, 1956'
WHERE id = 'wa_the_cave_route'
  AND fa = 'Ron Burgner & Don McPherson, 1968';

-- verify: should show the corrected fa
SELECT id, fa, grade, pitches FROM routes WHERE id = 'wa_the_cave_route';
