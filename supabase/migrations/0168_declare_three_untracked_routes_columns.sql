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
-- CORRECTION (same day, before anyone relies on it). An earlier version of this header said
-- `difficulty` "was mapped by NOTHING" and that the radar was dark on every DB-backed route.
-- THAT WAS WRONG, and the error is worth recording because it is a trap this repo has already
-- paid for once.
--
-- `dbRouteToCamel` opens `return { ...r, ... }` — it SPREADS the raw row and then adds camelCase
-- aliases. So every snake_case column reaches the app whether or not the mapper names it, and
-- `grep -c difficulty lib/db.js` returning 0 does NOT mean the field was missing. Verified by
-- executing the pre-change mapper: it returns `.difficulty` intact, 70 keys. DiffRadar was
-- rendering all along on routes that carry the column.
--
-- This is the same mistake CLAUDE.md records for `descentText`, where three sessions in a row
-- derived a rule from one line without reading the rest of the writer. READ THE WHOLE MAPPER
-- BEFORE CONCLUDING A COLUMN IS UNREACHED — a spread makes absence of a reference meaningless.
--
-- What remains true, and why this migration is still worth having: these three columns exist in
-- the live database and in NO migration, so a database rebuilt from supabase/migrations/ would
-- not have them, and `difficulty` is populated on 8,029 routes and read by the route page. That
-- is a real reproducibility gap and it is what this closes.
--
-- Idempotent.

alter table public.routes add column if not exists difficulty   jsonb;
alter table public.routes add column if not exists gear_bucket  jsonb;
alter table public.routes add column if not exists assumed_gear jsonb;

comment on column public.routes.difficulty is
  'Five-axis difficulty profile {physical,technical,exposure,commitment,routefinding}, each 1-5. Rendered by DiffRadar on the route page. Declared in 0168; the column predates it and was created by hand.';
