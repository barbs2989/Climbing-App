-- A topo PHOTO belongs to the route page it was added on (owner, 2026-10-23: "Do topo photos
-- only stick to the route page on which they were added? If not make that so, it won't make
-- sense to have topo photos if the route is on the other side of the mountain").
--
-- Until now a topo was filed only by area_id (0026: "a topo is per-wall, not per-route"), and the
-- route page read every topo of its area. An alpine route's area is the PEAK, so a photo of the
-- north face showed on every south-side route of the same mountain, with no line drawn on it.
--
-- topos.route_id records the route the photo was posted from, and the route page reads by it
-- (useRouteTopos). area_id stays: contribution_points() (0333) credits a topo to its area.
--
-- Insert now REQUIRES a route_id, so no new topo can float area-wide again. on delete set null
-- rather than cascade: a route folded into its duplicate must not take the climber's photo with
-- it; on update cascade follows a renamed id.
--
-- Backfill: a topo whose lines all name ONE route takes that route. When this was written there
-- were 3 topos and 0 topo_lines, all three posted by one account from unknown routes on Mount
-- Rainier, Sleepy Hollow and The Lowers — nothing records which route page they were posted
-- from, so they keep route_id null and show on no route page. The rows and photos are kept.

alter table topos add column if not exists route_id text references routes(id) on update cascade on delete set null;

create index if not exists topos_route_idx on topos(route_id, created_at);

comment on column topos.route_id is
  'The route page the photo was posted from. The route page shows only its own topos. Required on insert (topos authed insert).';

update topos t set route_id = l.route_id
from (select topo_id, min(route_id) as route_id from topo_lines group by topo_id having count(distinct route_id) = 1) l
where l.topo_id = t.id and t.route_id is null;

drop policy if exists "topos authed insert" on topos;
create policy "topos authed insert" on topos for insert
  with check (auth.uid() is not null and auth.uid() = created_by and route_id is not null);
