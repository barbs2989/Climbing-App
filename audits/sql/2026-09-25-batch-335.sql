-- wa_little_sister_west_face: high_point_ft (6526) contradicted the app's own areas row for
-- the same peak (wa_little_sister.elevation_ft = 6600). Batch 334 fixed the identical error
-- on this peak's North Face route using the same external convergence (SummitPost, Peakbagger,
-- ListsOfJohn all give 6,600-6,620 ft) but did not touch West Face, which still carried the
-- stale value.
UPDATE routes SET high_point_ft = 6600 WHERE id = 'wa_little_sister_west_face';

-- wa_live_free_or_die: watch_out described the whole route as bouldering terrain ("Boulder
-- problem grade terrain", "Limited protection on bouldering sections", "exposed bouldering
-- terrain"), directly contradicting the route's own overview ("Despite its name and grade
-- label, Live Free or Die! is NOT a boulder problem") and its pitch_detail (8 pitches, mostly
-- bolted anchors, one gear anchor, 70m rope, quickdraws in detailed_rack) -- the V5 figure
-- applies only to one crimp/pendulum move on the P4 crux, not the route as a whole. Also
-- replaces a bare string with embedded newlines with the JSON array every other route's
-- watch_out column uses.
UPDATE routes SET watch_out = '["Crux pitch (P4, 5.12-, described as V5 boulder-grade for the crimp/pendulum move) is height-dependent -- shorter climbers report it feels notably harder.", "This is a fully roped, bolt-protected 8-pitch face route, not a boulder problem, despite the V5 comparison used for the crux sequence.", "Upper pitches share terrain and rappel stations with Thin Red Line -- watch for rockfall or traffic from other parties on busy days.", "Descent requires careful navigation of shared rappel anchors."]'::jsonb
WHERE id = 'wa_live_free_or_die';
