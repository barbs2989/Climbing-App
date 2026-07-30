-- STEP 5 of 5 — the refresh entry point, plus the staleness warning on the object itself.
-- security definer so service_role can call it over RPC without owning the matview;
-- refresh scans all of routes, so anon must not be able to trigger it.

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

-- VERIFY: expect one row.
select proname, prosecdef as security_definer from pg_proc
where proname = 'refresh_route_duplicate_names';
