-- WA alpine route audit -- batch 489 (pass 8)
-- Routes: wa_esmeralda_peaks_scramble, wa_fifth_of_july_mountain_scramble,
-- wa_fire_on_the_mountain, wa_fish_whistle, wa_flora_mountain_southwest_slope,
-- wa_flycatcher_buttress, wa_forbidden_peak_east_ledges, wa_forbidden_peak_east_ridge
-- All values below were re-read from the live DB immediately before this file was
-- written; each UPDATE carries a guard on the current value so it cannot silently
-- no-op if another session has already touched the same field.
-- No DELETE/DROP/TRUNCATE/ALTER anywhere in this file.

-- wa_flora_mountain_southwest_slope: gain_ft/loss_ft are stored as 3150, but this
-- route's own waypoints give a start (Bird Creek Camp, 4200 ft) and summit (Flora
-- Mountain, 8323 ft) that are 4123 ft apart -- already more than the stored 3150 ft
-- before counting anything else. The route's own itinerary/pitch_detail additionally
-- describe the day-2 push dropping into a saddle (~6,400 ft) and then descending again
-- to cross Castle Creek before the final climb to the summit, which can only push the
-- true one-way gain higher than the simple 4123 ft floor, never lower. No source gives
-- the Castle Creek crossing's exact elevation, so 4123 ft (the minimum the row's own
-- stored waypoints allow) is used here rather than a guessed, more precise figure --
-- a human should re-derive the exact total from a track/DEM if a tighter number is
-- wanted. Round trip, so loss_ft is set to match.
update routes set
  gain_ft = 4123,
  loss_ft = 4123
where id = 'wa_flora_mountain_southwest_slope'
  and gain_ft = 3150
  and loss_ft = 3150;
