-- Per-member read watermark for crew chats.
-- DMs already carry read state (messages.read, 0042); crews_messages has no
-- per-member equivalent, so unread counts for crew chats need a watermark:
-- everything from other members after last_read_at is unread.
-- The app fails closed until this is applied: fetchCrewLastReads returns null
-- on error and the client then skips crew unread badges entirely.

create table if not exists crew_reads (
  crew_id uuid not null references crews(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

alter table crew_reads enable row level security;

drop policy if exists "users manage own crew read marks" on crew_reads;
create policy "users manage own crew read marks" on crew_reads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
