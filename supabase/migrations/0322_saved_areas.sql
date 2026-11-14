-- 0322: saved_areas — a saved area or peak belongs to the ACCOUNT, not the phone.
--
-- Until now "Save area" / "Save peak" wrote one list to IndexedDB on the device (lib/offline.js,
-- `bookmarks:<uid>`). On ONE device every surface already agreed — the area page's Save button,
-- Logbook › Saved's ✕, the Home tile and the Menu tile all read the same `bookmarks` state — but
-- unsaving on the phone left the area saved on the laptop forever, and a new phone started empty.
-- Every other thing Logbook › Saved holds (routes = objectives, lists, itineraries, searches) is
-- already an account row. Mountain Project keeps Favorite Areas on the account and AllTrails syncs
-- Saved across devices; this brings areas in line.
--
-- The device copy stays as an OFFLINE MIRROR (a packed state is read with no signal), never as a
-- second writer: once an account has been read back from here, this table decides.

begin;

create table if not exists public.saved_areas (
  user_id    uuid not null references auth.users(id) on delete cascade,
  area_id    text not null references public.areas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, area_id)
);
comment on table public.saved_areas is
  'Areas and peaks a climber saved (0322). Private: owner-only on every verb. Read by Logbook › Saved, the area page Save button, Home and Menu.';

alter table public.saved_areas enable row level security;

drop policy if exists "saved_areas read own" on public.saved_areas;
create policy "saved_areas read own" on public.saved_areas for select
  using (auth.uid() = user_id);
drop policy if exists "saved_areas insert own" on public.saved_areas;
create policy "saved_areas insert own" on public.saved_areas for insert
  with check (auth.uid() = user_id);
drop policy if exists "saved_areas delete own" on public.saved_areas;
create policy "saved_areas delete own" on public.saved_areas for delete
  using (auth.uid() = user_id);
-- No UPDATE: a row is (who, where) and nothing else; changing either is a delete and an insert.

commit;
