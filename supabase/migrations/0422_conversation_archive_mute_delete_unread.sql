-- 0422 — Messages: Archive, Mute, Mark as unread and Delete a conversation are saved, for the climber who chose them only.
--
-- The inbox (lib/Inbox.jsx) let a climber swipe a conversation left to "delete" it, but that only dropped it from
-- React state: nothing was written, so the next load brought the whole thread back. Messenger, which climbers
-- compare it to, offers per-conversation Archive, Mute, Mark as unread and Delete (your copy only), and every one of
-- them is a PERSONAL filing choice: the other climber, or the rest of the crew, must not see that you archived, muted
-- or cleared the chat. So, as with crew_past_state (0370), this is its own owner-only table, not a column on
-- messages or crew_members.
--
-- One row per climber per conversation. `kind` says which: 'dm' (target_id = the other climber's profile id) or
-- 'crew' (target_id = the crew's id). No row = a plain conversation.
--
--   archived_at    set  → the thread sits under "Archived chats" until a message newer than this arrives (as Messenger).
--   cleared_before set  → "Delete": every message at or before this time is hidden for you; the other side keeps theirs.
--                         A new message starts the conversation again with only what came after.
--   muted_until    set  → no badge or alert from this thread until then; 'infinity' = until you turn it back on.
--   marked_unread  true → the thread shows and counts as unread until you open it.

create table if not exists public.conversation_state (
  user_id        uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind           text not null check (kind in ('dm', 'crew')),
  target_id      uuid not null,
  archived_at    timestamptz,
  cleared_before timestamptz,
  muted_until    timestamptz,
  marked_unread  boolean not null default false,
  updated_at     timestamptz not null default now(),
  primary key (user_id, kind, target_id)
);

alter table public.conversation_state enable row level security;

drop policy if exists "own conversation state read" on public.conversation_state;
create policy "own conversation state read" on public.conversation_state for select using (auth.uid() = user_id);
drop policy if exists "own conversation state insert" on public.conversation_state;
create policy "own conversation state insert" on public.conversation_state for insert with check (auth.uid() = user_id);
drop policy if exists "own conversation state update" on public.conversation_state;
create policy "own conversation state update" on public.conversation_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own conversation state delete" on public.conversation_state;
create policy "own conversation state delete" on public.conversation_state for delete using (auth.uid() = user_id);

revoke all on public.conversation_state from anon;
grant select, insert, update, delete on public.conversation_state to authenticated;
