-- 0230 — Group posts, events, RSVPs and event invites reach the group.
--
-- WHAT WAS BROKEN. In a REAL group (0090) every one of these was React state only: a post, an
-- edit, a pin, a reaction, an event (or a ten-week series), an RSVP and an event invite were seen
-- by their author alone and gone on reload, while the toasts said "Event created — 10 occurrences
-- scheduled", "You're in — see you there", "Invited Sam to the event". The owner decided on
-- 2026-09-30 that the app reads as the finished product, so those toasts are now promises.
--
-- WHO MAY DO WHAT (mirrors the app's own rules, which until now only the client enforced):
--   posts      read: active members. write: an active member, as themselves. edit text: the
--              author. pin: a manager (owner/moderator). delete: the author or a manager.
--   reactions  one per (post, climber); a member sets or clears their own.
--   events     read: active members, and anyone invited to that event. create: an active member
--              when the group's event_policy is 'anyone', a manager when it is 'mods'.
--              cancel: the host or a manager. edit: the host.
--   rsvps      your own, on an event you can read; capacity (>0) is enforced here, not trusted to
--              a client that read a stale count.
--   invites    by an active member, as themselves, never to someone who has blocked you
--              (0095's profile_owner_blocked_me), and in a PRIVATE group only to its members —
--              an outsider could not open the event's group anyway.
--
-- Helpers are 0178's is_group_member / is_group_manager (active members only).
--
-- NON-GOALS. No push/email. No edit history. Seed groups (string ids) stay on the device.

create table if not exists group_posts (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  author      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body        text not null check (length(btrim(body)) between 1 and 4000),
  photos      jsonb not null default '[]'::jsonb check (jsonb_typeof(photos) = 'array' and jsonb_array_length(photos) <= 8),
  photo_alts  jsonb not null default '{}'::jsonb check (jsonb_typeof(photo_alts) = 'object'),
  pinned      boolean not null default false,
  pinned_at   timestamptz,
  edited      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists group_posts_group_idx on group_posts (group_id, created_at desc);

create table if not exists group_post_reactions (
  post_id   uuid not null references group_posts(id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reaction  text not null check (length(reaction) between 1 and 32),
  primary key (post_id, user_id)
);

create table if not exists group_events (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  host        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title       text not null check (length(btrim(title)) between 1 and 120),
  event_date  date not null,
  event_time  text check (event_time is null or length(event_time) <= 40),
  location    text check (location is null or length(location) <= 200),
  descr       text check (descr is null or length(descr) <= 2000),
  capacity    int not null default 0 check (capacity between 0 and 500),
  repeat      text check (repeat is null or repeat in ('weekly', 'biweekly', 'monthly')),
  series_id   uuid,
  created_at  timestamptz not null default now()
);
create index if not exists group_events_group_idx on group_events (group_id, event_date);

create table if not exists group_event_rsvps (
  event_id   uuid not null references group_events(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists group_event_invites (
  event_id    uuid not null references group_events(id) on delete cascade,
  invitee     uuid not null references auth.users(id) on delete cascade,
  invited_by  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (event_id, invitee),
  constraint group_event_invites_not_self check (invitee <> invited_by)
);
create index if not exists group_event_invites_invitee_idx on group_event_invites (invitee);

-- Can the caller READ this event? Members of its group, or someone invited to it. Definer so the
-- invites/members lookups are not themselves filtered by the caller's RLS.
create or replace function can_read_group_event(eid uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (select 1 from group_events e where e.id = eid and is_group_member(e.group_id))
      or exists (select 1 from group_event_invites i where i.event_id = eid and i.invitee = auth.uid());
$$;
revoke all on function can_read_group_event(uuid) from public, anon;
grant execute on function can_read_group_event(uuid) to authenticated;

-- Is the caller invited to event `eid`? Looks at invites ONLY. The events SELECT policy uses this
-- plus is_group_member(group_id) read off the row itself, never can_read_group_event(id): that one
-- finds the event BY ID, and during INSERT ... RETURNING the new row is not yet visible to it, so
-- every event creation was refused (found by scripts/oneoff/verify-group-posts-events-rls.mjs).
create or replace function is_invited_to_group_event(eid uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (select 1 from group_event_invites i where i.event_id = eid and i.invitee = auth.uid());
$$;
revoke all on function is_invited_to_group_event(uuid) from public, anon;
grant execute on function is_invited_to_group_event(uuid) to authenticated;

-- May the caller invite `who` to event `eid`? An active member of its group, not blocked by `who`,
-- and in a private group only a fellow active member.
create or replace function can_invite_to_group_event(eid uuid, who uuid) returns boolean
language sql security definer stable set search_path = public, pg_temp as $$
  select exists (
    select 1 from group_events e join groups g on g.id = e.group_id
    where e.id = eid
      and is_group_member(e.group_id)
      and not exists (select 1 from blocked_users b where b.blocker = who and b.blocked = auth.uid())
      and (g.visibility is distinct from 'private'
           or exists (select 1 from group_members m where m.group_id = e.group_id and m.user_id = who and m.status = 'active'))
  );
$$;
revoke all on function can_invite_to_group_event(uuid, uuid) from public, anon;
grant execute on function can_invite_to_group_event(uuid, uuid) to authenticated;

-- RSVP capacity: counted under a row lock on the event, so two last-seat RSVPs cannot both land.
create or replace function guard_group_event_capacity() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare cap int; n int;
begin
  select capacity into cap from group_events where id = new.event_id for update;
  if cap is not null and cap > 0 then
    select count(*) into n from group_event_rsvps where event_id = new.event_id;
    if n >= cap then raise exception 'This event is full' using errcode = 'P0001'; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_group_event_capacity on group_event_rsvps;
create trigger trg_group_event_capacity before insert on group_event_rsvps
  for each row execute function guard_group_event_capacity();

-- A post's author may change its text/photos; only a manager may change pinned. An UPDATE policy
-- cannot pin columns, so this does.
create or replace function guard_group_post_update() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.group_id is distinct from old.group_id or new.author is distinct from old.author or new.created_at is distinct from old.created_at then
    raise exception 'a post cannot move groups or change author';
  end if;
  if (new.pinned is distinct from old.pinned or new.pinned_at is distinct from old.pinned_at) and not is_group_manager(old.group_id) then
    raise exception 'only an organizer or moderator can pin a post';
  end if;
  if (new.body is distinct from old.body or new.photos is distinct from old.photos or new.photo_alts is distinct from old.photo_alts or new.edited is distinct from old.edited)
     and old.author is distinct from auth.uid() then
    raise exception 'only the author can edit a post';
  end if;
  return new;
end $$;
drop trigger if exists trg_group_post_update on group_posts;
create trigger trg_group_post_update before update on group_posts
  for each row execute function guard_group_post_update();

create or replace function guard_group_event_update() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.group_id is distinct from old.group_id or new.host is distinct from old.host then
    raise exception 'an event cannot move groups or change host';
  end if;
  return new;
end $$;
drop trigger if exists trg_group_event_update on group_events;
create trigger trg_group_event_update before update on group_events
  for each row execute function guard_group_event_update();

alter table group_posts          enable row level security;
alter table group_post_reactions enable row level security;
alter table group_events         enable row level security;
alter table group_event_rsvps    enable row level security;
alter table group_event_invites  enable row level security;

-- posts
drop policy if exists "group posts read by members" on group_posts;
create policy "group posts read by members" on group_posts for select using (is_group_member(group_id));
drop policy if exists "group posts written by members as themselves" on group_posts;
create policy "group posts written by members as themselves" on group_posts for insert
  with check (auth.uid() = author and is_group_member(group_id));
drop policy if exists "group posts edited by author or pinned by a manager" on group_posts;
create policy "group posts edited by author or pinned by a manager" on group_posts for update
  using (auth.uid() = author or is_group_manager(group_id))
  with check (auth.uid() = author or is_group_manager(group_id));
drop policy if exists "group posts deleted by author or a manager" on group_posts;
create policy "group posts deleted by author or a manager" on group_posts for delete
  using (auth.uid() = author or is_group_manager(group_id));

-- reactions
drop policy if exists "post reactions read by members" on group_post_reactions;
create policy "post reactions read by members" on group_post_reactions for select
  using (exists (select 1 from group_posts p where p.id = post_id and is_group_member(p.group_id)));
drop policy if exists "post reactions set by members as themselves" on group_post_reactions;
create policy "post reactions set by members as themselves" on group_post_reactions for insert
  with check (auth.uid() = user_id and exists (select 1 from group_posts p where p.id = post_id and is_group_member(p.group_id)));
drop policy if exists "post reactions changed by their owner" on group_post_reactions;
create policy "post reactions changed by their owner" on group_post_reactions for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "post reactions cleared by their owner" on group_post_reactions;
create policy "post reactions cleared by their owner" on group_post_reactions for delete
  using (auth.uid() = user_id);

-- events
drop policy if exists "group events read by members or invitees" on group_events;
create policy "group events read by members or invitees" on group_events for select
  using (is_group_member(group_id) or is_invited_to_group_event(id));
drop policy if exists "group events created per the group's event policy" on group_events;
create policy "group events created per the group's event policy" on group_events for insert
  with check (
    auth.uid() = host and is_group_member(group_id)
    and (is_group_manager(group_id)
         or exists (select 1 from groups g where g.id = group_id and coalesce(g.event_policy, 'anyone') = 'anyone'))
  );
drop policy if exists "group events edited by the host" on group_events;
create policy "group events edited by the host" on group_events for update
  using (auth.uid() = host) with check (auth.uid() = host);
drop policy if exists "group events cancelled by host or a manager" on group_events;
create policy "group events cancelled by host or a manager" on group_events for delete
  using (auth.uid() = host or is_group_manager(group_id));

-- rsvps
drop policy if exists "rsvps read by whoever can read the event" on group_event_rsvps;
create policy "rsvps read by whoever can read the event" on group_event_rsvps for select
  using (can_read_group_event(event_id));
drop policy if exists "rsvp as yourself" on group_event_rsvps;
create policy "rsvp as yourself" on group_event_rsvps for insert
  with check (auth.uid() = user_id and can_read_group_event(event_id));
drop policy if exists "withdraw your own rsvp" on group_event_rsvps;
create policy "withdraw your own rsvp" on group_event_rsvps for delete using (auth.uid() = user_id);

-- invites
drop policy if exists "event invites read by members or the invitee" on group_event_invites;
create policy "event invites read by members or the invitee" on group_event_invites for select
  using (auth.uid() = invitee or can_read_group_event(event_id));
drop policy if exists "event invites sent by members as themselves" on group_event_invites;
create policy "event invites sent by members as themselves" on group_event_invites for insert
  with check (auth.uid() = invited_by and can_invite_to_group_event(event_id, invitee));
drop policy if exists "event invites withdrawn by the sender or declined by the invitee" on group_event_invites;
create policy "event invites withdrawn by the sender or declined by the invitee" on group_event_invites for delete
  using (auth.uid() = invited_by or auth.uid() = invitee);

-- Confirm -- expect RLS on all five and these policy counts (posts 4, reactions 4, events 4,
-- rsvps 3, invites 3):
--   select tablename, count(*) from pg_policies
--    where tablename in ('group_posts','group_post_reactions','group_events','group_event_rsvps','group_event_invites')
--    group by tablename order by tablename;
