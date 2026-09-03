-- WA alpine audit — batch 184 (pass 4)
-- Routes: wa_colchuck_peak_colchuck_glacier, wa_colchuck_peak_east_ridge,
-- wa_colchuck_peak_holsten_hilden, wa_colchuck_peak_north_buttress_couloir,
-- wa_colchuck_peak_northeast_couloir, wa_colfax_peak_cosley_houston,
-- wa_colfax_peak_kimchi_suicide_volcano, wa_colfax_peak_polish_route,
-- wa_colonial_peak_west_ridge, wa_complete_south_buttress

-- wa_colchuck_peak_east_ridge ("East Ridge (Non-Technical)"): gain_ft/loss_ft stored
-- as 2800, which is physically impossible — the route's own waypoints put the
-- Stuart Lake Trailhead at 3,400 ft and Colchuck Peak's summit at 8,705 ft (both
-- figures independently confirmed: Wikipedia/SummitPost give the peak at 8,705+ ft),
-- so a party climbing this route gains at least 8,705 - 3,400 = 5,305 ft. No waypoint
-- sits near the elevation 2,800 ft of gain would imply (8,705 - 2,800 = 5,905 ft), so
-- this is not a "measured from a high camp" convention, just a wrong number. Corrected
-- to match the route's own trailhead/summit pair, the same figure already stored on
-- three of its four Colchuck Peak siblings (colchuck_glacier: 5300, holsten_hilden:
-- 5300, northeast_couloir: 5305).
UPDATE routes
SET gain_ft = 5305, loss_ft = 5305
WHERE id = 'wa_colchuck_peak_east_ridge'
  AND gain_ft = 2800
  AND loss_ft = 2800;

-- wa_colchuck_peak_northeast_couloir: `watch_out` stored as a single string joined
-- with literal "\n" characters instead of a JSON array of strings — the recurring
-- array-shape bug this audit has fixed on other routes before (Sharkfin Tower, Mount
-- Shuksan SE Ridge, wa_chockstone_route in the prior batch). Content unchanged, only
-- the shape (8 items).
UPDATE routes
SET watch_out = '["CRITICAL AVALANCHE TERRAIN: Slope angle of 35-45 degrees with extensive vertical relief and frequent terrain traps—couloir is prime avalanche slope with multiple fatal accidents (3 deaths in Feb 2023); only climb in ideal snow conditions with confirmed low/minimal avalanche hazard", "Entry and exit of steep couloir can be technical with snow or ice up to 60 degrees—difficult down-climbing if route-finding error occurs; requires excellent snow/ice judgment", "Rock and ice fall from walls above couloir—stay alert and compact party; position out of direct fall line; watch for ice/rock loosening due to solar warming", "Bergschrund crossing at glacier base—may be significant obstacle early/mid-season with potential fall hazard; probe and belay crossing if uncertain", "Late-season glacier becomes bare ice (July+)—surface becomes extremely difficult and icy; crampons and ice tools essential; increased rockfall risk from warming", "Crevasses in upper Colchuck Glacier approach (though fewer than on other glacier routes)—travel roped; probe continuously", "Limited escape options once committed to upper couloir—retreat can be hazardous in poor conditions; plan to turn back early if conditions deteriorate", "Navigation difficulty in whiteout conditions—few visual landmarks; GPS/map essential; descending in low visibility is particularly risky"]'::jsonb
WHERE id = 'wa_colchuck_peak_northeast_couloir'
  AND watch_out = '"CRITICAL AVALANCHE TERRAIN: Slope angle of 35-45 degrees with extensive vertical relief and frequent terrain traps—couloir is prime avalanche slope with multiple fatal accidents (3 deaths in Feb 2023); only climb in ideal snow conditions with confirmed low/minimal avalanche hazard\nEntry and exit of steep couloir can be technical with snow or ice up to 60 degrees—difficult down-climbing if route-finding error occurs; requires excellent snow/ice judgment\nRock and ice fall from walls above couloir—stay alert and compact party; position out of direct fall line; watch for ice/rock loosening due to solar warming\nBergschrund crossing at glacier base—may be significant obstacle early/mid-season with potential fall hazard; probe and belay crossing if uncertain\nLate-season glacier becomes bare ice (July+)—surface becomes extremely difficult and icy; crampons and ice tools essential; increased rockfall risk from warming\nCrevasses in upper Colchuck Glacier approach (though fewer than on other glacier routes)—travel roped; probe continuously\nLimited escape options once committed to upper couloir—retreat can be hazardous in poor conditions; plan to turn back early if conditions deteriorate\nNavigation difficulty in whiteout conditions—few visual landmarks; GPS/map essential; descending in low visibility is particularly risky"'::jsonb;

-- wa_colonial_peak_west_ridge: `corrections` consisted entirely of a note about a
-- routeId "wa_colonial_peak_northeast" that does not exist anywhere in the catalog
-- (verified directly against the live routes table — 0 rows, no such id in any
-- state) and is not this row's id (which is wa_colonial_peak_west_ridge). The row's
-- actual name ("West Ridge / Colonial Glacier"), aspect (W) and face text already
-- correctly describe a west-facing route, so the note describes a discrepancy that
-- does not exist in the current data — a stale/orphaned artifact from a prior pass,
-- the same "broken internal reference" shape as wa_chianti_spire_east_face's
-- wa_east_face_rebel_yell reference fixed last batch. Removed since it names nothing
-- real and no longer describes anything true about this row.
UPDATE routes
SET corrections = NULL
WHERE id = 'wa_colonial_peak_west_ridge'
  AND corrections = 'The routeId ''wa_colonial_peak_northeast'' does not match the route''s actual west-facing aspect/name (West Ridge / Colonial Glacier) -- flagging in case the id is a legacy naming artifact, but it was used exactly as given per instructions.';

-- verify
SELECT id, gain_ft, loss_ft FROM routes WHERE id = 'wa_colchuck_peak_east_ridge';
SELECT id, jsonb_typeof(watch_out), jsonb_array_length(watch_out) FROM routes WHERE id = 'wa_colchuck_peak_northeast_couloir';
SELECT id, corrections FROM routes WHERE id = 'wa_colonial_peak_west_ridge';
