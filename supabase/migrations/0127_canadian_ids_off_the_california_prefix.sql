-- Canadian ids move off the `ca_` prefix, which in this catalog means CALIFORNIA.
--
-- 0126 filed every Canadian row under `ca_`, reading it as "Canada". It is not: ~14,000
-- Californian routes already own that prefix, so `id like 'ca_%'` — the reflex filter used
-- throughout scripts/ and by audit:identity — silently returned Bugaboo Spire and Mount Robson
-- as Californian. That is exactly the route-identity contamination CLAUDE.md documents, and it
-- caused a visible symptom immediately: audit:fifty-classics rejected all eleven Canadian
-- routes as cross-region collisions and reported 36 of 50 instead of 47.
--
-- The provinces take their own two-letter codes, matching the US convention and colliding with
-- no US state prefix: bc, ab, yt, nt. (`ab` is not Alabama — that is `al`.)
--
-- Done as delete-then-insert rather than an id UPDATE because areas.path is a materialized
-- ltree that areas_set_path does NOT cascade: renaming a parent id would leave every
-- descendant's path pointing at an id that no longer exists. These rows were inserted minutes
-- ago by 0126, nothing references them, and the delete is scoped to source =
-- 'fifty-classics-roster' so it cannot reach a Californian row that legitimately owns `ca_`.

begin;

delete from routes where source = 'fifty-classics-roster' and id like 'ca\_%';
delete from areas  where source = 'fifty-classics-roster' and id like 'ca\_%';

insert into areas (id, name, area_type, parent_id, region, source) values
  ('bc',      'British Columbia',      'state', 'canada', 'Canada', 'fifty-classics-roster'),
  ('ab', 'Alberta',               'state', 'canada', 'Canada', 'fifty-classics-roster'),
  ('yt',   'Yukon',                 'state', 'canada', 'Canada', 'fifty-classics-roster'),
  ('nt',     'Northwest Territories', 'state', 'canada', 'Canada', 'fifty-classics-roster')
on conflict (id) do nothing;

insert into areas (id, name, area_type, parent_id, region, source) values
  ('bc_purcells',        'Purcell Mountains',   'range', 'bc',      'British Columbia',      'fifty-classics-roster'),
  ('bc_selkirks',        'Selkirk Mountains',   'range', 'bc',      'British Columbia',      'fifty-classics-roster'),
  ('bc_coast',           'Coast Mountains',     'range', 'bc',      'British Columbia',      'fifty-classics-roster'),
  ('bc_cascades',        'Canadian Cascades',   'range', 'bc',      'British Columbia',      'fifty-classics-roster'),
  ('bc_rockies',         'Canadian Rockies',    'range', 'bc',      'British Columbia',      'fifty-classics-roster'),
  ('ab_rockies',    'Canadian Rockies',    'range', 'ab', 'Alberta',               'fifty-classics-roster'),
  ('yt_st_elias',     'Saint Elias Mountains','range','yt',   'Yukon',                 'fifty-classics-roster'),
  ('nt_mackenzies',     'Mackenzie Mountains', 'range', 'nt',     'Northwest Territories', 'fifty-classics-roster')
on conflict (id) do nothing;

insert into areas (id, name, area_type, parent_id, region, lat, lng, elevation_ft, source) values
  ('bc_bugaboo_spire',      'Bugaboo Spire',       'crag', 'bc_purcells',     'British Columbia',      50.74556, -116.78889, 10512, 'fifty-classics-roster'),
  ('bc_south_howser_tower', 'South Howser Tower',  'crag', 'bc_purcells',     'British Columbia',      50.72972, -116.81333, 10801, 'fifty-classics-roster'),
  ('bc_mount_sir_donald',   'Mount Sir Donald',    'crag', 'bc_selkirks',     'British Columbia',      51.26310, -117.43140, 10774, 'fifty-classics-roster'),
  ('bc_mount_waddington',   'Mount Waddington',    'crag', 'bc_coast',        'British Columbia',      51.37370, -125.26360, 13186, 'fifty-classics-roster'),
  ('bc_slesse_mountain',    'Slesse Mountain',     'crag', 'bc_cascades',     'British Columbia',      49.02561, -121.59192,  8002, 'fifty-classics-roster'),
  ('bc_mount_robson',       'Mount Robson',        'crag', 'bc_rockies',      'British Columbia',      53.11050, -119.15660, 12989, 'fifty-classics-roster'),
  ('ab_mount_edith_cavell', 'Mount Edith Cavell',  'crag', 'ab_rockies', 'Alberta',               52.66720, -118.05690, 11033, 'fifty-classics-roster'),
  ('ab_mount_alberta',      'Mount Alberta',       'crag', 'ab_rockies', 'Alberta',               52.28500, -117.47720, 11877, 'fifty-classics-roster'),
  ('ab_mount_temple',       'Mount Temple',        'crag', 'ab_rockies', 'Alberta',               51.35110, -116.20630, 11614, 'fifty-classics-roster'),
  ('yt_mount_logan',        'Mount Logan',         'crag', 'yt_st_elias',  'Yukon',                 60.56710, -140.40550, 19551, 'fifty-classics-roster'),
  ('nt_lotus_flower_tower', 'Lotus Flower Tower',  'crag', 'nt_mackenzies',  'Northwest Territories', 62.10167, -127.67083,  null, 'fifty-classics-roster')
