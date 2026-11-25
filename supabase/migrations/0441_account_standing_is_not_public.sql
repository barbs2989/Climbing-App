-- 0441 — Another climber's account standing is no longer answerable by any signed-in user.
--
-- is_active_user(uid), can_flag(uid), can_contribute_fields(uid) and group_user_banned(gid, who) are
-- SECURITY DEFINER and were EXECUTE-able by every signed-in user through /rpc, with any id. So anyone
-- could ask "is this climber banned or suspended?", "is their flagging or field-editing restricted?"
-- and "are they banned from this group?" — about anybody. The owner does not want that visible.
--
-- They cannot simply answer only about the caller: RLS policies and definer functions ask about
-- OTHER climbers too — the "group_members invite" policy checks the invitee is not banned from the
-- group, and people_you_may_know drops suspended accounts. So:
--   * The real logic moves to private.<same name>. The API exposes only public and graphql_public
--     (checked against production 2026-11-14: PGRST106 "Invalid schema: private"), so nothing in
--     private can be called by a client, whatever is granted.
--   * The two callers that ask about someone else now call private.*: the invite policy (as the
--     caller, so authenticated gets USAGE on private and EXECUTE on that one function) and
--     people_you_may_know (a definer, so it needs nothing).
--   * The public functions keep their names and signatures, and answer only about the caller
--     (every policy passes auth.uid(); file_appeal and file_route_flag pass uid := auth.uid()), to an
--     admin, to the service role, and — for group bans — to that group's organizer or moderators, who
--     can already read group_bans. Anyone else gets NULL: "not yours to know", not a false "active".
-- No client code calls any of the four (lib/, src/, *.jsx, supabase/functions checked).


CREATE OR REPLACE FUNCTION private.is_active_user(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select uid is not null and not exists (
    select 1 from account_standing s
     where s.user_id = uid
       and (s.status = 'banned' or (s.status = 'suspended' and (s.until is null or s.until > now())))
  );
$function$;

revoke all on function private.is_active_user from public, anon, authenticated;

CREATE OR REPLACE FUNCTION private.can_flag(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select uid is not null and (
    is_admin(uid) or not exists (select 1 from contribution_standing s where s.user_id = uid and s.status = 'banned')
  );
$function$;

revoke all on function private.can_flag from public, anon, authenticated;

CREATE OR REPLACE FUNCTION private.can_contribute_fields(uid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select uid is not null and (
    is_admin(uid) or not exists (
      select 1 from contribution_standing s
       where s.user_id = uid
         and (s.status = 'banned' or (s.status = 'restricted' and (s.until is null or s.until > now())))
    )
  );
$function$;

revoke all on function private.can_contribute_fields from public, anon, authenticated;

CREATE OR REPLACE FUNCTION private.group_user_banned(gid uuid, who uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (select 1 from group_bans where group_id = gid and user_id = who);
$function$;

revoke all on function private.group_user_banned from public, anon, authenticated;

grant usage on schema private to anon, authenticated;
-- The invite policy runs as the caller and calls this one; an INSERT by anon is refused by RLS either way.
grant execute on function private.group_user_banned(uuid, uuid) to anon, authenticated;

create or replace function public.is_active_user(uid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select case when uid is not distinct from auth.uid() or (auth.role() = 'service_role' or is_admin(auth.uid()))
              then private.is_active_user(uid) end;
$$;

create or replace function public.can_flag(uid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select case when uid is not distinct from auth.uid() or (auth.role() = 'service_role' or is_admin(auth.uid()))
              then private.can_flag(uid) end;
$$;

create or replace function public.can_contribute_fields(uid uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select case when uid is not distinct from auth.uid() or (auth.role() = 'service_role' or is_admin(auth.uid()))
              then private.can_contribute_fields(uid) end;
$$;

create or replace function public.group_user_banned(gid uuid, who uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select case when who is not distinct from auth.uid() or is_group_manager(gid) or (auth.role() = 'service_role' or is_admin(auth.uid()))
              then private.group_user_banned(gid, who) end;
$$;

alter policy "group_members invite" on public.group_members with check (((( SELECT auth.uid() AS uid) <> user_id) AND (status = 'invited'::text) AND (role = 'member'::text) AND (invited_by = ( SELECT auth.uid() AS uid)) AND (is_group_manager(group_id) OR (is_group_member(group_id) AND (group_invite_policy(group_id) = 'members'::text))) AND (NOT private.group_user_banned(group_id, user_id)) AND (NOT profile_owner_blocked_me(user_id))));

CREATE OR REPLACE FUNCTION public.people_you_may_know(p_limit integer DEFAULT 12)
 RETURNS TABLE(id uuid, mutuals integer, crews_together integer, logged_together integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with me as (select auth.uid() as uid),
  friends as (
    select case when c.requester = me.uid then c.addressee else c.requester end as f
      from connections c, me
     where c.status = 'accepted' and (c.requester = me.uid or c.addressee = me.uid)
  ),
  fof as (
    select case when c.requester = f.f then c.addressee else c.requester end as x, count(*)::int as n
      from connections c join friends f on (c.requester = f.f or c.addressee = f.f)
     where c.status = 'accepted'
     group by 1
  ),
  crewmates as (
    select b.user_id as x, count(distinct a.crew_id)::int as n
      from crew_members a join crew_members b on a.crew_id = b.crew_id, me
     where a.user_id = me.uid and a.status = 'confirmed' and b.status = 'confirmed' and b.user_id <> me.uid
     group by 1
  ),
  logmates as (
    select p.x as x, count(*)::int as n
      from climb_logs l, me, lateral unnest(coalesce(l.partners, '{}'::uuid[])) as p(x)
     where l.user_id = me.uid and p.x is not null
     group by 1
  ),
  cand as (
    select x, sum(m)::int as mutuals, sum(cr)::int as crews_together, sum(lg)::int as logged_together from (
      select x, n as m, 0 as cr, 0 as lg from fof
      union all select x, 0, n, 0 from crewmates
      union all select x, 0, 0, n from logmates
    ) u group by x
  )
  select c.x, c.mutuals, c.crews_together, c.logged_together
    from cand c join profiles p on p.id = c.x, me
   where c.x <> me.uid
     and not exists (select 1 from connections k
                      where least(k.requester, k.addressee) = least(c.x, me.uid)
                        and greatest(k.requester, k.addressee) = greatest(c.x, me.uid))
     and not exists (select 1 from blocked_users b
                      where (b.blocker = me.uid and b.blocked = c.x) or (b.blocker = c.x and b.blocked = me.uid))
     and private.is_active_user(c.x)
     and p.requests_from <> 'nobody'
     -- Someone who hid from discovery or hid their mutuals is suggested only to people they actually
     -- climbed or crewed with, never as a friend-of-a-friend.
     and (c.crews_together > 0 or c.logged_together > 0
          or (coalesce(p.discoverable, true) and coalesce(p.mutuals_visible, true)))
   order by (c.crews_together * 3 + c.logged_together * 3 + c.mutuals) desc, c.x
   limit greatest(1, least(coalesce(p_limit, 12), 50));
$function$;
