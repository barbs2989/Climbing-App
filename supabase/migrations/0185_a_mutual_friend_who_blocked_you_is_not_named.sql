-- A climber who blocked you could still be named to you as a mutual friend.
--
-- `0182` shipped `mutual_connections` with one block check:
--
--     and not profile_owner_blocked_me(t.oid)
--
-- `t.oid` is the profile being OPENED, so a reader cannot see the mutuals of somebody who has
-- blocked them. `t.fid` -- the person being NAMED in the list -- had no such check, and that is
-- the half `0095` exists to protect. Fixed here by filtering both.
--
-- IT IS REACHABLE, and that was measured rather than assumed, because a fix for an unreachable
-- state is dead code and this repo records dead code reading as coverage. The question is whether
-- somebody you are still CONNECTED to can have blocked you, since `t.fid` is joined against the
-- caller's own accepted edges (`mine`). They can:
--
--   * `blocked_users` (0088) is a standalone table. There is no trigger on `connections`, so
--     blocking severs nothing at the database level;
--   * `lib/db.js`'s `blockUser()` inserts the block row and touches `connections` not at all;
--   * neither of its two call sites in `ClimbMatch.jsx` removes the connection either.
--
-- So: A and C are connected, C blocks A, the accepted row survives. B and C are connected. A opens
-- B's profile and C is named -- by the one surface that reaches around the block.
--
-- WHAT THE LEAK ACTUALLY IS, stated precisely rather than as "a block was ignored". A already knows
-- C exists and already knows they are connected to C; no identity is revealed. What is revealed is
-- an EDGE that C has tried to withhold from A -- that C is also connected to B -- on the one
-- surface `0095` did not cover. `0095` makes C's profile unreadable to A; this makes C's presence
-- in a list unreadable to A. Same rule, second door.
--
-- IT SUPPRESSES SILENTLY, WHICH IS A REQUIREMENT AND NOT AN ACCIDENT. `useMyBlocked`'s own comment
-- states the principle: the app never shows you who has blocked you, because that "would turn a
-- safety tool into a notification". `0088`, `0094` and `0095` all refuse without naming the block,
-- and CLAUDE.md records that `check:block-guarantees` asserts exactly that -- neither refusal
-- discloses the block to the blocked party. A row that is simply absent names nothing, so this
-- inherits that property rather than needing a new one.
--
-- THE MIRROR IS DELIBERATELY NOT BUILT: a climber the CALLER blocked is still named to them.
-- Three reasons, and none of them is that it would be hard:
--
--   * it is not a privacy question. A blocked C, so A already knows C; showing C to A discloses
--     nothing A withheld from themselves. It is a preference about what A wants to look at;
--   * there is no precedent to follow. `useMyConnections` filters blocked climbers in NEITHER
--     direction, so a blocked connection is still listed in the friends list today. Hiding them
--     here alone would make two surfaces disagree about one relationship;
--   * `profile_owner_blocked_me(target)` cannot express it. It asks "has TARGET blocked the
--     caller", so the mirror needs a second helper, which is a second thing to keep straight.
--
-- Flagged rather than silently expanded, the same call `0184` made about reciprocity.
--
-- A BLOCK BETWEEN TWO THIRD PARTIES IS ALSO OUT OF SCOPE, and for a sharper reason: if the opened
-- profile has blocked the mutual (or the reverse), neither of them is the caller, so nothing is
-- disclosed TO the caller that they did not already have from their own connection. This function
-- is caller-relative by construction and stays that way.
--
-- COST: `blocked_users_pair_uidx` on `(blocker, blocked)` (0088) serves
-- `where blocker = target and blocked = auth.uid()` exactly, so each call is an indexed EXISTS,
-- and `others` is already capped at 64 rows.

-- UNCHANGED from 0184 apart from the one new filter line. `create or replace` keeps the signature,
-- and therefore the ACL -- it cannot replace ACROSS argument lists, which is how 0128/0132 left two
-- live overloads, so the argument list here is byte-identical on purpose.
create or replace function mutual_connections(others uuid[])
returns table (other_id uuid, mutual_id uuid)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  with mine as (
    -- The caller's own accepted edges, mapped to the OTHER party each time.
    select case when requester = auth.uid() then addressee else requester end as fid
    from connections
    where status = 'accepted'
      and (requester = auth.uid() or addressee = auth.uid())
  ),
  theirs as (
    select o.id as oid,
           case when c.requester = o.id then c.addressee else c.requester end as fid
    from unnest(others) as o(id)
    join connections c
      on c.status = 'accepted'
     and (c.requester = o.id or c.addressee = o.id)
  )
  select t.oid, t.fid
  from theirs t
  join mine m on m.fid = t.fid
  -- An INNER join, so a profile row that does not exist drops the pair rather than exposing it.
  join profiles pm on pm.id = t.fid
  join profiles po on po.id = t.oid
  where auth.uid() is not null
    -- A signed-out caller has no friends, so `mine` is empty and the join returns nothing
    -- anyway; this says so explicitly rather than relying on that.
    and t.fid <> auth.uid()
    and t.fid <> t.oid
    -- THE BLOCK, at both ends: the profile being OPENED (0182) and the person being NAMED (here).
    and not profile_owner_blocked_me(t.oid)
    and not profile_owner_blocked_me(t.fid)
    and coalesce(array_length(others, 1), 0) <= 64
    -- The visibility switch, at both ends (0184).
    and pm.mutuals_visible
    and po.mutuals_visible;
$$;

-- RE-ASSERTED RATHER THAN ASSUMED, exactly as 0184 does. `create or replace` preserves a
-- function's ACL, so these are belt-and-braces -- but 0182's header records that its first apply
-- left `anon=X` standing in `proacl`, because a revoke from PUBLIC does not touch an explicit role
-- grant and Supabase's default privileges add one. Reading the ACL back is what caught it.
revoke all on function mutual_connections(uuid[]) from public;
revoke all on function mutual_connections(uuid[]) from anon;
grant execute on function mutual_connections(uuid[]) to authenticated;

-- Confirm -- expect prosecdef true, search_path pinned, no anon in proacl, and BOTH block filters:
--   select prosecdef, proconfig, proacl from pg_proc where proname = 'mutual_connections';
--   select prosrc from pg_proc where proname = 'mutual_connections';
--
-- BEHAVIOUR CANNOT BE PROVEN WITH FEWER THAN THREE ACCOUNTS, for 0095's reason plus one more: a
-- mutual needs A and B both connected to C, and the block needs C to act against A. The service
-- role bypasses RLS entirely, so a service-key probe reports success either way.
-- `scripts/oneoff/probe-mutual-friends-honour-the-block.mjs` runs it on real accounts, with the
-- control BEFORE the block so the disappearance is attributable to it.
