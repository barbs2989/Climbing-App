-- AREA PHOTOS (owner, 2026-11-11: "a thin line for photos that can be uploaded and feed photos that people
-- uploaded for photos within that hierarchy tree").
--
-- An area page shows ONE strip: photos posted to the area itself, plus every route photo posted on a climb
-- anywhere under it in the area tree.
--
-- Stored as `topos` rows rather than a new table, so an area photo gets everything a route photo already has:
-- the public `topo-photos` bucket and its {uid}/ path rule (0026, 0150), the description (0193), moderation
-- and reports (0263), restricted-account and screening rules (0264, 0265), own/admin removal (0151, 0152)
-- and contribution points for the area (0333).
--
-- 0364 made route_id REQUIRED on insert so that no photo floats area-wide on ROUTE pages, which read by
-- route_id. An area photo never reaches a route page either: route_id stays null and the new `area_photo`
-- flag says it was posted to the area on purpose. The insert rule is widened only by that flag. The three
-- legacy route-less topos 0364 kept have area_photo = false, so they stay hidden (no page shows them).

alter table topos add column if not exists area_photo boolean not null default false;

comment on column topos.area_photo is
  'Posted from an AREA page (route_id null): shown in that area''s photo strip and its ancestors'', never on a route page (0411).';

-- A photo is a route photo or an area photo, not both.
alter table topos drop constraint if exists topos_area_photo_has_no_route;
alter table topos add constraint topos_area_photo_has_no_route check (not area_photo or route_id is null) not valid;
alter table topos validate constraint topos_area_photo_has_no_route;

drop policy if exists "topos authed insert" on topos;
create policy "topos authed insert" on topos for insert
  with check ((select auth.uid()) is not null and (select auth.uid()) = created_by and (route_id is not null or area_photo));

-- The strip's read: newest first, everything under the area (path <@, the same subtree test area_classics,
-- 0391, uses), route photos named by their climb. SECURITY INVOKER (the default), so topos' own RLS still
-- applies: "moderation hides taken-down content" (0263) drops held and removed rows here too.
create or replace function public.area_photo_feed(p_area_id text, p_limit integer default 40)
returns table (id uuid, storage_path text, alt text, route_id text, route_name text, area_id text, area_name text, created_at timestamptz)
language sql
stable
set search_path = public
as $$
  select t.id, t.storage_path, t.alt, t.route_id, r.name, t.area_id, a.name, t.created_at
    from topos t
    join areas a on a.id = t.area_id
    left join routes r on r.id = t.route_id
   where a.path <@ (select path from areas where id = p_area_id)
     and (t.route_id is not null or t.area_photo)
   order by t.created_at desc
   limit least(greatest(p_limit, 1), 100)
$$;

grant execute on function public.area_photo_feed(text, integer) to anon, authenticated;
