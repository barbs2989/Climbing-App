-- 0231: fold the Idaho area the Mountain Project import filed twice into ONE area.
--
-- check:area-duplicates after the Idaho import (2026-09-30) named 1 pair not on its list. Read:
--   keep id_thinking_spot_the   drop id_thinking_spot_bouldering   one crag near McCall, 160 m apart; the copy
--                                                                  sits in MP's "Payette Lake Boulder Circuit"
-- 0221's rule (0228 is the same shape): the copy in the discipline tree folds into the one in the main
-- tree. None of its 15 problems shares a name with a climb on the keeper, so all move; the emptied copy
-- is deleted. route_count follows the moves through the routes trigger.
-- ABORTS if the copy has a child area or any climber data points at it.

begin;

create temp table m_fold(keep text not null, drop_id text primary key) on commit drop;
insert into m_fold values
  ('id_thinking_spot_the', 'id_thinking_spot_bouldering');

do $$
declare n int;
begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog: nothing to fold.
  select count(*) into n from areas where id in (select keep from m_fold union select drop_id from m_fold);
  if n = 0 then return; end if;
  if n <> 2 then
    raise exception '0231: expected 2 areas, found a different number';
  end if;
  if exists (select 1 from areas a join m_fold f on a.parent_id = f.drop_id) then
    raise exception '0231: the copy has a child area';
  end if;
  -- contributions and topos CASCADE on an area delete
  if exists (select 1 from contributions where area_id in (select drop_id from m_fold))
     or exists (select 1 from topos where area_id in (select drop_id from m_fold)) then
    raise exception '0231: climber data points at the copy';
  end if;
end $$;

update routes r set area_id = f.keep from m_fold f where r.area_id = f.drop_id;

delete from areas a using m_fold f where a.id = f.drop_id
  and not exists (select 1 from routes r where r.area_id = a.id);

do $$
begin
  if exists (select 1 from areas where id in (select drop_id from m_fold)) then
    raise exception '0231: the copy was not emptied';
  end if;
end $$;

commit;
