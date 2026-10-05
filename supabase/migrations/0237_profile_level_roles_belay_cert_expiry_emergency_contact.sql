-- The profile editor asked for things it could not keep, and lacked things a climbing partner needs.
--
-- Audited 2026-10-01 against Mountain Project's partner finder, mtnprofile and The Mountaineers:
--
--   * EXPERIENCE LEVEL was collected (Beginner..Expert) and stored nowhere -- `profiles` had no
--     column, so it reverted on the next load. `check:profile-draft-persists` listed it NOT_A_COLUMN.
--   * The crew float plan reads the climber's EMERGENCY CONTACT, and there was no way to enter one,
--     so for every real account it was null.
--   * Grades were three free-text boxes with no LEAD/FOLLOW, the thing a partner most needs to know,
--     and nothing for ice, mixed or aid although the editor offers all three as disciplines.
--   * The profile invited "belay devices" and had no field for them.
--   * A certification's EXPIRY was welded into its name ("WFR · exp 6/27"), so nothing could tell an
--     expired one from a current one.
--
-- All nullable with no default: NULL means "not asked yet", which is the truth for every existing row.
-- No RLS change for the `profiles` columns -- its policies are row-level, and these are as public as
-- the bio beside them (they are what a partner reads before roping up).

alter table public.profiles
  add column if not exists level text,
  add column if not exists climb_grades jsonb,
  add column if not exists belay_devices jsonb,
  add column if not exists cert_expiry jsonb;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_level_check') then
    alter table public.profiles add constraint profiles_level_check
      check (level is null or level in ('Beginner','Intermediate','Advanced','Expert'));
  end if;
end $$;

comment on column public.profiles.level is
  'Self-reported experience level: Beginner, Intermediate, Advanced or Expert. NULL = not set.';
comment on column public.profiles.climb_grades is
  'Per-discipline extras beside sport_grade/trad_grade/boulder_grade: {"sport":{"role":"lead"},"ice":{"grade":"WI4","role":"follow"},...}. role is lead or follow; grade is set only for ice, mixed and aid, whose grades have no column of their own.';
comment on column public.profiles.belay_devices is
  'Belay devices the climber uses and how well: {"atc":"Proficient","grigri":"Expert"}. Levels: Learning, Proficient, Expert.';
comment on column public.profiles.cert_expiry is
  'Expiry DATE (YYYY-MM-DD) per certification, keyed by the certification''s text in profiles.certifications. A certification with no key does not expire or has no date given.';

-- The emergency contact is NOT public. Same shape and reasoning as profile_zips (0189): an
-- owner-only table, so nobody else can select it. The climber's own float plan reads it; the app
-- never sends it anywhere -- the float plan tells the climber to send it themselves.
create table if not exists public.profile_emergency_contacts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  phone text not null check (length(btrim(phone)) between 3 and 32),
  updated_at timestamptz not null default now()
);
alter table public.profile_emergency_contacts enable row level security;
drop policy if exists "read own emergency contact" on public.profile_emergency_contacts;
create policy "read own emergency contact" on public.profile_emergency_contacts for select using (auth.uid() = user_id);
drop policy if exists "insert own emergency contact" on public.profile_emergency_contacts;
create policy "insert own emergency contact" on public.profile_emergency_contacts for insert with check (auth.uid() = user_id);
drop policy if exists "update own emergency contact" on public.profile_emergency_contacts;
create policy "update own emergency contact" on public.profile_emergency_contacts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own emergency contact" on public.profile_emergency_contacts;
create policy "delete own emergency contact" on public.profile_emergency_contacts for delete using (auth.uid() = user_id);

comment on table public.profile_emergency_contacts is
  'A climber''s emergency contact, readable and writable by its owner ONLY (like profile_zips). Read by their own float plan.';
