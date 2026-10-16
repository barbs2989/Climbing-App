-- Climbers' own 1-5 reads on DIFFICULTY BREAKDOWN's five axes.
--
-- #2062 reset that card to climbers' reads only: the seeded `routes.difficulty` profile is no
-- longer read, every route starts unrated, and each axis is the plain average of the reads.
-- But the reads were React state (`diffRatings`), so nobody else ever saw one and every route
-- stayed "Nobody has rated this one yet" for everyone, forever. This is where they persist.
--
-- Modelled on hazard_votes (0089), the same shape of thing: one small vote per climber per
-- route per item, aggregated client-side into counts.
--
-- READ IS PUBLIC, for the same reason hazard_votes is: it is route information a signed-out
-- climber planning a trip needs as much as a member does. The rows carry user_id so a person
-- can change or withdraw their own read, not to publish who said what -- the UI only ever
-- renders an average and a count.
create table if not exists route_difficulty_ratings (
  id uuid primary key default gen_random_uuid(),
  route_id text not null,
  axis text not null check (axis in ('physical','technical','exposure','commitment','routefinding')),
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- One read per climber per axis. Without this one person could stack fives and set a route's
-- difficulty for everyone on their own.
create unique index if not exists route_difficulty_ratings_one_per_user_uidx
  on route_difficulty_ratings (route_id, axis, user_id);
create index if not exists route_difficulty_ratings_route_idx on route_difficulty_ratings (route_id);

alter table route_difficulty_ratings enable row level security;

drop policy if exists "difficulty ratings public read" on route_difficulty_ratings;
create policy "difficulty ratings public read" on route_difficulty_ratings for select using (true);

-- Constrain WHAT, not just WHO (0082/0085): the axis and the value are pinned here as well as
-- by the column CHECKs.
drop policy if exists "difficulty ratings insert own" on route_difficulty_ratings;
create policy "difficulty ratings insert own" on route_difficulty_ratings for insert
  with check (auth.uid() = user_id and rating between 1 and 5
    and axis in ('physical','technical','exposure','commitment','routefinding'));

drop policy if exists "difficulty ratings update own" on route_difficulty_ratings;
create policy "difficulty ratings update own" on route_difficulty_ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and rating between 1 and 5
    and axis in ('physical','technical','exposure','commitment','routefinding'));

-- Withdrawing a read is how the UI's toggle-off works (tap your own number again).
drop policy if exists "difficulty ratings delete own" on route_difficulty_ratings;
create policy "difficulty ratings delete own" on route_difficulty_ratings for delete
  using (auth.uid() = user_id);

-- A WITH CHECK cannot pin columns it does not name, so an update could otherwise move a read
-- onto a different route or axis and carry its history with it.
create or replace function guard_difficulty_rating_target_immutable() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.route_id is distinct from old.route_id
     or new.axis is distinct from old.axis
     or new.user_id is distinct from old.user_id then
    raise exception 'a difficulty rating cannot change which route, axis or climber it belongs to';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists route_difficulty_ratings_guard_target on route_difficulty_ratings;
create trigger route_difficulty_ratings_guard_target before update on route_difficulty_ratings
  for each row execute function guard_difficulty_rating_target_immutable();

-- Confirm -- expect the table, 4 policies, and the trigger function:
--   select policyname, cmd from pg_policies where tablename = 'route_difficulty_ratings' order by cmd;
--   select proname from pg_proc where proname = 'guard_difficulty_rating_target_immutable';
