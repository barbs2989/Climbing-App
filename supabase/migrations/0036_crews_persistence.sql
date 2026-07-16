-- Feedback Loop Phase 1: Crews Persistence
-- Stores crew data (trip parties) with real, tested RLS.
--
-- This replaces an earlier draft of this migration that had four confirmed bugs,
-- caught during review before it was ever applied live:
--   1. route_id had a hard FK to routes(id) - breaks for any seed-only ROUTES id
--      (most of this app's catalog runs on in-memory seed data, not the DB - see
--      CLAUDE.md). route_id is intentionally a loose text reference here instead,
--      same reasoning as 0031_objectives.sql.
--   2. The app's sync layer tried to write a `dayAcks` field directly onto the
--      crews row, but no such column existed - every update would fail. Day-acks
--      get their own table below instead (see its comment for why).
--   3. The frontend's "my crews" query only matched crews you created, never
--      crews you're a confirmed member of.
--   4. Local demo/seed crews (fake trip parties used for onboarding/testing) would
--      get synced to a real signed-in user's live Supabase row, since the sync
--      logic couldn't distinguish real crews from seed data by id shape alone.
--      route_id/crew_members below only ever get populated by explicit app calls
--      keyed to a real signed-in user_id, not an automatic "sync everything local"
--      effect - see the frontend crews wiring in ClimbMatch.jsx/lib/db.js.

-- Safe to run whether or not an earlier, buggy version of this table was already
-- applied: CASCADE only drops dependent objects (climb_logs' FK constraint, if
-- climb_logs exists yet), never rows in an unrelated table. The FK is re-added
-- at the bottom of this file once the corrected crews table exists again.
drop table if exists crews cascade;

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

-- Day-acking lives in its own table (rather than a jsonb/column on crews)
-- specifically so a member can ack/un-ack their own day with a narrow,
-- trivially-safe RLS policy - self-insert/self-delete, requiring confirmed
-- membership - without ever needing UPDATE access to the crews row itself,
-- which would otherwise be the only way to let members participate in
-- date-planning while also opening a path to rewrite float_plan/meet_place.
create table crew_day_acks (
  crew_id  uuid references crews(id) on delete cascade,
  user_id  uuid references profiles(id) on delete cascade,
  date     date not null,
  primary key (crew_id, user_id, date)
);

create index crews_route_idx on crews(route_id);
create index crew_members_user_idx on crew_members(user_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- crews holds float_plan/meet_place/meet_time (sensitive - see docs/BACKEND.md:
-- "shared with your emergency contact... can call for help if you're overdue").
-- Base-table read is organizer-or-confirmed-member ONLY, never public. Public
-- "browse open crews" is served by the crew_listings view below, which exposes
-- only a safe column subset by construction (float_plan/meet_place are simply
-- not selected, not filtered) - see the view's security_invoker note.
alter table crews enable row level security;
create policy "crew members can read" on crews for select using (
  auth.uid() = created_by
  or exists (select 1 from crew_members m where m.crew_id = crews.id and m.user_id = auth.uid() and m.status = 'confirmed')
);
create policy "authenticated users can create crews" on crews for insert with check (auth.uid() = created_by);
create policy "organizer can update own crew" on crews for update using (auth.uid() = created_by);
create policy "organizer can delete own crew" on crews for delete using (auth.uid() = created_by);

-- crew_members: identity of who's on a crew is already treated as browse-safe
-- info elsewhere in the app (headcount/who's-in on an open-crew card), so
-- public read here matches that - it's just membership + status, no float plan.
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

-- crew_day_acks: members-only read; self-insert/self-delete requiring confirmed
-- membership, by construction - a member can never touch anyone else's ack, or
-- any column on the crews row itself.
alter table crew_day_acks enable row level security;
create policy "crew members can read acks" on crew_day_acks for select using (
  exists (select 1 from crew_members m where m.crew_id = crew_day_acks.crew_id and m.user_id = auth.uid() and m.status = 'confirmed')
  or exists (select 1 from crews c where c.id = crew_day_acks.crew_id and c.created_by = auth.uid())
);
create policy "members ack their own day" on crew_day_acks for insert with check (
  auth.uid() = user_id
  and exists (select 1 from crew_members m where m.crew_id = crew_day_acks.crew_id and m.user_id = auth.uid() and m.status = 'confirmed')
);
create policy "members un-ack their own day" on crew_day_acks for delete using (auth.uid() = user_id);

-- Public, float-plan-free listing for browsing open crews - created with
-- security_invoker = false (view owner's privileges, the Postgres default)
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

-- Re-attach climb_logs' FK to the recreated crews table, if climb_logs already
-- exists (i.e. 0037_logs_persistence.sql ran before this file, or this file is
-- being re-run after climb_logs was added) - dropping crews above cascaded away
-- the old constraint, which needs restoring.
do $$
begin
  if exists (select 1 from information_schema.tables where table_name = 'climb_logs') then
    alter table climb_logs add constraint climb_logs_crew_id_fkey foreign key (crew_id) references crews(id) on delete set null;
  end if;
end $$;

