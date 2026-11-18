-- 0450 — Each crew member files their OWN float plan.
--
-- Owner report, 2026-11-14: saving a float plan on a crew the climber did not organize said "That didn't save —
-- only the crew organiser can change this". The plan itself lives on the climber's device (lib/offline.js); what
-- was refused was a stamp on the shared crews.float_plan column, which the 0036 crews UPDATE policy lets only the
-- organizer write. PR #3369 stopped members from attempting that write. This table gives every member a filing
-- of their own, so each card can say whether YOUR plan is filed, and the organizer's filing no longer turns every
-- member's card green.
--
-- What is stored is what the Privacy Policy already describes (lib/LegalView.jsx): the date you filed and the
-- crew's agreed return day, readable by the crew's other confirmed members, with no screen showing it back to
-- them (owner, 2026-11-18: "only my own"). The plan's contents, and the emergency contact, are never stored here.
-- Pattern: crew_rides (0377) — one row per climber per crew, own writes, the confirmed crew reads, and leaving
-- the crew removes it. crews.float_plan is no longer written by the app (left in place, deprecated).

begin;

create table if not exists public.crew_float_filings (
  crew_id    uuid not null references public.crews(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  filed_at   date not null default current_date,
  return_by  date,
  updated_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

comment on table public.crew_float_filings is
  'Float plan filings on a crew (0450): one row per climber per crew -- the date they filed and the crew''s agreed return day, never the plan or a contact (those stay on the device). Readable by the row''s owner and the crew''s confirmed members; written by the owner while a confirmed member.';
comment on column public.crews.float_plan is
  'DEPRECATED (0450): one shared stamp per crew, writable only by the organizer. The app now files per member in crew_float_filings and no longer writes or reads this column for real crews.';

alter table public.crew_float_filings enable row level security;

drop policy if exists "float filings read by the crew" on public.crew_float_filings;
create policy "float filings read by the crew" on public.crew_float_filings for select using (
  auth.uid() = user_id
  or exists (select 1 from public.crew_members m
              where m.crew_id = crew_float_filings.crew_id and m.user_id = auth.uid() and m.status = 'confirmed'));

drop policy if exists "own float filing insert" on public.crew_float_filings;
create policy "own float filing insert" on public.crew_float_filings for insert with check (
  auth.uid() = user_id
  and exists (select 1 from public.crew_members m
               where m.crew_id = crew_float_filings.crew_id and m.user_id = auth.uid() and m.status = 'confirmed'));

drop policy if exists "own float filing update" on public.crew_float_filings;
create policy "own float filing update" on public.crew_float_filings for update using (auth.uid() = user_id) with check (
  auth.uid() = user_id
  and exists (select 1 from public.crew_members m
               where m.crew_id = crew_float_filings.crew_id and m.user_id = auth.uid() and m.status = 'confirmed'));

drop policy if exists "own float filing delete" on public.crew_float_filings;
create policy "own float filing delete" on public.crew_float_filings for delete using (auth.uid() = user_id);

drop policy if exists "restricted accounts cannot post" on public.crew_float_filings;
create policy "restricted accounts cannot post" on public.crew_float_filings as restrictive for insert with check (public.is_active_user(auth.uid()));

revoke insert, update, delete on public.crew_float_filings from anon;
grant select on public.crew_float_filings to anon;  -- embedded in the crews read; RLS answers it with no rows, and a 401 here would fail the whole read (same as crew_past_state, 0370)
grant select, insert, update, delete on public.crew_float_filings to authenticated;

-- Leaving (or being removed from) a crew takes your filing off it.
create or replace function public.crew_float_filings_drop_on_leave()
returns trigger language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  delete from crew_float_filings where crew_id = old.crew_id and user_id = old.user_id;
  return old;
end;
$function$;
revoke all on function public.crew_float_filings_drop_on_leave() from public, anon, authenticated;

drop trigger if exists crew_float_filings_drop_on_leave on public.crew_members;
create trigger crew_float_filings_drop_on_leave after delete on public.crew_members
  for each row execute function public.crew_float_filings_drop_on_leave();

commit;

-- PostgREST caches the schema; without this the new table is invisible until the next reload.
notify pgrst, 'reload schema';
