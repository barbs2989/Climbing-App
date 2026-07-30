-- STEP 2 of 5 — create the materialized view.
-- This one does the work (~6s), so expect it to take a moment. It needs
-- route_name_is_placeholder() to exist; it does, 0064 used it.

create materialized view route_duplicate_names as
select d.area_id,
       a.name as area_name,
       d.route_name,
       d.copies,
       d.route_ids
from (
  select r.area_id,
         lower(btrim(r.name))          as route_name,
         count(*)                      as copies,
         array_agg(r.id order by r.id) as route_ids
  from routes r
  where r.area_id is not null
    and not route_name_is_placeholder(r.name)
  group by r.area_id, lower(btrim(r.name))
  having count(*) > 1
) d
left join areas a on a.id = d.area_id;

-- VERIFY: expect relkind = 'm', then a count (will NOT be zero).
select relname, relkind from pg_class where relname = 'route_duplicate_names';

select count(*) as duplicate_families from route_duplicate_names;
