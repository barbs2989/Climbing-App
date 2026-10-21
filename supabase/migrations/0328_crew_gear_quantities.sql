-- Crew gear: quantities. An item can say how many the crew wants ("Quickdraws · 12 wanted"), and each
-- climber bringing it says how many THEY bring ("Sam 6, Alex 6"), so two people can split one item
-- and the card can count it covered only when the numbers add up.
--
-- Two per-member jsonb maps, keyed by lower(item) as 0289 matches items:
--   gear_counts  {item: n}  how many of a claimed item this member brings. Absent means one.
--   gear_wanted  {item: n}  how many the crew wants, stored on the row(s) of whoever added the item
--                           (the list itself is gear_extras on those rows). Absent means no number.
-- The claim itself is still gear_claims (0287/0291): a count says nothing on a row that holds no
-- claim, and the reader ignores it there.
--
-- set_crew_gear_count: the same caller and target rules as assign_crew_gear (0291) for a count above
-- one; a count of one or less only removes the key, which anyone who may unclaim may do.
-- set_crew_gear_wanted: any member who may claim (confirmed, or pending for themselves -- so here,
-- confirmed), on an item that is on the list. Null or 0 clears it.
-- remove_crew_gear_item: 0289's, plus it clears both maps, so a re-added item starts clean.
begin;

alter table public.crew_members add column if not exists gear_counts jsonb not null default '{}'::jsonb;
alter table public.crew_members add column if not exists gear_wanted jsonb not null default '{}'::jsonb;

create or replace function public.set_crew_gear_count(p_crew_id uuid, p_user_id uuid, p_item text, p_count integer)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare n integer;
begin
  if auth.uid() is null then raise exception 'sign in to coordinate gear'; end if;
  if p_item is null or length(trim(p_item)) = 0 or length(p_item) > 80 then
    raise exception 'a gear item must be 1-80 characters'; end if;
  if p_count is null or p_count < 0 or p_count > 999 then
    raise exception 'a quantity must be 0-999'; end if;
  if not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = auth.uid()
                  and (status = 'confirmed' or (status = 'pending' and p_user_id = auth.uid()))) then
    raise exception 'you are not in this crew'; end if;
  if p_count <= 1 then
    update crew_members set gear_counts = gear_counts - lower(p_item)
     where crew_id = p_crew_id and user_id = p_user_id and status in ('confirmed','pending');
    get diagnostics n = row_count;
    if n = 0 then raise exception 'that climber is not in this crew'; end if;
    return;
  end if;
  if not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = p_user_id) then
    raise exception 'that climber is not in this crew'; end if;
  if not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = p_user_id
                  and (status = 'confirmed' or (status = 'pending' and p_user_id = auth.uid()))) then
    raise exception 'that climber has not been confirmed in this crew'; end if;
  if not exists (select 1 from crew_members m, unnest(m.gear_extras) g
                  where m.crew_id = p_crew_id and lower(g) = lower(p_item)) then
    raise exception 'that item is not on this crew''s gear list'; end if;
  update crew_members set gear_counts = gear_counts || jsonb_build_object(lower(p_item), p_count)
   where crew_id = p_crew_id and user_id = p_user_id;
end;
$function$;
revoke all on function public.set_crew_gear_count(uuid, uuid, text, integer) from public, anon;
grant execute on function public.set_crew_gear_count(uuid, uuid, text, integer) to authenticated, service_role;

create or replace function public.set_crew_gear_wanted(p_crew_id uuid, p_item text, p_count integer)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then raise exception 'sign in to coordinate gear'; end if;
  if p_item is null or length(trim(p_item)) = 0 or length(p_item) > 80 then
    raise exception 'a gear item must be 1-80 characters'; end if;
  if p_count is not null and (p_count < 0 or p_count > 999) then
    raise exception 'a quantity must be 0-999'; end if;
  if not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = auth.uid() and status = 'confirmed') then
    raise exception 'you are not in this crew'; end if;
  if not exists (select 1 from crew_members m, unnest(m.gear_extras) g
                  where m.crew_id = p_crew_id and lower(g) = lower(p_item)) then
    raise exception 'that item is not on this crew''s gear list'; end if;
  update crew_members
     set gear_wanted = case when coalesce(p_count, 0) = 0 then gear_wanted - lower(p_item)
                            else gear_wanted || jsonb_build_object(lower(p_item), p_count) end
   where crew_id = p_crew_id
     and exists (select 1 from unnest(gear_extras) g where lower(g) = lower(p_item));
end;
$function$;
revoke all on function public.set_crew_gear_wanted(uuid, text, integer) from public, anon;
grant execute on function public.set_crew_gear_wanted(uuid, text, integer) to authenticated, service_role;

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
         gear_claims = array(select g from unnest(gear_claims) with ordinality u(g, i) where lower(g) <> lower(p_item) order by i),
         gear_counts = gear_counts - lower(p_item),
         gear_wanted = gear_wanted - lower(p_item)
   where crew_id = p_crew_id
     and (exists (select 1 from unnest(gear_extras || gear_claims) g where lower(g) = lower(p_item))
          or gear_counts ? lower(p_item) or gear_wanted ? lower(p_item));
end;
$function$;
revoke all on function public.remove_crew_gear_item(uuid, text) from public, anon;
grant execute on function public.remove_crew_gear_item(uuid, text) to authenticated, service_role;

notify pgrst, 'reload schema';
commit;
