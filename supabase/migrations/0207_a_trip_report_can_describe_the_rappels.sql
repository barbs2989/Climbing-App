-- A trip report can describe the rappels.
--
-- The log form's DESCENT section asks three things of a roped climb: how many rappels, the
-- longest one, and the rope the party used. The route page's RAPPELS section shows what
-- climbers reported under the catalog's own account (never in place of its headline count --
-- check:rappel-single-rope keeps that one honest), so a party checking whether one 60 m rope
-- will do can read it off the people who were just there.
--
--   rappel_count      how many rappels the party made (0 = walked off)
--   rappel_longest_m  the longest single rappel, in METRES like every pitch length; the form
--                     converts from the climber's units at the edge (uLenIn)
--   rappel_rope       one of the form's fixed choices: 'Single 60 m' | 'Single 70 m' |
--                     'Single 80 m' | 'Double ropes' (COND_ENUMS.rapRope in ClimbMatchCore.jsx)
--
-- Nullable, no defaults: the section is optional, and a default would manufacture a statement
-- about the descent the climber never made.
--
-- No RLS change. climb_logs' policies (0081) already decide who may read a row.
--
-- The client degrades without these columns (LOG_COLS_0121 in lib/db.js drops them and re-sends
-- on an unknown-column error), so applying this and deploying the client are independent events.

alter table climb_logs add column if not exists rappel_count integer;
alter table climb_logs add column if not exists rappel_longest_m integer;
alter table climb_logs add column if not exists rappel_rope text;

alter table climb_logs drop constraint if exists climb_logs_rappel_count_sane;
alter table climb_logs add constraint climb_logs_rappel_count_sane check (rappel_count is null or rappel_count between 0 and 200);
alter table climb_logs drop constraint if exists climb_logs_rappel_longest_sane;
alter table climb_logs add constraint climb_logs_rappel_longest_sane check (rappel_longest_m is null or rappel_longest_m between 1 and 200);

comment on column climb_logs.rappel_count is 'How many rappels the reporting party made on the descent; 0 = walked off.';
comment on column climb_logs.rappel_longest_m is 'The longest single rappel the party made, in metres.';
comment on column climb_logs.rappel_rope is 'Rope the party rappelled on: Single 60 m | Single 70 m | Single 80 m | Double ropes.';
