-- Feedback Loop Phase 2: Climb Logs & Trip Reports Persistence
-- Stores logged climbs with discipline-specific metrics and crew references

create table if not exists climb_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_id uuid not null references routes(id) on delete cascade,
  crew_id uuid references crews(id) on delete set null,
  discipline text not null, -- rock_climbing, alpine, ice_climbing, aid_climbing, trad, sport, bouldering
  date_climbed date not null,
  stars int check (stars >= 1 and stars <= 5),
  cond_tags text[] default '{}', -- condition tags (easy, hard, wet, icy, etc.)
  notes text,

  -- Crew attribution: who they climbed with
  partners uuid[] default '{}', -- array of partner user_ids
  party_size int, -- total party size including user

  -- Alpine/ice-specific metrics (from condMetricsFor)
  car_to_car_minutes int,
  approach_minutes int,
  climb_minutes int,
  descent_minutes int,
  snow_condition text, -- variable, stable, icy, slushy
  freezing_level_ft int,
  water_level text, -- low, moderate, high
  bug_pressure text, -- light, moderate, heavy
  trail_condition text, -- snow, dirt, scree, mixed

  -- Sport/trad-specific metrics
  protection_quality text,
  anchor_quality text,
  crowd_level text,

  -- Belay catch credits (trust feedback)
  belayed_by uuid, -- who belayed them
  caught_fall bool default false,

  -- Photos/media
  photos jsonb default '[]'::jsonb, -- array of {url, caption}

  -- Trip report (public consensus contribution)
  trip_report_visibility text check (trip_report_visibility in ('private', 'crew', 'public')) default 'crew',

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists climb_logs_user_id_idx on climb_logs(user_id);
create index if not exists climb_logs_route_id_idx on climb_logs(route_id);
create index if not exists climb_logs_crew_id_idx on climb_logs(crew_id);
create index if not exists climb_logs_date_idx on climb_logs(date_climbed);

alter table climb_logs enable row level security;

-- Users can see their own logs + public/crew logs (depending on visibility)
create policy "view own logs" on climb_logs for select
  using (user_id = auth.uid());

create policy "view crew logs" on climb_logs for select
  using (
    trip_report_visibility = 'public'
    or (trip_report_visibility = 'crew' and crew_id in (
      select id from crews where members @> jsonb_build_array(jsonb_build_object('id', auth.uid()::text))
    ))
  );

-- Users can create/edit/delete their own logs
create policy "manage own logs" on climb_logs for all
  using (user_id = auth.uid());

-- Trigger: Update climb_logs.updated_at on row change
create or replace function update_climb_logs_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists climb_logs_timestamp on climb_logs;
create trigger climb_logs_timestamp before update on climb_logs
  for each row execute function update_climb_logs_timestamp();

-- Function: Get recent trip reports for a route (for consensus building)
create or replace function get_trip_reports_for_consensus(route_id uuid)
returns table(
  id uuid, user_id uuid, stars int, cond_tags text[],
  date_climbed date, discipline text, created_at timestamptz
) as $$
begin
  return query
  select cl.id, cl.user_id, cl.stars, cl.cond_tags,
         cl.date_climbed, cl.discipline, cl.created_at
  from climb_logs cl
  where cl.route_id = route_id
    and cl.trip_report_visibility in ('public', 'crew')
    and cl.date_climbed >= (now()::date - interval '180 days')
  order by cl.created_at desc;
end;
$$ language plpgsql;

grant execute on function get_trip_reports_for_consensus(uuid) to authenticated;
