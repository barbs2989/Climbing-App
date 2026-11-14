-- WA alpine route audit -- batch 496 (pass 8)
-- Routes: wa_guye_peak_improbable_traverse, wa_guye_peak_r1, wa_guye_peak_r2,
-- wa_hadley_peak_cougar_divide, wa_hadley_peak_skyline_divide, wa_hagan_mountain_south,
-- wa_half_moon_southwest_slopes, wa_helmet_butte_standard_route
-- All values below were re-read from the live DB immediately before this file was
-- written; each UPDATE carries a guard on the current value so it cannot silently
-- no-op if another session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

-- wa_hadley_peak_skyline_divide: gain_ft/loss_ft are stored as 2818, but this route's
-- own waypoints give a trailhead (Skyline Divide Trailhead, 4,250 ft) and summit
-- (Hadley Peak, 7,515 ft) that are 3,265 ft apart on a line the route's own approach
-- text describes as a steady climb (trail to the ridge crest, then a cross-country
-- ridge walk to the summit block) with no descent along the way -- so 3,265 ft is a
-- floor the stored 2,818 ft already falls short of by 447 ft, confirmed via
-- scripts/audit-gain-vs-waypoints.mjs. Using 3,265 ft (the minimum the row's own
-- waypoints allow) rather than a guessed, more precise figure -- a human should
-- re-derive the exact total from a track/DEM if a tighter number accounting for
-- ridge undulation is wanted. Round trip via the same trail, so loss_ft is set to
-- match.
update routes set
  gain_ft = 3265,
  loss_ft = 3265
where id = 'wa_hadley_peak_skyline_divide'
  and gain_ft = 2818
  and loss_ft = 2818;
