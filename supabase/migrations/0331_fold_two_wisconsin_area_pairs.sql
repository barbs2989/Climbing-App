-- 0331: fold two Wisconsin areas filed twice (Devil's Lake East Bluff) into ONE area each.
--
-- check:area-duplicates named both pairs: same name, under 0.1 km apart, filed under two parents.
--   keep wi_7_1_1_railroad_amphitheater (21)  drop wi_4_railroad_amphitheater (14)
--   keep wi_7_pony_barricade (5)              drop wi_7_4_pony_barricade (3)
-- No climb in a copy shares a name with one on its keeper, so all 17 climbs move; the emptied
-- copies are deleted. route_count follows the moves through the routes trigger.
-- ABORTS if a copy has a child area or any climber data points at an area it deletes.

begin;

create temp table m_fold(keep text not null, drop_id text primary key) on commit drop;
insert into m_fold values
  ('wi_7_1_1_railroad_amphitheater', 'wi_4_railroad_amphitheater'),
  ('wi_7_pony_barricade', 'wi_7_4_pony_barricade');

do $$
declare n int;
begin
  -- an EMPTY database (a Supabase preview) has no catalog: nothing to fold
  select count(*) into n from areas where id in (select keep from m_fold union select drop_id from m_fold);
  if n = 0 then return; end if;
  if n <> 4 then
    raise exception '0331: expected 4 areas, found a different number';
  end if;
  if exists (select 1 from areas a join m_fold f on a.parent_id = f.drop_id) then
    raise exception '0331: a copy has a child area';
  end if;
  if exists (select 1 from contributions where area_id in (select drop_id from m_fold))
     or exists (select 1 from topos where area_id in (select drop_id from m_fold)) then
    raise exception '0331: climber data points at a copy';
  end if;
end $$;

update routes r set area_id = f.keep from m_fold f where r.area_id = f.drop_id;

delete from areas a using m_fold f where a.id = f.drop_id
  and not exists (select 1 from routes r where r.area_id = a.id);

do $$
begin
  if exists (select 1 from areas where id in (select drop_id from m_fold)) then
    raise exception '0331: a copy was not emptied';
  end if;
end $$;

commit;
