-- Gear audit batch 3: 4 peaks verified via multi-source research
-- Expanded scope: guidebooks, guide services, manufacturers, media, forums, terrain, weather
-- All unroped scrambles; helmet and seasonal gear documented

update routes set
  gear = '["Waterproof boots","Gaiters","Helmet","Trekking poles"]'::jsonb,
  detailed_rack = 'ZERO TECHNICAL GEAR - unroped scramble',
  sling_rack = null,
  alpine_draws = null,
  rope_type = '',
  rope_length_m = null,
  rope_note = 'NO ROPE REQUIRED OR USED',
  ascender = '',
  corrections = 'NO ROPE GEAR REQUIRED - multiple sources (2022-2026) confirm unroped scramble model'
where id = 'bryant_peak_southeast_slopes';

update routes set
  gear = '["Helmet","Ice axe and crampons if snow present"]'::jsonb,
  detailed_rack = '',
  sling_rack = null,
  alpine_draws = null,
  rope_type = '',
  rope_length_m = null,
  rope_note = 'Unroped Class 3 scramble',
  ascender = '',
  corrections = 'Class 3 scramble without rope - no technical gear documented'
where id = 'buck_mountain_south_ridge';

update routes set
  gear = '["Ice axe","crampons/microspikes","helmet"]'::jsonb,
  detailed_rack = '',
  sling_rack = null,
  alpine_draws = null,
  rope_type = '',
  rope_length_m = null,
  rope_note = 'Unroped scramble; rope optional for snow/glacier',
  ascender = '',
  corrections = 'Primary scramble; rope not required for standard approach'
where id = 'wa_cashmere_mountain_west_ridge';

update routes set
  gear = '["helmet"]'::jsonb,
  detailed_rack = '',
  sling_rack = null,
  alpine_draws = null,
  rope_type = '',
  rope_length_m = null,
  rope_note = 'Unroped scramble',
  ascender = '',
  corrections = 'No technical climbing gear documented - unroped scramble'
where id = 'southwest_slopes';

