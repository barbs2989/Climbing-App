-- The five Alaska entries from Steck & Roper's Fifty Classic Climbs of North America.
--
-- After PR #804 fixed the audit's matcher (it had been reporting routes absent that were
-- sitting in the catalog under a parent formation), `npm run audit:fifty-classics` reports
-- these five as genuinely missing. Four of the peaks already exist as leaf areas and simply
-- hold no route for the line the book lists; the fifth, Mount Saint Elias, has no area at all.
--
-- Checked before writing, per CLAUDE.md — a duplicate flag is a hypothesis until both sides
-- are confirmed: none of the five route ids exist, `ak_mount_saint_elias` does not exist, and
-- the only route already on any of these peaks is "The Tooth Obsession" on Moose's Tooth,
-- which is a different climb.
--
-- ON GRADES. Only two of the five carry a published technical grade. The other three are
-- expedition mountaineering routes, rated by commitment and conditions rather than by YDS,
-- and the Fifty Classics list itself prints no grade for them. `grade` is therefore left NULL
-- rather than invented. That is the honest rendering and the app is built for it: check:bare
-- asserts that a route with no enrichment states what it does not know, instead of implying
-- precision it does not have. See also the CLAUDE.md rule that `grade` is a GRADE — a
-- qualifier or an explanation belongs in prose, never in that column.
--
-- `path` and `route_count` are both maintained by triggers (areas_set_path, and the routes
-- trigger that rolls counts up the tree), so neither is written here.

begin;

-- Parent is the St. Elias Range region, which holds no routes of its own, so the
-- areas_leaf_xor trigger permits a child underneath it.
insert into areas (id, name, area_type, parent_id, region, lat, lng, elevation_ft, source, blurb)
values (
  'ak_mount_saint_elias', 'Mount Saint Elias', 'crag', 'ak_st_elias_range', 'Alaska',
  60.29222, -140.93139, 18008, 'fifty-classics-roster',
  'A huge, heavily glaciated peak on the Alaska-Yukon border and one of the biggest vertical rises on earth, going from tidewater to over 18,000 ft in about ten miles. Objectively serious rather than technically hard, and climbed only rarely.'
)
on conflict (id) do nothing;

insert into routes (id, area_id, name, discipline, grade, alpine_grade, lists, classic, source, description)
values
  ('ak_mount_saint_elias_abruzzi_ridge', 'ak_mount_saint_elias', 'Abruzzi Ridge',
   'mountaineering', null, null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The line of the 1897 first ascent of the peak, led by Luigi Amedeo, Duke of the Abruzzi. It is in the book as a piece of mountaineering history rather than as a route in condition: the approach beneath the northeast face is exposed to icefall, and glacial recession has made the access harder than it was, so repeats are very rare.'),

  ('ak_mount_fairweather_carpe_ridge', 'ak_mount_fairweather', 'Carpé Ridge',
   'mountaineering', null, null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The standard line on Fairweather and the route of its first ascent. A long glaciated ridge climb on a peak that stands almost straight up out of the Gulf of Alaska, which is what makes the weather here as bad as the name is optimistic. Committing, remote, and rarely dry.'),

  ('ak_moose_s_tooth_west_ridge', 'ak_moose_s_tooth', 'West Ridge',
   'alpine', null, null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The original line to the summit of the Moose''s Tooth, above the Ruth Gorge. A long ridge of snow, ice and rock rather than a single technical crux, and much less travelled than the steep couloirs on the south face that draw most parties to this peak now.'),

  ('ak_mt_huntington_west_face', 'ak_mt_huntington', 'West Face',
   'alpine', '5.9 A2', null, array['fifty_classics'], true, 'fifty-classics-roster',
   'The Harvard Route, put up in 1965. Steep mixed ground on one of the most striking peaks in the Alaska Range, with sustained climbing and no easy way off — the descent is as much of the undertaking as the ascent.'),

  ('ak_middle_triple_peak_east_buttress', 'ak_middle_triple_peak', 'East Buttress',
   'alpine', '5.9 A3', 'VI', array['fifty_classics'], true, 'fifty-classics-roster',
   'A big-wall line in the Kichatna Spires, a granite range whose weather keeps it far quieter than the Ruth. Grade VI, with aid climbing on a wall a long way from anywhere.')
on conflict (id) do nothing;

commit;
