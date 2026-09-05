-- WA alpine route audit, pass 4, batch 211 (2026-09-05)
-- Scope: wa_mount_logan_r2 .. wa_mount_persis_the_hexorcist

-- wa_mount_mathias_scramble: dist_km stored as 91.73 km (57.0 mi). The row's
-- own summit waypoint independently records distMi=28.5 (one-way, cumulative
-- along its own waypoint chain) -- exactly half of the stored figure
-- (28.5 mi = 45.87 km; 45.87 * 2 = 91.74). This is the same round-trip-
-- stored-as-one-way bug already fixed on wa_mount_johnson_standard and
-- wa_mount_larrabee_south_ridge in batch 210. Corrected to the one-way
-- distance the row's own waypoints already record.
UPDATE routes SET dist_km = 45.87
WHERE id = 'wa_mount_mathias_scramble' AND dist_km = 91.73;

-- wa_mount_maude_r1 (North Face): dist_km stored as 6.4 km -- geometrically
-- IMPOSSIBLE, since the straight-line chord between this row's own
-- approach_logistics trailhead and peak coordinates is 6.52 km, and no real
-- trail can be shorter than the straight line to its destination. The row's
-- own summit waypoint independently records distMi=8 (one-way,
-- Phelps Creek Trailhead to Mount Maude summit) = 12.87 km, consistent with
-- its own 4-point gpx track (7.99 km partial/simplified) and with the
-- approach text's own component legs (3.5 mi to the Leroy Creek crossing
-- alone). Corrected to match the row's own summit waypoint.
UPDATE routes SET dist_km = 12.9
WHERE id = 'wa_mount_maude_r1' AND dist_km = 6.4;

