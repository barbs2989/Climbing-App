-- ClimbMatch Phase 1 (crews/objectives backend, Phase B) — real crew persistence.
-- Apply in the Supabase SQL Editor AFTER 0031_objectives.sql.
--
-- Scope: the core fields needed for crews to survive a refresh and be discoverable
-- by real users, matching ClimbMatch.jsx's crews[] shape. Deliberately NOT modeled
-- here (left as client-only for now): the pre-climb checklist (`acks`), safety-ready
-- marks (`safetyDone`), in-flight member-removal votes (`removeVotes`), and the
-- legacy single-date fields (`date`/`dateAcks`, superseded by `dates`/crew_day_acks).
--
-- route_id has no FK to routes(id), same reasoning as 0031_objectives.sql: a crew's
-- climb can be either a real DB route or a seed-only ROUTES id.

create table crews (
  id          uuid primary key default gen_random_uuid(),
  route_id    text not null,
  created_by  uuid references profiles(id),
  dates       jsonb not null default '[]',   -- proposed candidate days, e.g. ["2026-06-14"]
  meet_time   text,
  meet_place  text,
  float_plan  jsonb,                          -- {vehicle,lot,depart,ret,contact,notes} — SENSITIVE, see RLS below
  cap         integer not null default 4,
  dismissed   boolean not null default false, -- soft-archive to "Past Crews"
  created_at  timestamptz default now()
);

create table crew_members (
  crew_id    uuid references crews(id) on delete cascade,
  user_id    uuid references profiles(id) on delete cascade,
  status     text not null default 'invited', -- invited | pending | confirmed
  note       text,
  joined_at  timestamptz default now(),
  primary key (crew_id, user_id)
);

-- Day-acking lives in its own table (rather than a jsonb column on crews) specifically
-- so a member can ack/un-ack their own day with a narrow, trivially-safe RLS policy —
-- self-insert/self-delete only — without ever needing UPDATE access to the crews row
-- itself, which would otherwise create a path for a member to also rewrite float_plan
-- or meet_place via a raw client call. See docs/BACKEND.md's floatPlan privacy note.
create table crew_day_acks (
  crew_id  uuid references crews(id) on delete cascade,
  user_id  uuid references profiles(id) on delete cascade,
  date     date not null,
  primary key (crew_id, user_id, date)
);

create index crews_route_idx on crews(route_id);
create index crew_members_user_idx on crew_members(user_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- crews holds float_plan/meet_place/meet_time (sensitive — see docs/BACKEND.md:
-- "shared with your emergency contact... can call for help if you're overdue").
-- Base-table read is organizer-or-confirmed-member ONLY, never public. Public
-- "browse open crews" (CrewFinder) is served by the crew_listings view below,
-- which exposes only a safe column subset by construction (float_plan/meet_place
-- are simply not selected, not filtered) — see the view's security_invoker note.
alter table crews enable row level security;
create policy "crew members can read" on crews for select using (
  auth.uid() = created_by
  or exists (select 1 from crew_members m where m.crew_id = crews.id and m.user_id = auth.uid() and m.status = 'confirmed')
);
create policy "authenticated users can create crews" on crews for insert with check (auth.uid() = created_by);
create policy "organizer can update own crew" on crews for update using (auth.uid() = created_by);
create policy "organizer can delete own crew" on crews for delete using (auth.uid() = created_by);

-- crew_members: identity of who's on a crew is already public today (OPEN_CREWS
-- exposes member climberIds for headcount on browse cards), so public read here
-- matches existing exposure — it's just membership + status, no float plan.
alter table crew_members enable row level security;
create policy "crew membership is public read" on crew_members for select using (true);
create policy "join or invite" on crew_members for insert with check (
  auth.uid() = user_id  -- requesting to join yourself
  or auth.uid() = (select created_by from crews where id = crew_id)  -- organizer inviting someone
);
create policy "self or organizer can update membership" on crew_members for update using (
  auth.uid() = user_id or auth.uid() = (select created_by from crews where id = crew_id)
);
create policy "self or organizer can remove membership" on crew_members for delete using (
  auth.uid() = user_id or auth.uid() = (select created_by from crews where id = crew_id)
);

-- crew_day_acks: members-only read (matches crews' sensitivity level — a date being
-- finalized isn't float-plan-sensitive, but isn't a public listing detail either).
-- Self-insert/self-delete only, by construction (see the table comment above) — a
-- member can never touch anyone else's ack, or any column on the crews row itself.
alter table crew_day_acks enable row level security;
create policy "crew members can read acks" on crew_day_acks for select using (
  exists (select 1 from crew_members m where m.crew_id = crew_day_acks.crew_id and m.user_id = auth.uid() and m.status = 'confirmed')
  or exists (select 1 from crews c where c.id = crew_day_acks.crew_id and c.created_by = auth.uid())
);
create policy "members ack their own day" on crew_day_acks for insert with check (auth.uid() = user_id);
create policy "members un-ack their own day" on crew_day_acks for delete using (auth.uid() = user_id);

-- Public, float-plan-free listing for CrewFinder's "browse open crews" — created
-- with security_invoker = false (view owner's privileges, the Postgres default)
-- specifically so it can read the sensitive crews table and re-expose ONLY the
-- columns selected here. There is no way to leak float_plan/meet_place through
-- this view: they are not present in its SELECT list, not merely filtered out.
create view crew_listings as
select
  c.id, c.route_id, c.created_by, c.cap, c.dates, c.created_at,
  (select count(*) from crew_members m where m.crew_id = c.id and m.status = 'confirmed') as confirmed_count
from crews c
where not c.dismissed;
grant select on crew_listings to anon, authenticated;
