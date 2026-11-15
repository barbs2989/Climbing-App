-- WA alpine audit, batch 553 (closes pass 8, opens pass 9)

-- wa_action_potential (Burgundy Spire, East Face, Washington Pass): high_point_ft is stored
-- as 8492, but the route's own "Burgundy Spire Summit" waypoint already carries elev: 8483,
-- and the areas table's own elevation_ft for wa_burgundy_spire is also 8483 -- matching Lemke
-- Climbs' figure for the peak (8,483 ft / 2,586 m). high_point_ft was the one field left on a
-- different number than the row's own waypoint and the parent area record. Fixing it to match
-- what the rest of the row (and the area) already say.
UPDATE routes SET high_point_ft = 8483 WHERE id = 'wa_action_potential';

-- areas.wa_agnes_mountain (Agnes Mountain, Chelan County / Agnes Creek, North Cascades):
-- elevation_ft is stored as 8131, but the area's own route wa_agnes_mountain_south_ridge
-- carries an "Agnes Mountain summit" waypoint at the identical coordinates (48.3176, -120.9685)
-- with elev: 8119 -- and Wikipedia's figure for the peak (NAVD88) is also 8,119 ft. The area
-- row was the one field disagreeing with its own route's summit waypoint. Fixing it to match.
UPDATE areas SET elevation_ft = 8119 WHERE id = 'wa_agnes_mountain';
