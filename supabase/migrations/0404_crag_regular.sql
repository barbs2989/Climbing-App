-- CRAG REGULAR (competitor review Batch C item 22, owner 2026-11-04): Strava's Local Legend, for a
-- crag or peak — the climber with the most LOGGED DAYS under an area in the last 90 days. It rewards
-- showing up rather than grade, which is what partner-finding wants to know. Shown on the area page
-- (PARTNERS HERE) and in Ranks › By area.
--
-- Who can be it: the same people leaderboard() ranks — show_on_ranks on (or me), nobody who blocked
-- the viewer or whom the viewer blocked. What counts: visible logs under the area's subtree, dated
-- within the last 90 days, a conditions report is not a climb. Days are DISTINCT dates, so ten logs
-- on one Saturday are one day. Two days at least: one visit is a visitor, not a regular. Ties: more
-- logs, then the more recent last day, then the id (stable). Signed-in only, like the boards.
--
-- SECURITY DEFINER so the viewer's own RLS over climb_logs (own + public + crew) does not decide who
-- the regular is; it returns a name and a count, never a log.

begin;

create or replace function public.crag_regular(p_area_id text)
returns table(user_id uuid, name text, username text, show_name boolean, avatar text, days integer, logs integer, last_day date, is_me boolean)
language plpgsql stable security definer set search_path = public, pg_temp as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  a_path ltree;
begin
  if me is null then raise exception 'sign in to see the crag regular'; end if;
  select a.path into a_path from areas a where a.id = p_area_id;
  if a_path is null then return; end if;

  return query
  with people as (
    select p.id, p.name, p.username, p.show_name, p.avatar
      from profiles p
     where (p.id = me or coalesce(p.show_on_ranks, true))
       and not profile_owner_blocked_me(p.id)
       and not exists (select 1 from blocked_users b where b.blocker = me and b.blocked = p.id)
  ),
  d as (
    select l.user_id,
           count(distinct l.date_climbed)::integer as days,
           count(*)::integer as logs,
           max(l.date_climbed) as last_day
      from climb_logs l
      join routes ro on ro.id = l.route_id
      join areas ra on ra.id = ro.area_id
     where ra.path <@ a_path
       and l.moderation = 'visible'
       and l.date_climbed is not null
       and l.date_climbed >= current_date - 90
       and l.date_climbed <= current_date + 1
       and lower(coalesce(l.tick_type, '')) <> 'conditions'
       and l.user_id in (select pe.id from people pe)
     group by l.user_id
  )
  select pe.id, pe.name, pe.username, pe.show_name, pe.avatar, d.days, d.logs, d.last_day, (pe.id = me)
    from d
    join people pe on pe.id = d.user_id
   where d.days >= 2
   order by d.days desc, d.logs desc, d.last_day desc, pe.id
   limit 1;
end $$;

-- Supabase's default privileges hand EXECUTE to anon as well; take it back — a guest has no uid and
-- the function raises for one anyway.
revoke all on function public.crag_regular(text) from public, anon;
grant execute on function public.crag_regular(text) to authenticated;
comment on function public.crag_regular(text) is
  'The climber with the most logged DAYS under an area in the last 90 days (0404): at least two distinct '
  'days, visible logs only, conditions reports left out, the same people leaderboard() ranks. Signed-in '
  'only. Backs CRAG REGULAR on the area page and in Ranks › By area.';

commit;
