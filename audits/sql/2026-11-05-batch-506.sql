-- wa_liberty_bell_overexposure: pitches stored as 4, but Mountain Project's route page
-- (106555416/overexposure) gives "200 ft (61 m), 2 pitches, Grade II" -- and the route's
-- own stored waypoint directions already describe "Two sustained 30 m pitches of finger
-- cracks and liebacking", internally contradicting the pitches=4 field.
UPDATE routes
SET pitches = 2
WHERE id = 'wa_liberty_bell_overexposure';

-- wa_liberty_bell_freedom_rider: fa spells the second ascensionist's first name "Brian
-- Burdo". Mountain Project and OpenBeta both give "Bryan Burdo" (FA: Steve Risse and
-- Bryan Burdo) -- the same spelling the DB already uses correctly on the Sidewinder
-- route's 1991 variation credit, so "Brian" here is the inconsistent/incorrect one.
UPDATE routes
SET fa = replace(fa, 'Brian Burdo', 'Bryan Burdo')
WHERE id = 'wa_liberty_bell_freedom_rider';
