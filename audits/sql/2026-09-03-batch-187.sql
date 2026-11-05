-- WA alpine audit — batch 187 (pass 4)
-- Routes: wa_dorado_needle_east_ridge, wa_dragontail_peak_backbone_ridge,
-- wa_dragontail_peak_east_ridge_aasgard_pass, wa_dragontail_peak_r1,
-- wa_dragontail_peak_r2, wa_dragontail_peak_r3, wa_dragontail_peak_r4,
-- wa_dragontail_peak_serpentine_arete, wa_e_se_face, wa_east_face

-- ============================================================================
-- wa_dragontail_peak_r1 (Hidden Couloir): `dist_km` was 20 (=12.4 mi), which
-- contradicts the row's own `waypoints` array — a coherent, monotonically
-- increasing distMi chain (Trailhead 0 -> junction 2.3 -> Colchuck Lake
-- 4/4.3 -> moraine crest 5 -> couloir base 5.3 -> mid-face 6 -> summit 6.3)
-- that the row itself built to describe this exact route. 6.3 mi = 10.14 km,
-- which also matches the sibling wa_dragontail_peak_east_ridge_aasgard_pass
-- (same trailhead/lake, its own waypoint chain tops out at 6.25 mi and its
-- stored dist_km is 10.1 -- i.e. that sibling's dist_km already equals its
-- own waypoint-chain distance). Two structurally near-identical siblings on
-- the same peak/approach corridor (Gerber-Sink, Pandora's Box) store 6.4 km
-- for a shorter waypoint chain, not the ~20 km convention, so a "total
-- multi-day trip mileage" reading was checked and does not hold across the
-- family. Corrected to match this row's own waypoint-derived distance.
UPDATE routes
SET dist_km = 10.1
WHERE id = 'wa_dragontail_peak_r1'
  AND dist_km = 20;

-- ============================================================================
-- wa_east_face (Middle Peak / "Middle Gunsight", Gunsight Range): `permit`
-- was NULL, read as "no permit required." Confirmed via the Mt.
-- Baker-Snoqualmie NF's own trailhead page that the Downey Creek Trailhead
-- (this route's own approach start) requires a paid Recreation Pass
-- (Northwest Forest Pass or equivalent) for parking, plus a free self-issued
-- wilderness permit at the trailhead for entry into Glacier Peak Wilderness
-- -- consistent with how every other route checked this batch populates
-- `permit` with the applicable pass/permit requirement rather than leaving it
-- null. Not a quota/reservation system (unlike the Enchantment area or NCNP
-- backcountry permits elsewhere in this catalog), so phrased accordingly.
UPDATE routes
SET permit = 'Glacier Peak Wilderness (Mt. Baker-Snoqualmie NF), accessed via the Downey Creek Trailhead: a Northwest Forest Pass (or equivalent Interagency Pass) is required for trailhead parking, and a free self-issued wilderness permit is required at the trailhead for entry -- no advance reservation or quota.'
WHERE id = 'wa_east_face'
  AND area_id = 'wa_middle_peak'
  AND permit IS NULL;

-- verify
SELECT id, dist_km FROM routes WHERE id = 'wa_dragontail_peak_r1';
SELECT id, permit FROM routes WHERE id = 'wa_east_face' AND area_id = 'wa_middle_peak';
