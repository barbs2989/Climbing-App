-- Which alerts a climber has SEEN and which they CLEARED, kept on the account.
--
-- Nearly every alert is derived from another read (kudos, an accepted friend request, a catch, a
-- group post, an anniversary...), and "read" and "dismissed" lived only in React state. So a reload
-- brought every one of them back, unread and undismissed: thirty old kudos were "new" each visit, and
-- Clear all lasted until the tab closed. GitHub's notification inbox and Strava's bell keep this on the
-- account, so Done and read survive a reload and reach the next device; this is the same thing.
--
-- One owner-only row per climber. The ids are the app's own alert ids ("kudos_<id>", "anniv_<route>_<date>",
-- ...). The app keeps the most recent 300 of each, so the arrays stay bounded; an id the app no longer
-- derives is simply never matched. Table notices (0307) still carry their own read_at.
create table if not exists public.notification_state (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  seen_ids text[] not null default '{}' check (cardinality(seen_ids) <= 300 and pg_column_size(seen_ids) < 40000),
  dismissed_ids text[] not null default '{}' check (cardinality(dismissed_ids) <= 300 and pg_column_size(dismissed_ids) < 40000),
  updated_at timestamptz not null default now()
);
alter table public.notification_state enable row level security;
drop policy if exists "read own notification state" on public.notification_state;
create policy "read own notification state" on public.notification_state for select using (auth.uid() = user_id);
drop policy if exists "insert own notification state" on public.notification_state;
create policy "insert own notification state" on public.notification_state for insert with check (auth.uid() = user_id);
drop policy if exists "update own notification state" on public.notification_state;
create policy "update own notification state" on public.notification_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own notification state" on public.notification_state;
create policy "delete own notification state" on public.notification_state for delete using (auth.uid() = user_id);

comment on table public.notification_state is
  'The alert ids a climber has seen and cleared, so read and Clear survive a reload and follow the account. Owner-only.';
