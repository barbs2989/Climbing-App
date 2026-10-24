-- wa_marvin_s_ear: high_point_ft was NULL. AAC Publications ("Morning Star Peak, Vega Tower,
-- Marvin's Ear", Morgan Zentler, 2018) states Vega Tower -- the sub-summit this route climbs,
-- a satellite of Morning Star Peak (6,020 ft) -- stands at 5,480 ft. The route's own area
-- filing under wa_morning_star_peak is correct (AAC/Mountain Project both describe Vega Tower
-- and its neighbor Vega North Tower/Eros Tower as subsidiary summits on Morning Star's north
-- ridge, matching the app's existing convention for this route's siblings Mile High Club and
-- Beyond Redlining), so only the missing elevation needed filling.
UPDATE routes SET high_point_ft = 5480 WHERE id = 'wa_marvin_s_ear' AND high_point_ft IS NULL;
