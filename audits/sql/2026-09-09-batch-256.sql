-- WA alpine route audit -- batch 256 (pass 5)
-- Routes checked: wa_forbidden_peak_east_ridge, wa_forbidden_peak_north_ridge,
-- wa_forbidden_peak_northeast_face, wa_forbidden_peak_northwest_face,
-- wa_forbidden_peak_west_ridge, wa_fortress_mountain_east_ridge,
-- wa_fortress_mountain_northeast_face, wa_fortress_mountain_southwest_face

-- Forbidden Peak, East Ridge Direct: watch_out is a single string of generic
-- glacier-mountaineering boilerplate ("Glacier approach with crevasse field...
-- continuous rope essential... bergschrund crossing required at ridge base",
-- "Moat crossing at ridge base", "7000+ ft elevation gain to base") that
-- contradicts this same row's own data: seasonal_hazards.crevasses states
-- outright "N/A - no glacier travel documented for this approach/ridge line",
-- and the row's own approach/approach_variants text describes a non-glaciated
-- talus/slab/snow-gully approach with no rope-team travel, no bergschrund, and
-- no moat anywhere. This reads as boilerplate carried over from a much bigger,
-- genuinely glaciated objective (the same shape documented systemically in
-- batch 251/255) rather than route-specific content. Re-homed into the jsonb
-- array shape used everywhere else, using this row's OWN already-accurate
-- `hazards` field content verbatim -- no new research, nothing invented.
UPDATE routes SET watch_out = '["loose rock on the gendarmes and long crest", "serious, sustained exposure", "complex route-finding over multiple gendarmes", "afternoon thunderstorms", "aging fixed rappel anchors in the gendarme notches"]'::jsonb
WHERE id = 'wa_forbidden_peak_east_ridge' AND jsonb_typeof(watch_out) = 'string';

-- Forbidden Peak, East Ridge Direct: itinerary.days[0].gainFt (2,800 ft, camp
-- day) contradicts this same row's own day-1 note text, which explicitly says
-- "camping near 6,400 ft" -- 3,200 ft above the 3,200 ft trailhead
-- (approach_logistics/waypoints[0]), not the 6,000 ft the stored 2,800 ft
-- would imply. Independently, day 2's own gainFt (2,415) only makes sense as
-- summit (8,815 ft) minus a 6,400 ft camp -- it requires the corrected value.
-- Correcting day 1 to 3,200 ft makes the two days sum to exactly 5,615 ft,
-- which is this same row's own top-level gain_ft (already correct and
-- unchanged) -- three independent numbers converge with zero residual once
-- this one field is fixed. Also updating the itinerary's own totalNote, which
-- quotes both the now-wrong "2,800 ft" and "~5,200 ft total gain" figures, so
-- the prose does not contradict the corrected numbers beside it.
UPDATE routes SET itinerary = jsonb_set(
  jsonb_set(itinerary, '{days,0,gainFt}', '3200'::jsonb),
  '{totalNote}',
  '"A 2-day trip: ~4 hrs / 3,200 ft hiking in to a Boston Basin camp, then a long 12-14 hr day climbing the East Ridge (8 pitches) and descending the West Ridge for a full ridge traverse, ~5,600 ft total gain."'::jsonb
)
WHERE id = 'wa_forbidden_peak_east_ridge' AND itinerary->'days'->0->>'gainFt' = '2800';

-- Forbidden Peak, North Ridge: watch_out is a single newline-joined string of
-- generic "winter route requiring ice climbing" boilerplate ("Short ice pitch
-- potential in winter conditions", "Alpine terrain exposure in winter
-- conditions") that contradicts every other field on this same row -- this is
-- a summer glaciated-rock route (best_season "Mid to late summer", season
-- "Jul-Sep", approach describes crossing the Quien Sabe/Boston glaciers roped
-- for crevasses in July-August, not a winter ice climb). Re-homed into the
-- jsonb array shape (same defect class as East Ridge Direct above and the
-- Energizer Bunny/Fish & Whistle/Flycatcher Buttress fixes in batch 255),
-- using this row's own already-accurate `obj_haz` field verbatim.
UPDATE routes SET watch_out = '["crevasse hazard crossing the Quien Sabe and Boston Glaciers", "rockfall in the approach gully/notch", "very remote — limited rescue options", "route-finding difficulty on the glaciers and ridge"]'::jsonb
WHERE id = 'wa_forbidden_peak_north_ridge' AND jsonb_typeof(watch_out) = 'string';

-- Fortress Mountain, East Ridge: loss_ft (7,900) is wildly inconsistent with
-- this same row's own gain_ft (5,884, which itself matches summit minus
-- trailhead almost exactly: 8,679 - 2,800 = 5,879) and with this row's own
-- descent_text, which explicitly reverses the ascent step by step ("down-climb
-- the exposed 4th-class step and follow the East Ridge crest back to the head
-- of the loose gully, descending it carefully to the ~7,200 ft col... drop
-- back... and retrace the cross-country line down... to Trinity Trailhead").
-- For a route documented as descending the same line it climbed, cumulative
-- loss must equal cumulative gain (a closed loop back to the same trailhead
-- has zero net elevation change) -- 7,900 is 2,016 ft too high and has no
-- support anywhere else in the row. Correcting to match gain_ft.
UPDATE routes SET loss_ft = 5884
WHERE id = 'wa_fortress_mountain_east_ridge' AND loss_ft = 7900;
