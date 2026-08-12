-- Canada, and the eleven Canadian entries from Steck & Roper's Fifty Classic Climbs.
--
-- The catalog had exactly one root, `usa`, so none of these existed: not the routes, not the
-- peaks, not the country. This adds the tree down to each formation and the one route per
-- formation that the book lists.
--
-- REACHABILITY WAS PART OF THIS CHANGE, NOT AN AFTERTHOUGHT. lib/db.js `useStates()` read
-- `parent_id = 'usa'`, so a province added here would have been loaded, counted and
-- searchable while being completely unreachable from the area browser — data with no reader.
-- That query now resolves the roots instead of naming one, and the breadcrumb drops the
-- leading path label rather than filtering the literal "usa". Both shipped alongside this
-- file; running this migration without them would hide everything it inserts.
--
-- Devils Thumb is deliberately NOT here. It straddles the Alaska-British Columbia border and
-- is approached from Petersburg, Alaska. The catalog ALREADY holds it that way, with three
-- routes including the East Ridge the book lists, so it needs no row here at all — only a
-- correction to the roster's region, which had it as British Columbia and so rejected its
-- own correct match as a cross-region collision.
--
-- ON GRADES. Every route below except Mount Logan's carries the grade the Fifty Classics list
-- publishes. Hummingbird Ridge has none there — it is an expedition line, climbed once, in
-- 1965 — so `grade` is left NULL rather than invented, per the CLAUDE.md rule that `grade` is
-- a GRADE and the app's own preference for stating what it does not know (check:bare).
--
-- Elevations and coordinates are from each peak's own record; `path` and `route_count` are
-- maintained by triggers (areas_set_path, and the routes trigger that rolls counts upward), so
-- neither is written here.
--
-- The leaf-XOR-parent invariant holds throughout: every area that gains a child below holds no
-- routes of its own, and only the leaf formations receive routes.

begin;

insert into areas (id, name, area_type, parent_id, region, source, blurb) values
  ('canada', 'Canada', 'country', null, 'North America', 'fifty-classics-roster',
   'The Canadian ranges — the Rockies, the Purcells and Selkirks, the Coast Mountains, and the big glaciated peaks of the Yukon and the Northwest Territories.')
on conflict (id) do nothing;

insert into areas (id, name, area_type, parent_id, region, source) values
  ('ca_bc',      'British Columbia',      'state', 'canada', 'Canada', 'fifty-classics-roster'),
  ('ca_alberta', 'Alberta',               'state', 'canada', 'Canada', 'fifty-classics-roster'),
  ('ca_yukon',   'Yukon',                 'state', 'canada', 'Canada', 'fifty-classics-roster'),
  ('ca_nwt',     'Northwest Territories', 'state', 'canada', 'Canada', 'fifty-classics-roster')
on conflict (id) do nothing;

insert into areas (id, name, area_type, parent_id, region, source) values
  ('ca_bc_purcells',        'Purcell Mountains',   'range', 'ca_bc',      'British Columbia',      'fifty-classics-roster'),
  ('ca_bc_selkirks',        'Selkirk Mountains',   'range', 'ca_bc',      'British Columbia',      'fifty-classics-roster'),
  ('ca_bc_coast',           'Coast Mountains',     'range', 'ca_bc',      'British Columbia',      'fifty-classics-roster'),
  ('ca_bc_cascades',        'Canadian Cascades',   'range', 'ca_bc',      'British Columbia',      'fifty-classics-roster'),
  ('ca_bc_rockies',         'Canadian Rockies',    'range', 'ca_bc',      'British Columbia',      'fifty-classics-roster'),
  ('ca_alberta_rockies',    'Canadian Rockies',    'range', 'ca_alberta', 'Alberta',               'fifty-classics-roster'),
  ('ca_yukon_st_elias',     'Saint Elias Mountains','range','ca_yukon',   'Yukon',                 'fifty-classics-roster'),
  ('ca_nwt_mackenzies',     'Mackenzie Mountains', 'range', 'ca_nwt',     'Northwest Territories', 'fifty-classics-roster')
on conflict (id) do nothing;

insert into areas (id, name, area_type, parent_id, region, lat, lng, elevation_ft, source) values
  ('ca_bugaboo_spire',      'Bugaboo Spire',       'crag', 'ca_bc_purcells',     'British Columbia',      50.74556, -116.78889, 10512, 'fifty-classics-roster'),
  ('ca_south_howser_tower', 'South Howser Tower',  'crag', 'ca_bc_purcells',     'British Columbia',      50.72972, -116.81333, 10801, 'fifty-classics-roster'),
  ('ca_mount_sir_donald',   'Mount Sir Donald',    'crag', 'ca_bc_selkirks',     'British Columbia',      51.26310, -117.43140, 10774, 'fifty-classics-roster'),
  ('ca_mount_waddington',   'Mount Waddington',    'crag', 'ca_bc_coast',        'British Columbia',      51.37370, -125.26360, 13186, 'fifty-classics-roster'),
  ('ca_slesse_mountain',    'Slesse Mountain',     'crag', 'ca_bc_cascades',     'British Columbia',      49.02561, -121.59192,  8002, 'fifty-classics-roster'),
  ('ca_mount_robson',       'Mount Robson',        'crag', 'ca_bc_rockies',      'British Columbia',      53.11050, -119.15660, 12989, 'fifty-classics-roster'),
  ('ca_mount_edith_cavell', 'Mount Edith Cavell',  'crag', 'ca_alberta_rockies', 'Alberta',               52.66720, -118.05690, 11033, 'fifty-classics-roster'),
  ('ca_mount_alberta',      'Mount Alberta',       'crag', 'ca_alberta_rockies', 'Alberta',               52.28500, -117.47720, 11877, 'fifty-classics-roster'),
  ('ca_mount_temple',       'Mount Temple',        'crag', 'ca_alberta_rockies', 'Alberta',               51.35110, -116.20630, 11614, 'fifty-classics-roster'),
  ('ca_mount_logan',        'Mount Logan',         'crag', 'ca_yukon_st_elias',  'Yukon',                 60.56710, -140.40550, 19551, 'fifty-classics-roster'),
  ('ca_lotus_flower_tower', 'Lotus Flower Tower',  'crag', 'ca_nwt_mackenzies',  'Northwest Territories', 62.10167, -127.67083,  null, 'fifty-classics-roster')
