-- WA alpine/mountaineering audit — batch 11 (pass 1)
-- Reviewed 2026-07-29. Each fix below was cross-checked against at least one authoritative
-- source / the row's own internal data (see audits/wa-alpine-audit-log.md for the summary).
-- These are PROPOSED fixes for a human to review and run -- not yet applied. Continues the
-- same scope/ordering as batches 1-10 (routes.discipline in ('alpine','mountaineering'),
-- id like 'wa_%', area_type = 'peak'). Column types re-verified against
-- supabase/migrations/*.sql before writing each statement (routes.high_point_ft and
-- routes.grade_num are both numeric/integer).

-- Forbidden Peak North Ridge (wa_forbidden_peak_north_ridge): high_point_ft stored 10781 ft,
-- which does not belong to Forbidden Peak at all. Forbidden Peak's real summit elevation is
-- 8,815 ft -- confirmed by this same route's own summit waypoint (elev: 8815), by the parent
-- area row (areas.wa_forbidden_peak.elevation_ft = 8815), and by all three other Forbidden
-- Peak routes audited this batch (East Face/Catscratch, East Ridge, East Ridge Direct), which
-- all already store high_point_ft = 8815. 10,781 ft is not a plausible reading of any Forbidden
-- Peak source and looks like stray data from an unrelated peak. Fixing to match the route's own
-- waypoint and every other on-file source for this peak.
update routes set high_point_ft = 8815
  where id = 'wa_forbidden_peak_north_ridge';

-- Forbidden Peak North Ridge (wa_forbidden_peak_north_ridge): grade_num stored 3, inconsistent
-- with this row's own grade ('Grade III, 5.6') and rock_grade ('5.6') fields, and with the
-- catalog-wide convention (confirmed against every other route in this batch) of grade_num
-- holding the digits after "5." in a YDS grade -- e.g. this same batch's East Ridge stores
-- grade 'Grade III, 5.8' with grade_num = 8. 3 appears to be the "III" commitment-grade token
-- misread as a number rather than the YDS grade. Fixing to 6 to match rock_grade/grade and the
-- established convention.
update routes set grade_num = 6
  where id = 'wa_forbidden_peak_north_ridge';
