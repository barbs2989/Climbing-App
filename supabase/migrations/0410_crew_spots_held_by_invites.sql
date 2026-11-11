-- 0410: the crew finder counts the same spots the app does, and 0408's organiser row survives a hand-off.
--
-- Three follow-ups to 0408 (review of PR #3220):
--
--   * crew_listings gains held_count = confirmed + invited. In the app an unanswered invite HOLDS a spot
--     (crewSize; accepting a request and sending an invite both refuse past cap). The finder read
--     confirmed_count alone, so a crew of cap 4 with its organiser and 3 open invites showed
--     "1 of 4 · 3 spots left" to strangers whose requests the organiser then could not accept. Pending
--     requests still hold nothing (0180: a request is not a membership). crew_members is public-read
--     (0036), so a count exposes nothing new. Appended, so every reader keeps its shape; confirmed_count
--     stays for the readers that mean confirmed.
--   * crew_creator_joins: when created_by is handed to a climber who already has an invited or pending
--     row, that row is now confirmed (0408 left it as it was, so the count drifted back).
--   * crew_members_only_self_confirms (0227) lets the CREW ORGANISER's own row be confirmed by anyone. That
--     is the row the trigger writes on a hand-off, whoever runs the UPDATE; before this an admin signed in
--     as themselves could not hand a crew over. Confirming the organiser grants them nothing they lack:
--     0036 already lets the organiser read and run the crew.

begin;

create or replace function public.crew_creator_joins()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.created_by is not null
     and (tg_op = 'INSERT' or new.created_by is distinct from old.created_by) then
    insert into public.crew_members (crew_id, user_id, status, invited_by)
    values (new.id, new.created_by, 'confirmed', new.created_by)
    on conflict (crew_id, user_id) do update set status = 'confirmed'
      where public.crew_members.status is distinct from 'confirmed';
  end if;
  return new;
end
$$;
revoke all on function public.crew_creator_joins() from public, anon, authenticated;

create or replace function public.crew_members_only_self_confirms()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.status = 'confirmed'
     and auth.uid() is not null
     and auth.uid() <> new.user_id
     and (tg_op = 'INSERT' or old.status is distinct from 'confirmed')
     and (tg_op = 'INSERT' or old.status is distinct from 'pending')
     and new.user_id is distinct from (select c.created_by from public.crews c where c.id = new.crew_id)
  then
    raise exception 'Only the climber themselves can accept a crew invite'
      using errcode = '42501';
  end if;
  return new;
end
$$;

create or replace view public.crew_listings as
 select c.id,
        c.route_id,
        c.created_by,
        c.cap,
        c.dates,
        c.created_at,
        (select count(*) from public.crew_members m
          where m.crew_id = c.id and m.status = 'confirmed') as confirmed_count,
        case when auth.uid() is null then '{}'::uuid[]
             else coalesce((select array_agg(m.user_id order by m.user_id)
                              from public.crew_members m
                             where m.crew_id = c.id and m.status = 'confirmed'
                               and not exists (select 1 from public.blocked_users b
                                                where (b.blocker = m.user_id and b.blocked = auth.uid())
                                                   or (b.blocker = auth.uid() and b.blocked = m.user_id))),
                           '{}'::uuid[])
        end as confirmed_member_ids,
        c.area_id,
        c.discipline,
        (select count(*) from public.crew_members m
          where m.crew_id = c.id and m.status in ('confirmed', 'invited')) as held_count
   from public.crews c
  where not dismissed;
grant select on public.crew_listings to anon, authenticated;

commit;

-- VERIFY:
--   select id, cap, confirmed_count, held_count from public.crew_listings;   -- held_count >= confirmed_count
--   select prosrc like '%do update set status%' from pg_proc where proname = 'crew_creator_joins';
