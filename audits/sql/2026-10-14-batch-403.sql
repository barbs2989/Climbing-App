-- WA alpine/mountaineering audit -- batch 403 (pass 7)
-- Scope: routes.discipline IN ('alpine','mountaineering') AND routes.id LIKE 'wa_%'
--        AND routes.area_id IN (SELECT id FROM areas WHERE area_type = 'peak')
-- Routes: wa_garfield_mountain_south_route, wa_garfield_mountain_southeast_face,
--         wa_garfield_mountain_southwest_ledges, wa_ghost_peak_south_route,
--         wa_gilbert_peak_conrad_glacier, wa_gilbert_peak_meade_glacier,
--         wa_gilbert_peak_west_route, wa_glacier_peak_cool_glacier_gerdine
-- One fix this batch: a grade correction on Gilbert Peak's West Route, where the
-- stored Class 4 contradicts SummitPost's explicit "Class 3 rock, moderate scramble"
-- rating and no source found rates any segment Class 4. See wa-alpine-audit-log.md for
-- everything else checked and left flagged for human review this batch -- most
-- notably two likely-fabricated/conflated Garfield Mountain routes (Southeast Face,
-- Southwest Ledges) and a likely duplicate Glacier Peak route row, neither of which
-- this audit has authority to delete or merge.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

-- =========================================================================
-- Gilbert Peak, West Route (wa_gilbert_peak_west_route)
-- -- grade/grade_num (Class 4) contradicted by SummitPost's West Route page, which
--    rates this line "Class 3 rock, moderate scramble" -- no source found supports
--    Class 4 for any segment of this route
-- =========================================================================
UPDATE routes SET
  grade = 'Class 3',
  grade_num = 3
WHERE id = 'wa_gilbert_peak_west_route'
  AND grade = 'Class 4'
  AND grade_num = 4;
