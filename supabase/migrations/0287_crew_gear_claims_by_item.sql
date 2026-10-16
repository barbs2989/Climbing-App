-- Tapping "I'll bring it" must not erase what a crewmate assigned you.
--
-- 0209's set_my_crew_gear REPLACES the caller's whole gear_claims array with the list the client
-- holds. That was safe while only you wrote your row. 0286 let a crewmate write it too, so a screen
-- loaded before Sam assigned you the rope sends a list without the rope on your next tap, and the
-- assignment is gone without a word. The client now changes claims ONE ITEM AT A TIME through
-- assign_crew_gear (yours included), and writes the items it added through this extras-only function.
--
-- A new name rather than a new meaning for set_my_crew_gear's arguments: whichever of the deploy and
-- this migration lands first, an old function never receives a call shaped for the new one -- a client
-- ahead of the database gets an error and a toast, not a wiped list. set_my_crew_gear stays for a
-- cached client still running the old code.
create or replace function public.set_my_crew_gear_extras(p_crew_id uuid, p_extras text[])
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare n integer;
begin
  if auth.uid() is null then raise exception 'sign in to coordinate gear'; end if;
  if coalesce(array_length(p_extras,1),0) > 50 then raise exception 'too many gear items'; end if;
  if exists (select 1 from unnest(coalesce(p_extras,'{}')) g where length(g) > 80 or length(trim(g)) = 0) then
    raise exception 'a gear item must be 1-80 characters'; end if;
  update crew_members set gear_extras = coalesce(p_extras,'{}')
   where crew_id = p_crew_id and user_id = auth.uid() and status in ('confirmed','pending');
  get diagnostics n = row_count;
  if n = 0 then raise exception 'you are not in this crew'; end if;
end;
$function$;
revoke all on function public.set_my_crew_gear_extras(uuid, text[]) from public, anon;
grant execute on function public.set_my_crew_gear_extras(uuid, text[]) to authenticated, service_role;

-- assign_crew_gear, now also the path for your OWN claims: a pending member may set their own row
-- (as set_my_crew_gear always allowed), only a confirmed one may set someone else's. And a claim the
-- 100-item cap refuses raises, where 0286 matched no row and returned as if it had saved.
create or replace function public.assign_crew_gear(p_crew_id uuid, p_user_id uuid, p_item text, p_on boolean)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare n integer;
begin
  if auth.uid() is null then raise exception 'sign in to coordinate gear'; end if;
  if p_item is null or length(trim(p_item)) = 0 or length(p_item) > 80 then
    raise exception 'a gear item must be 1-80 characters'; end if;
  if not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = auth.uid()
                  and (status = 'confirmed' or (status = 'pending' and p_user_id = auth.uid()))) then
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
  if n = 0 then
    if not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = p_user_id and status in ('confirmed','pending')) then
      raise exception 'that climber is not in this crew';
    elsif p_on and not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = p_user_id and p_item = any(gear_claims)) then
      raise exception 'too many gear items';
    end if;
  end if;
end;
$function$;
revoke all on function public.assign_crew_gear(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.assign_crew_gear(uuid, uuid, text, boolean) to authenticated, service_role;
