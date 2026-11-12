-- 0415: a crew's size is enforced by the database, email invites hold a spot, and 0410's two loose ends.
--
-- Follow-ups to PR #3220 (0408/0410), agreed as a separate change:
--
--   * THE CAP IS A DATABASE RULE. Until now only the app checked cap, against its own possibly stale copy of
--     the crew: two members accepting two different requests at the same moment both passed, and the crew went
--     over its size. A BEFORE trigger on crew_members now refuses any row that newly TAKES a spot (inserted, or
--     moved, into 'invited' or 'confirmed' from anything else) once the crew is at cap. It locks the crew row
--     first (select ... for update), so concurrent accepts queue behind each other and the second one sees the
--     first. invited -> confirmed takes no new spot and is never refused; neither is 'pending' (0180: a request
--     is not a membership).
--   * EMAIL INVITES HOLD A SPOT. An unclaimed crew_email_invites row is a spot promised to someone with no
--     account yet; nothing counted it, so a full crew could still invite by email and overfill on sign-up. It is
--     now counted by the cap rule, refused past cap on insert, and added to crew_listings.held_count.
--   * Two rows are never refused, because refusing them breaks something worse:
--       - a CLAIM: the sign-up trigger (0070) and claim_my_crew_email_invites (0076) insert the member while the
--         email invite is still unclaimed. That spot was already held by the invite, and a raise inside the
--         auth.users trigger would fail the ACCOUNT CREATION itself.
--       - the ORGANISER's own row, written by crew_creator_joins.
--   * crew_creator_joins sets a transaction-local flag around its insert, and 0410's exemption in
--     crew_members_only_self_confirms now reads that flag instead of looking up crews.created_by on every
--     crew_members write. The exemption is therefore scoped to the trigger, not to anyone who can update the
--     organiser's row. A client cannot set the flag: set_config is not exposed through the API.
--   * crew_listings counts members in ONE pass (a lateral aggregate) instead of two correlated count(*)s.
--     Columns, order and types are unchanged, so every reader keeps its shape.
--
-- Existing crews already over cap are left as they are: the rule only judges a row that newly takes a spot.

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
    perform set_config('crew.creator_joins', 'on', true);
    insert into public.crew_members (crew_id, user_id, status, invited_by)
    values (new.id, new.created_by, 'confirmed', new.created_by)
    on conflict (crew_id, user_id) do update set status = 'confirmed'
      where public.crew_members.status is distinct from 'confirmed';
    perform set_config('crew.creator_joins', 'off', true);
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
     and coalesce(current_setting('crew.creator_joins', true), '') <> 'on'
  then
    raise exception 'Only the climber themselves can accept a crew invite'
      using errcode = '42501';
  end if;
  return new;
end
$$;

-- Spots a crew has given out, leaving one member or one email out of the count (the row being judged).
create or replace function public.crew_spots_held(p_crew_id uuid, p_except_user uuid, p_except_email text)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select (select count(*) from public.crew_members m
           where m.crew_id = p_crew_id and m.status in ('confirmed', 'invited')
             and m.user_id is distinct from p_except_user)::int
       + (select count(*) from public.crew_email_invites e
           where e.crew_id = p_crew_id and e.claimed_by is null
             and lower(e.email) is distinct from lower(p_except_email))::int
$$;
revoke all on function public.crew_spots_held(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.crew_members_respect_cap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cap int;
  v_email text;
begin
  if new.status not in ('confirmed', 'invited') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status in ('confirmed', 'invited') then
    return new;  -- already held a spot
  end if;
  if coalesce(current_setting('crew.creator_joins', true), '') = 'on' then
    return new;  -- the organiser's own row
  end if;
  select c.cap into v_cap from public.crews c where c.id = new.crew_id for update;
  if v_cap is null then
    return new;
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = new.user_id;
  if v_email is not null and exists (
       select 1 from public.crew_email_invites e
        where e.crew_id = new.crew_id and e.claimed_by is null and lower(e.email) = v_email) then
    return new;  -- claiming a spot an email invite already holds
  end if;
  if public.crew_spots_held(new.crew_id, new.user_id, null) >= v_cap then
    raise exception 'This crew is full'
      using errcode = 'P0001', hint = 'Raise the crew''s size to add more climbers.';
  end if;
  return new;
end
$$;
revoke all on function public.crew_members_respect_cap() from public, anon, authenticated;

drop trigger if exists crew_members_respect_cap on public.crew_members;
create trigger crew_members_respect_cap
  before insert or update of status on public.crew_members
  for each row execute function public.crew_members_respect_cap();

create or replace function public.crew_email_invites_respect_cap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cap int;
begin
  select c.cap into v_cap from public.crews c where c.id = new.crew_id for update;
  if v_cap is not null and public.crew_spots_held(new.crew_id, null, new.email) >= v_cap then
    raise exception 'This crew is full'
      using errcode = 'P0001', hint = 'Raise the crew''s size to add more climbers.';
  end if;
  return new;
end
$$;
revoke all on function public.crew_email_invites_respect_cap() from public, anon, authenticated;

drop trigger if exists crew_email_invites_respect_cap on public.crew_email_invites;
create trigger crew_email_invites_respect_cap
  before insert on public.crew_email_invites
  for each row execute function public.crew_email_invites_respect_cap();

create or replace view public.crew_listings as
 select c.id,
        c.route_id,
        c.created_by,
        c.cap,
        c.dates,
        c.created_at,
        k.confirmed_count,
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
        k.held_members + (select count(*) from public.crew_email_invites e
                           where e.crew_id = c.id and e.claimed_by is null) as held_count
   from public.crews c
   cross join lateral (
     select count(*) filter (where m.status = 'confirmed') as confirmed_count,
            count(*) filter (where m.status in ('confirmed', 'invited')) as held_members
       from public.crew_members m
      where m.crew_id = c.id
   ) k
  where not dismissed;
grant select on public.crew_listings to anon, authenticated;

commit;

-- VERIFY:
--   select tgname from pg_trigger where tgname in ('crew_members_respect_cap', 'crew_email_invites_respect_cap');
--   select id, cap, confirmed_count, held_count from public.crew_listings;   -- same numbers as before, plus email invites
