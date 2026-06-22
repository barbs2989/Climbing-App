-- ClimbMatch Phase 0 — areas + routes, with MP-hierarchy rules enforced in the DB.
-- Apply with: supabase db reset   (or psql against your project)

create extension if not exists ltree;     -- fast subtree queries ("everything under Utah")
create extension if not exists pg_trgm;   -- trigram fuzzy search (replaces client fuzzyMatch)

-- ───────────────────────── areas (was MOUNTAINS) ─────────────────────────
create table areas (
  id          text primary key,           -- slug, e.g. "lcc_hellgate" (readable URLs)
  name        text not null,
  parent_id   text references areas(id),
  path        ltree,                       -- materialized path, set by trigger
  area_type   text,                        -- display label only: state/range/canyon/crag/wall…
  region      text,
  lat         double precision,
  lng         double precision,
  elevation   integer,
  avy_zone    text,
  blurb       text,
  route_count integer not null default 0,  -- denormalized aggregate, maintained by trigger
  source      text
);
create index areas_path_gist on areas using gist (path);
create index areas_parent_idx on areas (parent_id);
create index areas_name_trgm on areas using gin (name gin_trgm_ops);

-- ───────────────────────── routes (was ROUTES) ───────────────────────────
create table routes (
  id           text primary key,
  area_id      text not null references areas(id),  -- MUST be a leaf (enforced below)
  name         text not null,
  discipline   text,
  grade        text,
  grade_system text,
  grade_num    numeric,                    -- normalized for range filter + sort
  pitches      integer,
  length_m     integer,
  sort_order   integer,                    -- left-to-right cliff order (MP "by area")
  stars        numeric,
  fa           text,
  lat          double precision,
  lng          double precision,
  aspect       text,
  season       text,
  description  text,
  gear         jsonb,
  hazards      text[],
  verif        jsonb,
  source       text
);
create index routes_area_idx on routes (area_id);
create index routes_grade_idx on routes (grade_num);
create index routes_name_trgm on routes using gin (name gin_trgm_ops);

-- ───────────────────────── rule 0: materialized path ─────────────────────
create or replace function areas_set_path() returns trigger as $$
begin
  if new.parent_id is null then
    new.path := text2ltree(new.id);
  else
    new.path := (select path from areas where id = new.parent_id) || text2ltree(new.id);
    if new.path is null then
      raise exception 'parent area "%" not found', new.parent_id;
    end if;
  end if;
  return new;
end $$ language plpgsql;

create trigger trg_areas_set_path
  before insert or update of parent_id, id on areas
  for each row execute function areas_set_path();

-- ───── rule 1+2: routes only on leaves; an area is leaf XOR parent ────────
create or replace function routes_require_leaf() returns trigger as $$
begin
  if exists (select 1 from areas where parent_id = new.area_id) then
    raise exception 'route "%" must attach to a LEAF area; "%" has sub-areas',
      new.id, new.area_id;
  end if;
  return new;
end $$ language plpgsql;

create trigger trg_routes_require_leaf
  before insert or update of area_id on routes
  for each row execute function routes_require_leaf();

create or replace function areas_leaf_xor() returns trigger as $$
begin
  if new.parent_id is not null
     and exists (select 1 from routes where area_id = new.parent_id) then
    raise exception 'cannot nest "%" under "%" — that area holds routes (leaf XOR parent)',
      new.id, new.parent_id;
  end if;
  return new;
end $$ language plpgsql;

create trigger trg_areas_leaf_xor
  before insert or update of parent_id on areas
  for each row execute function areas_leaf_xor();

-- ───────────── rule 3: route_count aggregation up the tree ────────────────
-- areas.path @> (the route's area path)  selects that area + all its ancestors.
create or replace function routes_bump_counts() returns trigger as $$
begin
  if tg_op in ('INSERT','UPDATE') then
    update areas set route_count = route_count + 1
      where path @> (select path from areas where id = new.area_id);
  end if;
  if tg_op in ('DELETE','UPDATE') then
    update areas set route_count = route_count - 1
      where path @> (select path from areas where id = old.area_id);
  end if;
  return null;
end $$ language plpgsql;

create trigger trg_routes_bump_counts
  after insert or delete or update of area_id on routes
  for each row execute function routes_bump_counts();

-- ───────────────────────── Supabase RLS (public read) ────────────────────
alter table areas  enable row level security;
alter table routes enable row level security;
create policy "areas public read"  on areas  for select using (true);
create policy "routes public read" on routes for select using (true);
-- writes are service-role / authenticated-admin only (no public insert policy).

-- ───────────────────────── convenience: breadcrumb + children ────────────
-- GET /areas/:id children with counts:   select * from areas where parent_id = $1 order by name;
-- breadcrumb for an area:                 select * from areas where path @> (select path from areas where id=$1) order by nlevel(path);
-- routes in a leaf (sorted "by area"):    select * from routes where area_id = $1 order by sort_order nulls last, name;
