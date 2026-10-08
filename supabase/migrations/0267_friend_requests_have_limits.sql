-- Friend requests get the limits Facebook and LinkedIn have (phase 5 of docs/SAFETY-AND-MODERATION-PLAN.md,
-- owner-approved 2026-10-07). On an app whose friendships turn into meetups, an unlimited request is
-- a harassment channel:
--
--   * A DECLINE was quiet but not final: the requester could withdraw and ask again at once, forever
--     (probe-friend-request-lifecycle.mjs recorded it as a NOTE). Now a pair that was declined or
--     withdrawn waits 21 days before the same climber can ask again -- LinkedIn's "up to three weeks".
--     The DECLINER is not held to it: changing your mind is yours to do at any time.
--   * No cap at all on how many requests one account sends. Now 50 a week.
--   * No say over who may ask. Now profiles.requests_from: everyone | friends_of_friends | nobody,
--     enforced here, not hidden in the UI.
--   * A pending request lived forever. Now one older than 90 days is cleared the next time either
--     climber asks, so it neither blocks a fresh request nor sits in a Requests list.
--   * A photo from a stranger arrived like any other message. Now a DM can carry an image only between
--     friends, crewmates, or once the recipient has written back -- Messenger's message-request rule.
--   * "People you may know" drew only on seed climbers. people_you_may_know() finds real ones: friends of
--     friends, crewmates and climbers you logged a climb with, never anyone blocked, restricted, hidden
--     from discovery, or closed to requests.
--
-- Every refusal is a P0001 with a sentence the app shows as-is; none of them says "blocked".

-- ---------------------------------------------------------------------------------------------
-- 1. The history the limits need. A connections row is deleted on withdraw, so the row cannot carry it.
-- ---------------------------------------------------------------------------------------------
create table if not exists connection_events (
  id        bigserial primary key,
  requester uuid not null references auth.users(id) on delete cascade,
  addressee uuid not null references auth.users(id) on delete cascade,
  kind      text not null check (kind in ('requested', 'withdrawn', 'declined')),
  at        timestamptz not null default now()
);
create index if not exists connection_events_pair_idx on connection_events (requester, addressee, at desc);
create index if not exists connection_events_requester_idx on connection_events (requester, kind, at desc);
alter table connection_events enable row level security;
-- No policies on purpose: only the definer triggers below read or write it.

create or replace function log_connection_event() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- An expired request cleared by guard_connection_request_rules() is nobody's withdrawal or decline;
  -- logging it would start a cooldown against the very request that cleared it.
  if coalesce(current_setting('app.expiring_request', true), '') = 'on' then return null; end if;
  if tg_op = 'INSERT' then
    insert into connection_events (requester, addressee, kind) values (new.requester, new.addressee, 'requested');
  elsif tg_op = 'UPDATE' and new.status = 'declined' and old.status is distinct from 'declined' then
    insert into connection_events (requester, addressee, kind) values (new.requester, new.addressee, 'declined');
  elsif tg_op = 'DELETE' and old.status in ('pending', 'declined')
        -- Deleting an ACCOUNT cascades its requests away. Logging those would reference the user
        -- being deleted and make the whole account delete fail (it did: the cleanup of
        -- probe-friend-request-lifecycle caught it). A cooldown about someone who is gone means nothing.
        and exists (select 1 from auth.users where id = old.requester)
        and exists (select 1 from auth.users where id = old.addressee) then
    -- Withdrawn by the one who asked; dismissed by the one asked (that is a decline, quietly).
    insert into connection_events (requester, addressee, kind)
    values (old.requester, old.addressee, case when auth.uid() = old.addressee then 'declined' else 'withdrawn' end);
  end if;
  return null;
end;
$$;
drop trigger if exists connections_log_event on connections;
create trigger connections_log_event after insert or update or delete on connections
  for each row execute function log_connection_event();

-- ---------------------------------------------------------------------------------------------
-- 2. Who may ask you.
-- ---------------------------------------------------------------------------------------------
alter table profiles add column if not exists requests_from text not null default 'everyone';
alter table profiles drop constraint if exists profiles_requests_from_chk;
alter table profiles add constraint profiles_requests_from_chk check (requests_from in ('everyone', 'friends_of_friends', 'nobody'));
comment on column profiles.requests_from is
  'Who may send this climber a friend request: everyone | friends_of_friends | nobody. Enforced by guard_connection_request_rules().';

-- ---------------------------------------------------------------------------------------------
-- 3. The rules, before the insert (so an expired pending row can be cleared before the unique pair
--    index is checked). Fires after connections_guard_not_blocked (name order), so a block refuses
--    first and is never revealed by a different message.
-- ---------------------------------------------------------------------------------------------
create or replace function guard_connection_request_rules() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_pref  text;
  v_last  timestamptz;
