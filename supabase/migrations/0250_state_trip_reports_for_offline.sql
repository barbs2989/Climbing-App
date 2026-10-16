-- 0250: the latest shared trip reports for ONE WINDOW of a state's routes, for the offline download.
--
-- A downloaded state carried the route rows and nothing climbers had said about them, so with no
-- signal every route page showed no reports unless that one route had been packed by hand. The
-- download pages routes by id in windows of 500; this answers one window: the newest `p_per_route`
-- shared reports per route whose id is in [p_from, p_to] AND whose area sits under the state.
--
-- Why a function: climb_logs.route_id is a loose text reference (0037, FK dropped in 0054), so
-- PostgREST cannot embed routes -> areas to scope logs to a state, and listing 14k route ids in a
-- URL is not an option. The id window alone is not a scope either — ids sort across states — so
-- the area join is what keeps another state's reports out.
--
-- SECURITY INVOKER (the default) on purpose: climb_logs RLS decides what the CALLER may read, so a
-- 'crew' report is downloaded only by someone already allowed to see it online. The visibility
-- filter mirrors fetchRouteTripReports (lib/db.js) so the offline set is the online set.
create or replace function public.state_trip_reports(p_state text, p_from text, p_to text, p_per_route integer default 5)
returns setof climb_logs language sql stable as $$
  select l.*
  from climb_logs l
  join (
    select x.id from (
      select l2.id,
             row_number() over (partition by l2.route_id order by l2.date_climbed desc nulls last, l2.created_at desc, l2.id) as rn
      from climb_logs l2
      join routes r on r.id = l2.route_id
      join areas ra on ra.id = r.area_id
      join areas root on root.id = p_state
      where l2.route_id between p_from and p_to
        and ra.path <@ root.path
        and l2.trip_report_visibility in ('public', 'crew')
    ) x
    where x.rn <= least(greatest(coalesce(p_per_route, 5), 1), 20)
  ) k on k.id = l.id
$$;

comment on function public.state_trip_reports(text, text, text, integer) is
  'Offline state download: newest shared trip reports per route for routes with id in [p_from,p_to] under area p_state. Invoker rights, so climb_logs RLS applies.';

grant execute on function public.state_trip_reports(text, text, text, integer) to anon, authenticated;
