-- WA alpine/mountaineering audit — batch 7 (pass 1)
-- Reviewed 2026-07-28. Each fix below was cross-checked against at least one authoritative
-- source (see audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for a
-- human to review and run — not yet applied. Continues the same scope/ordering as batches 1-6
-- (routes.discipline in ('alpine','mountaineering'), id like 'wa_%', area_type = 'peak').

-- Cutthroat Peak's summit is 8,066 ft (Wikipedia; matches the parent area's own elevation_ft
-- of 8,065 and the West Ridge/South Buttress routes' own high_point_ft/waypoints in this same
-- batch). Three sibling routes on Cutthroat Peak carry high_point_ft = 8050, an outlier that
-- doesn't match any source found and contradicts each row's own summit waypoint (already 8066
-- on all three). Aligning high_point_ft to the row's own waypoint and the verified summit
-- elevation.
update routes set high_point_ft = 8066 where id = 'wa_cutthroat_peak_cauthorn_wilson_couloir';
update routes set high_point_ft = 8066 where id = 'wa_cutthroat_peak_northeast_face';
update routes set high_point_ft = 8066 where id = 'wa_cutthroat_peak_southeast_buttress';

-- wa_cutthroat_peak_r1 (South Buttress Direct) has the inverse problem: its own high_point_ft
-- is already correct at 8066, but its "Cutthroat Peak Summit" waypoint is stamped elevFt 8050 —
-- same contradiction as above, same fix direction (align the waypoint to 8066).
update routes set waypoints = jsonb_set(
  waypoints, '{1,elevFt}', '8066'::jsonb
) where id = 'wa_cutthroat_peak_r1';

-- Sloan Peak's area row already has the correct elevation_ft (7835, matching Wikipedia's 7,835
-- ft exactly, and matching this area's own prominence_ft of 3875 which Wikipedia also confirms)
-- but its own blurb text says "Sloan Peak (7,839 ft)" — a stale/typo'd figure contradicting the
-- row's own elevation_ft column. Correcting the blurb text to match.
update areas set blurb = replace(blurb, 'Sloan Peak (7,839 ft)', 'Sloan Peak (7,835 ft)')
  where id = 'wa_sloan_peak';
