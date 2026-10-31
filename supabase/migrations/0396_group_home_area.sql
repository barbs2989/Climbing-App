-- 0396 — A GROUP'S HOME AREA, and the point Discover measures "near" from (owner's note: "does search
-- by area make sense it seems to be too local. Need more ways to join groups away from home and ways
-- to explore").
--
-- A group's place was free text (`location`), so Discover could only browse by state (#2517) and
-- could never answer "which groups climb near Smith Rock?" for a climber planning a trip there.
-- Meetup answers it by letting you search any location and a radius around that point; here the
-- point is a catalog area, which every crag and peak already is.
--
--   area_id   the crag, peak or area the group climbs from, picked from the catalog in the group's
--             form. Optional. ON DELETE SET NULL: removing an area un-places a group, never deletes it.
--   lat, lng  the point that area stands for, written ONLY by the trigger below (a client value is
--             overwritten), so a group cannot claim to be somewhere its area is not.
--
-- area_point(aid): the area's own coordinate; failing that, the average of its descendants'
-- coordinates (a range or region row often has none of its own); failing that, the nearest
-- ancestor's. Public, like `areas`. Discover calls it for the place a climber picks.

alter table public.groups add column if not exists area_id text references public.areas(id) on delete set null;
alter table public.groups add column if not exists lat double precision;
alter table public.groups add column if not exists lng double precision;
create index if not exists groups_area_id_idx on public.groups (area_id);

create or replace function public.area_point(aid text)
returns table (lat double precision, lng double precision)
language sql stable
set search_path = public, pg_temp
as $$
  with a as (select id, path, lat, lng from public.areas where id = aid),
  own as (select a.lat, a.lng from a where a.lat is not null and a.lng is not null),
  kids as (
    select avg(d.lat) as lat, avg(d.lng) as lng
    from public.areas d, a
    where a.path is not null and d.path <@ a.path and d.id <> a.id and d.lat is not null and d.lng is not null
  ),
  up as (
    select p.lat, p.lng
    from public.areas p, a
    where a.path is not null and p.path @> a.path and p.id <> a.id and p.lat is not null and p.lng is not null
    order by nlevel(p.path) desc limit 1
  )
  select * from own
  union all select * from kids where kids.lat is not null and not exists (select 1 from own)
  union all select * from up where not exists (select 1 from own)
    and not exists (select 1 from kids where kids.lat is not null)
  limit 1;
$$;
grant execute on function public.area_point(text) to anon, authenticated;

create or replace function public.groups_place_from_area()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.area_id is null then
    new.lat := null; new.lng := null;
  elsif tg_op = 'INSERT' or new.area_id is distinct from old.area_id
        or new.lat is distinct from old.lat or new.lng is distinct from old.lng then
    select p.lat, p.lng into new.lat, new.lng from public.area_point(new.area_id) p;
  end if;
  return new;
end;
$$;

drop trigger if exists groups_place_from_area on public.groups;
create trigger groups_place_from_area
  before insert or update on public.groups
  for each row execute function public.groups_place_from_area();
