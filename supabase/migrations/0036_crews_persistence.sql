-- Feedback Loop Phase 1: Crews Persistence
-- Stores crew data (trip parties) and enables real-time sync

create table if not exists crews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_id uuid not null references routes(id) on delete cascade,
  status text check (status in ('forming', 'ready', 'climbing', 'completed', 'archived')) default 'forming',
  members jsonb default '[]'::jsonb, -- array of {id, name, accepted: bool, dayAcks: [dates]}
  proposed_dates text[] default '{}', -- proposed climb dates
  agreed_date text, -- date all members have acked
  meet_place text, -- meeting location
  meet_time text, -- meeting time (HH:MM)
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  archived_at timestamptz
);

create index if not exists crews_user_id_idx on crews(user_id);
create index if not exists crews_route_id_idx on crews(route_id);
create index if not exists crews_status_idx on crews(status);

alter table crews enable row level security;

-- Users can see crews they're part of or that include them as members
create policy "view own crews" on crews for select
  using (
    user_id = auth.uid()
    or members @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
  );

-- Users can create/edit/delete their own crews
create policy "manage own crews" on crews for all
  using (user_id = auth.uid());

-- Function: Mark crew as archived if it's 3+ days past agreed date
create or replace function auto_archive_crews()
returns void as $$
begin
  update crews set archived_at = now(), status = 'archived'
  where status in ('ready', 'climbing')
    and agreed_date is not null
    and (now()::date - agreed_date::date) >= 3
    and archived_at is null;
end;
$$ language plpgsql;

-- Function: Check if crew is ready (all members confirmed + agreed date + meet place + meet time)
create or replace function is_crew_ready(crew_id uuid)
returns boolean as $$
declare
  crew crews;
begin
  select * into crew from crews where id = crew_id;
  if crew is null then return false; end if;

  -- Check all members have accepted
  return (
    crew.members @> (select jsonb_agg(jsonb_build_object('id', m->>'id', 'accepted', true))
                     from jsonb_array_elements(crew.members) as m
                     where m->'accepted' = 'true'::jsonb)
    and crew.agreed_date is not null
    and crew.meet_place is not null
    and crew.meet_time is not null
  );
end;
$$ language plpgsql;

grant execute on function auto_archive_crews() to authenticated;
grant execute on function is_crew_ready(uuid) to authenticated;
