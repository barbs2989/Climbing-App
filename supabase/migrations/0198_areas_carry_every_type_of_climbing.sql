-- Every type of climbing an area holds, not just its main one (owner decision, 2026-09-24).
--
-- The map's type-of-climbing filter matched only `dominant_discipline` (0051), so a crag that is
-- mostly sport with a few trad lines never appeared under Trad, and a peak climbed both ways
-- appeared under only one. `disciplines` lists every type with AT LEAST ONE climb in the area's
-- subtree (owner's choice of threshold: one climb is enough). `dominant_discipline` is unchanged
-- and still colours the pin.
--
-- Two product rules shape the list:
--   * On a PEAK, crag types are not types: a trad, sport, aid, bouldering or rock line on a
--     mountain counts as ALPINE ("Trad only applies to climbs at a crag"; see 0197).
--   * "rock" is not a type anywhere in the app. Off a peak it is simply left out; an area whose
--     only climbs are typed rock gets an empty list and shows under "All" only.
--
-- Maintained only for peaks and crags — the only area types the map shows — so a route change
-- recomputes its own peak/crag and any peak/crag above it, each a small subtree. Recomputing
-- every ancestor up to the country on each route row would put a whole-catalog scan behind
-- every bulk import.

alter table areas add column if not exists disciplines text[] not null default '{}';

create or replace function areas_recompute_disciplines(target_area_id text) returns void as $$
begin
  update areas a set disciplines = coalesce((
    select array_agg(d order by d) from (
      select distinct
        case when a.area_type = 'peak' and r.discipline in ('trad','sport','aid','bouldering','rock')
             then 'alpine' else r.discipline end as d
      from areas c
      join routes r on r.area_id = c.id
      where c.path <@ a.path and r.discipline is not null
    ) s
    where d <> 'rock'
  ), '{}')
  where a.id = target_area_id and a.area_type in ('peak', 'crag');
end $$ language plpgsql;

create or replace function routes_bump_area_disciplines() returns trigger as $$
declare
  aid text;
begin
  if tg_op in ('INSERT','UPDATE') then
    for aid in select id from areas where area_type in ('peak','crag')
                 and path @> (select path from areas where id = new.area_id) loop
      perform areas_recompute_disciplines(aid);
    end loop;
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.area_id is distinct from new.area_id) then
    for aid in select id from areas where area_type in ('peak','crag')
                 and path @> (select path from areas where id = old.area_id) loop
      perform areas_recompute_disciplines(aid);
    end loop;
  end if;
  return null;
end $$ language plpgsql;

drop trigger if exists trg_routes_area_disciplines on routes;
create trigger trg_routes_area_disciplines
  after insert or delete or update of discipline, area_id on routes
  for each row execute function routes_bump_area_disciplines();

-- An area whose TYPE changes (a crag re-filed as a peak, or back) reads its routes differently.
create or replace function areas_type_change_disciplines() returns trigger as $$
begin
  perform areas_recompute_disciplines(new.id);
  return null;
end $$ language plpgsql;

drop trigger if exists trg_areas_type_disciplines on areas;
create trigger trg_areas_type_disciplines
  after update of area_type on areas
  for each row execute function areas_type_change_disciplines();

-- One-time backfill, set-based: each route is attributed to every peak/crag at or above its area.
update areas a set disciplines = sub.ds
from (
  select a2.id, array_agg(distinct d order by d) ds
  from routes r
  join areas c on c.id = r.area_id
  join areas a2 on a2.path @> c.path and a2.area_type in ('peak','crag')
  cross join lateral (select case when a2.area_type = 'peak' and r.discipline in ('trad','sport','aid','bouldering','rock')
                                  then 'alpine' else r.discipline end as d) x
  where r.discipline is not null and x.d <> 'rock'
  group by a2.id
) sub
where a.id = sub.id;
