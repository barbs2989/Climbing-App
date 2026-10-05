-- 0228: fold three Colorado areas the Mountain Project import filed twice into ONE area each.
--
-- check:area-duplicates after the Colorado import (2026-09-30) named 4 pairs not on its list. Read:
--   keep co_new_river_wall_the         drop co_new_river_wall_bouldering    one wall, 20 m apart; the copy sits in
--                                                                         MP's "Clear Creek Canyon Bouldering" tree
--   keep co_the_parking_lot_boulders   drop co_parking_lot_the              one boulder field, 190 m apart; the copy
--                                                                         sits in "Heaven's Gate Bouldering"
--   keep co_walls_of_honah_lee_the     drop co_walls_of_honah_lee_boulders  one wall, 10 m apart; the copy sits in
--                                                                         "Forest Boulders"
--   Roadside Boulder (Jaws Area) / Roadside Boulder (Independence Pass) are two boulders 2.5 km apart
--   with different problems: listed as read in scripts/data/area-duplicates-baseline.json, not folded.
-- 0221's rule: the copy in the discipline tree folds into the one in the main tree. No climb in a copy
-- shares a name with one on its keeper, so all 14 climbs move; the emptied copies are deleted.
-- route_count follows the moves through the routes trigger; the deleted areas held nothing else.
-- ABORTS if a copy has a child area or any climber data points at an area it deletes.

begin;

create temp table m_fold(keep text not null, drop_id text primary key) on commit drop;
insert into m_fold values
  ('co_new_river_wall_the', 'co_new_river_wall_bouldering'),
  ('co_the_parking_lot_boulders', 'co_parking_lot_the'),
  ('co_walls_of_honah_lee_the', 'co_walls_of_honah_lee_boulders');

do $$
declare n int;
begin
  -- An EMPTY database (a Supabase preview, check:migration-replay) has no catalog at all: none of
  -- the six areas exists, and there is nothing to fold. Only a PARTIAL set is the surprise worth
  -- aborting on (README-numbering: "a migration must replay on an empty database too").
  select count(*) into n from areas where id in (select keep from m_fold union select drop_id from m_fold);
  if n = 0 then return; end if;
  if n <> 6 then
    raise exception '0228: expected 6 areas, found a different number';
  end if;
  if exists (select 1 from areas a join m_fold f on a.parent_id = f.drop_id) then
    raise exception '0228: a copy has a child area';
  end if;
  -- contributions and topos CASCADE on an area delete
  if exists (select 1 from contributions where area_id in (select drop_id from m_fold))
     or exists (select 1 from topos where area_id in (select drop_id from m_fold)) then
    raise exception '0228: climber data points at a copy';
  end if;
end $$;

update routes r set area_id = f.keep from m_fold f where r.area_id = f.drop_id;

delete from areas a using m_fold f where a.id = f.drop_id
  and not exists (select 1 from routes r where r.area_id = a.id);

do $$
begin
  if exists (select 1 from areas where id in (select drop_id from m_fold)) then
    raise exception '0228: a copy was not emptied';
  end if;
end $$;

commit;
