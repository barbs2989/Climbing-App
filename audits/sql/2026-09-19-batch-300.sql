-- WA alpine audit batch 300

-- wa_tenpeak_mountain_southeast: descent_text said "Reverse the glacier and snow route to
-- the basin," but no glacier crossing appears anywhere in this route's own approach,
-- climbing_route, descent, or waypoints -- the summit push is talus/snow to a col, then a
-- loose gully and broken chimney (Class 4/low 5th), all consistent with this row's own much
-- more detailed `descent` field, which says "downclimb (or rappel, if wet/loose) the broken
-- chimney/face and gully back to the col, then descend the snow/talus back into Thunder
-- Basin." The small hanging glaciers mentioned in `hazards` (Moth, Ten Peak, Honeycomb) are
-- general geography near the peak, not part of this route's line. Rewrote descent_text to
-- match what this row's own descent/climbing_route fields actually describe.
UPDATE routes SET descent_text = 'Reverse the route: downclimb the broken chimney and loose gully back to the col east of the summit block, then descend snow and talus back into Thunder Basin.'
  WHERE id = 'wa_tenpeak_mountain_southeast' AND descent_text = 'Reverse the glacier and snow route to the basin.';

-- wa_the_brothers_south_couloir: `ascender` was stored as a double-encoded JSON string --
-- literally the text {"type":"...","note":"..."} -- rather than the plain descriptive text
-- every other row in the catalog uses for this column (checked ~15 other populated rows;
-- all are plain sentences, e.g. "prusik cord for glacier approach", "Mechanical ascender
-- (e.g. Petzl Tibloc) or prusik cords for crevasse self-rescue"). Converted to plain text
-- combining the same two pieces of information the JSON blob held, inventing nothing.
UPDATE routes SET ascender = 'Prusik cords for handline self-belay -- used by at least one documented party when rigging a handline in the couloir.'
  WHERE id = 'wa_the_brothers_south_couloir' AND ascender = '{"type":"prusik cords for handline self-belay","note":"used by at least one documented party when rigging a handline in the couloir"}';

-- wa_the_cave_route: `approach` states the Blue Lake Trailhead is at "~5,400 ft", but this
-- same row's own waypoints[0] already has it at 5200 ft, and independent USFS/WTA figures
-- (Blue Lake itself sits at 6,254 ft per Wikipedia/PeakVisor, reached via a trail with
-- 1,050-1,100 ft of gain per WTA/USFS) put the trailhead at roughly 5,150-5,200 ft --
-- matching this row's own waypoint, not its approach text. Corrected the approach text's
-- figure to match the row's own waypoint and the external sources.
UPDATE routes SET approach = 'Drive Highway 20 to the Blue Lake Trailhead (~5,200 ft), ~30 miles west of Winthrop, ~0.25 mile west of the Washington Pass Overlook; day-use fee or Northwest Forest/Interagency pass required. Hike the Blue Lake Trail ~1.5 miles to a small meadow, then take the climber''s boot path breaking off just past a small stream, climbing through slabs/talus/meadow to the gully between Liberty Bell and Concord Tower (often snow-filled and icy into late June, high rockfall risk after snowmelt). From the notch, drop about 50 feet down the gully on the north side of Concord Tower to the start of the two diagonal cracks that mark the route.'
  WHERE id = 'wa_the_cave_route' AND approach = 'Drive Highway 20 to the Blue Lake Trailhead (~5,400 ft), ~30 miles west of Winthrop, ~0.25 mile west of the Washington Pass Overlook; day-use fee or Northwest Forest/Interagency pass required. Hike the Blue Lake Trail ~1.5 miles to a small meadow, then take the climber''s boot path breaking off just past a small stream, climbing through slabs/talus/meadow to the gully between Liberty Bell and Concord Tower (often snow-filled and icy into late June, high rockfall risk after snowmelt). From the notch, drop about 50 feet down the gully on the north side of Concord Tower to the start of the two diagonal cracks that mark the route.';

-- wa_the_devils_club (Southeast Mox Peak, East Face): stored grade "5.11" / rock_grade
-- "5.11-" / grade_num 11 overstate the free-climbing difficulty of this route by two full
-- number grades. Two independent sources (Climbing.com's coverage of the FA and Mountain
-- Project's route page, both citing the 2007 AAC Journal / Alpinist #15 writeups) agree the
-- route is graded "V+ 5.9+ A2-" -- matching this row's OWN alpine_grade ("V+") and aid_grade
-- ("A2-") exactly, which were already correct and are left unchanged. Only the free-climbing
-- grade fields, which disagreed with the row's own aid/commitment grades and with every
-- external source found, are corrected here.
UPDATE routes SET grade = '5.9+ A2-', rock_grade = '5.9+', grade_num = 9
  WHERE id = 'wa_the_devils_club' AND grade = '5.11' AND rock_grade = '5.11-' AND grade_num = 11;
