-- WA alpine audit batch 231 (pass 4)
-- wa_south_twin_sister_north_ridge: dist_km stored as 33.8 km, implying ~42 mi round
-- trip under the app's dist_km*2 convention. The row's own waypoint chain (trailhead
-- distMi 0 -> South Twin Sister summit distMi 9.5) gives 9.5 mi = 15.29 km one-way,
-- less than half the stored value. No external source specific to this variant route
-- was found to corroborate either figure, but the row's own waypoint chain is the
-- more granular, purpose-built value (same precedent as batch 218's Mount Stuart West
-- Ridge and Mount Terror North Face fixes). Corrected to match.
UPDATE routes SET dist_km = 15.3 WHERE id = 'wa_south_twin_sister_north_ridge';

-- wa_south_twin_sister_scramble: dist_km stored as 10.05 km, but the row's own summit
-- waypoint carries "distFrom": "track" (i.e. derived from an actual GPS track) giving
-- distMi 7.45 = 11.99 km one-way -- about 16% higher than the stored scalar. The
-- route's own overview/approach text says the approach is "Identical to the West
-- Ridge approach" up to the basin, and the sibling West Ridge route's dist_km (20.1
-- km) already agrees closely with ITS OWN waypoint chain (12 mi = 19.3 km), so there
-- is no reason this route's approach should be roughly half that distance. Corrected
-- to match the row's own track-derived waypoint mileage.
UPDATE routes SET dist_km = 12.0 WHERE id = 'wa_south_twin_sister_scramble';

-- wa_southeast_ridge_se_corner (Mount Shuksan, Southeast Ridge / SE Corner):
-- pitch_detail's final entry (pitch "P4-6") states the climbing "stays at or below
-- 5.3 throughout" -- but this directly contradicts the row's OWN rock_grade field
-- ("5.3 (guide services describe two steps at 5.6/5.7)") and its own beta field
-- ("Grade 5.3-5.7 ... Class 4 downclimbing"). External sources confirm the real
-- variance: a Mountaineers.org route description says a *selective* line can be kept
-- at/below 5.3-5.4, while another independent source describes "alpine rock pitches
-- ranging from 5.3-5.7, with intermittent 5th class scrambling, with two unavoidable
-- steps (5.6 & 5.7) that must be climbed." pitch_detail's flat, unqualified "stays at
-- or below 5.3" claim is the one internally-inconsistent value on this row; corrected
-- to acknowledge the same variance the row already states elsewhere. Top-level grade
-- (5.3) and rock_grade are left as-is -- they already reflect this honestly.
UPDATE routes
SET pitch_detail = jsonb_set(
  jsonb_set(
    pitch_detail,
    '{1,notes}',
    '"Low 5th class moves on quality rock to the summit -- a selective, careful line can often be kept at or below 5.3-5.4, but some guide services and less-selective lines report two short steps up to 5.6/5.7."'::jsonb
  ),
  '{1,grade}',
  '"5.0-5.7"'::jsonb
)
WHERE id = 'wa_southeast_ridge_se_corner';
