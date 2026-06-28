-- 0011_route_lists.sql
-- Challenge/badge list membership per route (e.g. Bulgers, Cascade volcanoes, state highpoints).
-- The app resolves a list via inList(k) = routes whose `lists` array contains k; badges derive from these.
-- Filtering is currently client-side, but the GIN index keeps SQL containment queries fast if added later.
alter table routes add column if not exists lists text[];
create index if not exists routes_lists_gin on routes using gin (lists);
