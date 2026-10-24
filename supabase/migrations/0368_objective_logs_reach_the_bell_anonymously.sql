-- 0368 — Another climber logs a climb on your objectives: the bell says so, anonymously when they kept it private.
--
-- The bell already names a climber whose report you can READ (a public report, a friend's "friends" report, your
-- crew's "crew" report): those rows reach the app through the ordinary climb_logs select. A report kept to
-- friends, a crew or the climber alone that you cannot read used to tell you nothing, though it is the same news:
-- somebody was just on a climb you want to do.
--
-- This hands back exactly that and no more, the Mountain Project private-tick model 0329 already follows on the
-- route page: the route, the day it was climbed, whether it was a climb or a conditions-only report, and when it
-- was logged. NO author, NO name, NO text, NO photos, NO partners, NO track, and no opaque key either -- an alert
-- has no need to count climbers. Only routes in the CALLER's own objectives, only reports the caller cannot already
-- read (the same rules as 0329), never the caller's own, never a taken-down report, never across a block.

create or replace function public.objective_private_logs(p_days int default 30)
returns table (id uuid, route_id text, date_climbed date, tick_type text, created_at timestamptz)
language sql stable security definer set search_path = public, pg_temp
as $$
  select l.id, l.route_id, l.date_climbed, l.tick_type, l.created_at
    from climb_logs l
   where auth.uid() is not null
     and l.route_id in (select o.route_id from objectives o where o.user_id = auth.uid())
     and l.user_id <> auth.uid()
     and l.date_climbed >= current_date - least(greatest(coalesce(p_days, 30), 1), 90)
     and l.trip_report_visibility is distinct from 'public'
     and l.moderation = 'visible'
     and not (l.trip_report_visibility = 'friends' and is_my_friend(l.user_id))
     and not (l.trip_report_visibility = 'crew' and l.crew_id in (
           select cm.crew_id from crew_members cm where cm.user_id = auth.uid() and cm.status = 'confirmed'))
     and not exists (select 1 from blocked_users b
                      where (b.blocker = l.user_id and b.blocked = auth.uid())
                         or (b.blocker = auth.uid() and b.blocked = l.user_id))
   order by l.date_climbed desc, l.created_at desc
   limit 40;
$$;
revoke all on function public.objective_private_logs(int) from public;
grant execute on function public.objective_private_logs(int) to authenticated;
