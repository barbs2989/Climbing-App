-- "Rock" is not a type of climbing in this app (owner decision, 2026-09-24): every route typed
-- `rock` is re-typed, and top rope becomes a type of its own, as Mountain Project has it.
--
-- What `rock` held. The OpenBeta ETL (scripts/pipeline/etl-state.mjs) typed a climb `rock`
-- when none of trad/sport/bouldering/ice/mixed/alpine/aid was flagged — in practice, OpenBeta's
-- top-rope-only climbs. Probed against OpenBeta crag by crag, our `rock` count equalled its
-- TR-only count exactly (Hades Heights 35, Jungle Cliffs 23, Ed Rocks 17, Moss Island NY 60,
-- Grocery Store Walls CO 26, Spire Rock WA 10); Split Rock's 22 are 20 TR-only + 2 TR+boulder.
-- Of the 7,443 rows, 0 carry a description and 6 any gear/beta text, so nothing in the row
-- supports calling them trad or sport — they become `toprope`.
--
-- The exception: 6 rows sit directly on a PEAK and are hand-researched alpine climbs, not
-- imports (Prusik Peak's Solid Gold, Colchuck Balanced Rock West Face, Kangaroo Temple North
-- Face, Sherpa Balanced Rock, Mushroom Tower, Olympus's summit block). A crag type is never a
-- peak's type (0197), so they become `alpine`.
--
-- Also: `rock` is dropped from the route-level `disciplines` list (135 alpine/scrambling rows
-- used it to mean "has rock climbing on it", which alpine already says), and the areas' type
-- list (0198) learns that a top-rope line on a peak counts as alpine.
--
-- The per-row area triggers are paused for the bulk re-type and replaced by one set-based
-- rebuild: 7,443 rows each re-counting their crag's subtree is the slow way to the same answer.

-- 1. A top-rope line on a peak counts as alpine, like every other crag type.
create or replace function areas_recompute_disciplines(target_area_id text) returns void as $$
begin
  update areas a set disciplines = coalesce((
    select array_agg(d order by d) from (
      select distinct
        case when a.area_type = 'peak' and r.discipline in ('trad','sport','toprope','aid','bouldering','rock')
             then 'alpine' else r.discipline end as d
      from areas c
      join routes r on r.area_id = c.id
      where c.path <@ a.path and r.discipline is not null
    ) s
    where d <> 'rock'
  ), '{}')
  where a.id = target_area_id and a.area_type in ('peak', 'crag');
end $$ language plpgsql;

-- The areas whose main type must be re-voted: every area that directly holds a `rock` route.
create temp table _rock_areas as
  select distinct area_id from routes where discipline = 'rock';

alter table routes disable trigger trg_routes_area_disciplines;
alter table routes disable trigger trg_routes_dominant_discipline;

-- 2. Re-type.
update routes r set discipline = 'alpine'
  from areas a
 where a.id = r.area_id and a.area_type = 'peak' and r.discipline = 'rock';

update routes set discipline = 'toprope' where discipline = 'rock';

-- 3. The route-level list: drop `rock`; a list left empty falls back to the route's own type.
update routes set disciplines = disciplines - 'rock'
 where jsonb_typeof(disciplines) = 'array' and disciplines ? 'rock';
update routes set disciplines = jsonb_build_array(discipline)
 where jsonb_typeof(disciplines) = 'array' and jsonb_array_length(disciplines) = 0 and discipline is not null;

alter table routes enable trigger trg_routes_area_disciplines;
alter table routes enable trigger trg_routes_dominant_discipline;

-- 4. Rebuild what the paused triggers maintain. Main type: re-vote each affected area with
-- the live function (its tie-break is alphabetical, so a renamed winner is not always the
-- winner: rock beat sport on a tie, toprope does not).
select areas_update_dominant_discipline(area_id) from _rock_areas;

-- Type lists: the same set-based pass as 0198's backfill, over the whole catalog.
update areas a set disciplines = coalesce(sub.ds, '{}')
from (
  select a2.id, array_agg(distinct x.d order by x.d) filter (where x.d <> 'rock') ds
  from areas a2
  left join areas c on c.path <@ a2.path
  left join routes r on r.area_id = c.id and r.discipline is not null
  cross join lateral (select case when a2.area_type = 'peak' and r.discipline in ('trad','sport','toprope','aid','bouldering','rock')
                                  then 'alpine' else r.discipline end as d) x
  where a2.area_type in ('peak','crag')
  group by a2.id
) sub
where a.id = sub.id and a.disciplines is distinct from coalesce(sub.ds, '{}');

drop table _rock_areas;
