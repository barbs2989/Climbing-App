-- 0380 — LINK-UPS on the route page (owner's note, 2026-10-28: "For routes that people often link
-- up, we should provide information on those routes on how to do that ... the route will be
-- different and plan for those that want to do that").
--
-- A link-up is two or more mountaineering, scrambling or alpine objectives done in one push, where
-- the plan is not the sum of the single climbs: a ridge or col joins the summits, the descent moves,
-- one camp serves both, a car shuttle is needed. Mountain Project and SummitPost file the famous
-- ones as routes of their own and leave the rest to a line in a peak's description; Peakbagger shows
-- them only as trip reports. Here a link-up is ONE row that renders on EVERY member climb's page,
-- with the order, what joins each leg to the next, the descent and the logistics, so a climber on
-- any of the peaks finds it.
--
--   route_ids  the catalog climbs it renders on, in the order the link-up climbs them. Not a foreign
--              key (an array cannot be one); the reader drops an id it cannot resolve, and a deleted
--              route only shortens the list.
--   legs       [{ peak, route, route_id|null, connect }] in order — every objective, including one
--              the catalog does not hold, with how you get to it from the previous leg.
--   how / descent / logistics  researched prose in our own words (research-data/link-ups/).
--   duration   a short value for the header, e.g. "1 long day", "3-5 days".
--
-- Written by the service key only (scripts/oneoff/link-ups/apply.mjs); public read.

create table if not exists public.route_link_ups (
  id text primary key,
  name text not null check (char_length(name) between 3 and 120),
  state text not null,
  region text,
  route_ids text[] not null default '{}',
  legs jsonb not null check (jsonb_typeof(legs) = 'array' and jsonb_array_length(legs) >= 2),
  duration text check (duration is null or char_length(duration) <= 40),
  how text not null check (char_length(how) between 20 and 900),
  descent text check (descent is null or char_length(descent) <= 900),
  logistics text check (logistics is null or char_length(logistics) <= 900),
  checked_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists route_link_ups_route_ids_idx on public.route_link_ups using gin (route_ids);

alter table public.route_link_ups enable row level security;
drop policy if exists route_link_ups_read on public.route_link_ups;
create policy route_link_ups_read on public.route_link_ups for select to anon, authenticated using (true);
-- No write policy: only the service key writes. Take the default write privileges away too, so a
-- future permissive policy cannot open the table by accident.
revoke insert, update, delete, truncate, references, trigger on public.route_link_ups from anon, authenticated;
grant select on public.route_link_ups to anon, authenticated;
