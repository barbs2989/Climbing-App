-- 0241: five route facts that published guidebooks print and the app had no column for.
--
-- Found by the 2026-10-01 guidebook audit (owner asked that every kind of guidebook information the app
-- lacks get a field). ROUTE FACTS on the route page renders each one only when it is present.
--   guide_stars  quality stars as the guidebook prints them (0-4). Kept apart from `stars`, which is a
--                different (climber-consensus) scale -- the two must never be averaged or merged.
--   alt_names    other names the same line goes by ("Also called ...").
--   variations   short notes, one per named variation / direct start / alternate finish, with its grade.
--   ffa          first FREE ascent, when it differs from the first ascent.
--   fwa          first WINTER ascent.
-- All NULL = not recorded. Text is written in our own words; no source is ever named on screen.

alter table public.routes add column if not exists guide_stars integer;
alter table public.routes add column if not exists alt_names text[];
alter table public.routes add column if not exists variations jsonb;
alter table public.routes add column if not exists ffa text;
alter table public.routes add column if not exists fwa text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'routes_guide_stars_range' and conrelid = 'public.routes'::regclass) then
    alter table public.routes add constraint routes_guide_stars_range check (guide_stars is null or (guide_stars >= 0 and guide_stars <= 4));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'routes_variations_is_array' and conrelid = 'public.routes'::regclass) then
    alter table public.routes add constraint routes_variations_is_array check (variations is null or jsonb_typeof(variations) = 'array');
  end if;
end $$;

comment on column public.routes.guide_stars is 'Guidebook quality stars (0-4) as printed. Separate scale from `stars`; never merged with it.';
comment on column public.routes.alt_names is 'Other names the same line goes by.';
comment on column public.routes.variations is 'JSON array of short own-words notes, one per named variation/direct start/finish, with its grade.';
comment on column public.routes.ffa is 'First free ascent (party, year) when it differs from the first ascent.';
comment on column public.routes.fwa is 'First winter ascent (party, year).';
