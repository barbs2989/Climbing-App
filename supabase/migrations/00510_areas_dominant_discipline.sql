-- Adds a per-area "dominant discipline" so the DB-backed near-me map
-- (lib/DbAreaBrowser.jsx NearMePanel) can color/icon pins by discipline the
-- same way the in-memory catalog's OverviewMap already does client-side.
-- Kept scoped to recomputing only the touched area_id per trigger fire (not a
-- full table recount) — see the areas.route_count trigger in
-- 0001_areas_routes.sql for the pattern this mirrors, minus the ancestor
-- propagation (near-me only ever queries leaf areas, so no rollup needed).
-- Apply with: supabase db push   (or psql against your project)

alter table areas add column if not exists dominant_discipline text;

create or replace function areas_update_dominant_discipline(target_area_id text) returns void as $$
begin
  update areas set dominant_discipline = (
    select discipline from routes
    where area_id = target_area_id and discipline is not null
    group by discipline
    order by count(*) desc, discipline
    limit 1
  )
  where id = target_area_id;
end $$ language plpgsql;

create or replace function routes_bump_dominant_discipline() returns trigger as $$
begin
  if tg_op in ('INSERT','UPDATE') then
    perform areas_update_dominant_discipline(new.area_id);
  end if;
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.area_id is distinct from new.area_id) then
    perform areas_update_dominant_discipline(old.area_id);
  end if;
  return null;
end $$ language plpgsql;

create trigger trg_routes_dominant_discipline
  after insert or delete or update of discipline, area_id on routes
  for each row execute function routes_bump_dominant_discipline();

-- One-time backfill for existing rows (the trigger only maintains it going
-- forward). Picks the most-common discipline per area, breaking ties
-- alphabetically for determinism.
update areas set dominant_discipline = sub.discipline
from (
  select distinct on (area_id) area_id, discipline
  from routes
  where discipline is not null
  group by area_id, discipline
  order by area_id, count(*) desc, discipline
) sub
where areas.id = sub.area_id;
