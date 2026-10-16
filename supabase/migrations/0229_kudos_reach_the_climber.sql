-- 0229 — Kudos reach the climber they are for.
--
-- WHAT WAS BROKEN. "Kudos" on a friend's climb in the Home feed set a key in React state and
-- toasted "Kudos sent to Alex". Nothing was written, so Alex never heard of it and a reload lost
-- it (0091's header recorded the gap). The owner asked on 2026-09-30 that toasts read as the
-- finished app, which makes that toast a promise this table now keeps.
--
-- SHAPE. One row per (giver, climb_logs row). The log id is what the feed item carries
-- (climb_logs.id), and a log is what kudos are FOR, so it is the natural key: a second tap
-- deletes the row (take it back), it never inserts a second one.
--
-- WHO SEES IT. Only the two people involved: the giver (to show their own tick) and the
-- receiver (whose bell reads it). Nobody else can list who gave whom kudos.
--
-- BLOCKS. A climber who has blocked you cannot be sent kudos by you. blocked_users is RLS'd to
-- its own rows, so the check goes through 0095's security-definer profile_owner_blocked_me().
--
-- NON-GOALS. No counts on a climb, no push/email. The receiver's bell is the delivery.

create table if not exists kudos (
  id           uuid primary key default gen_random_uuid(),
  giver        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  receiver     uuid not null references auth.users(id) on delete cascade,
  climb_log_id uuid not null references climb_logs(id) on delete cascade,
  route_name   text check (route_name is null or length(route_name) <= 200),
  created_at   timestamptz not null default now(),
  constraint kudos_not_to_self check (giver <> receiver),
  constraint kudos_once_per_log unique (giver, climb_log_id)
);

create index if not exists kudos_receiver_idx on kudos (receiver, created_at desc);

alter table kudos enable row level security;

drop policy if exists "kudos read by giver or receiver" on kudos;
create policy "kudos read by giver or receiver" on kudos
  for select using (auth.uid() = giver or auth.uid() = receiver);

-- The receiver must be the author of the log the kudos are on, so a row cannot name one climber
-- while pointing at another's climb.
drop policy if exists "kudos give as yourself" on kudos;
create policy "kudos give as yourself" on kudos
  for insert with check (
    auth.uid() = giver
    and not profile_owner_blocked_me(receiver)
    and exists (select 1 from climb_logs l where l.id = climb_log_id and l.user_id = receiver)
  );

drop policy if exists "kudos take back your own" on kudos;
create policy "kudos take back your own" on kudos
  for delete using (auth.uid() = giver);

-- Confirm -- expect three policies (SELECT, INSERT, DELETE) and RLS on:
--   select policyname, cmd from pg_policies where tablename = 'kudos' order by cmd;
--   select relrowsecurity from pg_class where relname = 'kudos';
