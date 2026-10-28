-- 0372: "Wrong place?" claims on an AREA (owner, 2026-10-25).
--
-- A climber who finds an area filed under the wrong place files a contributions row of kind
-- 'area_placement' (area_id = the area they say is misplaced; value = {note, suggested}). Nothing
-- on the page changes: the owner reads the claim in the proposals queue and moves the area by
-- hand, then resolves the claim here. The insert policy ('authed can contribute') already lets a
-- signed-in climber write any non-field kind, so this migration adds only the review step.
--
-- resolve_area_placement mirrors reject_new_route (0127): admin only, pending rows only, the
-- review columns set in one statement. 'approved' = the owner moved the area; 'rejected' = the
-- owner checked and it is where it belongs.

create or replace function resolve_area_placement(p_contribution_id uuid, p_status text, p_note text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare c contributions;
begin
  if not is_admin(auth.uid()) then
    raise exception 'only an admin can resolve an area placement claim';
  end if;
  if p_status not in ('approved', 'rejected') then
    raise exception 'a placement claim resolves as approved (moved) or rejected (already right), not %', p_status;
  end if;
  select * into c from contributions where id = p_contribution_id;
  if c.id is null then
    raise exception 'no contribution with id %', p_contribution_id;
  end if;
  if c.kind <> 'area_placement' then
    raise exception 'contribution % is not an area placement claim', p_contribution_id;
  end if;
  if c.status <> 'pending' then
    raise exception 'contribution % is already %', p_contribution_id, c.status;
  end if;
  update contributions
     set status = p_status, reviewed_by = auth.uid(), reviewed_at = now(),
         review_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_contribution_id;
end $$;

revoke all on function resolve_area_placement(uuid, text, text) from public, anon;
grant execute on function resolve_area_placement(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------- confirm (run SEPARATELY)
--
--   select proname from pg_proc where proname = 'resolve_area_placement';
--   -- expect 1 row
