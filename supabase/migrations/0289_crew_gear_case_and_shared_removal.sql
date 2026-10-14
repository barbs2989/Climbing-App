-- Crew gear: one item is one item whatever its capitals, and removing it removes it for the crew.
--
-- 1. CASE. The crew card already treats "Rope" and "rope" as one list item (it dedupes the members'
--    gear_extras case-insensitively), but assign_crew_gear (0286/0287) matched claims EXACTLY. A
--    member who added "rope" and a crewmate who claimed "Rope" were never joined up, and clearing
--    "Rope" left a stored "rope" that came back on the next load. Claims now match ignoring case:
--    claiming an item already held in any spelling is a no-op, and clearing removes every spelling.
--
-- 2. AN ITEM TWO MEMBERS ADDED. gear_extras is per member, so when two climbers both added "Stove",
--    one of them removing it only took it out of THEIR row -- the other copy put it straight back,
--    with every claim on it already cleared. remove_crew_gear_item takes the item out of every
--    member's extras and every member's claims in ONE statement. Who may call it is unchanged from
--    the card: a member who added the item themselves.
--
-- 3. ADDING IS ONE ITEM TOO. Now that a crewmate's removal reaches your gear_extras, 0287's
--    set_my_crew_gear_extras (which REPLACES your whole list) would put back an item a crewmate had
--    just removed, from any screen loaded before the removal. add_crew_gear_item appends one item.
--    The client no longer sends a whole list anywhere; both old functions stay for cached clients.
create or replace function public.add_crew_gear_item(p_crew_id uuid, p_item text)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare n integer;
begin
  if auth.uid() is null then raise exception 'sign in to coordinate gear'; end if;
  if p_item is null or length(trim(p_item)) = 0 or length(p_item) > 80 then
    raise exception 'a gear item must be 1-80 characters'; end if;
  if not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = auth.uid() and status in ('confirmed','pending')) then
    raise exception 'you are not in this crew'; end if;
  if exists (select 1 from crew_members m, unnest(m.gear_extras) g
              where m.crew_id = p_crew_id and m.user_id = auth.uid() and lower(g) = lower(p_item)) then
    return; end if;
  update crew_members set gear_extras = array_append(gear_extras, p_item)
   where crew_id = p_crew_id and user_id = auth.uid() and coalesce(array_length(gear_extras,1),0) < 50;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'too many gear items'; end if;
end;
$function$;
revoke all on function public.add_crew_gear_item(uuid, text) from public, anon;
grant execute on function public.add_crew_gear_item(uuid, text) to authenticated, service_role;

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
       and not exists (select 1 from unnest(gear_claims) g where lower(g) = lower(p_item))
       and coalesce(array_length(gear_claims,1),0) < 100;
  else
    update crew_members
       set gear_claims = array(select g from unnest(gear_claims) with ordinality u(g, i) where lower(g) <> lower(p_item) order by i)
     where crew_id = p_crew_id and user_id = p_user_id and status in ('confirmed','pending');
  end if;
  get diagnostics n = row_count;
  if n = 0 then
    if not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = p_user_id and status in ('confirmed','pending')) then
      raise exception 'that climber is not in this crew';
    elsif p_on and not exists (select 1 from crew_members m, unnest(m.gear_claims) g
                                where m.crew_id = p_crew_id and m.user_id = p_user_id and lower(g) = lower(p_item)) then
      raise exception 'too many gear items';
    end if;
  end if;
end;
$function$;
revoke all on function public.assign_crew_gear(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.assign_crew_gear(uuid, uuid, text, boolean) to authenticated, service_role;

create or replace function public.remove_crew_gear_item(p_crew_id uuid, p_item text)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then raise exception 'sign in to coordinate gear'; end if;
  if p_item is null or length(trim(p_item)) = 0 or length(p_item) > 80 then
    raise exception 'a gear item must be 1-80 characters'; end if;
  if not exists (select 1 from crew_members m, unnest(m.gear_extras) g
                  where m.crew_id = p_crew_id and m.user_id = auth.uid() and m.status in ('confirmed','pending')
                    and lower(g) = lower(p_item)) then
    raise exception 'only a climber who added that item can remove it'; end if;
  update crew_members
     set gear_extras = array(select g from unnest(gear_extras) with ordinality u(g, i) where lower(g) <> lower(p_item) order by i),
         gear_claims = array(select g from unnest(gear_claims) with ordinality u(g, i) where lower(g) <> lower(p_item) order by i)
   where crew_id = p_crew_id
     and exists (select 1 from unnest(gear_extras || gear_claims) g where lower(g) = lower(p_item));
end;
$function$;
revoke all on function public.remove_crew_gear_item(uuid, text) from public, anon;
grant execute on function public.remove_crew_gear_item(uuid, text) to authenticated, service_role;
