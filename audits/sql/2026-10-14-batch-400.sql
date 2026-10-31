-- WA alpine/mountaineering audit -- batch 400 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_eldorado_peak_northeast_face, wa_eldorado_peak_west_arete,
--         wa_elephant_butte_standard_route, wa_energizer_bunny (Prusik Peak),
--         wa_esmeralda_peaks_scramble, wa_fifth_of_july_mountain_scramble,
--         wa_fire_on_the_mountain (Sloan Peak), wa_fish_whistle (Vesper Peak),
--         wa_flora_mountain_southwest_slope, wa_flycatcher_buttress
--         (North Early Winters Spire)
-- Both fixes below are elevation corrections confirmed against Wikipedia/SummitPost/
-- Mountaineers.org trip reports (see wa-alpine-audit-log.md for the per-route detail of
-- everything checked, including the items left flagged for human review). No source
-- contradicted any grade, FA, permit, approach, descent or hazard claim in this batch.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

-- =========================================================================
-- Esmeralda Peaks, Southwest Slope (wa_esmeralda_peaks_scramble)
-- -- row's own high_point_ft (6765) already correct; beta/waypoints/pitch_detail
--    instead describe the same West Summit as 6,776 ft, an internal contradiction
-- =========================================================================
-- Wikipedia ("Esmeralda Peaks", 6,765 ft), SummitPost ("Esmeralda Peak", 6,767 ft) and a
-- 2022 Mountaineers.org trip report ("the summit block itself was bare rock (6,765
-- feet)") all agree on ~6,765 ft for the true (west) summit -- matching this row's own
-- high_point_ft column. The prose/waypoint/pitch fields instead say 6,776 ft for the
-- same summit. Correcting those three fields to match the column that was already right.
UPDATE routes SET
  beta = replace(beta, '6,776 ft', '6,765 ft'),
  waypoints = jsonb_set(
    jsonb_set(waypoints, '{2,elev}', '6765'::jsonb),
    '{2,elevFt}', '6765'::jsonb
  ),
  pitch_detail = jsonb_set(
    pitch_detail, '{2,notes}',
    '"~1,100 ft of sustained, loose scree and talus up the southwest slope to the west (true high point, 6,765 ft) summit, with the upper 100-150 ft loose broken rock."'::jsonb
  )
WHERE id = 'wa_esmeralda_peaks_scramble'
  AND beta LIKE '%6,776 ft%'
  AND waypoints->2->>'name' = 'Esmeralda Peaks - West Summit (true/high summit)'
  AND pitch_detail->2->>'pitch' = 'Scree/talus scramble';

-- =========================================================================
-- Flora Mountain, Southwest Slope / Standard Route (wa_flora_mountain_southwest_slope)
-- -- high_point_ft off by 2 ft; the row's own `corrections` field already flagged this
-- =========================================================================
-- Wikipedia and WTA both give 8,325 ft for Flora Mountain; the stored 8,323 ft traces to
-- a single lidar resurvey (trailcatjim.com, citing Eric Gilbertson) that the two more
-- widely corroborated sources do not share. This row's own `corrections` field already
-- recommends 8325 for this reason. Applying that recommendation and syncing the summit
-- waypoint to match.
UPDATE routes SET
  high_point_ft = 8325,
  waypoints = jsonb_set(
    jsonb_set(waypoints, '{2,elev}', '8325'::jsonb),
    '{2,elevFt}', '8325'::jsonb
  )
WHERE id = 'wa_flora_mountain_southwest_slope'
  AND high_point_ft = 8323
  AND waypoints->2->>'name' = 'Flora Mountain summit';
