-- 0236 — A partner typed by NAME is kept, and only the climber who typed it can read it.
--
-- WHAT WAS BROKEN. CLIMBED WITH says "Add anyone — they don't need ClimbMatch", and a name typed
-- there was dropped on save: climb_logs.partners is uuid[] (accounts, for confirmation and Ranks),
-- and nothing held a plain name. So after a reload a climb logged "with Jamie" read as solo on the
-- climber's own trip report, résumé partner column, recap and anniversary alert.
--
-- WHY NOT A COLUMN ON climb_logs. A climb_logs row is readable by anyone the trip report is shared
-- with, and RLS is per ROW, not per column. A typed name belongs to somebody who has no account
-- and never agreed to be listed, and the visibility copy promises partners' names stay with you.
-- A separate table whose every policy is the owner keeps that promise structurally.
--
-- SHAPE. One row per climb_logs row (log_id is the key), `names` the typed names in the order
-- given. The client upserts it on every save and deletes it when no typed names remain.
--
-- NON-GOALS. These names never feed Ranks, trust or confirmation — only uuids in
-- climb_logs.partners do. Nothing reads this table but the owner's own log hydration.

create table if not exists climb_log_partner_names (
  log_id     uuid primary key references climb_logs(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  names      text[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint climb_log_partner_names_size check (cardinality(names) <= 20),
  constraint climb_log_partner_names_len check (length(array_to_string(names, '')) <= 2000)
);

create index if not exists climb_log_partner_names_user_idx on climb_log_partner_names (user_id);

alter table climb_log_partner_names enable row level security;

drop policy if exists "partner names read by the climber" on climb_log_partner_names;
create policy "partner names read by the climber" on climb_log_partner_names
  for select using (auth.uid() = user_id);

-- The row must name the caller AND hang off the caller's own log, so nobody can attach names to
-- someone else's climb.
drop policy if exists "partner names written by the climber" on climb_log_partner_names;
create policy "partner names written by the climber" on climb_log_partner_names
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from climb_logs l where l.id = log_id and l.user_id = auth.uid())
  );

drop policy if exists "partner names updated by the climber" on climb_log_partner_names;
create policy "partner names updated by the climber" on climb_log_partner_names
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from climb_logs l where l.id = log_id and l.user_id = auth.uid())
  );

drop policy if exists "partner names removed by the climber" on climb_log_partner_names;
create policy "partner names removed by the climber" on climb_log_partner_names
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on climb_log_partner_names to authenticated;
revoke all on climb_log_partner_names from anon;

-- Confirm -- expect four policies (SELECT, INSERT, UPDATE, DELETE) and RLS on:
--   select policyname, cmd from pg_policies where tablename = 'climb_log_partner_names' order by cmd;
--   select relrowsecurity from pg_class where relname = 'climb_log_partner_names';
