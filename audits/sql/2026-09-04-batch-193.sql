-- Batch 193 (pass 4): wa_golden_horn_north_face .. wa_gunsight_peak_standard
-- Generated 2026-09-04. Each statement verified against the live row immediately before
-- this file was written. Re-verify before applying if time has passed.

-- ============================================================
-- wa_goode_mountain_southwest_couloir: dist_km (59.5 km / 36.97 mi) is anomalously large
-- for a trailhead-to-summit one-way distance and is very likely the ROUND-TRIP figure
-- stored where the app expects one-way (it renders round trip as dist_km * 2, which would
-- show ~74 miles round trip -- far beyond even the most generous published trip-report
-- total of ~42 miles for this exact approach).
--
-- Two independent checks agree on roughly half the stored value:
--  1) The row's OWN approach text states: "Total approach is commonly done as a long
--     day-plus-camp, on the order of 15-16 miles ... to high camp" (one-way to the high
--     camp at ~5,500-6,800 ft), plus a further ~1-1.5 mi of glacier/couloir travel from
--     camp to the 9,220 ft summit -- giving a one-way estimate of roughly 16.5-17.5 mi
--     (26.6-28.2 km).
--  2) Straight-line trailhead-to-summit distance (haversine, same Rainy Pass PCT North
--     Trailhead at 48.5181,-120.7331 to the Goode summit at 48.4829,-120.9109) is 13.67 km.
--     This route's stored dist_km / straight-line ratio is 4.35x -- versus 1.32x and 1.88x
--     for its two sibling routes sharing the IDENTICAL trailhead and summit
--     (wa_goode_mountain_megalodon_ridge, dist_km=18; wa_goode_mountain_northeast_face,
--     dist_km=25.7). Halving the stored value brings this route to a 2.18x ratio, in line
--     with (if a bit higher than, consistent with its more indirect off-trail moraine/
--     glacier travel) its siblings, rather than more than double their sinuosity.
--
-- descent_text confirms this is a straightforward out-and-back on the same line ("Descend
-- the same Southwest Couloir used on ascent ... retrace the approach line back down"),
-- consistent with the existing gain_ft = loss_ft = 8400 (an out-and-back round-trip
-- profile), so only dist_km needs correcting, not the vertical figures.
-- ============================================================
UPDATE routes
SET dist_km = 29.75
WHERE id = 'wa_goode_mountain_southwest_couloir'
  AND dist_km = 59.5
  AND gain_ft = 8400
  AND loss_ft = 8400;

-- ============================================================
-- wa_gunnshy_peak_standard_route: access.notes claimed "Many of these peaks (Mount Persis,
-- Gunn Peak, Baring Mountain area) sit outside designated wilderness". This is false for
-- two of the three named peaks and contradicts the rest of this very row: the route's own
-- `overview` field correctly states Gunnshy Peak is "the second-highest summit in the Wild
-- Sky Wilderness", and access.permit/access.landManager both correctly reference Wild Sky
-- Wilderness regulations. Confirmed via web search: Gunn Peak is the Wild Sky Wilderness's
-- HIGHEST summit and Baring Mountain is also inside the wilderness boundary (established
-- 2008); only Mount Persis, of the three peaks named, sits outside it. Corrected to
-- describe the actual situation (Wild Sky Wilderness includes Gunnshy/Gunn/Baring; Mount
-- Persis nearby is the outlier that does not), matching the rest of the row.
-- ============================================================
UPDATE routes
SET access = jsonb_set(
  access,
  '{notes}',
  '"Gunnshy, Gunn, and Baring are all inside the Wild Sky Wilderness (established 2008), unlike nearby Mount Persis, which sits outside the wilderness boundary in ordinary National Forest land."'::jsonb
)
WHERE id = 'wa_gunnshy_peak_standard_route'
  AND access->>'notes' = 'Many of these peaks (Mount Persis, Gunn Peak, Baring Mountain area) sit outside designated wilderness — administratively unrestricted despite serious technical terrain.';
