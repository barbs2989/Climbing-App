-- WA alpine audit, batch 137 (pass 3), 2026-08-20
-- Both fixes below correct an internal self-contradiction inside a route's own
-- waypoints jsonb: the Trailhead entry's `name` and `directions` correctly say the
-- pullout is EAST of Washington Pass (the SR-20 hairpin/pond pullout used by every
-- East Face-side route), but its `note` field is a stale copy of the Blue Lake
-- Trailhead's note ("...1.5 mi west of Washington Pass"), which describes a
-- different, west-side lot entirely. No external source needed, the row
-- contradicts itself. wa_liberty_bell_independence_route's identical waypoint
-- already has a correct, non-contradictory note and was left alone.

-- wa_liberty_bell_east_face: waypoints[0].note says "west of Washington Pass" while
-- waypoints[0].name and .directions say "east of Washington Pass" (same pullout used
-- by Independence Route and Thin Red Line). Fix the note to match.
UPDATE routes
SET waypoints = jsonb_set(
  waypoints,
  '{0,note}',
  '"Signed pullout on SR-20 about 1.5 mi east of Washington Pass, on the north shoulder near the hairpin curve. Northwest Forest Pass required, privy at the lot."'
)
WHERE id = 'wa_liberty_bell_east_face'
  AND waypoints->0->>'name' = 'SR-20 Hairpin / Pond Pullout (east of Washington Pass)'
  AND waypoints->0->>'note' = 'Signed pullout on SR-20 about 1.5 mi west of Washington Pass; Northwest Forest Pass required, privy at the lot.';

-- wa_liberty_bell_thin_red_line: identical defect, same waypoint, same stale note.
UPDATE routes
SET waypoints = jsonb_set(
  waypoints,
  '{0,note}',
  '"Signed pullout on SR-20 about 1.5 mi east of Washington Pass, on the north shoulder near the hairpin curve. Northwest Forest Pass required, privy at the lot."'
)
WHERE id = 'wa_liberty_bell_thin_red_line'
  AND waypoints->0->>'name' = 'SR-20 Hairpin / Pond Pullout (east of Washington Pass)'
  AND waypoints->0->>'note' = 'Signed pullout on SR-20 about 1.5 mi west of Washington Pass; Northwest Forest Pass required, privy at the lot.';
