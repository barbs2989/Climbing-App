-- 0233: fold the Nevada canyon the Mountain Project import filed twice into ONE area.
--
-- check:area-duplicates after the Nevada import (2026-10-01) named 2 pairs not on its list. Read:
--   keep nv_first_creek_canyon   drop nv_first_creek_canyon_boulders   one canyon, 330 m apart; the copy sits
--                                                                      in MP's "Red Rock Bouldering" tree
--   Beach Boulders Bouldering / The Beach are two places 2.2 km apart (0221 read the same pair before
--   the import split Beach Boulders): listed in scripts/data/area-duplicates-baseline.json, not folded.
-- 0221's rule, as it folded Calico Basin Boulders, Pine Creek Canyon Boulders and the other Red Rock
-- canyons: the copy in the discipline tree folds into the one in the main tree. The copy holds no climb
-- of its own, only 17 boulders, none sharing a name with a wall of the keeper; they move under the
-- keeper, the emptied copy is deleted, and route_count is recounted up both old and new ancestors.
-- ABORTS if the copy holds a climb, a child would repeat a sibling's name, or climber data points at it.

begin;

do $$
declare n int;
begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  select count(*) into n from areas where id in ('nv_first_creek_canyon', 'nv_first_creek_canyon_boulders');
  if n = 0 then return; end if;
  if n <> 2 then
    raise exception '0233: expected 2 areas, found a different number';
  end if;
  if exists (select 1 from routes where area_id = 'nv_first_creek_canyon_boulders') then
    raise exception '0233: the copy holds a climb of its own';
  end if;
  if exists (select 1 from areas c join areas k on k.parent_id = 'nv_first_creek_canyon' and catalog_key(k.name) = catalog_key(c.name)
              where c.parent_id = 'nv_first_creek_canyon_boulders') then
    raise exception '0233: a moved boulder would repeat a name under the keeper';
  end if;
  -- contributions and topos CASCADE on an area delete
  if exists (select 1 from contributions where area_id = 'nv_first_creek_canyon_boulders')
     or exists (select 1 from topos where area_id = 'nv_first_creek_canyon_boulders') then
    raise exception '0233: climber data points at the copy';
  end if;
end $$;

update areas set parent_id = 'nv_first_creek_canyon' where parent_id = 'nv_first_creek_canyon_boulders';

-- path is set per row by trg_areas_set_path and does NOT cascade (0221 met the same): three of the
-- moved areas hold 21 boulders of their own, whose paths still ran through the copy.
do $$ declare n int; begin
  loop
    update areas c set path = p.path || text2ltree(c.id) from areas p
     where c.parent_id = p.id and c.path is distinct from p.path || text2ltree(c.id);
    get diagnostics n = row_count;
    exit when n = 0;
  end loop;
end $$;

delete from areas a where a.id = 'nv_first_creek_canyon_boulders'
  and not exists (select 1 from routes r where r.area_id = a.id)
  and not exists (select 1 from areas c where c.parent_id = a.id);

do $$
begin
  if exists (select 1 from areas where id = 'nv_first_creek_canyon_boulders') then
    raise exception '0233: the copy was not emptied';
  end if;
end $$;

commit;

-- Recount once every path is right. (Applied live 2026-10-01 without the path loop, the recount
-- counted 169 of First Creek Canyon's 207 climbs; the loop and this statement were then run to repair
-- it.) Both trees share nv_red_rocks, so recounting the ancestors of the keeper and of Red Rock
-- Bouldering covers every count the move touched.
update areas set route_count = (
  select count(*) from routes r join areas a2 on a2.id = r.area_id where a2.path <@ areas.path
) where id in (select a.id from areas a, areas t
                where t.id in ('nv_first_creek_canyon', 'nv_red_rock_bouldering') and a.path @> t.path);
