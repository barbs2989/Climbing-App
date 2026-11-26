-- 0545: People you may know counts a mutual friend the way the Mutual friends sheet does.
--
-- Audit of mutual friends, 2026-11-25. people_you_may_know() (last defined in 0441) counted
-- friends-of-friends through EVERY accepted friend, while mutual_connections() -- what the profile
-- and the Mutual friends sheet list -- leaves out a friend whose profiles.mutuals_visible is off
-- (0184). So a suggestion card could say "2 mutual friends" and the climber's profile one tap
-- later "1 mutual friend · Ada": two counts of one fact. And the card's number still counted the
-- friend who had asked not to be shown, which tells you that one of your friends, unnamed, knows
-- this climber. The Settings switch promises that off keeps your connections out of it.
--
-- Only the fof CTE changes; the rest of the body is 0441's, verbatim. A climber reached ONLY
-- through hidden friends is no longer suggested as a friend-of-a-friend (they can still be
-- suggested for a crew or a logged climb together, which is a fact about you, not about a friend).
--
-- Facebook, LinkedIn and Instagram all show a mutual count on a suggestion that is the length of
-- the list you get on tapping it; that is the bar here.

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
      join profiles fp on fp.id = f.f
     where c.status = 'accepted'
       -- Counted only through a friend who lets themselves be shown as a mutual, the same rule
       -- mutual_connections() applies (0184), so the card's "N mutual friends" is the list the
       -- Mutual friends sheet and the profile name. Before, a friend who had turned the switch off
       -- was still counted: "2 mutual friends" over one name, and a number that told you a hidden
       -- friend of yours knows this person.
       and fp.mutuals_visible
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
