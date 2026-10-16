-- A trip report can describe the road to the trailhead.
--
-- The log form has a ROAD TO THE TRAILHEAD section now: was the road open, gated or closed; what
-- vehicle it took; what was on it (washouts, snow, downed trees...); and a free-text note. The
-- first three are fixed vocabularies and are stored where the road chips always were -- in
-- cond_tags -- so every report logged before the section existed still reads as a road report
-- (the three status strings are the old chips, unchanged). See ROAD_STATUS in ClimbMatchCore.jsx.
--
-- The note is the only part with nowhere to go. It is the most useful line of the section --
-- "gate locked at mile 3 until July 1" is what a status chip cannot say -- so it gets a column
-- rather than being folded into `notes`, where the route page's ROAD CONDITIONS section could not
-- find it and a climber skimming for the road would have to read the whole report.
--
-- Nullable, no default: the section is optional, and a default would manufacture a statement
-- about the road the climber never made.
--
-- No RLS change. climb_logs' policies (0081) already decide who may read a row; a new column on
-- the row changes nothing about who sees it.
--
-- The client degrades without this column (LOG_COLS_0121 in lib/db.js drops it and re-sends on
-- an unknown-column error), so applying this and deploying the client are independent events.

alter table climb_logs add column if not exists road_note text;

comment on column climb_logs.road_note is 'Free prose about the road to the trailhead as the reporter found it, e.g. "gate locked at mile 3 until July". The structured answers (status / vehicle / issues) live in cond_tags -- see ROAD_STATUS in ClimbMatchCore.jsx.';
