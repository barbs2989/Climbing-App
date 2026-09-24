-- A peak whose climbs are all filed on its SUB-areas had no dominant_discipline, because 0051
-- computes it from routes filed DIRECTLY on the area. Such a peak showed under "All" on the
-- map's type-of-climbing filter and under no type button.
--
-- Measured 2026-09-24 over every map-visible area (peak/crag with a coordinate): 3,899 had no
-- main type, and 3,896 of those hold ZERO climbs, so there is nothing to classify and nothing is
-- invented for them. Exactly 3 have climbs: Baring Mountain (7), Mount Index (7) and Eldorado
-- Peak (11). This fills those from their whole subtree, with 0051's own rule (most common
-- discipline, ties broken alphabetically) — trad, alpine and mountaineering respectively.
--
-- One-time backfill, deliberately NOT a trigger change: the 0051 trigger fires per route row on
-- a 200k-row table, and teaching it to recompute ancestors would put an ltree subtree scan
-- behind every bulk import to cover a class of 3. `coalesce`-style guard: only a NULL is written,
-- so a value the trigger sets later always wins.
update areas a set dominant_discipline = sub.discipline
from (
  select distinct on (p.id) p.id, r.discipline
  from areas p
  join areas c on c.path <@ p.path
  join routes r on r.area_id = c.id
  where p.dominant_discipline is null and p.route_count > 0
    and p.area_type in ('peak', 'crag') and p.lat is not null
    and r.discipline is not null
  group by p.id, r.discipline
  order by p.id, count(*) desc, r.discipline
) sub
where a.id = sub.id and a.dominant_discipline is null;
