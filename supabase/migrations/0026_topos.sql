-- Topos (route-overlay photos) — see docs/BACKEND.md §9 for the design rationale.
-- A topo is per-wall, not per-route: one photo can carry lines for several routes on
-- that wall. Applies to every discipline (rock/ice/mixed/aid AND mountaineering/alpine/
-- scrambling) — a photo of a couloir or ridge with the line drawn is exactly as useful
-- as a bolted-face topo, so there is no discipline filter here.

create table topos (
  id            uuid primary key default gen_random_uuid(),
  area_id       text not null references areas(id) on delete cascade,  -- the wall/crag/face
  storage_path  text not null,          -- object path in the "topo-photos" bucket (public)
  photographer  text,
  license       text default 'contributor-affirmed',  -- own work / CC / etc., self-declared
  created_by    uuid references profiles(id) default auth.uid(),
  created_at    timestamptz not null default now()
);
create index topos_area_idx on topos(area_id, created_at);

-- One row per (photo, route, contributor) — a photo can hold lines for several routes,
-- and several people can each submit their own line for the same route on the same
-- photo. No trust-weighted consensus yet (profiles has no trust_score column — social/
-- trust data isn't migrated, see BACKEND.md §5); the client picks the most recent row
-- per (topo_id, route_id) as canonical and shows older ones as alternates.
create table topo_lines (
  id          uuid primary key default gen_random_uuid(),
  topo_id     uuid not null references topos(id) on delete cascade,
  route_id    text not null references routes(id) on delete cascade,
  points      jsonb not null,           -- [{x,y}, …] normalized 0-1 to the image
  pins        jsonb not null default '[]'::jsonb,  -- [{x,y,category,note}, …]
  label       text,
  created_by  uuid references profiles(id) default auth.uid(),
  created_at  timestamptz not null default now()
);
create index topo_lines_topo_idx on topo_lines(topo_id);
create index topo_lines_route_idx on topo_lines(route_id, created_at);

alter table topos enable row level security;
create policy "topos public read" on topos for select using (true);
create policy "topos authed insert" on topos for insert
  with check (auth.uid() is not null and auth.uid() = created_by);
create policy "topos own update" on topos for update
  using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "topos own delete" on topos for delete
  using (auth.uid() = created_by);

alter table topo_lines enable row level security;
create policy "topo_lines public read" on topo_lines for select using (true);
create policy "topo_lines authed insert" on topo_lines for insert
  with check (auth.uid() is not null and auth.uid() = created_by);
create policy "topo_lines own update" on topo_lines for update
  using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "topo_lines own delete" on topo_lines for delete
  using (auth.uid() = created_by);

insert into storage.buckets (id, name, public)
  values ('topo-photos', 'topo-photos', true)
  on conflict (id) do nothing;

-- Path convention: {auth.uid()}/{uuid}-{filename} — ownership is the first path
-- segment, mirroring the guide_documents bucket (migration 0022).
create policy "topo_photos storage public read" on storage.objects for select
  using (bucket_id = 'topo-photos');
create policy "topo_photos storage insert own" on storage.objects for insert
  with check (
    bucket_id = 'topo-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "topo_photos storage own update" on storage.objects for update
  using (bucket_id = 'topo-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "topo_photos storage own delete" on storage.objects for delete
  using (bucket_id = 'topo-photos' and auth.uid()::text = (storage.foldername(name))[1]);
