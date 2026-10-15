-- assign_crew_gear, tightened: a claim can only be turned ON for a CONFIRMED member (or yourself), and
-- only on an item that is on the crew's list.
--
-- 0286-0289 left two holes, both found by an audit of #2376:
--
-- 1. THE TARGET could be a crewmate's PENDING row -- a climber who has only asked to join and whom the
--    organiser has not let in. The crew card counts a request as "not in the crew yet" (CrewCard.jsx,
--    `inCrew`) and its Assign chips offer confirmed crewmates only, but the function took the request
--    anyway. Now the target must be confirmed, or be the caller: a pending member may still claim for
--    THEMSELVES, which 0209's set_my_crew_gear allowed and 0287 kept on purpose.
-- 2. THE ITEM could be any string. The crew's list is drawn from gear_extras (the items members added),
--    so a claim on anything else is stored and rendered nowhere -- a write no screen can show. Turning a
--    claim ON now needs the item in some member's gear_extras for this crew, matched ignoring case as
--    0289 matches claims. Turning one OFF is never refused on that ground: it can only remove, and it is
--    how a stale claim gets cleared.
--
-- Everything else is 0289's, unchanged: case-insensitive matching (a claim already held in any spelling
-- is a quiet success; clearing removes every spelling), the 100-claim cap raising rather than matching
-- no row and returning as if it saved, and the same lower-case messages, which lib/db.js turns into
-- toast text (crewGearErrorText). Two are new: 'that climber has not been confirmed in this crew' and
-- 'that item is not on this crew''s gear list'. The client writes an item before any claim on it, one
-- patch at a time per crew (ClimbMatch.jsx, queueCrewGear), so its own taps never meet the second one.
create or replace function public.assign_crew_gear(p_crew_id uuid, p_user_id uuid, p_item text, p_on boolean)
returns void language plpgsql security definer set search_path to 'public', 'pg_temp'
as $function$
declare n integer;
begin
  if auth.uid() is null then raise exception 'sign in to coordinate gear'; end if;
  if p_item is null or length(trim(p_item)) = 0 or length(p_item) > 80 then
    raise exception 'a gear item must be 1-80 characters'; end if;
  -- The caller: a confirmed member, or a pending one changing only their own claims.
  if not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = auth.uid()
                  and (status = 'confirmed' or (status = 'pending' and p_user_id = auth.uid()))) then
    raise exception 'you are not in this crew'; end if;

  if not p_on then
    update crew_members
       set gear_claims = array(select g from unnest(gear_claims) with ordinality u(g, i) where lower(g) <> lower(p_item) order by i)
     where crew_id = p_crew_id and user_id = p_user_id and status in ('confirmed','pending');
    get diagnostics n = row_count;
    if n = 0 then raise exception 'that climber is not in this crew'; end if;
    return;
  end if;

  -- The target: a confirmed member, or the caller themselves.
  if not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = p_user_id) then
    raise exception 'that climber is not in this crew'; end if;
  if not exists (select 1 from crew_members where crew_id = p_crew_id and user_id = p_user_id
                  and (status = 'confirmed' or (status = 'pending' and p_user_id = auth.uid()))) then
    raise exception 'that climber has not been confirmed in this crew'; end if;
  -- Already theirs, in any spelling: nothing to write, so nothing to refuse (as 0289).
  if exists (select 1 from crew_members m, unnest(m.gear_claims) g
              where m.crew_id = p_crew_id and m.user_id = p_user_id and lower(g) = lower(p_item)) then
    return; end if;
  -- The item: on the crew's list, in any capitals.
  if not exists (select 1 from crew_members m, unnest(m.gear_extras) g
                  where m.crew_id = p_crew_id and lower(g) = lower(p_item)) then
    raise exception 'that item is not on this crew''s gear list'; end if;

  -- One statement, so two taps at once cannot both append: the second re-reads the row the first wrote.
  update crew_members set gear_claims = array_append(gear_claims, p_item)
   where crew_id = p_crew_id and user_id = p_user_id
     and not exists (select 1 from unnest(gear_claims) g where lower(g) = lower(p_item))
     and coalesce(array_length(gear_claims,1),0) < 100;
  get diagnostics n = row_count;
  if n = 0 and not exists (select 1 from crew_members m, unnest(m.gear_claims) g
                            where m.crew_id = p_crew_id and m.user_id = p_user_id and lower(g) = lower(p_item)) then
    raise exception 'too many gear items'; end if;
end;
$function$;
revoke all on function public.assign_crew_gear(uuid, uuid, text, boolean) from public, anon;
grant execute on function public.assign_crew_gear(uuid, uuid, text, boolean) to authenticated, service_role;
