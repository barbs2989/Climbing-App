-- A route's TOP anchor as a short value ("2-bolt chains", "rap rings", "tree, walk off"), drawn as the
-- ANCHOR row of ROUTE FACTS on crag routes. A pitch's own anchor stays in pitch_detail[].anchor.
alter table public.routes add column if not exists anchor text;
alter table public.routes drop constraint if exists routes_anchor_len;
alter table public.routes add constraint routes_anchor_len check (anchor is null or char_length(anchor) between 1 and 80);
