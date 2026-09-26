-- 0223 — "Pairs well with", from real climbers.
--
-- The route page's PAIRS WELL WITH section only ever rendered on seven seed Little Cottonwood
-- routes, from a hand-written constant (ROUTE_EXTRAS.pairsWith). No catalog route could have
-- one. Two real sources replace it:
--
-- 1. A climber SUGGESTS a pairing: a `contributions` row of kind 'pair' on the route, whose
--    value is {"with": <other route id>, "withName": <its name, for the ledger>, "note": <why>}.
--    It shows on BOTH routes' pages. No new table: contributions are already public-read and
--    signed-in-insert (contributor = auth.uid()), which is exactly the access this needs.
--    What was missing is below — a shape check, one suggestion per climber per pair, and the
--    right to take your own suggestion back (the delete policy only knew photos).
--
-- 2. LOGGED TOGETHER: other routes the same climber logged on the same day. `stable`, NOT
--    security definer — it reads climb_logs with the CALLER's privileges, so 0081's policy
--    decides which logs it may count, and the visibility filter keeps it to what their authors
--    shared. It returns counts only, never who.

alter table contributions drop constraint if exists contributions_pair_shape_ck;
alter table contributions add constraint contributions_pair_shape_ck check (
  kind is distinct from 'pair' or (
    route_id is not null
    and jsonb_typeof(value) = 'object'
    and coalesce(value->>'with', '') <> ''
    and value->>'with' <> route_id
    and length(coalesce(value->>'note', '')) <= 280
  )
);

create unique index if not exists contributions_one_pair_per_climber
  on contributions (contributor, route_id, (value->>'with'))
  where kind = 'pair';

drop policy if exists "own photo, or an admin" on contributions;
drop policy if exists "own photo or pairing, or an admin" on contributions;
create policy "own photo or pairing, or an admin" on contributions for delete using (
  (kind in ('photo', 'pair') and contributor is not null and contributor = (auth.uid())::text)
  or is_admin(auth.uid())
);

create or replace function route_logged_with(p_route_id text, p_limit int default 5)
returns table(route_id text, climbers int) language sql stable as $$
  select b.route_id, count(distinct a.user_id)::int as climbers
  from climb_logs a
  join climb_logs b
    on b.user_id = a.user_id
   and b.date_climbed = a.date_climbed
   and b.route_id <> a.route_id
  where a.route_id = p_route_id
    and a.date_climbed is not null
    and a.trip_report_visibility in ('public', 'crew')
    and b.trip_report_visibility in ('public', 'crew')
  group by b.route_id
  order by climbers desc, b.route_id
  limit greatest(1, least(p_limit, 20));
$$;

grant execute on function route_logged_with(text, int) to anon, authenticated, service_role;