begin
  -- An abandoned pending request (90+ days) in EITHER direction is cleared, not counted against anyone.
  perform set_config('app.expiring_request', 'on', true);
  delete from connections
   where least(requester, addressee) = least(new.requester, new.addressee)
     and greatest(requester, addressee) = greatest(new.requester, new.addressee)
     and status = 'pending' and created_at < now() - interval '90 days';
  perform set_config('app.expiring_request', '', true);

  select requests_from into v_pref from profiles where id = new.addressee;
  if v_pref = 'nobody' then
    raise exception 'This climber isn’t accepting friend requests.';
  elsif v_pref = 'friends_of_friends' and not exists (
      select 1 from connections a join connections b
        on (case when a.requester = new.requester then a.addressee else a.requester end)
         = (case when b.requester = new.addressee then b.addressee else b.requester end)
       where a.status = 'accepted' and b.status = 'accepted'
         and (a.requester = new.requester or a.addressee = new.requester)
         and (b.requester = new.addressee or b.addressee = new.addressee)) then
    raise exception 'This climber only accepts friend requests from friends of their friends.';
  end if;

  select max(at) into v_last from connection_events
   where requester = new.requester and addressee = new.addressee and kind in ('withdrawn', 'declined')
     and at > now() - interval '21 days';
  if v_last is not null then
    raise exception 'You asked this climber recently — you can ask again after %.', to_char(v_last + interval '21 days', 'FMMonth FMDD');
  end if;

  if (select count(*) from connection_events
       where requester = new.requester and kind = 'requested' and at > now() - interval '7 days') >= 50 then
    raise exception 'You’ve sent a lot of friend requests this week — try again in a few days.';
  end if;
  return new;
end;
$$;
drop trigger if exists connections_request_rules on connections;
create trigger connections_request_rules before insert on connections
  for each row execute function guard_connection_request_rules();

-- ---------------------------------------------------------------------------------------------
-- 4. A stranger's DM is words only until the recipient engages.
-- ---------------------------------------------------------------------------------------------
create or replace function guard_message_image_from_stranger() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if coalesce(new.image_url, '') = '' then return new; end if;
  if exists (select 1 from connections c where c.status = 'accepted'
              and least(c.requester, c.addressee) = least(new.sender_id, new.recipient_id)
              and greatest(c.requester, c.addressee) = greatest(new.sender_id, new.recipient_id))
     or exists (select 1 from crew_members a join crew_members b on a.crew_id = b.crew_id
                 where a.user_id = new.sender_id and b.user_id = new.recipient_id
                   and a.status = 'confirmed' and b.status = 'confirmed')
     or exists (select 1 from messages m where m.sender_id = new.recipient_id and m.recipient_id = new.sender_id) then
    return new;
  end if;
  raise exception 'Photos can be sent once you’re friends, or after they reply.';
end;
$$;
drop trigger if exists messages_guard_stranger_image on messages;
create trigger messages_guard_stranger_image before insert on messages
  for each row execute function guard_message_image_from_stranger();

-- ---------------------------------------------------------------------------------------------
-- 5. People you may know. Only ever returns ids the caller can already read in profiles.
-- ---------------------------------------------------------------------------------------------
create or replace function people_you_may_know(p_limit int default 12)
returns table (id uuid, mutuals int, crews_together int, logged_together int)
language sql stable security definer set search_path = public, pg_temp as $$
  with me as (select auth.uid() as uid),
  friends as (
    select case when c.requester = me.uid then c.addressee else c.requester end as f
      from connections c, me
     where c.status = 'accepted' and (c.requester = me.uid or c.addressee = me.uid)
  ),
  fof as (
    select case when c.requester = f.f then c.addressee else c.requester end as x, count(*)::int as n
      from connections c join friends f on (c.requester = f.f or c.addressee = f.f)
     where c.status = 'accepted'
     group by 1
  ),
  crewmates as (
    select b.user_id as x, count(distinct a.crew_id)::int as n
      from crew_members a join crew_members b on a.crew_id = b.crew_id, me
     where a.user_id = me.uid and a.status = 'confirmed' and b.status = 'confirmed' and b.user_id <> me.uid
     group by 1
  ),
  logmates as (
    select p.x as x, count(*)::int as n
      from climb_logs l, me, lateral unnest(coalesce(l.partners, '{}'::uuid[])) as p(x)
     where l.user_id = me.uid and p.x is not null
     group by 1
  ),
  cand as (
    select x, sum(m)::int as mutuals, sum(cr)::int as crews_together, sum(lg)::int as logged_together from (
      select x, n as m, 0 as cr, 0 as lg from fof
      union all select x, 0, n, 0 from crewmates
      union all select x, 0, 0, n from logmates
    ) u group by x
  )
  select c.x, c.mutuals, c.crews_together, c.logged_together
    from cand c join profiles p on p.id = c.x, me
   where c.x <> me.uid
     and not exists (select 1 from connections k
                      where least(k.requester, k.addressee) = least(c.x, me.uid)
                        and greatest(k.requester, k.addressee) = greatest(c.x, me.uid))
     and not exists (select 1 from blocked_users b
                      where (b.blocker = me.uid and b.blocked = c.x) or (b.blocker = c.x and b.blocked = me.uid))
     and is_active_user(c.x)
     and p.requests_from <> 'nobody'
     -- Someone who hid from discovery or hid their mutuals is suggested only to people they actually
     -- climbed or crewed with, never as a friend-of-a-friend.
     and (c.crews_together > 0 or c.logged_together > 0
          or (coalesce(p.discoverable, true) and coalesce(p.mutuals_visible, true)))
   order by (c.crews_together * 3 + c.logged_together * 3 + c.mutuals) desc, c.x
   limit greatest(1, least(coalesce(p_limit, 12), 50));
$$;
revoke all on function people_you_may_know(int) from public, anon;
grant execute on function people_you_may_know(int) to authenticated;

-- Confirm:
--   node scripts/oneoff/probe-friend-request-limits.mjs     (real accounts; must end 0 failed)
