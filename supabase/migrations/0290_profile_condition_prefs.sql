-- "Your conditions" follows the climber to a new phone.
--
-- The ideal temperature band, the wind they are happy in and how long they give rock after rain were
-- kept in localStorage, so a new device or a cleared browser lost them and the conditions score went
-- back to the defaults. They now also live here, one row per climber.
--
-- An owner-only table, same shape and reasoning as profile_emergency_contacts (0237): `profiles` is
-- read with select("*") by other climbers' screens, so a column there would be public. Nobody but the
-- owner can select, insert, update or delete this row.
--
-- prefs is the app's own object, validated in the client (lib/CondPrefs.jsx cleanPrefs) and bounded
-- here so a bad write cannot store anything large or of the wrong kind:
--   {"rain":"normal"|"cautious",
--    "temp":{"all":[lo,hi],"sport":[lo,hi],"trad":[lo,hi],"toprope":[lo,hi],"bouldering":[lo,hi],"alpine":[lo,hi],"ice":[lo,hi]},
--    "wind":[lo,hi], "rhMax":<%>, "sun":"sun"|"shade"|"either", "aq":"sensitive"|"relaxed", "window":[startHr,endHr]}
-- (Numbered 0290: written as 0284, renumbered when main took 0284 first. Applied by hand 2026-10-14.)
-- Temperatures are degrees F and wind is mph whatever units the climber reads them in. Every key is
-- optional: a missing one means "use the default", never zero.
create table if not exists public.profile_condition_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb check (jsonb_typeof(prefs) = 'object' and pg_column_size(prefs) < 2000),
  updated_at timestamptz not null default now()
);
alter table public.profile_condition_prefs enable row level security;
drop policy if exists "read own condition prefs" on public.profile_condition_prefs;
create policy "read own condition prefs" on public.profile_condition_prefs for select using (auth.uid() = user_id);
drop policy if exists "insert own condition prefs" on public.profile_condition_prefs;
create policy "insert own condition prefs" on public.profile_condition_prefs for insert with check (auth.uid() = user_id);
drop policy if exists "update own condition prefs" on public.profile_condition_prefs;
create policy "update own condition prefs" on public.profile_condition_prefs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own condition prefs" on public.profile_condition_prefs;
create policy "delete own condition prefs" on public.profile_condition_prefs for delete using (auth.uid() = user_id);

comment on table public.profile_condition_prefs is
  'A climber''s conditions-score preferences (ideal temperature range per discipline, wind they accept, rain caution). Owner-only; never joined into a public read.';
