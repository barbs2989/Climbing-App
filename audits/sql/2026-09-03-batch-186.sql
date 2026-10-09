-- WA alpine audit — batch 186 (pass 4)
-- Routes: wa_cutthroat_west_ridge, wa_dark_peak_dark_glacier_route,
-- wa_dark_side_of_liberty, wa_diamond_in_the_rough, wa_direct_north_buttress,
-- wa_direct_southwest_buttress, wa_direct_west_face, wa_dolphin_chimney,
-- wa_dome_peak_dome_glacier, wa_dome_peak_indian_summer

-- ============================================================================
-- wa_dark_side_of_liberty: `watch_out` was stored as one string joined with
-- literal `\n` characters instead of a JSON array of 5 items — the recurring
-- array-shape bug this audit keeps finding (Sharkfin Tower, Mount Shuksan SE
-- Ridge, Chockstone Route, Colchuck Peak Northeast Couloir in prior batches).
-- Converted to a proper array; content unchanged.
UPDATE routes
SET watch_out = '["Extreme technical grade 5.13+ with serious fall consequences throughout", "High commitment; sustained exposure on extreme terrain throughout route", "Weather sensitivity - any precipitation immediately marginalizes route", "Complex descent with multiple rappels from exposed position", "Loose rock hazard on mixed terrain sections"]'::jsonb
WHERE id = 'wa_dark_side_of_liberty'
  AND watch_out = 'Extreme technical grade 5.13+ with serious fall consequences throughout
High commitment; sustained exposure on extreme terrain throughout route
Weather sensitivity - any precipitation immediately marginalizes route
Complex descent with multiple rappels from exposed position
Loose rock hazard on mixed terrain sections';

-- ============================================================================
-- wa_dolphin_chimney: same array-shape bug as above — `watch_out` was a
-- single newline-joined string instead of a 5-item JSON array. Converted;
-- content unchanged.
UPDATE routes
SET watch_out = '["Sustained 5.9+ climbing in chimney terrain with exposure", "Chimney sections can trap loose rock which falls on climbers below", "Route-finding near chimney exit critical; easy to commit to wrong line", "Weather hazard - afternoon storms on exposed sections", "Descent requires careful rope management through chimney sections"]'::jsonb
WHERE id = 'wa_dolphin_chimney'
  AND watch_out = 'Sustained 5.9+ climbing in chimney terrain with exposure
Chimney sections can trap loose rock which falls on climbers below
Route-finding near chimney exit critical; easy to commit to wrong line
Weather hazard - afternoon storms on exposed sections
Descent requires careful rope management through chimney sections';

-- ============================================================================
-- wa_direct_north_buttress: `ice_grade` was stored as "WI5+" (a serious
-- vertical water-ice grade), which contradicts every other field on this
-- row: `pitch_detail` is entirely rock pitches (5.8 to 5.10-, a chimney
-- system, an offwidth, ridge crest climbing — no ice pitch of any kind),
-- `beta`/`overview` describe a sustained crack-and-face rock climb, and the
-- only ice-related gear mentioned ("lightweight ice axe... helpful for a
-- steep snow section near the route base, not mandatory") describes
-- approach snow, not a WI5+ pitch. Independently confirmed via AAC
-- Publications / skisickness.com / Mountain Project that the Direct North
-- Buttress (Kearney/Knight, Sept 1980, freed by Burdo/Merrand 1985) is a
-- V 5.10 rock route with no ice climbing on it. This is not another route's
-- data misfiled here — no other row in the catalog carries this exact
-- ice_grade value — so it reads as a stray/erroneous field rather than a
-- traceable contamination; nulled rather than left standing as a false claim.
UPDATE routes
SET ice_grade = NULL
WHERE id = 'wa_direct_north_buttress'
  AND ice_grade = 'WI5+';

-- ============================================================================
-- wa_cutthroat_west_ridge: `partner_requirements.approachTime` claimed
-- "on-file timing lists an 8-hour total route day starting early morning" —
-- but the row's own `timing.totalHrs` is 10, not 8, and its own
-- `partner_requirements.fitnessSpec.hiking` independently says "roughly 6
-- hours up and 4 hours down" (= 10). The derived narrative field
-- misdescribed what is actually on file elsewhere in the same row. Corrected
-- the stated figure to match; the two on-file numbers agree at 10 hours.
UPDATE routes
SET partner_requirements = jsonb_set(
  partner_requirements,
  '{approachTime}',
  to_jsonb(replace(partner_requirements->>'approachTime', 'on-file timing lists an 8-hour total route day', 'on-file timing lists a 10-hour total route day'))
)
WHERE id = 'wa_cutthroat_west_ridge'
  AND partner_requirements->>'approachTime' = 'Roughly 2-3 hours from the SR 20 pullout through meadows/the approach bowl to the ridge saddle; on-file timing lists an 8-hour total route day starting early morning';

-- verify
SELECT id, watch_out FROM routes WHERE id IN ('wa_dark_side_of_liberty', 'wa_dolphin_chimney');
SELECT id, ice_grade FROM routes WHERE id = 'wa_direct_north_buttress';
SELECT id, partner_requirements->>'approachTime' AS approach_time FROM routes WHERE id = 'wa_cutthroat_west_ridge';
