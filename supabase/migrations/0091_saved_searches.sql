-- Saved searches were `useState([])`. Save a search, refresh, gone.
--
-- Small, but the UI presents it as a saved thing in two places (the area browser and
-- Logbook -> Lists), with a delete button next to each — the affordances of storage, with no
-- storage.
--
-- SCOPE, deliberately narrow. Two neighbours were considered and left out:
--
--   `user_lists` — custom route lists have the same problem, and the asymmetry is worse:
--     "My Objectives" survives (it is hydrated from `objectives`) while every other list a
--     climber makes does not. NOT done here because `setUserLists` is handed to two child
--     components that write it directly, so persisting it means mapping those write paths
--     first. Shipping the table before the UI writes to it is the mistake in
--     `enriched-columns-outran-the-ui` — an unused column that reads as a working feature.
--
--   `kudos` — looks like a sibling and is not. `giveKudos(name, route)` keys on a NAME
--     string, so there is no addressable recipient to store, and the recipient never learns
--     of it either way. That needs a call-site rework, which is a feature decision. Its toast
--     claimed "Kudos sent to X" when nothing was sent; that claim is corrected in this PR
--     rather than papered over with a table.

create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  -- The filter object is a moving target — the UI's filter shape has changed repeatedly — so
  -- store it opaquely rather than pinning today's keys into columns that will drift.
  query jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists saved_searches_user_idx on saved_searches (user_id);

alter table saved_searches enable row level security;

-- Private, full stop. There is no sharing concept here and none is implied.
drop policy if exists "saved_searches read own" on saved_searches;
create policy "saved_searches read own" on saved_searches for select
  using (auth.uid() = user_id);

-- WHO is pinned on every verb, and on UPDATE it is pinned in the WITH CHECK as well as the
-- USING — without that half, a row could be reassigned to another user mid-edit. That is the
-- 0085 lesson in its smallest form.
drop policy if exists "saved_searches insert own" on saved_searches;
create policy "saved_searches insert own" on saved_searches for insert
  with check (auth.uid() = user_id);

drop policy if exists "saved_searches update own" on saved_searches;
create policy "saved_searches update own" on saved_searches for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "saved_searches delete own" on saved_searches;
create policy "saved_searches delete own" on saved_searches for delete
  using (auth.uid() = user_id);

-- Confirm -- expect the table and 4 policies:
--   select policyname, cmd from pg_policies where tablename = 'saved_searches' order by cmd;
--
-- Then prove it with two real signed-in users, NOT the service key, which bypasses RLS:
--   as A: insert a saved search
--   as B: select saved_searches            -> 0 rows (A's is invisible)
--         update/delete A's row by id      -> 0 rows
--         insert one with user_id = A      -> 42501
