-- Add approach_logistics field for structured trailhead/parking/permit/supply data
alter table routes
  add column if not exists approach_logistics jsonb;

-- Index for performance when filtering/searching logistics
create index if not exists idx_routes_approach_logistics on routes using gin (approach_logistics);
