-- 0467 — The rest of the Black Wall (Mt Blue Sky, CO) is ALPINE too: the four routes earlier crag passes made trad.
--
-- 0465 returned crag pass 3's 11 Black Wall routes to alpine (owner 2026-11-18: "do what research says"): snow lies at
-- the base and over the rappel anchors into July, you rappel in (4 x 70 m) and climb back out, 12,000-13,000 ft, and
-- Mountain Project calls these its "long, committing routes" (stephabegg.com/?p=11406; mountainproject.com/area/105745699).
-- That evidence is about the WALL, not about pass 3's rows, so the four Black Wall routes earlier passes had made trad
-- (owner 2026-11-18: "do what you recommend") follow: the wall reads one way.
--   co_cary_granite                     trad ["trad"]
--   co_black_wall_the_black_mamba       trad ["trad","alpine"]
--   co_black_wall_the_harry_caray       trad ["trad","alpine"]
--   co_black_wall_the_miller_s_face     trad ["trad","alpine"]
-- Each becomes discipline 'alpine' with disciplines ["alpine","trad"]: the primary first (0366's trigger requires it),
-- and Mountain Project's own Trad type kept as the secondary tag. Assert-then-set on the exact current value, and a row
-- the owner locked (route_field_confidence) or a climber edited (approved discipline / rockStyle contribution) is left alone.
begin;

update routes r
   set discipline = 'alpine', disciplines = '["alpine","trad"]'::jsonb
 where r.area_id = 'co_black_wall_the'
   and r.discipline = 'trad'
   and (r.disciplines = '["trad"]'::jsonb or r.disciplines = '["trad","alpine"]'::jsonb)
   and r.id in ('co_cary_granite', 'co_black_wall_the_black_mamba', 'co_black_wall_the_harry_caray', 'co_black_wall_the_miller_s_face')
   and not exists (select 1 from route_field_confidence f where f.route_id = r.id and f.field in ('discipline', 'rockStyle'))
   and not exists (select 1 from contributions c where c.route_id = r.id and c.kind = 'field'
                    and c.field in ('discipline', 'rockStyle') and c.status = 'approved');

-- Expect every Black Wall route alpine (26 of 26; 0 on an empty catalog).
select discipline, count(*) from routes where area_id = 'co_black_wall_the' group by discipline order by 1;

commit;
