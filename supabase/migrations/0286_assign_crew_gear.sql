-- A crew member can mark who is bringing an item, not only themselves.
--
-- 0209 stores gear per member (crew_members.gear_claims / gear_extras) and set_my_crew_gear writes
-- only the CALLER's row, so "Sam is bringing the rope" could only be said by Sam. This adds the one
-- missing write: a confirmed member of a crew sets or clears ONE item on ANOTHER confirmed member's
-- claim list. No new column -- the crew card already reads every member's gear_claims.
--
-- Through a definer for the reason 0209 gives: the row policy refuses the update for most members,
-- and a refused UPDATE is a 200 with zero rows. This raises instead.
create or replace function public.assign_crew_gear(p_crew_id uuid, p_user_id uuid, p_item text, p_on boolean)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare n integer;
begin
  if auth.uid() is null then raise exception 'sign in to coordinate gear'; end if;
  if p_item is null or length(trim(p_item)) = 0 or length(p_item) > 80 then
    raise exception 'a gear item must be 1-80 characters'; end if;
  if not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = auth.uid() and status = 'confirmed') then
    raise exception 'you are not in this crew'; end if;
  if p_on then
    update crew_members set gear_claims = array_append(gear_claims, p_item)
     where crew_id = p_crew_id and user_id = p_user_id and status in ('confirmed','pending')
       and not (p_item = any(gear_claims)) and coalesce(array_length(gear_claims,1),0) < 100;
  else
    update crew_members set gear_claims = array_remove(gear_claims, p_item)
     where crew_id = p_crew_id and user_id = p_user_id and status in ('confirmed','pending');
  end if;
  get diagnostics n = row_count;
  if n = 0 and not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = p_user_id and status in ('confirmed','pending')) then
    raise exception 'that climber is not in this crew'; end if;
end;
$function$;
revoke all on function public.assign_crew_gear(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.assign_crew_gear(uuid, uuid, text, boolean) to authenticated, service_role;
