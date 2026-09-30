-- route_duplicate_names: view -> materialized view.
--
-- WHY: the plain view takes ~6.4s even for the service role (no RLS, no timeout), so
-- anon's 3s statement_timeout turns every read into a 500. 0064's join reordering did
-- not change that. Aggregating 201k routes per request is the wrong shape for a guard
-- the app and audit scripts poll; precompute it instead.
--
-- Not an RLS problem: pg_class.reloptions on the old view was null, so security_invoker
-- was never set and anon reads already ran with owner rights. The matview keeps that
-- same exposure — no change in what anon can see.
--
-- STALENESS IS THE TRADE. A matview can report "clean" while routes has new duplicates.
-- Refresh before trusting it; see refresh_route_duplicate_names() below.

drop view if exists route_duplicate_names;

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

-- Unique index is required for REFRESH ... CONCURRENTLY, which is what lets a refresh
-- run without blocking readers. (area_id, route_name) is the natural key of the group by.
create unique index route_duplicate_names_key
  on route_duplicate_names (area_id, route_name);

grant select on route_duplicate_names to anon, authenticated;

-- Refresh is privileged: it reads all of routes, so it must not be callable by anon.
-- security definer so service_role can invoke it over RPC without owning the matview.
create or replace function refresh_route_duplicate_names()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently route_duplicate_names;
end $$;

revoke all on function refresh_route_duplicate_names() from public;
grant execute on function refresh_route_duplicate_names() to service_role;

comment on materialized view route_duplicate_names is
  'Routes sharing one area_id and a non-placeholder name -- the same climb entered twice. Expected to be EMPTY. Materialized because the live aggregate over 201k routes takes ~6s and exceeds the anon statement_timeout. STALE UNTIL REFRESHED: call refresh_route_duplicate_names() (service_role) after any import or dedup, then read.';

-- VERIFY: expect one row (m = matview), then a count, then a fast read.
-- If these result tables do not appear, your paste was truncated.
select relname, relkind from pg_class where relname = 'route_duplicate_names';

select count(*) as duplicate_families from route_duplicate_names;
