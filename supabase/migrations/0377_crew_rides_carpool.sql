-- 0377 — Rides on a crew: who is driving, from roughly where, with how many seats, and who needs a ride.
--
-- Shredder (a ski/snowboard partner app) makes carpooling a headline feature, and climbing needs it more: trailhead
-- lots fill, permit zones cap party size, and a crew already plans around one place and one day. Until now a crew had
-- only the advice "carpool openly in the thread". (Owner's Shredder audit, approved 2026-10-28.)
--
-- One row per climber per crew, written by that climber alone. `from_area` is a rough place the climber types
-- ("Bellevue", "North Seattle") and never an address; the card says so. It is readable only by the crew's CONFIRMED
-- members and by its owner, which is why this is its own table and not columns on crew_members: crew_members is public
-- read, and where a climber drives from is a hint to where they live (the partner search shows strangers a distance
-- only, never a place). A climber who has only ASKED to join cannot read it, and cannot write one until accepted.
-- Leaving the crew deletes your row, so a former member's car does not stay on the card.
begin;

create table if not exists public.crew_rides (
  crew_id    uuid not null references public.crews(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  mode       text not null check (mode in ('driving', 'need')),
  seats      smallint check (seats between 1 and 8),
  from_area  text not null default '' check (char_length(from_area) <= 60),
  updated_at timestamptz not null default now(),
  primary key (crew_id, user_id),
  check (mode = 'driving' or seats is null)
);

comment on table public.crew_rides is
  'Carpool on a crew (0377): one row per climber per crew -- driving with N seats, or needs a ride -- from a rough area the climber typed. Readable by the crew''s confirmed members and the row''s owner; written by the owner only.';

alter table public.crew_rides enable row level security;

drop policy if exists "crew rides read by the crew" on public.crew_rides;
create policy "crew rides read by the crew" on public.crew_rides for select using (
  auth.uid() = user_id
  or exists (select 1 from public.crew_members m
              where m.crew_id = crew_rides.crew_id and m.user_id = auth.uid() and m.status = 'confirmed'));

drop policy if exists "own crew ride insert" on public.crew_rides;
create policy "own crew ride insert" on public.crew_rides for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.crew_members m
               where m.crew_id = crew_rides.crew_id and m.user_id = auth.uid() and m.status = 'confirmed'));

drop policy if exists "own crew ride update" on public.crew_rides;
create policy "own crew ride update" on public.crew_rides for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (select 1 from public.crew_members m
               where m.crew_id = crew_rides.crew_id and m.user_id = auth.uid() and m.status = 'confirmed'));

drop policy if exists "own crew ride delete" on public.crew_rides;
create policy "own crew ride delete" on public.crew_rides for delete using (auth.uid() = user_id);

drop policy if exists "restricted accounts cannot post" on public.crew_rides;
create policy "restricted accounts cannot post" on public.crew_rides as restrictive for insert with check (public.is_active_user(auth.uid()));

revoke all on public.crew_rides from anon;
grant select, insert, update, delete on public.crew_rides to authenticated;

-- Leaving (or being removed from) a crew takes your ride off it.
create or replace function public.crew_rides_drop_on_leave()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  delete from crew_rides where crew_id = old.crew_id and user_id = old.user_id;
  return old;
end;
$function$;
revoke all on function public.crew_rides_drop_on_leave() from public, anon, authenticated;

drop trigger if exists crew_rides_drop_on_leave on public.crew_members;
create trigger crew_rides_drop_on_leave after delete on public.crew_members
  for each row execute function public.crew_rides_drop_on_leave();

commit;

-- PostgREST caches the schema; without this the new table is invisible until the next reload.
notify pgrst, 'reload schema';
