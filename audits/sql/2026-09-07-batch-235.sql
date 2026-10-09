-- WA alpine audit batch 235 (pass 4)
-- Routes: wa_the_monk_le_gibet, wa_the_monk_odine, wa_the_monk_scabo,
-- wa_the_monk_west_cracks_left_crack, wa_the_monk_west_cracks_right_crack,
-- wa_the_needle_neve_glacier, wa_the_pleiades_scramble,
-- wa_the_pyramid_picket_south_route

-- All five "The Monk" routes are filed under area_id wa_cathedral_peak_pasayten
-- (Cathedral Peak, elevation_ft 8606) and all five stored high_point_ft = 8606,
-- i.e. Cathedral Peak's OWN summit height. But The Monk is a distinct, shorter
-- formation next to Cathedral Peak, not its summit -- every one of these five
-- rows says so in its own data: each waypoint list's "Topout" point is named
-- "The Monk (tower top)" at elev 8300, and wa_the_monk_le_gibet's own waypoint
-- note spells it out explicitly: "The Monk is a semi-detached ~1000' tower
-- leaning against Cathedral Peak's flank, in the gully between the two
-- formations." So high_point_ft (the route's own summit) contradicts the
-- row's own waypoint chain by 306 ft, using the neighboring peak's elevation
-- instead of the formation actually being climbed. Corrected to match the
-- row's own waypoint-stated topout elevation, identical across all five
-- sibling routes. (Mountain Project is blocked from this network's egress and
-- general web search did not surface an independent figure for The Monk's
-- summit specifically, so this is a same-row internal-contradiction fix, not
-- an externally-sourced one -- flagging that basis explicitly.)
UPDATE routes SET high_point_ft = 8300
WHERE id IN (
  'wa_the_monk_le_gibet',
  'wa_the_monk_odine',
  'wa_the_monk_scabo',
  'wa_the_monk_west_cracks_left_crack',
  'wa_the_monk_west_cracks_right_crack'
) AND high_point_ft = 8606;

-- Same five routes store dist_km = 27.4 (17.03 mi one-way under the app's
-- dist_km*2 round-trip convention). The row's own approach prose says "Day one
-- of the standard plan is a 17 to 20 mile hike to Upper Cathedral Lake, THEN
-- ~40 min to the base of The Monk" -- i.e. 17-20 mi covers only the hike to the
-- lake, with more distance beyond that to reach the actual climbing objective.
-- The row's own waypoint chain is more specific: the Topout waypoint carries
-- distMi 20 (cumulative one-way miles trailhead -> summit), which already
-- covers the full approach including the ~40 min beyond the lake. 27.4 km
-- matches only the LOW end of the lake-only figure and ignores the additional
-- distance to the climb itself. Corrected to the row's own waypoint-chain
-- mileage (20 mi = 32.19 km), the same precedent used in batch 231 for the
-- South Twin Sister routes.
UPDATE routes SET dist_km = 32.2
WHERE id IN (
  'wa_the_monk_le_gibet',
  'wa_the_monk_odine',
  'wa_the_monk_scabo',
  'wa_the_monk_west_cracks_left_crack',
  'wa_the_monk_west_cracks_right_crack'
) AND dist_km = 27.4;

-- wa_the_monk_scabo and wa_the_monk_west_cracks_right_crack store loss_ft
-- 5450 / 5200 respectively, while their three sibling Monk routes (Le Gibet,
-- Odine, West Cracks Left Crack) all store loss_ft = 1300 despite every one of
-- the five sharing the identical trailhead, identical waypoint chain, and a
-- near-identical descent: all describe rappelling the NE gully in three
-- 75-ft raps "back to the base" (not a full walk-out to the trailhead).
-- Scabo's own descent field goes further and explicitly contrasts its short
-- gully-rappel descent against "the main summit walk-off used by the SE
-- Buttress and OTHER routes" -- i.e. Scabo's own text says it does NOT do a
-- long walk-out, which only the 1300 figure (shared by its siblings using the
-- same descent) is consistent with; its own stored 5450 implies a return
-- closer to the trailhead's own elevation, i.e. the "other routes'" walk-off
-- it explicitly disclaims. West Cracks Right Crack's descent text is
-- word-for-word the same shape as West Cracks Left Crack's (identical
-- "rappel the route, or continue to the top of The Monk" language), yet only
-- Right Crack stores the outlier loss_ft. Corrected both to match their
-- siblings and their own stated descent method.
UPDATE routes SET loss_ft = 1300
WHERE id = 'wa_the_monk_scabo' AND loss_ft = 5450;

UPDATE routes SET loss_ft = 1300
WHERE id = 'wa_the_monk_west_cracks_right_crack' AND loss_ft = 5200;

-- wa_the_monk_odine: `corrections` field reads "Mountain Project lists this
-- route at 5.9, not 5.8 as given in the route table -- flagging for
-- correction upstream" -- but the row's own `grade`/`grade_num` are ALREADY
-- 5.9 / 9, matching what the note says Mountain Project shows. The note
-- describes an already-resolved discrepancy as still outstanding, which could
-- mislead a future reader into re-flagging (or worse, reverting) an already
-- correct grade. Updated the note to reflect the current, already-corrected
-- state, matching the phrasing convention used by its four sibling routes'
-- corrections fields ("... verified on Mountain Project").
UPDATE routes
SET corrections = 'Grade (5.9) verified on Mountain Project -- an earlier version of this row stored 5.8; the route table has since been corrected to match.'
WHERE id = 'wa_the_monk_odine'
  AND corrections = 'Mountain Project lists this route at 5.9, not 5.8 as given in the route table — flagging for correction upstream.';

-- Verify: all five Monk routes should now show high_point_ft 8300, dist_km
-- 32.2, and loss_ft either 1300 (all five) or the pre-existing 1300 value;
-- Odine's corrections text should read the new sentence.
SELECT id, high_point_ft, dist_km, loss_ft, corrections
FROM routes
WHERE id IN (
  'wa_the_monk_le_gibet',
  'wa_the_monk_odine',
  'wa_the_monk_scabo',
  'wa_the_monk_west_cracks_left_crack',
  'wa_the_monk_west_cracks_right_crack'
)
ORDER BY id;

-- wa_the_needle_neve_glacier, wa_the_pleiades_scramble,
-- wa_the_pyramid_picket_south_route: no changes. See
-- audits/wa-alpine-audit-log.md for what was checked (FA claims corroborated
-- against SummitPost/AAC where checkable; gain/loss/dist_km sanity-checked
-- against each route's own waypoint elevation chain; no internal or external
-- contradictions found). The Pleiades route's pre-existing uncertainty about
-- which summit the row refers to, and the Pyramid route's unconfirmed
-- grade/FA specifics, are already correctly flagged in their own
-- `corrections`/`data_quality.gaps` fields and are left as documented
-- uncertainty rather than guessed at.
