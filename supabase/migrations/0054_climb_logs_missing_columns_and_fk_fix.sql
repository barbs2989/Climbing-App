-- Fix for a critical bug found via first-ever real-account testing: EVERY climb_logs
-- write from a signed-in user has been failing, for two independent reasons.
--
-- 1. syncLogToDb() (ClimbMatch.jsx) sends fa_ascent, developed, beta, gear_beta,
--    sun_vote, sun_note, outcome_reasons, outcome_note, gpx_track, and itinerary in
--    every payload (added when FA credit / sun reports / outcome tracking / GPX /
--    itinerary features were built), but no migration ever added these columns to
--    climb_logs. PostgREST rejects the entire insert/update when any unknown column
--    is present (PGRST204), so this has silently failed for 100% of real writes,
--    regardless of route.
--
-- 2. The live table also has a "climb_logs_route_id_fkey" foreign key constraint on
--    route_id, despite 0037_logs_persistence.sql's own comment explicitly saying
--    route_id was designed as "a loose text reference, not a FK to routes(id)... a
--    hard FK breaks [the seed-only-route] case (most of this app's catalog)". This
--    constraint isn't defined anywhere in this migrations folder, so it was added
--    directly against the live database outside of a tracked migration at some point
--    — it directly contradicts the documented design and breaks logging any of the
--    app's own bundled seed/demo routes for a signed-in user.

alter table climb_logs drop constraint if exists climb_logs_route_id_fkey;

alter table climb_logs add column if not exists fa_ascent boolean default false;
alter table climb_logs add column if not exists developed boolean default false;
alter table climb_logs add column if not exists beta text;
alter table climb_logs add column if not exists gear_beta text;
alter table climb_logs add column if not exists sun_vote text;
alter table climb_logs add column if not exists sun_note text;
alter table climb_logs add column if not exists outcome_reasons text[] default '{}';
alter table climb_logs add column if not exists outcome_note text;
alter table climb_logs add column if not exists gpx_track jsonb;
alter table climb_logs add column if not exists itinerary jsonb;
