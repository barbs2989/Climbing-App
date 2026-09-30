-- Point comments.user_id at profiles(id) so the author can be embedded.
--
-- Every route open fires this query from lib/db.js fetchComments():
--
--   .select("id,target_id,...,profiles(name,avatar,username)")
--
-- and it has always failed with HTTP 400:
--
--   PGRST200 — Could not find a relationship between 'comments' and 'profiles'
--              in the schema cache
--
-- Verified live: the identical query returns 200 with the profiles(...) embed
-- removed, and 400 with it. fetchComments does `if (error) throw error`, so the
-- comments query fails on every route, every time — the comment feature cannot
-- load anything. It has gone unnoticed only because `comments` has 0 rows, so
-- an empty list and a failed list look identical on screen.
--
-- Cause: 0069 created the column as
--   user_id uuid not null references auth.users(id) on delete cascade
-- PostgREST embeds along foreign keys, and there is no FK from comments to
-- profiles, so it cannot resolve profiles(...) no matter how the select is
-- written. comments is the only user-referencing table that points at
-- auth.users; objectives, crews, crew_members, crew_reads, vouches, topos,
-- guide_profiles and the guide tables all reference profiles(id). This brings
-- comments in line rather than special-casing the query.
--
-- profiles.id is itself the auth user id, so no data is reinterpreted: the same
-- uuid is simply now checked against profiles. Safe to run — `comments` is
-- empty, so the new constraint cannot fail validation on existing rows.

alter table comments drop constraint if exists comments_user_id_fkey;

alter table comments
  add constraint comments_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

-- PostgREST caches the schema; reload it so the embed resolves without a restart.
notify pgrst, 'reload schema';
