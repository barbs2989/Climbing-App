-- WA alpine route audit -- batch 484 (pass 8)
-- Routes: wa_dolphin_chimney, wa_dome_peak_dome_glacier, wa_dome_peak_indian_summer,
-- wa_dorado_needle_east_ridge, wa_dot_mountain_scramble, wa_dragontail_peak_backbone_ridge,
-- wa_dragontail_peak_boving_route, wa_dragontail_peak_colchuck_col_buttress
-- All values below were re-read from the live DB immediately before this file was
-- written; each UPDATE carries a guard on the current value so it cannot silently
-- no-op if another session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

-- wa_dome_peak_dome_glacier, wa_dome_peak_indian_summer: both routes store
-- high_point_ft = 8920, the older map-based figure (matches Wikipedia's
-- "8,920+ ft" and SummitPost). But the wa_dome_peak AREA row already stores
-- the LiDAR-surveyed figure: elevation_ft 8926, prominence_ft 3079. Those two
-- numbers are a matched LiDAR pair on listsofjohn.com (elevation 8,926 ft,
-- rise 3,079 ft, coords 48.30342/-121.02949 -- matching this area row's own
-- lat/lng to 4 decimal places) -- i.e. the area row is already internally
-- self-consistent on the newer, more precise survey. The two routes' stored
-- 8920 does not pair with this area's own prominence_ft (3079); it pairs
-- with the older map figure's prominence (~3040-3080 depending on source).
-- Raising the routes' high_point_ft to match the area row's own already-
-- correct LiDAR figure, the same kind of area/route sibling-agreement fix
-- made for wa_cutthroat_peak in batch 482.
update routes set
  high_point_ft = 8926
where id = 'wa_dome_peak_dome_glacier'
  and high_point_ft = 8920;

update routes set
  high_point_ft = 8926
where id = 'wa_dome_peak_indian_summer'
  and high_point_ft = 8920;

-- verify: both rows should now show 8926, matching the wa_dome_peak area row
select id, high_point_ft from routes where id in ('wa_dome_peak_dome_glacier', 'wa_dome_peak_indian_summer');
select id, elevation_ft, prominence_ft from areas where id = 'wa_dome_peak';
