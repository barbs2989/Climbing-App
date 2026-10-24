-- 0360: a climber can PROPOSE A NEW AREA, and the owner's approval files it.
--
-- Until now the only way to name a place the catalog lacks was the "Not in the catalog? Type the
-- new crag's name" box inside Add a climb. That name rode on the climb's proposal as `areaName`,
-- and approve_new_route filed the climb under the PARENT area — nothing ever created the area.
-- The owner asked (2026-10-23) that climbers can add areas.
--
-- Mountain Project's model, which this follows: on an area page, "Add to Page" → Sub-Area; a
-- sub-area is offered only where the area holds no routes (areas hold sub-areas OR routes — our
-- trg_areas_leaf_xor is the same rule), and new areas are reviewed by an admin before they show.
--
-- 1. A proposal is a `contributions` row of kind 'new_area': area_id = the PARENT, value =
--    {name, areaType ('crag'|'peak'|'region'), description?, lat?, lng?}. The table's existing
--    insert policy (signed in, contributor = you) and trg_contribution_status (forced 'pending')
--    already cover it; `kind` is free text.
-- 2. approve_new_area() — admin only — inserts the areas row. The area triggers still run, so a
--    same-named place within 1.5 km (0216), a bucket copy, or a parent that holds routes is
--    REFUSED with the trigger's own message, which the review screen prints verbatim.
-- 3. Rejection reuses reject_new_route(), which never checked the kind.
-- 4. contribution_points(): a new area scores only once APPROVED (it used to fall to the
--    "anything else, unless rejected" branch, which would have paid a point for a pending one),
--    2 points — the tier of an area detail.

create or replace function approve_new_area(p_contribution_id uuid)
returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  c      contributions;
  par    areas;
  nm     text;
  typ    text;
  la     double precision;
  ln     double precision;
  base   text;
  new_id text;
  n      int := 1;
begin
  if not is_admin(auth.uid()) then
    raise exception 'only an admin can approve an area proposal';
  end if;
  select * into c from contributions where id = p_contribution_id;
  if c.id is null then
    raise exception 'no contribution with id %', p_contribution_id;
  end if;
  if c.kind <> 'new_area' then
    raise exception 'contribution % is kind %, not new_area', p_contribution_id, c.kind;
  end if;
  if c.status <> 'pending' then
    raise exception 'contribution % is already %', p_contribution_id, c.status;
  end if;
  select * into par from areas where id = c.area_id;
  if par.id is null then
    raise exception 'this proposal names no parent area that exists (%)', coalesce(c.area_id, 'none');
  end if;
  if par.area_type in ('world', 'country') then
    raise exception 'a new area goes inside a state or below, not directly under %', par.name;
  end if;
  if exists (select 1 from routes where area_id = par.id) then
    raise exception '% holds climbs itself, so it cannot hold sub-areas too', par.name;
  end if;

  nm := btrim(coalesce(c.value ->> 'name', ''));
  if nm = '' or length(nm) > 120 then
    raise exception 'an area name must be 1 to 120 characters';
  end if;
  typ := coalesce(nullif(c.value ->> 'areaType', ''), 'crag');
  if typ not in ('crag', 'peak', 'region') then
    raise exception 'area type % is not one of crag, peak, region', typ;
  end if;
  begin
    la := nullif(c.value ->> 'lat', '')::double precision;
    ln := nullif(c.value ->> 'lng', '')::double precision;
  exception when others then
    la := null; ln := null;
  end;
  if la is null or ln is null or la not between -90 and 90 or ln not between -180 and 180 then
    la := null; ln := null;
  end if;

  -- Ids are `<state prefix>_<slug>`, as the imported catalog's are; a clash gets a number.
  base := split_part(par.id, '_', 1) || '_' || coalesce(nullif(route_slug(nm), ''), 'area');
  new_id := base;
  while exists (select 1 from areas where id = new_id) loop
    n := n + 1;
    new_id := base || '_' || n;
  end loop;

  insert into areas (id, name, parent_id, area_type, region, lat, lng, blurb, coords_approx)
  values (new_id, nm, par.id, typ, coalesce(par.region, par.name), la, ln,
          nullif(btrim(coalesce(c.value ->> 'description', '')), ''), false);

  update contributions
     set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_contribution_id;
  return new_id;
end $$;

revoke all on function approve_new_area(uuid) from public, anon;
grant execute on function approve_new_area(uuid) to authenticated;
comment on function approve_new_area(uuid) is
  'Admin-only. Turns a pending new_area contribution (area_id = the parent) into an areas row, id <state>_<slug>[_n]. The area triggers still refuse a duplicate place or a parent that holds routes.';

create or replace function contribution_points()
returns table(contributor text, k text, pts int, area_path ltree)
language sql stable security definer set search_path = public, pg_temp as $$
  select distinct on (x.contributor, x.k) x.contributor, x.k, x.pts, a.path
  from (
    select c.contributor, coalesce(c.area_id, r.area_id) as aid,
           case
             when c.kind = 'field' then 'f|' || coalesce(c.route_id, 'a:' || c.area_id, '') || '|' || coalesce(c.field, '')
             when c.kind = 'new_route' then 'n|' || c.id::text
             when c.kind = 'new_area' then 'na|' || c.id::text
             when c.kind = 'photo' then 'p|' || coalesce(c.route_id, 'a:' || c.area_id, '')
             when c.kind = 'pair' then 'pair|' || coalesce(c.route_id, '') || '|' || coalesce(c.value ->> 'with', c.id::text)
             else c.kind || '|' || coalesce(c.route_id, 'a:' || c.area_id, '')
           end as k,
           case c.kind when 'new_route' then 10 when 'photo' then 5 when 'field' then 2 when 'new_area' then 2 else 1 end as pts
      from contributions c
      left join routes r on r.id = c.route_id
     where c.contributor is not null and c.contributor not in ('anon', '')
       and case when c.kind in ('field', 'new_route', 'new_area') then c.status = 'approved'
                else c.status is distinct from 'rejected' end
    union all
    select t.created_by::text, t.area_id, 't|' || t.area_id, 5
      from topos t
     where t.created_by is not null and t.moderation = 'visible'
    union all
    select l.created_by::text, coalesce(r.area_id, t.area_id), 'l|' || coalesce(l.route_id, l.id::text), 2
      from topo_lines l
      join topos t on t.id = l.topo_id and t.moderation = 'visible'
      left join routes r on r.id = l.route_id
     where l.created_by is not null
    union all
    -- a logged climb or attempt: once per route (a Conditions-only report is not a climb)
    select cl.user_id::text, r.area_id, 'log|' || cl.route_id, 1
      from climb_logs cl
      join routes r on r.id = cl.route_id
     where cl.trip_report_visibility = 'public' and cl.moderation = 'visible'
       and cl.tick_type is distinct from 'Conditions'
    union all
    -- a trip report: once per route per month
    select cl.user_id::text, r.area_id,
           'rep|' || cl.route_id || '|' || to_char(coalesce(cl.date_climbed, cl.created_at::date), 'YYYY-MM'), 2
      from climb_logs cl
      join routes r on r.id = cl.route_id
     where cl.trip_report_visibility = 'public' and cl.moderation = 'visible'
       and (cl.tick_type = 'Conditions'
            or btrim(coalesce(cl.notes, '')) <> ''
            or cardinality(coalesce(cl.cond_tags, '{}')) > 0
            or btrim(coalesce(cl.beta, '')) <> '')
  ) x
  join areas a on a.id = x.aid
  order by x.contributor, x.k, x.pts desc;
$$;
