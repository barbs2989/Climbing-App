-- The climbing lists a climber chose to see on Home.
--
-- Every list counts every logged climb whether or not it is tracked: progress is derived from the
-- climber's logs, never stored. This row only says which lists Home shows, in the order picked, so
-- the choice follows the climber to a new phone. Strava shows the challenges you JOINED on your
-- profile and theCrag lets you star the lists you care about; this is the same choice.
--
-- Owner-only, same shape and reasoning as profile_condition_prefs (0290): `profiles` is read with
-- select("*") by other climbers' screens, so a column there would be public.
--
-- keys holds the list keys the app declares in ClimbMatchCore's Challenges (bulgers, co14, cascade,
-- ca14, fifty, desert, quiver, ...). A key the app no longer draws is ignored by the reader, so
-- removing a list never breaks a row. Bounded so a bad write cannot store anything large.
create table if not exists public.profile_tracked_lists (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  keys text[] not null default '{}' check (cardinality(keys) <= 40 and pg_column_size(keys) < 2000),
  updated_at timestamptz not null default now()
);
alter table public.profile_tracked_lists enable row level security;
drop policy if exists "read own tracked lists" on public.profile_tracked_lists;
create policy "read own tracked lists" on public.profile_tracked_lists for select using (auth.uid() = user_id);
drop policy if exists "insert own tracked lists" on public.profile_tracked_lists;
create policy "insert own tracked lists" on public.profile_tracked_lists for insert with check (auth.uid() = user_id);
drop policy if exists "update own tracked lists" on public.profile_tracked_lists;
create policy "update own tracked lists" on public.profile_tracked_lists for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own tracked lists" on public.profile_tracked_lists;
create policy "delete own tracked lists" on public.profile_tracked_lists for delete using (auth.uid() = user_id);

comment on table public.profile_tracked_lists is
  'The climbing lists a climber chose to show on Home, in order. Progress is derived from logs and counts for every list regardless. Owner-only.';
