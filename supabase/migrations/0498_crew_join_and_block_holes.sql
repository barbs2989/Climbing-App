-- 0498: three holes found by the crews-and-partners review (2026-11-23).
--
--   1. A CLIMBER COULD APPROVE THEIR OWN JOIN REQUEST. "member updates own membership" (0086) lets a member
--      reach 'confirmed' only when the row's invited_by is the crew's organizer — the mark of a real invite.
--      But nothing stopped the member WRITING invited_by on their own row: ask to join a listed crew (a
--      pending row, invited_by = you), then one UPDATE setting status = 'confirmed' and invited_by = the
--      organizer's id, which crew_listings.created_by publishes. That seated a stranger, who could then read
--      the float plan, the meet-up and the chat. invited_by, crew_id and user_id are now fixed once a row
--      exists, for every write that arrives through the API. Definer functions (the hand-over in 0474, the
--      email-invite claim) run as their owner and are not affected.
--   2. A CLIMBER YOU BLOCKED COULD STILL ASK TO JOIN YOUR CREW, with a note that reached your bell and your
--      Requests. guard_crew_invite_not_blocked (0094) only looked at an invite: the invitee blocked the
--      inviter. A request to join has invited_by = the requester, so it was skipped. A request is now refused
--      when the crew's organizer has blocked the requester, in the same words as any other refusal. Requests
--      already waiting from a blocked climber are removed.
--   3. A CLIMBER YOU BLOCKED WAS STILL COUNTED on an area page's "N climbers listed here". The partner
--      functions hide a climber who blocked YOU (profile_owner_blocked_me); the other direction is filtered
--      on the screen, which a count cannot be. partner_area_counts now leaves out climbers the caller blocked.

begin;

-- 1 ── a membership row's identity is not the member's to rewrite ──
create or replace function public.crew_members_lock_identity() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $function$
begin
  if current_user in ('authenticated', 'anon')
     and (new.invited_by is distinct from old.invited_by
          or new.crew_id is distinct from old.crew_id
          or new.user_id is distinct from old.user_id) then
    raise exception 'that part of a crew membership cannot be changed' using errcode = '42501';
  end if;
  return new;
end $function$;
drop trigger if exists crew_members_lock_identity on public.crew_members;
create trigger crew_members_lock_identity before update on public.crew_members
  for each row execute function public.crew_members_lock_identity();

-- 2 ── a block stops a request to join, as it stops an invite ──
create or replace function guard_crew_invite_not_blocked() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Someone else did the adding: the invitee must not have blocked the inviter (0094).
  if new.invited_by is not null and new.invited_by <> new.user_id and exists (
    select 1 from blocked_users
    where blocker = new.user_id and blocked = new.invited_by
  ) then
    -- Says nothing about a block, exactly as the message guard does not.
    raise exception 'this climber cannot be added to your crew';
  end if;
  -- The climber added themselves (a request to join): the crew's organizer must not have blocked them.
  if (new.invited_by is null or new.invited_by = new.user_id) and exists (
    select 1 from crews c join blocked_users b on b.blocker = c.created_by and b.blocked = new.user_id
    where c.id = new.crew_id
  ) then
    raise exception 'this crew is not taking your request';
  end if;
  return new;
end;
$$;

delete from crew_members m
 using crews c, blocked_users b
 where m.crew_id = c.id and m.status = 'pending'
   and b.blocker = c.created_by and b.blocked = m.user_id;

-- 3 ── the count leaves out climbers the caller blocked ──
create or replace function public.partner_area_counts(p_area_ids text[])
returns table(area_id text, listed_count integer)
language plpgsql stable security definer set search_path to 'public', 'pg_temp'
as $function$
begin
  if auth.uid() is null then raise exception 'sign in to see who is listed'; end if;
  if coalesce(array_length(p_area_ids, 1), 0) > 50 then raise exception 'too many areas'; end if;
  return query
    select t.aid, (
      select count(distinct pa.user_id)::integer
      from partner_areas pa
      join areas la on la.id = pa.area_id
      join profiles p on p.id = pa.user_id
      where pa.user_id <> auth.uid()
        and (la.path <@ ta.path or (la.path @> ta.path and la.area_type <> 'state'))
        and p.discoverable = true and not profile_owner_blocked_me(p.id)
        and not exists (select 1 from blocked_users b where b.blocker = auth.uid() and b.blocked = p.id))
    from unnest(p_area_ids) as t(aid)
    join areas ta on ta.id = t.aid;
end;
$function$;
revoke all on function public.partner_area_counts(text[]) from public, anon;
grant execute on function public.partner_area_counts(text[]) to authenticated, service_role;

commit;
