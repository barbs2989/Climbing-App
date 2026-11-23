-- 0485: a climber suggests the LEFT-TO-RIGHT ORDER of the climbs on a wall (owner, 2026-11-19:
-- "we should offer a button to recommend a change in the order left to right or right to left of
-- climbs on walls").
--
-- The wall's climb list has a button that opens a sheet where the climber puts the climbs in
-- order. Sending it files ONE contributions row of kind 'wall_order': area_id = the wall,
-- value = {order: [route ids, left to right], note}. The list holds only the climbs the climber
-- has in the line: a climb with no position that they did not place is not in it. Nothing on the
-- page changes. The insert policy ('authed can contribute') already lets a signed-in climber
-- write a non-field kind, so this migration adds the shape check, the review step, the notice to
-- the sender, and the scoring rule.
--
-- resolve_wall_order: admin only, pending rows only.
--   'approved' WRITES the order: each listed climb that is still on the wall and is not a boulder
--              problem (a problem has no place in a wall's line -- owner, 2026-10-21) gets
--              routes.sort_order = its place in the list, 1..n. A placed climb the list does not
--              name (added to the wall after the suggestion was sent) keeps its turn AFTER the
--              listed ones, in its old order. A climb with no position that the list does not
--              name stays without one.
--   'rejected' writes nothing to routes.
--   Either way the sender gets a notice in the bell that opens the wall (as 0309 does for a route
--   edit and 0367 for a proposed climb).
--
-- contribution_points(): a wall order scores only once APPROVED. It used to fall to the "anything
-- else, unless rejected" branch, which would have paid a point for every suggestion the moment it
-- was filed. The rest of the function is 0360's, unchanged.

alter table contributions drop constraint if exists contributions_wall_order_shape_ck;
alter table contributions add constraint contributions_wall_order_shape_ck check (
  kind is distinct from 'wall_order'
  -- coalesce: a value with no 'order' key makes the test NULL, and a CHECK passes on NULL.
  or coalesce(
    area_id is not null
    and route_id is null
    and jsonb_typeof(value) = 'object'
    and jsonb_typeof(value -> 'order') = 'array'
    and jsonb_array_length(value -> 'order') between 2 and 1000
    and length(coalesce(value ->> 'note', '')) <= 400,
    false
  )
);

create or replace function resolve_wall_order(p_contribution_id uuid, p_status text, p_note text default null)
returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  c contributions;
  n_listed integer := 0;
  who uuid;
  aname text;
  note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not is_admin(auth.uid()) then
    raise exception 'only an admin can resolve a wall order suggestion';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'a wall order suggestion resolves as approved (order written) or rejected (order kept), not %', p_status;
  end if;
  select * into c from contributions where id = p_contribution_id;
  if c.id is null then
    raise exception 'no contribution with id %', p_contribution_id;
  end if;
  if c.kind <> 'wall_order' then
    raise exception 'contribution % is not a wall order suggestion', p_contribution_id;
  end if;
  if c.status <> 'pending' then
    raise exception 'contribution % is already %', p_contribution_id, c.status;
  end if;

  if p_status = 'approved' then
    -- The listed climbs, in the order sent; a climb named twice keeps its first place.
    with listed as (
      select o.id, min(o.ord) as ord
        from jsonb_array_elements_text(c.value -> 'order') with ordinality as o(id, ord)
       group by o.id
    ), on_wall as (
      select r.id, l.ord, r.sort_order as was, r.name
        from routes r
        left join listed l on l.id = r.id
       where r.area_id = c.area_id
         and r.discipline is distinct from 'bouldering'
         and (l.id is not null or r.sort_order is not null)
    ), placed as (
      -- listed climbs first, in the list's order; then the placed climbs it does not name.
      select id, row_number() over (order by (ord is null), ord, was, name, id) as pos
        from on_wall
    )
    update routes r
       set sort_order = p.pos
      from placed p
     where r.id = p.id
       and r.sort_order is distinct from p.pos;

    select count(*) into n_listed
      from routes r
     where r.area_id = c.area_id
       and r.discipline is distinct from 'bouldering'
       and r.id in (select jsonb_array_elements_text(c.value -> 'order'));
    if n_listed < 2 then
      raise exception 'fewer than two of the climbs in this suggestion are still on the wall; nothing to order';
    end if;
  end if;

  update contributions
     set status = p_status, reviewed_by = auth.uid(), reviewed_at = now(), review_note = note
   where id = p_contribution_id;

  -- Tell the sender. contributor is text; an old anonymous row has no one to tell.
  who := _contributor_uuid(c.contributor);
  if who is not null and exists (select 1 from profiles where id = who) then
    select name into aname from areas where id = c.area_id;
    if p_status = 'approved' then
      perform _notify(who, 'contribution_approved',
        'Your wall order is live: ' || coalesce(aname, 'the wall you ordered'),
        'The climbs there are now listed in the order you sent.',
        jsonb_build_object('area', c.area_id));
    else
      perform _notify(who, 'contribution_rejected',
        'The wall order you sent wasn''t used: ' || coalesce(aname, 'that wall'),
        case when note is null then null else 'Reason: ' || note end,
        jsonb_build_object('area', c.area_id));
    end if;
  end if;
  return n_listed;
end $$;

revoke all on function resolve_wall_order(uuid, text, text) from public, anon;
grant execute on function resolve_wall_order(uuid, text, text) to authenticated;

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
       and case when c.kind in ('field', 'new_route', 'new_area', 'wall_order') then c.status = 'approved'
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

-- ---------------------------------------------------------------- confirm (run SEPARATELY)
--
--   select proname from pg_proc where proname = 'resolve_wall_order';
--   -- expect 1 row
--   select conname from pg_constraint where conname = 'contributions_wall_order_shape_ck';
--   -- expect 1 row
--   select position('wall_order' in prosrc) > 0 from pg_proc where proname = 'contribution_points';
--   -- expect true
