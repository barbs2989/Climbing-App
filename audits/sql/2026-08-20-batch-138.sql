-- WA alpine audit, batch 138 (pass 3), 2026-08-20
-- Scope: wa_liberty_cap_ptarmigan_ridge_finish, wa_liberty_crack, wa_liberty_crack_free,
-- wa_liberty_traverse, wa_lichtenberg_mountain_west_face_west_rib,
-- wa_lincoln_peak_north_ridge, wa_lincoln_peak_standard,
-- wa_little_big_chief_mountain_northeast_face
--
-- Two confirmed elevation errors below, both cross-checked against Wikipedia plus
-- multiple independent aggregator sites (PeakVisor, Peakbagger-derived listings,
-- WTA, peakery), and both cases where sibling rows already in this same database
-- carry the correct figure while the flagged row does not.

-- wa_liberty_crack: high_point_ft stores 7746, which no source anywhere gives for
-- Liberty Bell Mountain. Wikipedia, mountainzone.com and peakvisor.com all
-- consistently give 7,720 ft (topozone gives 7,680 ft from an older contour read;
-- nothing gives 7,746). The route's own sibling wa_liberty_crack_free already
-- stores the correct 7720 for the identical summit, and a prior audit batch
-- (2026-08-20, batch 137/log) independently confirmed 7,720 ft for
-- wa_liberty_bell_beckey_route against the same Wikipedia figure and its own
-- waypoint. Liberty Crack's descent_text says it tops out at "M&M Ledge, or the
-- true summit if you continue" -- 7720 is the true summit height.
UPDATE routes
SET high_point_ft = 7720
WHERE id = 'wa_liberty_crack'
  AND high_point_ft = 7746;

-- wa_lincoln_peak_north_ridge and wa_lincoln_peak_standard: both store
-- high_point_ft = 9101 for Lincoln Peak (Black Buttes, Mt. Baker massif), and
-- wa_lincoln_peak_standard's single summit waypoint also stores elev/elevFt 9101.
-- Every independent source found -- Wikipedia (via Black Buttes and Lincoln Peak
-- articles, cited through Peakbagger), PeakVisor, Washington Trails Association,
-- peakery.com, and stevensong.com's peakbagging log -- consistently gives Lincoln
-- Peak as "9,080+ ft"; none gives 9,101 ft anywhere. wa_lincoln_peak_north_ridge's
-- OWN `corrections` column already records this exact discrepancy from a prior
-- enrichment pass ("Wikipedia's Black Buttes article gives a precise 9,085ft for
-- Lincoln Peak ... 9,085 is the more precise figure") but the fix was apparently
-- never applied to high_point_ft or to either route's waypoints. Using 9085 ft as
-- the more precise figure the correction note already cites, consistent with the
-- "9,080+" rounding every other source gives.
UPDATE routes
SET high_point_ft = 9085
WHERE id = 'wa_lincoln_peak_north_ridge'
  AND high_point_ft = 9101;

UPDATE routes
SET waypoints = jsonb_set(waypoints, '{7,elev}', '9085'::jsonb)
WHERE id = 'wa_lincoln_peak_north_ridge'
  AND waypoints->7->>'name' = 'Lincoln Peak summit'
  AND (waypoints->7->>'elev')::numeric = 9101;

UPDATE routes
SET high_point_ft = 9085
WHERE id = 'wa_lincoln_peak_standard'
  AND high_point_ft = 9101;

UPDATE routes
SET waypoints = jsonb_set(
  jsonb_set(waypoints, '{0,elev}', '9085'::jsonb),
  '{0,elevFt}', '9085'::jsonb
)
WHERE id = 'wa_lincoln_peak_standard'
  AND waypoints->0->>'name' = 'Lincoln Peak summit'
  AND (waypoints->0->>'elev')::numeric = 9101;

-- Everything else in this batch checked clean against authoritative sources:
-- Little Big Chief Mountain's 7,225 ft and 47.5297,-121.2567 peak coordinate both
-- confirmed exactly against Wikipedia/Peakbagger (the row's own `corrections` note
-- already flags Mountain Project's rival 7,213 ft as the outlier, correctly).
-- Lichtenberg Mountain's true 5,844 ft summit (matching the route's own pro_tips
-- claim) confirmed against Wikipedia/listsofjohn.com; the route's own high_point_ft
-- of 5,800 ft is for a distinct, little-documented sub-summit ("the Lichtenhorn")
-- and was left alone -- no independent source exists to check it against. Liberty
-- Crack's FA (Marts/Stanley/McPherson, July 1965) and its #24 spot on Roper &
-- Steck's Fifty Classic Climbs both confirmed. Lincoln Peak's X Couloir standard
-- route FA (Beckey/Grande/Rupley/Staley, July 22 1956) and its SW-Face/X-Couloir
-- routing both confirmed -- the route's own `corrections` note hedges toward an
-- "east face" description that does NOT match reality and was correctly left
-- unapplied; no fix needed there. Mowich Lake / SR-165 Fairfax Bridge closure text
-- on wa_liberty_cap_ptarmigan_ridge_finish matches the permanent April 2025 WSDOT
-- closure already documented elsewhere in this repo.
