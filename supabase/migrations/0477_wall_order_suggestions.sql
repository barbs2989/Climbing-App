-- 0477: a climber suggests the LEFT-TO-RIGHT ORDER of the climbs on a wall (owner, 2026-11-19:
-- "we should offer a button to recommend a change in the order left to right or right to left of
-- climbs on walls").
--
-- The wall's climb list has a button that opens a sheet where the climber puts the climbs in
-- order. Sending it files ONE contributions row of kind 'wall_order': area_id = the wall,
-- value = {order: [route ids, left to right], note}. Nothing on the page changes. The insert
-- policy ('authed can contribute') already lets a signed-in climber write a non-field kind, so
-- this migration adds the shape check and the review step, as 0372 did for "Wrong place?".
--
-- resolve_wall_order: admin only, pending rows only.
--   'approved' WRITES the order: each listed climb that is still on the wall and is not a boulder
--              problem (a problem has no place in a wall's line -- owner, 2026-10-21) gets
--              routes.sort_order = its place in the list, 1..n. A placed climb the list does not
--              name (added to the wall after the suggestion was sent) keeps its turn AFTER the
--              listed ones, in its old order. A climb with no position stays without one.
--   'rejected' writes nothing to routes.

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
     set status = p_status, reviewed_by = auth.uid(), reviewed_at = now(),
         review_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_contribution_id;
  return n_listed;
end $$;

revoke all on function resolve_wall_order(uuid, text, text) from public, anon;
grant execute on function resolve_wall_order(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------- confirm (run SEPARATELY)
--
--   select proname from pg_proc where proname = 'resolve_wall_order';
--   -- expect 1 row
--   select conname from pg_constraint where conname = 'contributions_wall_order_shape_ck';
--   -- expect 1 row