on conflict (id) do nothing;

insert into routes (id, area_id, name, discipline, grade, alpine_grade, aid_grade, lists, classic, source, description) values
  ('ca_bugaboo_spire_east_ridge', 'ca_bugaboo_spire', 'East Ridge',
   'alpine', '5.7', 'III', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The classic moderate on Bugaboo Spire, taken at a friendly grade for the position it puts you in. Clean Purcell granite with a well-known gendarme pitch high on the ridge, reached from the Applebee camp above the Bugaboo Glacier.'),

  ('ca_south_howser_tower_west_buttress', 'ca_south_howser_tower', 'West Buttress',
   'alpine', '5.8 A2 or 5.10', 'V', 'A2', array['fifty_classics'], true, 'fifty-classics-roster',
   'The Beckey-Chouinard, and for many people the best long granite route in the range. Around two thousand feet of climbing on the far side of the Howsers, which means a committing approach over a col and a descent that is a serious part of the day.'),

  ('ca_mount_sir_donald_northwest_arete', 'ca_mount_sir_donald', 'Northwest Arete',
   'alpine', '5.2', 'III', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'A knife-cut arete of quartzite rising straight above Rogers Pass. The climbing is easy for its grade and almost absurdly continuous — the appeal is the line and the exposure rather than any single hard move.'),

  ('ca_mount_waddington_south_face', 'ca_mount_waddington', 'South Face',
   'alpine', '5.7', 'V', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The highest summit entirely within British Columbia, deep in the Coast Mountains and a long way from a road. The rock and ice of the summit tower are the technical part; getting to the mountain and waiting out its weather are the rest of it.'),

  ('ca_slesse_mountain_northeast_buttress', 'ca_slesse_mountain', 'Northeast Buttress',
   'alpine', '5.9 A2', 'V', 'A2', array['fifty_classics'], true, 'fifty-classics-roster',
   'A long, clean buttress on the shaded side of Slesse, close enough to the border that it is a familiar objective on both sides of it. Sustained moderate climbing at altitude-free elevation, with a descent that has caught out plenty of parties.'),

  ('ca_mount_robson_wishbone_arete', 'ca_mount_robson', 'Wishbone Arete',
   'alpine', '5.6', 'V', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The highest peak in the Canadian Rockies, and a mountain notorious for turning parties back on weather rather than difficulty. The Wishbone is a long ridge of loose rock, snow and ice; the grade says little about the commitment.'),

  ('ca_mount_edith_cavell_north_face', 'ca_mount_edith_cavell', 'North Face',
   'alpine', '5.7', 'IV', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'A striking face above the Angel Glacier outside Jasper, and one of the most photographed walls in the Rockies. Mixed ground on typically loose Rockies limestone, best in cold, settled conditions.'),

  ('ca_mount_alberta_japanese_route', 'ca_mount_alberta', 'Japanese Route',
   'alpine', '5.6', 'V', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The line of the 1925 Japanese first ascent, on a peak with a long-standing reputation as one of the hardest big summits in the Rockies to reach. Steep, loose limestone and a serious descent; the modest technical grade is not the measure of it.'),

  ('ca_mount_temple_east_ridge', 'ca_mount_temple', 'East Ridge',
   'alpine', '5.7', 'IV', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'A long ridge on the peak that towers over Moraine Lake, and a very different proposition from the walk-up tourist route on the other side. Rock quality varies from good to alarming, and the ridge is long enough that speed matters.'),

  ('ca_mount_logan_hummingbird_ridge', 'ca_mount_logan', 'Hummingbird Ridge',
   'mountaineering', null, null, null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The most serious line in the book by some distance. Climbed once, in 1965, and never repeated in its entirety: miles of corniced ridge on the biggest massif in Canada, with retreat effectively impossible once committed. It is here as a landmark of what was done, not as a route to go and do.'),

  ('ca_lotus_flower_tower_southeast_face', 'ca_lotus_flower_tower', 'Lotus Flower Tower',
   'alpine', '5.8 A2 or 5.10', 'V', 'A2', array['fifty_classics'], true, 'fifty-classics-roster',
   'The southeast buttress in the Cirque of the Unclimbables — around two thousand feet of splitter granite, with the upper pitches following cracks up a clean headwall. Reaching it means a flight, a lake, and a long walk into the Mackenzies, which is most of why it stays as good as it is.')
on conflict (id) do nothing;

commit;
