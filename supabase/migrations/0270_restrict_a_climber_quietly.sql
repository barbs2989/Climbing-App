-- RESTRICT: a quiet alternative to a block (phase 5, item 7 of docs/SAFETY-AND-MODERATION-PLAN.md),
-- the way Messenger and Instagram offer it.
--
-- A block is loud: the other climber finds they cannot reach you. Sometimes that escalates things --
-- an ex-partner, a pushy crew member, someone you will meet at the crag anyway. Restricting changes only
-- what YOU see: their messages arrive in Message requests without a badge or a notification, and their
-- friend requests stop pinging you. They are not told and nothing refuses them, so there is nothing
-- here for the server to enforce -- only a private list that follows you across devices.
--
-- Like blocked_users (0088): directional, readable only by the person who made it (who restricted you
-- is never discoverable), no UPDATE policy because a restriction has nothing to amend.
create table if not exists restricted_users (
  id         uuid primary key default gen_random_uuid(),
  restrictor uuid not null references auth.users(id) on delete cascade,
  restricted uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint restricted_users_no_self check (restrictor <> restricted)
);
create unique index if not exists restricted_users_pair_uidx on restricted_users (restrictor, restricted);
alter table restricted_users enable row level security;

drop policy if exists "restricted read own" on restricted_users;
create policy "restricted read own" on restricted_users for select using (auth.uid() = restrictor);
drop policy if exists "restricted insert own" on restricted_users;
create policy "restricted insert own" on restricted_users for insert with check (auth.uid() = restrictor);
drop policy if exists "restricted delete own" on restricted_users;
create policy "restricted delete own" on restricted_users for delete using (auth.uid() = restrictor);

-- Confirm:
--   node scripts/oneoff/probe-restrict-is-private.mjs   (two real accounts; must end 0 failed)
