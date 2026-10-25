-- 0370 — Archive and Clear on a past crew are saved to the account, for the climber who chose them only.
--
-- Past crews (#2374, #2395) let a climber Archive a crew (it moves to the Archived list under Past crews, where
-- Restore brings it back) or Clear it (it leaves the list; Undo on the toast). Both lived in React state only, so a
-- reload brought every crew back and the toast had to say "on this device until you reload".
--
-- One row per climber per crew, readable and writable by that climber alone: archiving or clearing a crew is a
-- personal filing choice, and the rest of the crew must not see that you put their trip away. That is why this is
-- its own table and not a column on crew_members, which is public read. No row = the crew is on the Past crews list.

create table if not exists public.crew_past_state (
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  crew_id    uuid not null references public.crews(id) on delete cascade,
  state      text not null check (state in ('archived', 'cleared')),
  updated_at timestamptz not null default now(),
  primary key (user_id, crew_id)
);

alter table public.crew_past_state enable row level security;

drop policy if exists "own past crew state read" on public.crew_past_state;
create policy "own past crew state read" on public.crew_past_state for select using (auth.uid() = user_id);
drop policy if exists "own past crew state insert" on public.crew_past_state;
create policy "own past crew state insert" on public.crew_past_state for insert with check (auth.uid() = user_id);
drop policy if exists "own past crew state update" on public.crew_past_state;
create policy "own past crew state update" on public.crew_past_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own past crew state delete" on public.crew_past_state;
create policy "own past crew state delete" on public.crew_past_state for delete using (auth.uid() = user_id);

revoke insert, update, delete on public.crew_past_state from anon;
grant select on public.crew_past_state to anon;  -- RLS answers it with no rows; a 401 here would fail the whole crews read it is embedded in
grant select, insert, update, delete on public.crew_past_state to authenticated;
