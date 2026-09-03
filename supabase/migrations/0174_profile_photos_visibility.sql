-- Whether a climber's profile photo strip is shown to other climbers.
--
-- 0173 gave profiles a `photos` column and the Profile tab a working "+ Add photo" tile, but
-- the photos were owner-only: of the nine `profiles` selects in lib/db.js, only `select("*")`
-- carries `photos`, and both of its callers fetch YOUR OWN row. So a photo you added was
-- visible to you and to nobody else — which is not what a profile photo is for.
--
-- LIKE `discoverable` (0104), THIS IS NOT AN ACCESS CONTROL, and saying so matters. `profiles`
-- is publicly readable by policy — 0009's "profiles public read" is `using (true)`, narrowed by
-- 0095 only to hide you from someone you blocked — so the row, and therefore the `photos`
-- array, is already readable by anyone with the anon key whatever this column says. An RLS
-- policy around it would be the always-passing guard this codebase keeps catching: present,
-- reviewed, enforcing nothing.
--
-- What it controls is what the APP RENDERS: whether FullProfile draws the strip for a visitor.
-- That is the same honest scope 0104 documents for partner browse, and it is worth stating in
-- the settings copy too, so nobody reads the toggle as a promise the schema cannot keep.
--
-- Splitting hairs on a genuinely private option is possible later (moving photos to their own
-- table with a real policy), and would be the right shape if these ever became sensitive. They
-- are photos a climber chose to put on a public climbing profile; the surfacing control is the
-- proportionate one, and the alternative is a table, a policy and a join for a handful of
-- images with no per-row facts — the same call 0173 makes about text[] versus a table.
--
-- DEFAULT true, on the product decision that a profile photo is for other climbers to see:
-- "the profile strip should be visible to others unless they designate otherwise on their
-- settings". NOT NULL so no consumer has to treat missing as a third state — every reader asks
-- one question and gets true or false, which is the distinction whose absence made the strip
-- dishonest in 0173's own header.
--
-- Existing rows take the default. Nothing is backfilled and nothing can fail partway.

alter table profiles
  add column if not exists photos_public boolean not null default true;

comment on column profiles.photos_public is
  'Does the app SHOW this climber''s profile photo strip to other climbers? Surfacing only, '
  'not access control — profiles are publicly readable by policy (0009/0095), so the photos '
  'column is readable regardless. Same scope as `discoverable` (0104). Default true.';

-- Confirm — expect one row, boolean, not null, default true:
--   select column_name, data_type, is_nullable, column_default
--     from information_schema.columns
--    where table_name = 'profiles' and column_name = 'photos_public';
