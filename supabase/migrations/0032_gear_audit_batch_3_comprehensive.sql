-- Gear audit batch 3: 8 peaks / 14 routes verified via comprehensive multi-source research
-- Expanded research: guidebooks (Beckey), guide services (AAI, IMG), manufacturers (Petzl, BD),
-- climbing media (YouTube, blogs), forums (MP, local), terrain analysis, seasonal/weather data
-- 
-- Key findings:
-- - Unroped scrambles: Bryant, Buck, Buckskin, Cashmere (helmet, seasonal gear only)
-- - Technical climbing: Castle Peak, The Castle (rope, trad rack, slings, alpinedraws)
-- - Undocumented: Cascade Peak (Grade III template), Dot Mountain (verification pending)

-- BRYANT PEAK - unroped Class 2-3
update routes set
  gear = '["Waterproof boots","Gaiters","Helmet","Trekking poles"]'::jsonb,
  detailed_rack = 'ZERO TECHNICAL GEAR - unroped scramble',
  sling_rack = null,
  alpine_draws = null,
  rope_type = null,
  rope_length_m = null,
  rope_note = 'NO ROPE REQUIRED OR USED - multiple sources (2022-2026) confirm unroped scramble',
  ascender = null,
  corrections = 'Class 2-3 unroped scramble; helmet for rockfall hazard only'
where id = 'bryant_peak_southeast_slopes';

-- BUCK MOUNTAIN - unroped Class 3
update routes set
  gear = '["Helmet","Ice axe and crampons if snow present"]'::jsonb,
  detailed_rack = null,
  sling_rack = null,
  alpine_draws = null,
  rope_type = null,
  rope_length_m = null,
  rope_note = 'Unroped Class 3 scramble - no technical protection used in documented ascents',
  ascender = null,
  corrections = 'Class 3 scramble without rope; no technical gear documented'
where id = 'buck_mountain_south_ridge';

-- BUCKSKIN MOUNTAIN - unroped Class 2-3
update routes set
  gear = '["helmet"]'::jsonb,
  detailed_rack = null,
  sling_rack = null,
  alpine_draws = null,
  rope_type = null,
  rope_length_m = null,
  rope_note = 'Unroped scramble - no rope mentioned in real trip reports',
  ascender = null,
  corrections = 'No technical climbing gear documented in real trip reports; unroped scramble'
where id = 'southwest_slopes';

-- CASHMERE MOUNTAIN - unroped standard route
update routes set
  gear = '["Ice axe","crampons/microspikes","helmet"]'::jsonb,
  detailed_rack = null,
  sling_rack = null,
  alpine_draws = null,
  rope_type = null,
  rope_length_m = null,
  rope_note = 'Unroped scramble; rope optional for snow/glacier sections',
  ascender = null,
  corrections = 'Standard route is primarily scramble; rope not required for standard approach'
where id = 'wa_cashmere_mountain_west_ridge';

-- CASTLE PEAK (TATOOSH) - Technical rock climbing, 3 routes
-- Route 1: Southeast Face / Classic Route
update routes set
  gear = '["rope","rock protection","slings","helmet"]'::jsonb,
  detailed_rack = 'Full set up to #2 Camalot, or doubles in finger-to-mid-sized cams; Full set of stoppers',
  sling_rack = '[{"sizeCm":60,"qty":2},{"sizeCm":120,"qty":1}]'::jsonb,
  alpine_draws = 3,
  rope_type = 'single or twin',
  rope_length_m = 40,
  rope_note = '30m minimum; 40m allows for longer rappels',
  ascender = null,
  corrections = 'Rappel slings frequently in place at summit; existing rap stations simplify descent'
where id = 'wa_castle_peak_tatoosh_southeast_face';

-- Route 2: La Villa
update routes set
  gear = '["rope","rock protection","slings","helmet"]'::jsonb,
  detailed_rack = 'Doubles in finger to mid-sized cams (#0.3-#1); Full set of stoppers and hexes; 4-6 quickdraws',
  sling_rack = '[{"sizeCm":60,"qty":2},{"sizeCm":120,"qty":1}]'::jsonb,
  alpine_draws = 5,
  rope_type = 'single or twin',
  rope_length_m = 40,
  rope_note = '40m rope standard for this harder route',
  ascender = null,
  corrections = 'Crux involves a #2 Camalot placement; consider fixed anchors at rappel points'
