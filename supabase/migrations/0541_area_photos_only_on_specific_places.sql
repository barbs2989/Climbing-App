-- AREA PHOTOS ONLY ON A SPECIFIC PLACE, AND EVERY ROUTE PHOTO REACHES ITS PLACE (owner note, 2026-11-25:
-- "We shouldn't have photos for general areas like north cascades do an audit for what area pages should have
-- photos or not. Then we should make it a feature where if someone posts a photo on a route page, it
-- automatically gets out on that specific area page.")
--
-- Before: 0411's strip drew on every page from a state down, and a state or North Cascades collected every photo
-- in thousands of square km. And it read only `topos`, so a photo added on a route's Photos tab (a
-- `contributions` row of kind 'photo', #971) reached no area page at all.
--
-- WHICH PAGES TAKE PHOTOS -- `area_takes_photos(id)`, measured over the whole catalog (the census is in the PR):
--   * a state, range or country (and an untyped row): never;
--   * a peak: always (one mountain, even with its faces a few km apart);
--   * a crag or region: only when it is ONE PLACE -- no area under it sits more than 2 km from its own
--     point. That keeps a crag, a wall, a boulder field or a small cliff band grouping its walls (Lower Town
--     Wall) and drops a spread-out region (North Cascades, Leavenworth, Icicle Creek). EXISTS stops at the first
--     far descendant, so a large region answers quickly;
--     2 km, from the census: Lower Town Wall 0.05 km, Snow Creek Area 0.5, Cape Disappointment 1.6 are one
--     place; Southern Pickets 2.3 (a group of peaks), Index 8.9, Icicle Creek 11.5, Leavenworth 32.6 and North
--     Cascades 58.3 are not. 5,703 of 8,000 measured regions and 317 of 402 measured crags are within 1 km;
--   * a crag or region with no coordinate, or nothing under it that has one: only when nothing sits two levels
--     under it (a leaf, or a list of walls).
--
-- THE FEED -- `area_photos(id, limit)` answers { place, photos }. When `place` is false the page draws nothing.
-- Otherwise: photos posted to the area, and every topo and every Photos-tab route photo (pitch photos included)
-- posted on a climb anywhere under it, newest first. SECURITY INVOKER, so topos' and contributions' own RLS
-- still decide what a caller reads (moderation's taken-down topos stay hidden).
--
-- And an area photo can only be POSTED where it can be SHOWN: the topos insert rule now asks
-- area_takes_photos(area_id) for an area photo. No area photo had been posted on a general area (census).
-- area_photo_feed (0411) is dropped: its one reader moves to area_photos in the same PR.

create or replace function public.area_takes_photos(p_area_id text)
returns boolean
language sql
stable
set search_path = public
as $$
  select case
    when a.id is null then false
    when a.area_type is null or a.area_type in ('state', 'range', 'country', 'world') then false
    when a.area_type = 'peak' then true
    when a.lat is null or a.lng is null or not exists (
      select 1 from areas d where d.path <@ a.path and d.id <> a.id and d.lat is not null and d.lng is not null)
      then not exists (select 1 from areas c join areas g on g.parent_id = c.id where c.parent_id = a.id)
    else not exists (
      select 1 from areas d
       where d.path <@ a.path and d.id <> a.id and d.lat is not null and d.lng is not null
         and 2 * 6371 * asin(sqrt(power(sin(radians(d.lat - a.lat) / 2), 2)
               + cos(radians(a.lat)) * cos(radians(d.lat)) * power(sin(radians(d.lng - a.lng) / 2), 2))) > 2)
  end
  from (select 1) one left join areas a on a.id = p_area_id
$$;

grant execute on function public.area_takes_photos(text) to anon, authenticated;

drop function if exists public.area_photo_feed(text, integer);

create or replace function public.area_photos(p_area_id text, p_limit integer default 40)
returns jsonb
language sql
stable
set search_path = public
as $$
  with here as (select path from areas where id = p_area_id),
  ok as (select area_takes_photos(p_area_id) as place),
  pics as (
    select t.id::text as id, t.storage_path, null::text as url, t.alt, t.route_id, r.name as route_name,
           t.area_id, a.name as area_name, t.created_at
      from topos t
      join areas a on a.id = t.area_id
      left join routes r on r.id = t.route_id
     where (select place from ok) and a.path <@ (select path from here)
       and (t.route_id is not null or t.area_photo)
    union all
    select c.id::text, null, c.value ->> 'url', nullif(c.value ->> 'alt', ''), c.route_id, r.name,
           r.area_id, a.name, c.created_at
      from contributions c
      join routes r on r.id = c.route_id
      join areas a on a.id = r.area_id
     where (select place from ok) and c.kind = 'photo' and jsonb_typeof(c.value) = 'object'
       and coalesce(c.value ->> 'url', '') like 'https://%'
       and a.path <@ (select path from here)
  )
  select jsonb_build_object(
    'place', coalesce((select place from ok), false),
    'photos', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc)
                          from (select * from pics order by created_at desc limit least(greatest(p_limit, 1), 100)) p), '[]'::jsonb))
$$;

grant execute on function public.area_photos(text, integer) to anon, authenticated;

drop policy if exists "topos authed insert" on topos;
create policy "topos authed insert" on topos for insert
  with check ((select auth.uid()) is not null and (select auth.uid()) = created_by
              and (route_id is not null or (area_photo and area_takes_photos(area_id))));
