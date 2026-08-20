-- Declare three `routes` columns that exist in the live database and in NO migration.
--
-- Found by replaying every migration's DDL in file order and diffing the result against
-- information_schema: 39 of 39 tables and 3 of 3 views are accounted for, and these three
-- columns are not. They were added by hand in the SQL editor, so a database rebuilt from
-- `supabase/migrations/` would not have them — and one of them is read by the app as of this
-- change, which would make that rebuild throw.
--
--   difficulty    jsonb   POPULATED ON 8,029 ROUTES. The five-axis profile DiffRadar draws:
--                         {physical, technical, exposure, commitment, routefinding}, each 1-5.
--   gear_bucket   jsonb   0 rows. Read by nothing.
--   assumed_gear  jsonb   0 rows. Read by nothing.
--
-- ADDITIVE ONLY. `add column if not exists` three times, no drops, no data touched. The two
-- empty columns are declared rather than removed because declaring them makes the schema
-- reproducible, which is the entire point, and removing a column is a decision this migration
-- has no basis to make. If they should go, that is their own migration with its own reasoning.
--
-- `difficulty` is the one that matters. It was mapped by NOTHING: `dbRouteToCamel` contained no
-- reference to it at all, so `route.difficulty` was undefined on every DB-backed route and
-- DiffRadar's opening `if(!d) return null` fired catalog-wide. Measured by rendering the real
-- RouteDetail through react-dom/server: 24,236 characters without the column, 39,027 with it —
-- roughly 15,000 characters of route page, including all five axis labels, the per-discipline
-- explanatory blurbs, and the community axis-rating control, dark on all ~205k routes while
-- 8,029 of them held the data.
--
-- That is the `descent_text` shape exactly (populated on 1,021 routes, rendered on none), and it
-- is why check:field-renders' FIELDS list being hand-maintained is a standing risk: a column
-- nobody adds to that list is invisible to the guard that exists to catch precisely this.
-- `difficulty` is now in FIELDS, and in SENTINELS with an anchor — every leaf is a number, so
-- there is no string to search for, but DiffRadar prints deterministic axis labels and returns
-- null without the prop, which makes "Route-finding appears only when the column is set" real
-- evidence rather than a "did the page change" coin flip.
--
-- Idempotent.

alter table public.routes add column if not exists difficulty   jsonb;
alter table public.routes add column if not exists gear_bucket  jsonb;
alter table public.routes add column if not exists assumed_gear jsonb;

comment on column public.routes.difficulty is
  'Five-axis difficulty profile {physical,technical,exposure,commitment,routefinding}, each 1-5. Rendered by DiffRadar on the route page. Declared in 0168; the column predates it and was created by hand.';
