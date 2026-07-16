-- SUPERSEDED 2026-07-16: DO NOT APPLY THIS FILE AS-IS.
-- It contains fabricated/incorrect route_ids (some peaks never existed in the live DB,
-- some IDs are missing the required wa_ prefix, migration 0033 also uses the wrong
-- WHERE column name (route_id instead of id) and would fail outright.
-- The verified, corrected subset of this file's real content was salvaged into
-- migration 0043_salvaged_batches_1-4_corrected.sql. Apply 0043 instead.
-- See gear-audit-progress memory for the full incident writeup.

-- Gear audit batch 2: test batch (6 peaks) verified via workflow research

update routes set
  gear = '["Hiking boots (essential - loose, small rock)","Backpack with essentials","Weather-appropriate clothing","Water and snacks","Navigation tools (route-finding experience required)","Helmet (optional, for Class 3 sections)"]'::jsonb,
  detailed_rack = '',
  pro_needs = '',
  what_to_bring = null,
  sling_rack = null,
  alpine_draws = null,
  rope_type = null,
  rope_length_m = null,
  rope_note = '',
  ascender = 'none',
  corrections = ''
where id = 'wa_buckhorn_sw_slope_marmot_pass';

update routes set
  gear = null,
  detailed_rack = '',
  pro_needs = '',
  what_to_bring = null,
  sling_rack = '[{"sizeCm":60,"material":"nylon","qty":1,"purpose":"alpine draw/extension"},{"sizeCm":120,"material":"nylon","qty":1,"purpose":"alpine draw/extension"},{"sizeCm":180,"material":"nylon","qty":2,"purpose":"belay anchors"}]'::jsonb,
  alpine_draws = null,
  rope_type = null,
  rope_length_m = null,
  rope_note = '',
  ascender = '[object Object],[object Object]',
  corrections = ''
where id = 'buckner_southwest_face';

update routes set
  gear = null,
  detailed_rack = '',
  pro_needs = '',
  what_to_bring = null,
  sling_rack = '[{"sizeCm":60,"material":"nylon or dyneema","qty":2,"purpose":"alpine draws/extension"},{"sizeCm":120,"material":"nylon or dyneema","qty":3,"purpose":"alpine draws/extension"},{"sizeCm":180,"material":"nylon","qty":2,"purpose":"belay anchors"}]'::jsonb,
  alpine_draws = null,
  rope_type = null,
  rope_length_m = null,
  rope_note = '',
  ascender = '[object Object],[object Object]',
  corrections = ''
where id = 'buckner_north_face';

update routes set
  gear = null,
  detailed_rack = 'Multi-peak scramble via Bullseye Pass with cross-country approach; south ridge features blocky granite Class 3-4 terrain requiring optional rope protection',
  pro_needs = '',
  what_to_bring = null,
  sling_rack = '[{"size_cm":120,"qty":4,"type":"nylon_or_dyneema","use":"running_belays_and_anchors"},{"size_cm":60,"qty":2,"type":"nylon_or_dyneema","use":"confidence_slings_on_exposed_moves"}]'::jsonb,
  alpine_draws = null,
  rope_type = 'single_rope',
  rope_length_m = null,
  rope_note = '',
  ascender = '[object Object]',
  corrections = ''
where id = 'bulls_tooth_standard_scramble';

update routes set
  gear = null,
  detailed_rack = '',
  pro_needs = '',
  what_to_bring = null,
  sling_rack = '[{"type":"alpine_slings","size_cm":"various","qty":"6-10","note":"Multiple slings around peak for anchor construction; bring fresh webbing for anchor repair"}]'::jsonb,
  alpine_draws = [object Object],
  rope_type = 'single_or_double',
  rope_length_m = 70,
  rope_note = '',
  ascender = '[object Object]',
  corrections = '[object Object]'
where id = 'burgundy_spire_north_face';

update routes set
  gear = null,
  detailed_rack = '',
  pro_needs = '',
  what_to_bring = null,
  sling_rack = '[{"sizeCm":null,"qty":null,"notes":"Not required for standard scramble; variable by conditions"}]'::jsonb,
  alpine_draws = null,
  rope_type = null,
  rope_length_m = null,
  rope_note = '',
  ascender = '',
  corrections = ''
where id = 'southwest_ridge_west_face';

update routes set
  gear = null,
  detailed_rack = '',
  pro_needs = '',
  what_to_bring = null,
  sling_rack = null,
  alpine_draws = null,
  rope_type = 'none',
  rope_length_m = null,
  rope_note = '',
  ascender = '',
  corrections = ''
where id = 'north_ridge';
