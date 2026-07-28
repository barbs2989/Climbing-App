-- GPS submissions table for crowdsource GPS feature
create table if not exists gps_submissions (
  id bigserial primary key,
  route_id text not null,
  user_email text not null,
  quality_score integer not null check (quality_score >= 0 and quality_score <= 100),
  waypoint_count integer not null check (waypoint_count >= 5),
  gpx_data text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  submitted_at timestamp with time zone default now(),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists gps_submissions_route_id on gps_submissions(route_id);
create index if not exists gps_submissions_status on gps_submissions(status);
create index if not exists gps_submissions_submitted_at on gps_submissions(submitted_at desc);

alter table gps_submissions enable row level security;

create policy "allow_public_insert" on gps_submissions
  for insert to authenticated, anon with check (true);
