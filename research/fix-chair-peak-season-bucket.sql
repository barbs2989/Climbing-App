-- Snoqualmie Pass has two "crags" that are actually Mountain Project's seasonal
-- headings, imported as if they were places:
--
--   wa_summer_fall_rock_3            "Summer-Fall (rock)"              3 routes
--   wa_winter_spring_ice_snow_mixed_2 "Winter-Spring (ice, snow, mixed)" 0 routes
--
-- All 3 routes in the first are Chair Peak routes by their own text, and
-- wa_chair_peak already exists as a real peak area with 6 routes. Two of the
-- three duplicate routes already on Chair Peak; one is unique.
--
-- STEP 1 ONLY -- additive and reversible. Nothing is deleted here.
--
-- The duplicates each carry a grade that the enriched Chair Peak copy lacks
-- (both enriched rows have grade = null). Those grades are copied across FIRST,
-- with coalesce so this can only fill a blank, never overwrite. Deleting the
-- duplicates is a separate step, deliberately not bundled: a duplicate flag is
-- a hypothesis until both halves are confirmed, and an unguarded DELETE on that
-- assumption is what destroyed Triple Couloirs.

-- 1a. Rescue the grades before the duplicates are touched. Blanks only.
update routes set grade = coalesce(grade, '5.2')
 where id = 'wa_chair_peak_east_face' and area_id = 'wa_chair_peak';

update routes set grade = coalesce(grade, '5.7')
 where id = 'wa_chair_peak_northwest_ridge' and area_id = 'wa_chair_peak';

-- 1b. Move the one genuinely unique route onto the peak it describes.
--     Its text: "starts on Chair Peak's north ridge and follows the crest
--     toward Bryant Peak". No route of this name exists on wa_chair_peak.
update routes set area_id = 'wa_chair_peak'
 where id = 'wa_chair_bryant_traverse' and area_id = 'wa_summer_fall_rock_3';

select id, name, area_id, grade, pitches
  from routes
 where area_id in ('wa_chair_peak','wa_summer_fall_rock_3')
 order by area_id, name;
