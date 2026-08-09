-- Four conditions the log form has always asked for and never stored.
--
-- LogAscent collects, per report:
--     TEMP °F            -> cond.tempF      (the FIRST field in the conditions block)
--     Snow depth         -> cond.snowDepth  (alpine)
--     Seepage / wet      -> cond.seepage    (rock)
--     Mud / postholing   -> cond.mud        (alpine)
--
-- All four render back to the author immediately (ReportStats reads every one of them), which
-- is why nobody noticed: the report looks complete for as long as the tab is open. But
-- `syncLogToDb` never named them in its payload and the hydration on the next sign-in never
-- looked for them, so they survived exactly one session. climb_logs already had columns for
-- the neighbouring answers in the same block -- snow_condition, freezing_level_ft, water_level,
-- bug_pressure, trail_condition -- so a report kept its snow and lost the temperature beside it.
--
-- That also means no other climber could ever read them, which is the part that matters: a
-- freezing level is only useful next to the temperature that produced it, and "postholing after
-- 10am" is the single most actionable line in an alpine report.
--
-- No backfill is possible and none is attempted -- the values were never written anywhere. This
-- adds the columns; the first report after it lands is the first one that keeps them.
--
-- All four are nullable with no default. Every one of them is optional in the form, and a
-- default would manufacture an observation the climber did not make -- 0 °F reads as a
-- measurement, not as "not recorded" ([[fail-open-coercion-hides-missing-data]]).
--
-- No RLS change. These are columns on a table whose policies already decide who reads a row
-- ("view own logs", "view crew logs" from 0081); adding a column to a row changes nothing about
-- who may see the row.

alter table climb_logs add column if not exists temp_f      integer;
alter table climb_logs add column if not exists snow_depth  text;
alter table climb_logs add column if not exists seepage     text;
alter table climb_logs add column if not exists mud         text;

comment on column climb_logs.temp_f     is 'Air temperature in °F as observed by the reporter. Fahrenheit because the form asks in °F; display converts.';
comment on column climb_logs.snow_depth is 'Free prose, e.g. "boot-top, soft by noon". Not a number -- depth on an alpine route varies by aspect and hour.';
comment on column climb_logs.seepage    is 'Free prose, e.g. "left side weeping". Rock disciplines.';
comment on column climb_logs.mud        is 'Enum-ish (COND_ENUMS.mud) but stored as text, matching snow_condition/water_level beside it -- the vocabulary lives in the client so it can change without a migration.';

-- Confirm -- expect four rows:
--   select column_name, data_type, is_nullable
--     from information_schema.columns
--    where table_name = 'climb_logs'
--      and column_name in ('temp_f','snow_depth','seepage','mud')
--    order by column_name;
