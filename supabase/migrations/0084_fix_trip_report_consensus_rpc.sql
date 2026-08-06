-- get_trip_reports_for_consensus cannot be called with a real route id.
--
-- 0037 declares it as `(route_id text)` but grants `(uuid)`. The LIVE database has the
-- uuid version, so the file and the deployed schema disagree (there is no migration
-- tracking table -- the file was never the applied state). Verified against production,
-- not read off the file:
--
--   POST /rest/v1/rpc/get_trip_reports_for_consensus {"route_id":"wa_mount_baker_north_ridge"}
--     anon    -> 400 22P02 invalid input syntax for type uuid
--     service -> 400 22P02 invalid input syntax for type uuid
--
-- Route ids are text, confirmed the same way:
--   GET /routes?id=eq.wa_mount_baker_north_ridge          -> 200, returns the row
--   GET /climb_logs?route_id=eq.wa_mount_baker_north_ridge -> 200 (text filter accepted)
--
-- So the deployed parameter type can never match a route id, for any caller. Nobody has
-- hit this because the only wrapper, useRouteTripReports in lib/db.js, is dead code --
-- nothing in the app calls it. Dormant code was never exercised, so its bug never showed.
--
-- The file's own body has a second defect that would bite the moment the type was fixed:
--     where cl.route_id = route_id
-- the parameter is named the same as the column. In plpgsql that bare reference is
-- ambiguous; it either raises at runtime or resolves to the column, making the predicate
-- cl.route_id = cl.route_id -- always true -- and the function would return every trip
-- report for every route rather than the one asked for. Renaming the parameter to
-- p_route_id removes the ambiguity by construction rather than by qualification.
--
-- SECURITY: left as the default SECURITY INVOKER, so RLS on climb_logs still applies to
-- the caller. That is what makes this safe to grant: 0081's "view crew logs" policy is
-- what decides whose reports you may read (public -> anyone, crew -> confirmed members,
-- everything else -> author only). This function widens nothing on its own; the
-- visibility filter below is a second, narrower gate on top of the policy.
--
-- GRANT is to `authenticated` only, matching 0037's stated intent. Not widened to anon.

drop function if exists get_trip_reports_for_consensus(uuid);
drop function if exists get_trip_reports_for_consensus(text);

create function get_trip_reports_for_consensus(p_route_id text)
returns table(
  id uuid, user_id uuid, stars int, cond_tags text[],
  date_climbed date, discipline text, created_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  return query
  select cl.id, cl.user_id, cl.stars, cl.cond_tags,
         cl.date_climbed, cl.discipline, cl.created_at
  from climb_logs cl
  where cl.route_id = p_route_id
    and cl.trip_report_visibility in ('public', 'crew')
    and cl.date_climbed >= (now()::date - interval '180 days')
  order by cl.created_at desc;
end;
$$;

grant execute on function get_trip_reports_for_consensus(text) to authenticated;

-- Confirm -- expect exactly one row, with argument type `text`:
--   select p.proname, pg_get_function_arguments(p.oid) as args, p.prosecdef
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'get_trip_reports_for_consensus';
--
-- And that it now accepts a text route id instead of erroring 22P02:
--   select * from get_trip_reports_for_consensus('wa_mount_baker_north_ridge');
