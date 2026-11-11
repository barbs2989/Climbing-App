-- WHERE A ROUTE STARTS gets room for a few sentences (owner, 2026-11-11: "we need to allow more of a
-- description for location"). 0243 capped `routes.location` at 160 characters, one line, which fits
-- "20 ft right of the big chimney" and not the landmarks, the distance from the trail and the first
-- moves a climber actually needs at the base. The editor (SuggestFix) and Add Route now take a
-- multi-line answer up to 1,000 characters; this lets the column hold it. Rows are untouched: every
-- stored value already passes the wider check.
alter table public.routes drop constraint if exists routes_location_len;
alter table public.routes add constraint routes_location_len check (location is null or char_length(location) between 1 and 1000);
