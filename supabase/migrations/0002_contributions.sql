-- ClimbMatch Phase 1 — community contributions ledger.
-- Append-only: every add / fix / report / rating / photo a user submits persists here,
-- so contributions survive a refresh and can be aggregated into the route.
-- Apply in the Supabase SQL Editor AFTER 0001_areas_routes.sql.

create table contributions (
  id          uuid primary key default gen_random_uuid(),
  route_id    text references routes(id) on delete cascade,
  area_id     text references areas(id)  on delete cascade,
  kind        text not null,            -- 'field' | 'report' | 'rating' | 'photo' | 'hazard'
  field       text,                     -- which route field, when kind = 'field'
  value       jsonb,                    -- the contributed content (text, number, list, url…)
  contributor text default 'anon',      -- client/user id (real auth comes later)
  created_at  timestamptz default now()
);
create index contributions_route_idx on contributions(route_id, created_at);
create index contributions_area_idx  on contributions(area_id, created_at);

-- Public can read everything and INSERT their own contributions.
-- No update/delete policy on purpose: the ledger is append-only; edits/moderation
-- are service-role only. Consensus ("3 climbers agree") is computed from the rows.
alter table contributions enable row level security;
create policy "contributions public read" on contributions for select using (true);
create policy "anyone can contribute"      on contributions for insert with check (true);
