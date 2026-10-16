-- Mutual friends was the only visibility disclosure in the app with no control.
--
-- `0182` shipped the feature: opening a climber's profile names the people you have both
-- connected with, and Privacy §3 discloses it. Every OTHER visibility fact here has a switch --
-- `discoverable`, `show_name`, `photos_public`, `resume_public`, `show_on_ranks` -- and this one
-- did not, which made it the single asymmetry in the privacy surface. This is that switch.
--
-- WHAT IT SUPPRESSES, AND WHY ONE FLAG IS FILTERED AT TWO POINTS. The function returns, for each
-- profile being viewed, the people the caller and that profile both know. Two different climbers
-- have an edge revealed by any given row:
--
--   * the OTHER (the profile being opened) -- the reader learns who they are connected to;
--   * the MUTUAL (the person named) -- the reader learns THEY are connected to that profile.
--
-- So `mutuals_visible` is filtered on both. Turn it off and you are not named as a mutual on
-- anybody's profile, AND your own profile stops showing a reader who you both know. One column,
-- one switch, two filter points -- rather than two columns nobody could keep straight.
--
-- THE CALLER'S OWN FLAG IS DELIBERATELY NOT CONSULTED. Hiding yourself does not blind you, which
-- is how `resume_public` and `show_on_ranks` already behave: they govern EXPOSURE, not access.
-- Reciprocity ("hide yours and you lose theirs") is a defensible product rule and a DIFFERENT
-- one; it would need its own sentence in the documents, so it is not smuggled in here.
--
-- DEFAULT TRUE, AND `0110` IS THE PRECEDENT THAT ARGUES THE OTHER WAY, so here is the comparison
-- rather than an assertion. That migration flipped `discoverable` to default FALSE on the
-- reasoning that "being listed is the direction that cannot be walked back, so the default should
-- be the safe one". What made it urgent was the exposure level: production autologin meant a real
-- climber's NAME, HANDLE AND CITY rendered for ANONYMOUS VISITORS on the open web.
--
-- This is not that. `mutual_connections` requires `auth.uid() is not null` and EXECUTE is granted
-- to `authenticated` only, so nothing here is reachable signed-out; and every name it can return
-- is already one of the reader's own accepted connections, so it publishes no identity the reader
-- did not have. By exposure it sits with `resume_public`, `show_on_ranks` and `photos_public` --
-- all three `not null default true` -- rather than with `discoverable`. The one column that
-- defaults FALSE is `show_name`, where the default would otherwise publish a legal name.
--
-- Defaulting FALSE would also turn a feature dark for every account on the day after it shipped,
-- which is the "dead in production" shape this repo keeps finding rather than a safe choice. If
-- that trade is ever judged wrong, `0110` is the model for reversing it: change the default AND
-- reset the existing rows, because the accounts that never opted in are exactly the ones at issue.
--
-- NOT NULL, so there is no third state. `resume_public` is read as `!== false` by its owner and
-- `!!` by everyone else precisely because it can be absent, and CLAUDE.md records that asymmetry
-- as deliberate. A column that cannot be null needs no such dance: the switch, the filter and the
-- documents all describe the same two values. Were it ever made nullable, the bare `pm.mutuals_visible`
-- below evaluates NULL as false and HIDES, which is the safe direction by construction.

alter table profiles
  add column if not exists mutuals_visible boolean not null default true;

comment on column profiles.mutuals_visible is
  'When false, this climber is never named as a mutual connection to anyone, and their own '
  'profile shows no mutual connections to a reader. Governs exposure only: it does not stop '
  'them seeing other climbers'' mutuals. Settings -> Privacy & safety -> "Show mutual friends".';

-- The function is otherwise UNCHANGED from 0182; only the two filter joins are new. Replacing it
-- in place keeps the signature, so `create or replace` is legal here -- CLAUDE.md records that it
-- cannot replace ACROSS argument lists, which is how 0128/0132 ended up with two live overloads.
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
    and not profile_owner_blocked_me(t.oid)
    and coalesce(array_length(others, 1), 0) <= 64
    -- The switch, at both ends: the person NAMED and the profile being OPENED.
    and pm.mutuals_visible
    and po.mutuals_visible;
$$;

-- RE-ASSERTED RATHER THAN ASSUMED. `create or replace` preserves a function's ACL, so these are
-- strictly belt-and-braces -- but 0182's own header records that the first apply of that file
-- left `anon=X` standing in `proacl` because a revoke from PUBLIC does not touch an explicit role
-- grant. Reading the ACL back is what caught it then, and stating it again costs nothing.
revoke all on function mutual_connections(uuid[]) from public;
revoke all on function mutual_connections(uuid[]) from anon;
grant execute on function mutual_connections(uuid[]) to authenticated;
