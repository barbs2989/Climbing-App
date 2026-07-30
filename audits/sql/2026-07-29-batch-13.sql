-- WA alpine/mountaineering audit — batch 13 (pass 1)
-- Reviewed 2026-07-29. Each fix below was cross-checked against at least one authoritative
-- source / the row's own internal data or sibling routes on the same peak (see
-- audits/wa-alpine-audit-log.md for the summary). These are PROPOSED fixes for a human to
-- review and run -- not yet applied. Continues the same scope/ordering as batches 1-12
-- (routes.discipline in ('alpine','mountaineering'), id like 'wa_%', area_type = 'peak').
-- Column types re-verified against supabase/migrations/*.sql before writing each statement.

-- Glacier Peak, Disappointment Cleaver / Sitkum Glacier (wa_glacier_peak_disappointment_cleaver):
-- access.closures and road.status/driveNote all state the White Chuck River Road (FS-23)
-- closure past MP 3.7 is "since Dec 2025 flooding" -- but this contradicts all three other
-- Glacier Peak routes that reference the same closure (wa_glacier_peak_frostbite_ridge,
-- wa_glacier_peak_kennedy_glacier, wa_glacier_peak_sitkum_glacier all say "Dec 2024 flood
-- damage"), the area's own blurb ("Access has been in flux since December 2024 flood damage
-- closed the White Chuck Road (FR 23)"), and the real-world USFS closure order (fs.usda.gov
-- "FSR 23 and FSR 27 Closure Order," effective March 19, 2025 through Dec 31, 2025, issued in
-- response to flood damage from the preceding December -- i.e. December 2024, not 2025; a
-- March 2025 order cannot be responding to damage that hadn't happened yet). A real, separate,
-- much larger storm did hit the North Cascades in December 2025 (confirmed via UW Climate
-- Impacts Group and Cascade Backcountry Alliance reporting, which washed out the Suiattle River
-- Road/FSR 26 at MP 4.5 and is the correct basis for this same route's April-2026 "extremely
-- limited access" note elsewhere in this row) -- but no source found ties that second, later
-- event to the White Chuck Road/FS-23 closure specifically, so the "Dec 2025" date on this
-- particular closure is corrected to match the confirmed Dec 2024 event.
update routes set access = jsonb_set(
  access, '{closures}',
  '"White Chuck River Road (FS-23) closed past MP 3.7 since Dec 2024 flood damage."'::jsonb
) where id = 'wa_glacier_peak_disappointment_cleaver';

update routes set road = jsonb_set(
  road, '{driveNote}',
  '"FS-23 closed past MP 3.7 since Dec 2024 flooding; verify status with the Darrington Ranger District."'::jsonb
) where id = 'wa_glacier_peak_disappointment_cleaver';

-- Glacier Peak, Cool Glacier / Gerdine Ridge (wa_glacier_peak_cool_glacier_gerdine) and
-- Disappointment Peak Cleaver (wa_glacier_peak_disappointment_peak_cleaver): fa misspells USGS
-- surveyor A. H. Dubor's surname as "Dubois." Wikipedia's Glacier Peak article and this same
-- peak's two other routes in this batch (wa_glacier_peak_disappointment_cleaver and
-- wa_glacier_peak_sitkum_glacier) both correctly spell it "Dubor" -- this is the sole outlier
-- spelling against 2 sibling routes plus the external source.
update routes set fa = replace(fa, 'A. H. Dubois', 'A. H. Dubor')
  where id = 'wa_glacier_peak_cool_glacier_gerdine';

update routes set fa = replace(fa, 'A. H. Dubois', 'A. H. Dubor')
  where id = 'wa_glacier_peak_disappointment_peak_cleaver';

-- Glacier Peak, Frostbite Ridge (wa_glacier_peak_frostbite_ridge): the "Glacier Peak Summit"
-- waypoint stores elevFt 10550, but this row's own high_point_ft is 10541, the area's own
-- elevation_ft is 10541, and every other Glacier Peak route's summit waypoint in this batch
-- (Cool Glacier/Gerdine Ridge, Disappointment Cleaver, Disappointment Peak Cleaver, Kennedy
-- Glacier, Sitkum Glacier) also says 10541 -- sole outlier, corrected to match.
update routes set waypoints = jsonb_set(waypoints, '{1,elevFt}', '10541'::jsonb)
  where id = 'wa_glacier_peak_frostbite_ridge';

-- Gilbert Peak, Meade Glacier (wa_gilbert_peak_meade_glacier): the row's own `corrections`
-- field claims "Used 8,201 ft (benchmark) for this route's highPointFt" -- but the actual
-- stored high_point_ft on this row is 8,184 ft, matching Wikipedia/USGS topo (also matching
-- the area's own elevation_ft of 8,184) rather than the 8,201 ft benchmark figure the note
-- claims was used. The corrections text is corrected to describe what is actually stored
-- rather than a value that was never applied; the elevation itself (8,184 ft) is left
-- unchanged since it already matches the higher-confidence USGS/Wikipedia source.
update routes set corrections =
  'The given peak elevation was null; sources conflict slightly — USGS topo/Wikipedia list ' ||
  '8,184 ft, while a trip report citing the summit benchmark states 8,201 ft. Used 8,184 ft ' ||
  '(USGS/Wikipedia, matching the area''s own elevation_ft) for this route''s highPointFt; note ' ||
  'the ~17 ft discrepancy with the benchmark figure cited in some trip reports ' ||
  '(ericsbasecamp.net summit log).'
  where id = 'wa_gilbert_peak_meade_glacier';
