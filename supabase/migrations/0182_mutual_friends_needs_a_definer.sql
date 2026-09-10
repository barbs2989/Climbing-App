-- Mutual friends were a stub, and RLS is the reason.
--
-- `mutualIds()` in ClimbMatchCore.jsx took NO ARGUMENTS and returned a literal `[]`, so
-- `mutualCount()` was 0 for every climber, always. All five consumers render as
-- `mutualCount(...) ? control : null`, so the "N mutual friends" row never appeared and the
-- Mutual friends sheet was unreachable in the app -- only `?z=mutualModal`, the overlay
-- guards' own opener, could mount it. The feature was ABSENT rather than lying, which is why
-- no honesty guard ever saw it.
--
-- WHY IT COULD NOT BE DONE CLIENT-SIDE, AND WHY THAT IS NOT A DETAIL. `0087` says it plainly:
--
--     -- Read: only the two people involved. A connection is not public.
--     create policy "connections read own" on connections for select
--       using (auth.uid() = requester or auth.uid() = addressee);
--
-- so a client can read its OWN edges and nobody else's. The intersection needs the other
-- climber's edges, which no amount of client code can fetch. That is the same wall `0095`
-- hit, and the escape is the same: a SECURITY DEFINER function.
--
-- WHAT THIS DISCLOSES, STATED RATHER THAN GLOSSED. The rows it returns are always people the
-- CALLER is already connected to, so it reveals no identity the caller did not already have.
-- What it does reveal is an EDGE: that a friend of mine is also connected to the climber I am
-- looking at. Neither of them published that to me. It is the universal convention for this
-- feature and it is what the app's own UI was built to show, but it is a disclosure, and the
-- privacy documents are updated in the same change rather than left describing the old
-- behaviour -- the rule CLAUDE.md records as "gating a control is a change to the DOCUMENTS
-- too", applied in the un-gating direction.
--
-- ENUMERATION IS BOUNDED BY THE CALLER'S OWN FRIEND LIST, WHICH IS THE SAFETY PROPERTY.
-- Whatever ids are passed, the result is a subset of the caller's accepted connections: the
-- function can never return a climber the caller does not already know. So the worst a caller
-- learns by passing many ids is WHICH OF THEIR OWN FRIENDS know those people. That is inherent
-- to a mutual-friends feature rather than a defect in this implementation, and the array is
-- capped so it cannot be swept in one call.
--
-- BLOCKS ARE HONOURED, or this would be a way around one. A climber who has blocked me cannot
-- be read through `profiles` (0095), and returning their mutual friends here would hand back a
-- fact about them through a side door. `profile_owner_blocked_me` is reused rather than
-- re-implemented -- a second copy of a block test is how two of them drift.
--
-- `set search_path = public, pg_temp` and NOT `= public`. CLAUDE.md records 14 definers that
-- were wrong here and SEVEN that said `= public`, which READS AS PINNED AND IS NOT: Postgres
-- searches the temp schema first whenever pg_temp is not itself named, so a caller can shadow
-- `connections` with a temp table and this function would read it.

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
  where auth.uid() is not null
    -- A signed-out caller has no friends, so `mine` is empty and the join returns nothing
    -- anyway; this says so explicitly rather than relying on that.
    and t.fid <> auth.uid()
    and t.fid <> t.oid
    and not profile_owner_blocked_me(t.oid)
    and coalesce(array_length(others, 1), 0) <= 64;
$$;

-- REVOKING FROM `public` IS NOT ENOUGH, and reading the ACL back is what showed it. Postgres
-- grants EXECUTE on a new function to PUBLIC, and Supabase's default privileges ALSO grant it
-- explicitly to `anon`, `authenticated` and `service_role` -- an explicit role grant that a
-- revoke from PUBLIC does not touch. The first apply of this file left `anon=X` in `proacl`.
--
-- A signed-out caller could not have learned anything (`auth.uid()` is null, so `mine` is empty
-- and the guard below rejects it outright), but "it happens to return nothing" is the wrong
-- footing for a SECURITY DEFINER function: the whole point of one is that it runs with the
-- owner's rights, so who may call it should be stated rather than inferred from its body.
revoke all on function mutual_connections(uuid[]) from public;
revoke all on function mutual_connections(uuid[]) from anon;
grant execute on function mutual_connections(uuid[]) to authenticated;