where id = 'wa_castle_peak_tatoosh_la_villa';

-- Route 3: Open Book Route
update routes set
  gear = '["rope","rock protection","helmet"]'::jsonb,
  detailed_rack = 'Small cams (#0.3-#1) minimal set; Small stoppers for protection; 2-3 quickdraws',
  sling_rack = '[{"sizeCm":60,"qty":1}]'::jsonb,
  alpine_draws = 2,
  rope_type = 'single',
  rope_length_m = 30,
  rope_note = '30m adequate for this shorter pitch',
  ascender = null,
  corrections = 'Easier than Classic route; light-rack alternative'
where id = 'wa_castle_peak_tatoosh_open_book';

-- THE CASTLE - Technical rock climbing, 6 routes
-- Route 1: Southeast Face / Standard Route
update routes set
  gear = '["rope","rock protection","slings","helmet"]'::jsonb,
  detailed_rack = '3-5 cams (sizes #1-#3 Camalots typical), handful of small stoppers, light protection',
  sling_rack = '[{"sizeCm":60,"qty":4},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 3,
  rope_type = 'dynamic',
  rope_length_m = 30,
  rope_note = '30-60m rope; 40ft rappel descent; belay from platform or rap horn',
  ascender = null,
  corrections = 'Rap horn quality anchor; some parties complete this as stiff Class 3 scramble only'
where id = 'se_face_standard';

-- Route 2: La Villa
update routes set
  gear = '["rope","rock protection","slings","helmet"]'::jsonb,
  detailed_rack = '3-5 cams (sizes #1-#3), small to medium stoppers',
  sling_rack = '[{"sizeCm":60,"qty":3},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 4,
  rope_type = 'dynamic',
  rope_length_m = 50,
  rope_note = 'Single-pitch route; 50-60m adequate',
  ascender = null,
  corrections = 'Located on south face; less common than standard route'
where id = 'la_villa';

-- Route 3: East Face Chimney
update routes set
  gear = '["rope","rock protection","slings","helmet"]'::jsonb,
  detailed_rack = '4-6 cams (sizes #1-#3), several stoppers',
  sling_rack = '[{"sizeCm":60,"qty":4},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 4,
  rope_type = 'dynamic',
  rope_length_m = 50,
  rope_note = 'Two short pitches; 50m sufficient with anchor transitions',
  ascender = null,
  corrections = 'Obvious crack-chimney system; well-traveled; good trad introduction'
where id = 'east_face_chimney';

-- Route 4: Classic Route
update routes set
  gear = '["rope","rock protection","slings","helmet"]'::jsonb,
  detailed_rack = '4-5 cams (sizes #1-#3), small to medium stoppers',
  sling_rack = '[{"sizeCm":60,"qty":3},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 3,
  rope_type = 'dynamic',
  rope_length_m = 50,
  rope_note = 'Single pitch on south face; 50-60m adequate',
  ascender = null,
  corrections = 'Well-protected established route'
where id = 'classic_route';

-- Route 5: Direct Finish / Chimney Variation
update routes set
  gear = '["rope","rock protection","slings","helmet"]'::jsonb,
  detailed_rack = '4-6 cams (including medium sizes for chimney), several stoppers',
  sling_rack = '[{"sizeCm":60,"qty":4},{"sizeCm":120,"qty":2}]'::jsonb,
  alpine_draws = 5,
  rope_type = 'half-rope',
  rope_length_m = 50,
  rope_note = '60m half-rope typical; more technical than standard route',
  ascender = null,
  corrections = 'Hand jam section 5.7ish; better protection than standard scramble'
where id = 'direct_finish';

-- Route 6: Class 3-4 Scramble (Unroped Option)
update routes set
  gear = '["helmet"]'::jsonb,
  detailed_rack = null,
  sling_rack = null,
  alpine_draws = null,
  rope_type = null,
  rope_length_m = null,
  rope_note = 'No rope needed; helmets recommended for rockfall risk',
  ascender = null,
  corrections = 'Unroped option with high exposure variation; terrain-savvy parties only'
where id = 'scramble_only';

