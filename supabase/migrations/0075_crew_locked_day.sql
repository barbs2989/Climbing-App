-- The locked day never survived a refresh, because there was nowhere to put it.
--
-- `crewForceDate` / `crewSetDate` write `date` + `dateForced` through `setCrews` only, and
-- the crews table (0036_crews_persistence.sql) has no column for either:
--
--     id, route_id, created_by, dates, meet_time, meet_place, float_plan, cap, dismissed
--
-- `dates` is the list of PROPOSED candidate days. The locked day is a different fact: the
-- one day the organizer has settled on, which `isReady` treats as satisfying the
-- everyone-acked-the-same-day requirement (`datesAgreed(c) || (c.date && c.dateForced)`).
-- So a crew could read "Ready" to the organizer, and not to anyone else after a reload,
-- because the flag that made it ready was React state.
--
-- Two columns rather than one: a null `agreed_date` and a false `date_forced` are different
-- states. An organizer can lock a day and later unlock it while the date remains the
-- crew's agreed day, which is exactly what `crewForceDate`'s toggle does.
--
-- `agreed_date` is `text`, matching how every other date in this schema is stored
-- (`climb_logs.date_occurred` aside, the app passes "YYYY-MM-DD" strings straight through
-- and `dates` is a jsonb array of the same). Using `date` here would silently reformat on
-- read and break string equality against `dates` entries.
--
-- No RLS change: 0036's "organizer can update own crew" already gates updates, which is the
-- correct rule for locking a day, and updateCrew already reverts + toasts on rejection.

alter table crews add column if not exists agreed_date text;
alter table crews add column if not exists date_forced boolean not null default false;

comment on column crews.agreed_date is
  'The single day the crew settled on ("YYYY-MM-DD"), distinct from the `dates` array of proposed candidates.';
comment on column crews.date_forced is
  'True when the organizer locked `agreed_date` directly instead of reaching it by everyone acking the same day.';
