-- Dark Side of Liberty (Liberty Bell, East Face): watch_out is stored as a single string
-- with embedded newlines instead of the jsonb array of strings every other route on this
-- peak (and the overwhelming majority of the catalog) uses -- e.g. the sibling
-- wa_diamond_in_the_rough on this same batch stores watch_out as a proper
-- ["...", "...", ...] array. A bare string with \n separators does not render as distinct
-- items the way an array does; this is a shape defect, not a content one -- every sentence
-- below is copied verbatim from the existing value, just re-homed into the correct type.
-- Not isolated: a sibling check across this route's own peak group (Liberty Bell +
-- South Early Winters Spire, 51 routes) found 19 more rows with the identical string-shaped
-- watch_out, including wa_dolphin_chimney fixed below -- flagged as a systemic pattern in
-- the log rather than swept here, since it reaches well beyond this batch's 8 routes.
UPDATE routes SET watch_out = '["Extreme technical grade 5.13+ with serious fall consequences throughout", "High commitment; sustained exposure on extreme terrain throughout route", "Weather sensitivity - any precipitation immediately marginalizes route", "Complex descent with multiple rappels from exposed position", "Loose rock hazard on mixed terrain sections"]'::jsonb
WHERE id = 'wa_dark_side_of_liberty' AND jsonb_typeof(watch_out) = 'string';

-- Dolphin Chimney (South Early Winters Spire): same shape defect as Dark Side of Liberty
-- above -- watch_out is a bare string with embedded newlines instead of a jsonb array.
-- Content unchanged, just re-homed into the correct shape.
UPDATE routes SET watch_out = '["Sustained 5.9+ climbing in chimney terrain with exposure", "Chimney sections can trap loose rock which falls on climbers below", "Route-finding near chimney exit critical; easy to commit to wrong line", "Weather hazard - afternoon storms on exposed sections", "Descent requires careful rope management through chimney sections"]'::jsonb
WHERE id = 'wa_dolphin_chimney' AND jsonb_typeof(watch_out) = 'string';

-- Bear Mountain, Direct North Buttress: ice_grade is "WI5+" (a hard vertical water-ice
-- grade) on a route this row's own overview/beta/pitch_detail describe entirely as rock
-- climbing (5.8 to 5.10-, roof/chimney/off-width/ridge terrain) with a snow/glacier
-- *approach* only (gear already separately lists crampons/axe for that). Nothing in this
-- row's hazards, watch_out, pro_needs or pitch-by-pitch notes mentions ice terrain of any
-- kind, and this is the ONLY row in the entire WA catalog carrying ice_grade = 'WI5+' (a
-- shared/copied value would appear on a real ice route elsewhere; it does not), so this
-- reads as a stray value rather than cross-route contamination from a sibling climb.
-- Cross-checked against AAC Publications, Mountain Project, CascadeClimbers and
-- StephAbegg's trip report for this well-documented 1980 Kearney/Knight route (confirming
-- Grade V, 5.10-, 21 pitches, 670 m -- all of which already match this row) -- none
-- mention ice climbing on the route itself. Clearing the field rather than guessing a
-- value; nothing supports one.
UPDATE routes SET ice_grade = NULL WHERE id = 'wa_direct_north_buttress' AND ice_grade = 'WI5+';

-- Dorado Needle, Direct Southwest Buttress: rope_note claims "~13 pitches", contradicting
-- this same row's own pitches column (8) and its own beta field ("8-pitch, III 5.10a...").
-- 13 also doesn't match the sibling standard route on this peak (wa_southwest_buttress,
-- 9 pitches, 5.8, confirmed directly from the live DB) that the rest of this same
-- rope_note sentence is describing for comparison -- so it isn't even a stray reference to
-- the parent line. Correcting the pitch count to match this row's own verified value;
-- leaving the rest of the note (grade comparison, rope length, glacier-approach detail) as
-- written since nothing else in it is contradicted.
UPDATE routes SET rope_note = 'Grade III+ alpine rock buttress, 8 pitches over 1000+ ft; standard Southwest Buttress line is 5.7-5.8 (first pitch a full 55-57m rope length), the ''Direct'' variant follows a steeper/harder line to reach 5.10a. Glacier approach via Marble Creek-McAllister Pass gully (year-round snow to 35 deg) requires ice axe/crampons.'
WHERE id = 'wa_direct_southwest_buttress' AND rope_note LIKE '%~13 pitches%';

-- Dome Peak, Dome Glacier route: high_point_ft is 8920, disagreeing with this same row's
-- own summit waypoint (elev 8926, name "Dome Peak"), with the area row's elevation_ft
-- (8926), and with listsofjohn.com's precise summit figure (8,926 ft) -- the standard
-- high-resolution reference for Cascades peak elevations, cited over Wikipedia's older,
-- rounded "8,920+" contour-based figure. Correcting to match the row's own waypoint and
-- the area record.
UPDATE routes SET high_point_ft = 8926 WHERE id = 'wa_dome_peak_dome_glacier' AND high_point_ft = 8920;

-- Dome Peak, Indian Summer: identical high_point_ft discrepancy (8920 vs the peak's own
-- 8,926 ft area record / listsofjohn.com figure) as the Dome Glacier route above -- same
-- peak, same fix, same reasoning.
UPDATE routes SET high_point_ft = 8926 WHERE id = 'wa_dome_peak_indian_summer' AND high_point_ft = 8920;
