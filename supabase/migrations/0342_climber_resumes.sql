-- A climber's résumé reaches other climbers.
--
-- The résumé has three parts its owner writes by hand: a HEADLINE, COURSES & TRAINING, and past
-- climbs added by hand ("Add a past climb"). Until now all three were useState in App -- they
-- vanished on reload and no other climber could ever see them, so another climber's résumé only
-- ever showed the logged climbs they had made public. The owner's note (2026-10-21): "Viewing
-- others resume on their profile doesn't work" ... "make it for real climbers".
--
-- One row per climber. Readable by the owner always, and by anyone else only while the owner's
-- profiles.resume_public is on (0177, default true) -- the same switch that already shows or hides
-- the résumé button. The read goes through `profiles`, so a climber the owner BLOCKED (0095:
-- profile_owner_blocked_me) reads no profile row and therefore no résumé either.
begin;

create table if not exists public.climber_resumes (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  headline   text  not null default '' check (char_length(headline) <= 200),
  courses    jsonb not null default '[]'::jsonb check (jsonb_typeof(courses) = 'array' and jsonb_array_length(courses) <= 60),
  climbs     jsonb not null default '[]'::jsonb check (jsonb_typeof(climbs) = 'array' and jsonb_array_length(climbs) <= 400),
  updated_at timestamptz not null default now()
);

comment on table public.climber_resumes is
  'The hand-written parts of a climber''s résumé (0342): headline, courses [{name,org,date,self}], past climbs added by hand [{date,name,area,grade,disc,role}]. Logged climbs come from climb_logs, not here.';

alter table public.climber_resumes enable row level security;

drop policy if exists "resume owner or public read" on public.climber_resumes;
create policy "resume owner or public read" on public.climber_resumes for select
  using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = climber_resumes.user_id and p.resume_public)
  );

drop policy if exists "resume owner insert" on public.climber_resumes;
create policy "resume owner insert" on public.climber_resumes for insert
  with check (auth.uid() = user_id);

drop policy if exists "resume owner update" on public.climber_resumes;
create policy "resume owner update" on public.climber_resumes for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "resume owner delete" on public.climber_resumes;
create policy "resume owner delete" on public.climber_resumes for delete
  using (auth.uid() = user_id);

grant select on public.climber_resumes to anon, authenticated;
grant insert, update, delete on public.climber_resumes to authenticated;

commit;

-- PostgREST caches the schema; without this the new table answers 404 (PGRST205) until the next reload.
notify pgrst, 'reload schema';
