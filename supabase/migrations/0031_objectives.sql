-- ClimbMatch Phase 1 (crews/objectives backend, Phase A) — saved climbs ("wishlist").
-- Apply in the Supabase SQL Editor AFTER 0009_auth_profiles.sql.
--
-- route_id is intentionally NOT a foreign key to routes(id): a saved climb can be
-- either a real DB route or one of the local ROUTES seed-array ids (which never
-- exist in the routes table), matching how the app's route-id space already works
-- everywhere else (routeById(), crews[].routeId, etc.) — see docs/BACKEND.md §2.

create table objectives (
  user_id    uuid references profiles(id) on delete cascade,
  route_id   text not null,
  created_at timestamptz default now(),
  primary key (user_id, route_id)
);
create index objectives_route_idx on objectives(route_id);

-- Public read (backs "N climbers want this" in PartnerSearch — that's meant to be
-- visible to everyone, not just the saver); write restricted to your own rows.
alter table objectives enable row level security;
create policy "objectives public read" on objectives for select using (true);
create policy "users manage own objectives" on objectives for all using (auth.uid() = user_id);
