-- Crew and Direct Messaging Persistence
-- Stores crew group messages and direct 1-on-1 messages with full RLS

create table if not exists crews_messages (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  image_url text,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists crews_messages_crew_idx on crews_messages(crew_id);
create index if not exists crews_messages_user_idx on crews_messages(user_id);
create index if not exists crews_messages_created_idx on crews_messages(created_at);
create index if not exists messages_sender_idx on messages(sender_id);
create index if not exists messages_recipient_idx on messages(recipient_id);
create index if not exists messages_read_idx on messages(read);

-- ── RLS ──────────────────────────────────────────────────────────────────────

-- crews_messages: only crew members can read/write
alter table crews_messages enable row level security;
create policy "crew members can read messages" on crews_messages for select using (
  exists (select 1 from crew_members m where m.crew_id = crews_messages.crew_id and m.user_id = auth.uid() and m.status = 'confirmed')
  or exists (select 1 from crews c where c.id = crews_messages.crew_id and c.created_by = auth.uid())
);
create policy "crew members can send messages" on crews_messages for insert with check (
  auth.uid() = user_id
  and (exists (select 1 from crew_members m where m.crew_id = crew_id and m.user_id = auth.uid() and m.status = 'confirmed')
    or exists (select 1 from crews c where c.id = crew_id and c.created_by = auth.uid()))
);

-- messages: users can read their own messages (sent or received)
alter table messages enable row level security;
create policy "users can read own messages" on messages for select using (
  auth.uid() = sender_id or auth.uid() = recipient_id
);
create policy "users can send messages" on messages for insert with check (
  auth.uid() = sender_id
);
create policy "users can mark own received messages as read" on messages for update using (
  auth.uid() = recipient_id
);

-- Trigger: Update crews_messages.updated_at on row change
create or replace function update_crews_messages_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists crews_messages_timestamp on crews_messages;
create trigger crews_messages_timestamp before update on crews_messages
  for each row execute function update_crews_messages_timestamp();
