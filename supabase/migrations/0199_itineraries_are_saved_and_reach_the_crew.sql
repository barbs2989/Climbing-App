-- 0199 — A climber's itinerary is saved to their account, and "Share with crew" reaches the crew.
--
-- TWO THINGS CLAIMED A SAVE THAT NEVER HAPPENED.
--   * The route Plan tab's "+ Plan your own itinerary" toasted "Saved your plan", and the
--     Objectives tab listed it under MY ITINERARIES — but the plan lived in one React useState
--     with no read and no write. A refresh erased every itinerary a climber had built.
--   * "Share with crew" toasted "Shared your plan with the crew" and patched the crew in local
--     state. updateCrew() syncs cap / meet / float plan / dates and never `itinerary`, and
--     `crews` had no column to hold one. Nobody else in the crew ever saw it.
--
-- user_itineraries — one plan per climber per route, owner-only. route_id carries NO foreign
-- key on purpose: user_lists.route_ids and the app's seed routes use ids the routes table does
-- not hold, and an FK would make saving a plan on one of those fail.
--
-- crews.itinerary — the crew's shared plan. crews is organizer-only for UPDATE (0036), but the
-- climber who built the plan is often a MEMBER, not the organizer. Widening the update policy
-- would let a member rewrite the float plan, dates and cap too, so instead the only write path
-- for this one column is share_crew_itinerary(), which lets the organizer or a CONFIRMED member
-- set or clear it and records who did (`itinerary_by`), so the crew card can say whose plan it is.
-- Reads ride the existing "crew members can read" select policy: the same people who see the
-- crew see its plan. crew_listings (the open-crews browse view) selects named columns and does
-- not gain this one.

create table if not exists user_itineraries (
  user_id    uuid not null references auth.users(id) on delete cascade,
  route_id   text not null,
  itinerary  jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, route_id),
  -- A day-by-day plan is a few KB. The cap stops the table being used as free blob storage.
  constraint user_itineraries_size check (pg_column_size(itinerary) < 65536)
);

alter table user_itineraries enable row level security;

drop policy if exists "user_itineraries read own" on user_itineraries;
create policy "user_itineraries read own" on user_itineraries for select using (auth.uid() = user_id);
drop policy if exists "user_itineraries insert own" on user_itineraries;
create policy "user_itineraries insert own" on user_itineraries for insert with check (auth.uid() = user_id);
drop policy if exists "user_itineraries update own" on user_itineraries;
create policy "user_itineraries update own" on user_itineraries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "user_itineraries delete own" on user_itineraries;
create policy "user_itineraries delete own" on user_itineraries for delete using (auth.uid() = user_id);

alter table crews add column if not exists itinerary    jsonb;
alter table crews add column if not exists itinerary_by uuid references profiles(id) on delete set null;
alter table crews drop constraint if exists crews_itinerary_size;
alter table crews add constraint crews_itinerary_size check (itinerary is null or pg_column_size(itinerary) < 65536);

create or replace function share_crew_itinerary(p_crew_id uuid, p_itinerary jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'sign in to share a plan' using errcode = '42501';
  end if;
  if not exists (
    select 1 from crews c
     where c.id = p_crew_id
       and (c.created_by = me
            or exists (select 1 from crew_members m
                        where m.crew_id = c.id and m.user_id = me and m.status = 'confirmed'))
  ) then
    raise exception 'only the organizer or a confirmed member can share a plan with this crew' using errcode = '42501';
  end if;
  if p_itinerary is not null and (jsonb_typeof(p_itinerary) <> 'object'
       or jsonb_typeof(p_itinerary->'days') <> 'array'
       or jsonb_array_length(p_itinerary->'days') = 0) then
    raise exception 'a plan needs at least one day' using errcode = '22023';
  end if;
  update crews
     set itinerary    = p_itinerary,
         itinerary_by = case when p_itinerary is null then null else me end
   where id = p_crew_id;
end;
$$;

revoke all on function share_crew_itinerary(uuid, jsonb) from public, anon;
grant execute on function share_crew_itinerary(uuid, jsonb) to authenticated;

comment on table user_itineraries is
  'A climber''s own day-by-day plan for one route (0199). Owner-only. Read by the Objectives tab''s MY ITINERARIES and the route Plan tab.';
comment on column crews.itinerary is
  'The plan shared with this crew (0199). Written only through share_crew_itinerary(); read by crew members via the crews select policy.';
comment on function share_crew_itinerary(uuid, jsonb) is
  'Set or clear crews.itinerary. Organizer or confirmed member only; records the sharer in itinerary_by (0199).';