-- wa_mount_olympus_blue_glacier: two related fixes.
--
-- (1) dist_km stored as 28 km (17.4 mi). The row's own summit waypoint
-- independently records distMi=22 (one-way, Hoh River trailhead to the West
-- Peak summit) = 35.4 km. 28 km instead matches the row's OWN waypoint
-- distance to the Glacier Meadows CAMP (17.5 mi = 28.2 km) -- the same
-- trailhead-to-camp-instead-of-summit bug documented on the Mount Baker
-- cluster in batch 206, externally corroborated here too: a WebSearch-
-- confirmed synthesis of Mountaineers/guide sources states "17.2 miles to
-- Glacier Meadows" and "44 miles round trip" (= 22 mi one-way), matching the
-- row's own totalNote ("~41-44 mi[...] round trip") and summit waypoint
-- almost exactly. Corrected dist_km to the one-way summit distance.
--
-- (2) loss_ft stored as 400 -- grossly asymmetric against gain_ft=7500 despite
-- descent_text saying "Reverse the [...] line in reverse" (an out-and-back
-- via the identical Hoh River Trail both ways, which physically requires
-- round-trip gain to equal round-trip loss). gain_ft=7500 is independently
-- corroborated by the same external synthesis above ("7,400 feet of
-- elevation gain"), and the row's own itinerary already records losses
-- exceeding 400 ft in the first two approach days alone (1,250 ft + 1,300 ft)
-- before the climb even begins -- 400 is implausible under any reading.
-- Corrected loss_ft to match the corroborated, symmetric gain_ft figure.
UPDATE routes SET dist_km = 35.4
WHERE id = 'wa_mount_olympus_blue_glacier' AND dist_km = 28;

UPDATE routes SET loss_ft = 7500
WHERE id = 'wa_mount_olympus_blue_glacier' AND gain_ft = 7500 AND loss_ft = 400;

-- wa_mount_olympus_west_ridge: same two issues as its sibling
-- wa_mount_olympus_blue_glacier above (both routes share the identical
-- stored dist_km=28/gain_ft=7500/loss_ft=400, evidently copied from one
-- template without re-deriving either figure for this route).
--
-- (1) dist_km stored as 28 km. This row's own summit waypoint independently
-- records distMi=19.68, explicitly flagged distFrom:"track" (i.e. already
-- computed from this route's own gpx track), = 31.67 km -- matching the
-- route's own gpx track length (31.67 km) exactly. Corrected to match.
--
-- (2) loss_ft stored as 400 against gain_ft=7500, despite the route's
-- descent being "the standard Blue Glacier route via Crystal Pass" -- i.e.
-- returning to the same Hoh River trailhead the ascent started from, which
-- again physically requires round-trip loss to equal round-trip gain.
-- Corrected loss_ft to match gain_ft, for the same reason as the sibling row.
UPDATE routes SET dist_km = 31.7
WHERE id = 'wa_mount_olympus_west_ridge' AND dist_km = 28;

UPDATE routes SET loss_ft = 7500
WHERE id = 'wa_mount_olympus_west_ridge' AND gain_ft = 7500 AND loss_ft = 400;

-- NOTE (not a SQL fix -- flagged for human/editorial review): wa_mount_logan_r2
-- (Douglas Glacier) has three figures for its trip length that all disagree:
-- the row's own itinerary.days sums to a 19-mile round trip (7+5+7 mi); the
-- row's own itinerary.totalNote says "~28-mile round trip"; and the row's
-- own 3-point gpx track sums to a 13.85 km (8.6 mi) one-way distance
-- (~17.2 mi round trip). A WebSearch turned up a fourth, different figure --
-- one trip report cited as "approximately 24 miles traveled with 6,800 feet
-- gained & lost" -- while a Mountaineers route-description snippet gives
-- "3.9 miles and 2,000 ft of gain to Easy Pass", against this row's own
-- approach text ("3.5 miles gaining 2,800 feet" to the same pass). No single
-- figure is corroborated by a majority of sources; this needs an editorial
-- read of the full row (and ideally the underlying trip reports) rather than
-- a guessed UPDATE to dist_km/gain_ft/loss_ft.

-- NOTE (not a SQL fix -- flagged for human/editorial review): wa_mount_mathias_scramble
-- describes two different, only-partly-reconciled approaches within one row.
-- `approach` and `pitch_detail` describe the Hoh River Trail -> Glacier
-- Meadows -> Blue Glacier approach as the primary route (matching this row's
-- waypoints[0], which is coordinates-correct for the real Hoh Rain Forest
-- Visitor Center). But `waypoints[1:]`, `itinerary`, `timing.sectionBreakdown`,
-- and `bivy` all instead describe the Sol Duc Trailhead -> High Divide ->
-- Bailey Range Traverse approach as primary (matching this row's own
-- `approach_variants`, which explicitly files the Hoh route as a named
-- "variant" rather than the primary line -- implying Sol Duc was intended as
-- primary). Compounding this, waypoints[0] is labeled "Hoh River Trailhead"
-- but carries elev=1950 ft -- inconsistent with both the row's own approach
-- text (578 ft) and external sources (Hoh Rain Forest trailhead area is
-- ~530-650 ft per a WebSearch synthesis) -- while its very next waypoint
-- ("High Divide", 9 mi away) is a Sol Duc-side landmark that is not 9 miles
-- from Hoh by any known route. This needs an editorial decision on which
-- trailhead/approach the row should describe as primary and a coordinated
-- rewrite of whichever fields disagree with it, not a single targeted
-- UPDATE -- the same class of issue as batch 209's wa_mount_fairchild_standard
-- and batch 210's wa_mount_logan_r1 approach-text flags.

-- NOTE (not a SQL fix -- flagged for human/editorial review): wa_mount_maude_r2
-- (Entiat Ice Fall) has dist_km stored as 6.4 km, which is geometrically
-- IMPOSSIBLE for the same reason as its sibling wa_mount_maude_r1 above (the
-- straight-line chord between this row's own trailhead and peak coordinates
-- is 6.52 km). Unlike r1, this row records no distMi on its own summit
-- waypoint (null), so there is no internally-recorded one-way distance to
-- correct it to, and no external source was found giving a specific mileage
-- for this rarely-climbed variation. The approach text says it shares the
-- North Face's trailhead and lower approach (~5 mi to Leroy Basin per r1's
-- own waypoints) before diverging toward Icy Lake/the glacier, so the true
-- one-way distance is at least that much further, but a confident specific
-- replacement figure is not available. Flagged rather than guessed, per the
-- same reasoning as batch 206's wa_mount_baker_park_glacier_headwall.
