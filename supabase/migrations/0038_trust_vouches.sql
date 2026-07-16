-- Feedback Loop Phase 3: Trust Scores & Vouches Persistence
-- Tracks verification status, vouches, and computed trust scores

create table if not exists vouches (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references auth.users(id) on delete cascade,
  to_id uuid not null references profiles(id) on delete cascade,
  reason text, -- why they're vouching (reliable, strong, skilled, etc.)
  created_at timestamptz default now(),
  unique(from_id, to_id)
);

create index if not exists vouches_from_id_idx on vouches(from_id);
create index if not exists vouches_to_id_idx on vouches(to_id);

alter table vouches enable row level security;

-- Anyone can see vouches (public trust signals)
create policy "view vouches" on vouches for select using (true);

-- Users can create vouches
create policy "give vouches" on vouches for insert
  with check (auth.uid() = from_id);

-- Users can delete their own vouches
create policy "delete own vouches" on vouches for delete
  using (auth.uid() = from_id);

-- Track belay catches for computing safety/trust
create table if not exists belay_catches (
  id uuid primary key default gen_random_uuid(),
  belayer_id uuid not null references auth.users(id) on delete cascade,
  climber_id uuid not null references auth.users(id) on delete cascade,
  climb_log_id uuid references climb_logs(id) on delete set null,
  date_occurred date not null,
  description text,
  created_at timestamptz default now()
);

create index if not exists belay_catches_belayer_idx on belay_catches(belayer_id);
create index if not exists belay_catches_climber_idx on belay_catches(climber_id);

alter table belay_catches enable row level security;

-- Users can see catches involving them
create policy "view own belay catches" on belay_catches for select
  using (auth.uid() = belayer_id or auth.uid() = climber_id);

-- Users can log belay catches they were involved in
create policy "log belay catches" on belay_catches for insert
  with check (auth.uid() = belayer_id or auth.uid() = climber_id);

-- Verification status table
create table if not exists verification_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  verification_type text check (verification_type in ('email', 'id', 'member_club', 'guide_certified')) not null,
  status text check (status in ('pending', 'verified', 'expired')) default 'pending',
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, verification_type)
);

create index if not exists verification_user_idx on verification_records(user_id);
create index if not exists verification_status_idx on verification_records(status);

alter table verification_records enable row level security;

-- Users can see their own verification records
create policy "view own verification" on verification_records for select
  using (auth.uid() = user_id);

-- Function: Compute live trust score for a user
-- Score = 0 (no verification) to 99 (max trust)
-- Components: verification (0-20), tenure (0-20), vouches (0-20), logged climbs (0-15), conditions (0-14), belay catches (0-10)
create or replace function compute_trust_score(user_id uuid)
returns int as $$
declare
  base_score int := 0;
  vouch_count int;
  log_count int;
  report_count int;
  catch_count int;
  tenure_days int;
  verified_count int;
begin
  -- Email verification: 5 points
  if exists(select 1 from verification_records where verification_records.user_id = compute_trust_score.user_id and status = 'verified' and verification_type = 'email') then
    base_score := base_score + 5;
  end if;

  -- ID verification: 10 points
  if exists(select 1 from verification_records where verification_records.user_id = compute_trust_score.user_id and status = 'verified' and verification_type = 'id') then
    base_score := base_score + 10;
  end if;

  -- Club/guide certification: 5 points each (up to 10)
  select count(*) into verified_count
  from verification_records
  where verification_records.user_id = compute_trust_score.user_id
    and status = 'verified'
    and verification_type in ('member_club', 'guide_certified');
  base_score := base_score + least(verified_count * 5, 10);

  -- Tenure: 1 point per month, capped at 20
  select extract(day from (now() - profiles.created_at)) into tenure_days
  from profiles where profiles.id = compute_trust_score.user_id;
  base_score := base_score + least(tenure_days / 30, 20);

  -- Vouches: 1 point per unique vouch, capped at 20
  select count(distinct from_id) into vouch_count
  from vouches where vouches.to_id = compute_trust_score.user_id;
  base_score := base_score + least(vouch_count, 20);

  -- Logged climbs: 1 point per 5 climbs, capped at 15
  select count(*) into log_count
  from climb_logs where climb_logs.user_id = compute_trust_score.user_id;
  base_score := base_score + least(log_count / 5, 15);

  -- Condition reports (trip reports): 1 point per 3 reports, capped at 14
  select count(*) into report_count
  from climb_logs
  where climb_logs.user_id = compute_trust_score.user_id
    and trip_report_visibility in ('public', 'crew');
  base_score := base_score + least(report_count / 3, 14);

  -- Belay catches: 2 points per catch, capped at 10
  select count(*) into catch_count
  from belay_catches where belay_catches.belayer_id = compute_trust_score.user_id;
  base_score := base_score + least(catch_count * 2, 10);

  -- Cap at 99
  return least(base_score, 99);
end;
$$ language plpgsql;

-- Materialized view for performance: cache trust scores (refresh periodically)
create or replace view trust_scores_view as
select
  p.id,
  p.name,
  compute_trust_score(p.id) as trust_score
from profiles p;

grant execute on function compute_trust_score(uuid) to authenticated;
