-- Custom route lists were React state. The asymmetry is what makes this worth fixing:
-- "My Objectives" (`ul_obj`) survives a refresh because it is hydrated from the `objectives`
-- table, while every OTHER list a climber builds silently does not. One list persists and the
-- rest look identical and do not.
--
-- Deferred from 0091 until the write paths were mapped, rather than shipping a table the UI
-- never wrote to (the enriched-columns-outran-the-UI mistake). They are now known: four
-- writes, all in `ListsManager` — create, replace routeIds, remove one route, toggle shared.
-- There is no delete-a-list or rename affordance in the UI, so this migration does not invent
-- policies for actions that cannot happen; add them when the UI does.
--
-- `ul_obj` stays owned by `objectives` and is NOT stored here. One writer per fact.

create table if not exists user_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  icon text,
  -- Route ids are TEXT catalog ids (`wa_mount_baker_north_ridge`), not uuids, and a list is
  -- always read whole. An array column keeps that one row instead of a join table.
  route_ids text[] not null default '{}',
  shared boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_lists_user_idx on user_lists (user_id);

alter table user_lists enable row level security;

-- `shared = true` is honoured as "anyone signed in may read it" — the plain reading of the
-- flag the UI already sets and shows ("Share this list"). Storing the flag and ignoring it
-- would be the same overclaiming this codebase keeps having to undo. A shared list exposes a
-- name and route ids, nothing about its owner beyond user_id.
drop policy if exists "user_lists read own or shared" on user_lists;
create policy "user_lists read own or shared" on user_lists for select
  using (auth.uid() = user_id or shared = true);

drop policy if exists "user_lists insert own" on user_lists;
create policy "user_lists insert own" on user_lists for insert
  with check (auth.uid() = user_id);

-- user_id pinned in the WITH CHECK as well as the USING: without that half, an owner could
-- hand their row to someone else mid-edit. Smallest form of the 0085 lesson.
drop policy if exists "user_lists update own" on user_lists;
create policy "user_lists update own" on user_lists for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- No DELETE policy, deliberately: the UI has no way to delete a list, and with RLS on, an
-- absent policy denies. Add one alongside the affordance, not before it.
-- See `absent-policy-may-be-deliberate`.

-- Confirm -- expect the table and exactly 3 policies (select/insert/update, NO delete):
--   select policyname, cmd from pg_policies where tablename = 'user_lists' order by cmd;
--
-- Then prove it with two real signed-in users, NOT the service key, which bypasses RLS:
--   as A: insert a private list and a shared one
--   as B: select user_lists          -> sees ONLY the shared one
--         update A's list            -> 0 rows
--         insert with user_id = A    -> 42501
--   as A: patch user_id -> B         -> 42501, and the row still belongs to A
--         delete own list            -> 0 rows (no delete policy)