on conflict (id) do nothing;

insert into routes (id, area_id, name, discipline, grade, alpine_grade, aid_grade, lists, classic, source, description) values
  ('bc_bugaboo_spire_east_ridge', 'bc_bugaboo_spire', 'East Ridge',
   'alpine', '5.7', 'III', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The classic moderate on Bugaboo Spire, taken at a friendly grade for the position it puts you in. Clean Purcell granite with a well-known gendarme pitch high on the ridge, reached from the Applebee camp above the Bugaboo Glacier.'),

  ('bc_south_howser_tower_west_buttress', 'bc_south_howser_tower', 'West Buttress',
   'alpine', '5.8 A2 or 5.10', 'V', 'A2', array['fifty_classics'], true, 'fifty-classics-roster',
   'The Beckey-Chouinard, and for many people the best long granite route in the range. Around two thousand feet of climbing on the far side of the Howsers, which means a committing approach over a col and a descent that is a serious part of the day.'),

  ('bc_mount_sir_donald_northwest_arete', 'bc_mount_sir_donald', 'Northwest Arete',
   'alpine', '5.2', 'III', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'A knife-cut arete of quartzite rising straight above Rogers Pass. The climbing is easy for its grade and almost absurdly continuous — the appeal is the line and the exposure rather than any single hard move.'),

  ('bc_mount_waddington_south_face', 'bc_mount_waddington', 'South Face',
   'alpine', '5.7', 'V', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The highest summit entirely within British Columbia, deep in the Coast Mountains and a long way from a road. The rock and ice of the summit tower are the technical part; getting to the mountain and waiting out its weather are the rest of it.'),

  ('bc_slesse_mountain_northeast_buttress', 'bc_slesse_mountain', 'Northeast Buttress',
   'alpine', '5.9 A2', 'V', 'A2', array['fifty_classics'], true, 'fifty-classics-roster',
   'A long, clean buttress on the shaded side of Slesse, close enough to the border that it is a familiar objective on both sides of it. Sustained moderate climbing at altitude-free elevation, with a descent that has caught out plenty of parties.'),

  ('bc_mount_robson_wishbone_arete', 'bc_mount_robson', 'Wishbone Arete',
   'alpine', '5.6', 'V', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The highest peak in the Canadian Rockies, and a mountain notorious for turning parties back on weather rather than difficulty. The Wishbone is a long ridge of loose rock, snow and ice; the grade says little about the commitment.'),

  ('ab_mount_edith_cavell_north_face', 'ab_mount_edith_cavell', 'North Face',
   'alpine', '5.7', 'IV', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'A striking face above the Angel Glacier outside Jasper, and one of the most photographed walls in the Rockies. Mixed ground on typically loose Rockies limestone, best in cold, settled conditions.'),

  ('ab_mount_alberta_japanese_route', 'ab_mount_alberta', 'Japanese Route',
   'alpine', '5.6', 'V', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The line of the 1925 Japanese first ascent, on a peak with a long-standing reputation as one of the hardest big summits in the Rockies to reach. Steep, loose limestone and a serious descent; the modest technical grade is not the measure of it.'),

  ('ab_mount_temple_east_ridge', 'ab_mount_temple', 'East Ridge',
   'alpine', '5.7', 'IV', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'A long ridge on the peak that towers over Moraine Lake, and a very different proposition from the walk-up tourist route on the other side. Rock quality varies from good to alarming, and the ridge is long enough that speed matters.'),

  ('yt_mount_logan_hummingbird_ridge', 'yt_mount_logan', 'Hummingbird Ridge',
   'mountaineering', null, null, null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The most serious line in the book by some distance. Climbed once, in 1965, and never repeated in its entirety: miles of corniced ridge on the biggest massif in Canada, with retreat effectively impossible once committed. It is here as a landmark of what was done, not as a route to go and do.'),

  ('nt_lotus_flower_tower_southeast_face', 'nt_lotus_flower_tower', 'Lotus Flower Tower',
   'alpine', '5.8 A2 or 5.10', 'V', 'A2', array['fifty_classics'], true, 'fifty-classics-roster',
   'The southeast buttress in the Cirque of the Unclimbables — around two thousand feet of splitter granite, with the upper pitches following cracks up a clean headwall. Reaching it means a flight, a lake, and a long walk into the Mackenzies, which is most of why it stays as good as it is.')
on conflict (id) do nothing;

commit;
