-- DIFFICULTY BREAKDOWN gets its own axes for SPORT, TRAD and BOULDERING.
--
-- 0234 pinned `route_difficulty_ratings.axis` to the five axes every route used (physical,
-- technical, exposure, commitment, routefinding). A sport pitch, a trad lead and a boulder
-- problem are not hard in those terms, so the radar now asks different questions per
-- discipline (see DIFFICULTY_AXES in RouteDetail.jsx). This migration only WIDENS the pinned
-- list: every existing row keeps its meaning, and the five old axes stay valid for the
-- alpine, ice, mixed and other routes that still use them.
--
-- New axes:
--   sport:       power, endurance, fingery, mental        (+ technical)
--   trad:        protection, sustained, strenuous, commitment (+ technical)
--   bouldering:  power, fingery, height, landing           (+ technical)
-- `technical` and `commitment` keep the meaning they already had, so they are shared, not new.
-- The new keys are distinct names on purpose: an old `physical` read is not reinterpreted as
-- `power`, and an old `routefinding` read is not reinterpreted as `protection`.

alter table route_difficulty_ratings drop constraint if exists route_difficulty_ratings_axis_check;
alter table route_difficulty_ratings add constraint route_difficulty_ratings_axis_check
  check (axis in (
    'physical','technical','exposure','commitment','routefinding',
    'power','endurance','fingery','mental','protection','sustained','strenuous','height','landing'
  ));

drop policy if exists "difficulty ratings insert own" on route_difficulty_ratings;
create policy "difficulty ratings insert own" on route_difficulty_ratings for insert
  with check (auth.uid() = user_id and rating between 1 and 5
    and axis in (
      'physical','technical','exposure','commitment','routefinding',
      'power','endurance','fingery','mental','protection','sustained','strenuous','height','landing'
    ));

drop policy if exists "difficulty ratings update own" on route_difficulty_ratings;
create policy "difficulty ratings update own" on route_difficulty_ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and rating between 1 and 5
    and axis in (
      'physical','technical','exposure','commitment','routefinding',
      'power','endurance','fingery','mental','protection','sustained','strenuous','height','landing'
    ));

-- Confirm -- expect the widened constraint and both policies to name the new axes:
--   select conname, pg_get_constraintdef(oid) from pg_constraint where conname = 'route_difficulty_ratings_axis_check';
--   select policyname, cmd, with_check from pg_policies where tablename = 'route_difficulty_ratings' order by cmd;
