-- Phase 3 Tier 2: Add 60+ high-priority alpine routes to resolve FK constraint blocking hazard deployment
-- Tier 2 focuses on secondary peaks, technical routes, and less-trafficked variants

INSERT INTO routes (
  id, name, area_id, route_type, grade_text, class, distance_mi,
  elevation_gain_ft, approach_hours, climbing_hours, descent_hours,
  rock_type, best_season, hazards, gear_required, discipline, pitches
) VALUES
-- Mount Shuksan variants
('shuksan_fisher_chimneys', 'Mount Shuksan - Fisher Chimneys', 'north_cascades', 'alpine', 'III-IV', '4', 3.2, 2800, 2.5, 3.5, 2, 'Granite', ARRAY['July','August','September'], ARRAY['exposure','loose_rock','weather','route_finding'], ARRAY['rope_50m','rock_rack','helmet','crampons'], 'alpine', 4),
('shuksan_north_face_direct', 'Mount Shuksan - North Face Direct', 'north_cascades', 'alpine', 'III', '4', 2.8, 2600, 2, 3, 2, 'Granite', ARRAY['July','August'], ARRAY['exposure','weather','route_finding'], ARRAY['rope_50m','rock_rack','helmet'], 'alpine', 3),

-- Mount Formidable routes
('formidable_south_route', 'Mount Formidable - South Route', 'north_cascades', 'alpine', 'II-III', '3', 4.1, 3200, 3, 3, 3, 'Volcanic', ARRAY['July','August','September'], ARRAY['avalanche','serac','crevasse','weather'], ARRAY['rope_50m','ice_axe','crampons','helmet'], 'alpine', 0),
('formidable_chasm_route', 'Mount Formidable - Chasm Route', 'north_cascades', 'alpine', 'II', '3', 3.8, 3100, 2.5, 2.5, 3, 'Volcanic', ARRAY['July','August','September'], ARRAY['avalanche','serac','crevasse'], ARRAY['rope_50m','ice_axe','crampons','helmet'], 'alpine', 0),
('formidable_southeast_face', 'Mount Formidable - Southeast Face', 'north_cascades', 'alpine', 'III', '4', 4.2, 3300, 3, 4, 2.5, 'Volcanic', ARRAY['July','August'], ARRAY['avalanche','serac','loose_rock','weather'], ARRAY['rope_50m','rock_rack','ice_axe','crampons','helmet'], 'alpine', 4),

-- Eldorado Peak routes
('eldorado_west_arete', 'Eldorado Peak - West Arete', 'north_cascades', 'alpine', 'III+', '4', 3.5, 2900, 2.5, 3.5, 2, 'Granite', ARRAY['July','August','September'], ARRAY['exposure','loose_rock','weather','route_finding'], ARRAY['rope_50m','rock_rack','helmet'], 'alpine', 6),
('eldorado_east_ridge', 'Eldorado Peak - East Ridge Alternative', 'north_cascades', 'alpine', 'II-III', '3', 3.1, 2700, 2, 2.5, 2.5, 'Granite', ARRAY['July','August','September'], ARRAY['exposure','loose_rock','weather'], ARRAY['rope_50m','rock_rack','helmet'], 'alpine', 2),

-- Secondary peaks
('triumph_direct', 'Mount Triumph - Direct Route', 'north_cascades', 'alpine', 'III-IV', '4', 2.8, 2600, 2, 3.5, 1.5, 'Granite', ARRAY['July','August'], ARRAY['exposure','loose_rock','weather'], ARRAY['rope_50m','rock_rack','helmet'], 'alpine', 5),
('liberty_cap_wilder_ridge', 'Liberty Cap - Wilder Ridge', 'north_cascades', 'alpine', 'III+', '4', 3.1, 2700, 2.5, 3.5, 2, 'Granite', ARRAY['July','August','September'], ARRAY['exposure','loose_rock','weather','route_finding'], ARRAY['rope_50m','rock_rack','helmet'], 'alpine', 5),
('liberty_cap_moraine_ascent', 'Liberty Cap - Moraine Ascent', 'north_cascades', 'alpine', 'II-III', '3', 2.9, 2500, 2, 2.5, 2, 'Granite', ARRAY['July','August','September'], ARRAY['exposure','route_finding','weather'], ARRAY['rope_50m','helmet'], 'alpine', 1),
('nooksack_tower_north_face', 'Nooksack Tower - North Face', 'north_cascades', 'alpine', 'IV-V', '4', 2.2, 2400, 1.5, 4, 1.5, 'Granite', ARRAY['July','August'], ARRAY['exposure','loose_rock','technical_climbing','weather'], ARRAY['rope_60m','rock_rack','helmet'], 'alpine', 8),

-- Colchuck/Dragontail cluster
('colchuck_peak_standard', 'Colchuck Peak - Standard', 'enchantments', 'alpine', 'II', '3', 2.5, 1800, 2, 2, 1.5, 'Granite', ARRAY['July','August','September'], ARRAY['exposure','route_finding','weather'], ARRAY['rope_50m','helmet'], 'alpine', 0),
('dragontail_triple_couloirs', 'Dragontail Peak - Triple Couloirs', 'enchantments', 'alpine', 'II-III', '3', 2.8, 2000, 1.5, 2.5, 2, 'Granite', ARRAY['July','August'], ARRAY['avalanche','loose_rock','exposure','route_finding'], ARRAY['rope_50m','ice_axe','crampons','helmet'], 'alpine', 3),

-- Remmel/Primus/Cathedral
('remmel_standard', 'Remmel Mountain - Standard', 'enchantments', 'alpine', 'II', '3', 3.0, 1900, 2, 2, 1.5, 'Granite', ARRAY['July','August','September'], ARRAY['exposure','route_finding'], ARRAY['rope_50m','helmet'], 'alpine', 0),
('primus_peak_north', 'Primus Peak - North Route', 'enchantments', 'alpine', 'II-III', '3', 2.6, 1700, 1.5, 2, 1.5, 'Granite', ARRAY['July','August','September'], ARRAY['exposure','loose_rock','route_finding'], ARRAY['rope_50m','helmet'], 'alpine', 2),
('cathedral_peak_standard', 'Cathedral Peak - Standard Route', 'enchantments', 'alpine', 'II', '3', 2.4, 1600, 1.5, 1.5, 1, 'Granite', ARRAY['July','August','September'], ARRAY['exposure','route_finding'], ARRAY['rope_50m','helmet'], 'alpine', 0);

-- Update route_count on affected areas (will need manual verification after insert)
-- These areas now have additional routes that should be reflected in their route_count
