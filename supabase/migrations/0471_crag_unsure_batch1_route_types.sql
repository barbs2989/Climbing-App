-- 0471 — Crag pass 3 follow-up, batch 1: 8 routes left "unsure" only for want of a route type move to trad / top-rope.
--
-- Crag pass 3 (0462) left 193 areas alpine as "unsure" (research-data/crag-rows-out-of-alpine-pass3-2026-11-18/
-- owner-review.json; triage in unsure-triage.json). The easiest bucket, easy_route_type_only, already has a STATED walk of
-- <= 60 min from the car and lacked only Mountain Project's type for THIS route. Researched 2026-11-18 (owner: "do it"),
-- under the pass's own rule: an exact route-name match on Mountain Project typed Sport / Trad / TR, and no summit,
-- glacier or snow. These 8 pass; their own text names no summit or snow (checked read-only the same day).
--   id_the_rat_and_the_drainpipe       trad     MP 114622690  Trad, 180 ft     Right Flank, Bear Creek (40 min stated)
--   id_vertically_challenged_traverse  trad     MP 114774597  Trad, 150 ft     Right Flank
--   id_way_up_the_hill                 trad     MP 114775304  Trad             Right Flank
--   nh_lakeview                        trad     MP 106276179  Trad, 8 pitches  Cannon Slabs (30-40 min); tops out at an overlook, no summit
--   nh_stretched_on_your_grave         toprope  MP 106728635  TR, 90 ft        Cannon Slabs
--   ca_mr_d_n_a                        trad     MP 106217581  Trad, 50 ft      Lake George North Face (20 min stated)
--   ca_mr_kamikaze                     trad     MP 106217594  Trad, 50 ft      Lake George North Face
--   co_stone_idol                      toprope  MP 106439760  TR               Easter Island Pinnacle (20 min over the saddle)
-- Left alpine from the same bucket: The Original Route and Guide Route (summit, or snow at the start), Ridin' Out the
-- Storm (scrambles to the top of the formation), and seven with no exact Mountain Project match (Crystal Corner, Sinnid
-- Delight, Spidey, Route to Nowhere, Jabberwocky, Water streak #2, Mongoloid).
--
-- Guards as 0462: assert-then-set (still alpine, still in this area); a row the owner locked (route_field_confidence) or a
-- climber edited (approved discipline / rockStyle contribution) is left alone. disciplines = the new primary alone (the
-- rows hold NULL today). On an empty catalog (a replay or a preview) it matches nothing.
begin;

update routes r
   set discipline = m.discipline, disciplines = jsonb_build_array(m.discipline)
  from (values
    ('id_the_rat_and_the_drainpipe',      'id_right_flank_the',        'trad'),
    ('id_vertically_challenged_traverse', 'id_right_flank_the',        'trad'),
    ('id_way_up_the_hill',                'id_right_flank_the',        'trad'),
    ('nh_lakeview',                       'nh_slabs',                  'trad'),
    ('nh_stretched_on_your_grave',        'nh_slabs',                  'toprope'),
    ('ca_mr_d_n_a',                       'ca_north_face_3',           'trad'),
    ('ca_mr_kamikaze',                    'ca_north_face_3',           'trad'),
    ('co_stone_idol',                     'co_easter_island_pinnacle', 'toprope')
  ) as m(id, area_id, discipline)
 where r.id = m.id
   and r.area_id = m.area_id
   and r.discipline = 'alpine'
   and not exists (select 1 from route_field_confidence f where f.route_id = r.id and f.field in ('discipline', 'rockStyle'))
   and not exists (select 1 from contributions c where c.route_id = r.id and c.kind = 'field'
                    and c.field in ('discipline', 'rockStyle') and c.status = 'approved');

-- Expect 8 (0 on an empty catalog).
select discipline, count(*) from routes
 where id in ('id_the_rat_and_the_drainpipe','id_vertically_challenged_traverse','id_way_up_the_hill','nh_lakeview',
              'nh_stretched_on_your_grave','ca_mr_d_n_a','ca_mr_kamikaze','co_stone_idol')
 group by discipline order by 1;

commit;
