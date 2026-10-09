-- WA alpine audit -- batch 222 (2026-09-06, pass 4)
-- Routes: wa_northwest_ridge_2 (Boston Peak), wa_nw_face_var_remsberg_variation
-- (Liberty Bell Mountain), wa_nw_ridge_2 (Colchuck Balanced Rock),
-- wa_old_guard_peak_east_side_route (Old Guard Peak),
-- wa_old_guard_peak_southwest_route (Old Guard Peak),
-- wa_old_snowy_mountain_r1 (Old Snowy Mountain), wa_olympus_blue_glacier_east_ramps
-- (Mount Olympus West Peak), wa_olympus_summit_block_west_edge (Mount Olympus West Peak).
-- Each WHERE clause includes the current (wrong) value as a safety check.
-- Apply each UPDATE individually.

-- Mount Olympus, Blue Glacier / Snow Dome (East Face Ramps Finish): road.status
-- and road.seasonalGate both claim the Upper Hoh Road's storm-damage closure
-- ran "December 2024 until ... May 2026" (~17 months). Multiple authoritative
-- sources (Jefferson County WA official announcements, Washington State
-- Standard, NPS Olympic news releases) confirm the road actually reopened on
-- May 8, 2025, after a ~5-month closure -- not May 2026. The "2026" figures
-- appear to be an off-by-one-year error. Corrected both sub-fields; left
-- everything else in the road object untouched.
UPDATE routes
SET road = jsonb_set(
      jsonb_set(road, '{status}', '"Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS); closed by storm damage from December 2024 until repairs reopened it in May 2025, illustrating its washout-prone history"'::jsonb),
      '{seasonalGate}', '"None typical, but storm closures occur \u2014 as demonstrated by the ~5-month Dec 2024\u2013May 2025 closure"'::jsonb
    )
WHERE id = 'wa_olympus_blue_glacier_east_ramps'
  AND road->'status' = '"Paved, about 18 miles from Hwy 101 to the Hoh Ranger Station (NPS); closed by storm damage from December 2024 until repairs reopened it in May 2026, illustrating its washout-prone history"'::jsonb
  AND road->'seasonalGate' = '"None typical, but storm closures occur \u2014 as demonstrated by the ~17-month Dec 2024\u2013May 2026 closure"'::jsonb;

-- access_checked_at stamped for all 8 routes reviewed this batch (external
-- sources cross-checked 2026-09-06 -- elevations for Boston Peak, Liberty
-- Bell Mountain, Colchuck Balanced Rock, Old Guard Peak, Old Snowy Mountain,
-- and Mount Olympus West Peak all corroborated against Wikipedia/PeakVisor/
-- listsofjohn.com/Peakbagger; first-ascent claims for Boston Peak's NW Ridge
-- (Boyce-Willis 2018) and Mount Olympus (L.A. Nelson party, Aug 13 1907)
-- corroborated against the AAC/AAJ and HistoryLink.org; Suiattle River Road
-- and FR-21 washout/closure details corroborated against USFS alerts;
-- Enchantment and North Cascades NP permit fees corroborated against current
-- Recreation.gov/NPS pages; no change to any other field on the seven routes
-- not touched above).
UPDATE routes
SET access_checked_at = '2026-09-06T12:00:00+00:00'
WHERE id IN (
  'wa_northwest_ridge_2',
  'wa_nw_face_var_remsberg_variation',
  'wa_nw_ridge_2',
  'wa_old_guard_peak_east_side_route',
  'wa_old_guard_peak_southwest_route',
  'wa_old_snowy_mountain_r1',
  'wa_olympus_blue_glacier_east_ramps',
  'wa_olympus_summit_block_west_edge'
);
