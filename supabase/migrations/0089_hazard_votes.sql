-- "Still there" / "Gone now" votes on a route's reported hazards.
--
-- These have never persisted. hzVotes is React state keyed by "<routeId>|<label>", so a
-- climber reporting that the rockfall has cleared told nobody and lost it on refresh --
-- while the route page presents the result as community consensus.
--
-- READ IS PUBLIC. This is route safety information; a signed-out climber checking
-- conditions before driving out needs it as much as a member does, and the same page
-- already shows public trip reports. The vote rows carry a user_id so a person can change
-- or withdraw their own vote, not to publish who said what -- the UI only ever renders
-- counts.
create table if not exists hazard_votes (
  id uuid primary key default gen_random_uuid(),
  route_id text not null,
  hazard_label text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote text not null check (vote in ('still','gone')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- One vote per climber per hazard. Without this a single user could stack "gone" votes
-- and clear a hazard for everyone on their own.
create unique index if not exists hazard_votes_one_per_user_uidx
  on hazard_votes (route_id, hazard_label, user_id);
create index if not exists hazard_votes_route_idx on hazard_votes (route_id);

alter table hazard_votes enable row level security;

drop policy if exists "hazard votes public read" on hazard_votes;
create policy "hazard votes public read" on hazard_votes for select using (true);

-- Constrain WHAT, not just WHO (0082/0085): the vote value is pinned to the two legal
-- options here as well as by the column CHECK, so a client cannot invent a third state
-- that the aggregate would then have to guess about.
drop policy if exists "hazard votes insert own" on hazard_votes;
create policy "hazard votes insert own" on hazard_votes for insert
  with check (auth.uid() = user_id and vote in ('still','gone'));

drop policy if exists "hazard votes update own" on hazard_votes;
create policy "hazard votes update own" on hazard_votes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and vote in ('still','gone'));

-- Withdrawing a vote is how the UI's toggle-off works.
drop policy if exists "hazard votes delete own" on hazard_votes;
create policy "hazard votes delete own" on hazard_votes for delete
  using (auth.uid() = user_id);

-- A WITH CHECK cannot pin columns it does not name, so an update could otherwise move a
-- vote onto a different route or hazard and carry its history with it.
create or replace function guard_hazard_vote_target_immutable() returns trigger
language plpgsql as $$
begin
  if new.route_id is distinct from old.route_id
     or new.hazard_label is distinct from old.hazard_label
     or new.user_id is distinct from old.user_id then
    raise exception 'a hazard vote cannot change which hazard or climber it belongs to';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists hazard_votes_guard_target on hazard_votes;
create trigger hazard_votes_guard_target before update on hazard_votes
  for each row execute function guard_hazard_vote_target_immutable();

-- Confirm -- expect the table, 4 policies, and the trigger function:
--   select policyname, cmd from pg_policies where tablename = 'hazard_votes' order by cmd;
--   select proname from pg_proc where proname = 'guard_hazard_vote_target_immutable';
--
-- And that one climber cannot vote twice on the same hazard (second insert must fail 23505):
--   insert into hazard_votes (route_id, hazard_label, user_id, vote)
--     values ('wa_mount_baker_north_ridge','Rockfall','<uid>','gone');
--   insert into hazard_votes (route_id, hazard_label, user_id, vote)
--     values ('wa_mount_baker_north_ridge','Rockfall','<uid>','still');
