-- === wa_little_mac_spire_southwest_route ===

-- corrections field says "located near Mac Peak in the Deception Lakes
-- area," but Mac Peak is a real, distinct 6,859 ft summit in the Alpine
-- Lakes Wilderness near Stevens Pass (King/Chelan county line) -- confirmed
-- via SummitPost/Wikipedia -- roughly 90 miles south of Little Mac Spire,
-- which this row's own overview/approach correctly place in the Southern
-- Pickets (North Cascades NP, McMillan Spires group, Goodell Creek
-- approach), consistent with the row's waypoint coordinates. Contamination
-- from the unrelated Alpine Lakes peak of the same "Mac" name. The same
-- sentence also says the grade was "used to infer... 2-3 short pitches,"
-- contradicting this row's own pitches field (9). Rewritten to drop the
-- wrong-peak claim and the pitch-count contradiction while keeping the
-- existing, still-valid uncertainty flag on the rating itself.
UPDATE routes
SET corrections = 'No published route-specific beta confirmed for Little Mac Spire (Southern Pickets, North Cascades NP) independent of the broader McMillan Spires/Southern Pickets literature. Grade (II-III, 5.4) and pitch count (9) reflect on-file route data, not a dedicated guidebook entry. Not to be confused with the unrelated Mac Peak near Deception Lakes/Stevens Pass, Alpine Lakes Wilderness.'
WHERE id = 'wa_little_mac_spire_southwest_route';

-- === wa_live_free_or_die ===

-- watch_out describes the entire route as a bouldering objective
-- ("Boulder problem grade terrain - V5+...", "bouldering sections",
-- "exposed bouldering terrain"), directly contradicting this row's own
-- overview, which already explains the on-file name/grade previously
-- caused exactly this misreading and states plainly: "Live Free or Die! is
-- NOT a boulder problem -- it is a full 11-pitch, roughly 1,200-foot free
-- route." Confirmed externally (AAC Publications; Blake Herrington's own
-- FA account): an 8-pitch East Face line to M&M Ledge plus a shared
-- 3-4-pitch finish, mostly 5.10-5.11 thin face climbing with a bouldery
-- crux move -- not a boulder problem. Also fixes a schema-shape bug: this
-- row stored watch_out as one \n-joined string instead of the jsonb
-- string[] every other route uses (per 0012_alpine_rich_fields.sql), which
-- collapses into a single run-on bullet client-side since toArr() only
-- splits on commas, not newlines. Replacement content is drawn from this
-- same row's own descent_text/hazards/seasonal_hazards fields, not new
-- research.
UPDATE routes
SET watch_out = '["Sustained 5.10-5.11 thin face climbing leads to a reachy, height-dependent 5.12 crux move, shorter climbers report it feels notably harder.", "Mostly bolted protection, but the crux traverse ends in a downclimb with real fall potential onto technical terrain.", "Upper pitches finish via Thin Red Line, so traffic and rockfall exposure from other parties is possible on busy days.", "Descent from M&M Ledge requires two-rope rappels off fixed gear, then four more double-rope rappels to the ground, carry two ropes and know the rap line before committing.", "Afternoon thunderstorms are possible on the exposed East Face in July-August."]'::jsonb
WHERE id = 'wa_live_free_or_die';

-- === wa_luahna_peak (areas) ===

-- areas.elevation_ft = 8450, but the current authoritative figure (Wikipedia,
-- citing NGS/LIDAR-era data) is 8,445 ft -- the same value this DB's own
-- wa_luahna_peak_southwest_slope_southeast_ridge route already carries in
-- its high_point_ft field. 8450 is the older, superseded figure (traceable
-- to a 2005 WTA trip report). Brings the area row in line with both the
-- current authoritative source and this DB's own route data.
UPDATE areas
SET elevation_ft = 8445
WHERE id = 'wa_luahna_peak';
