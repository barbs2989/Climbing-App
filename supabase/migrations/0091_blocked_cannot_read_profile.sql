-- A climber you blocked can still read your profile.
--
-- The last item the Blocked-climbers screen still admits to: "They can still see your public
-- profile — we're working on that." 0088 covered DMs, 0090 covers crew invites, this covers
-- the profile read.
--
-- THE TRAP, and the reason a naive version of this is worse than not shipping it: RLS
-- subqueries are themselves subject to the referenced table's RLS. 0088 restricts reading
-- `blocked_users` to the BLOCKER:
--
--     create policy "blocked read own" on blocked_users for select using (auth.uid() = blocker);
--
-- so a policy written the obvious way --
--
--     using (not exists (select 1 from blocked_users where blocker = profiles.id and blocked = auth.uid()))
--
-- evaluates that subquery AS THE BLOCKED PARTY, who cannot see the row. It finds nothing,
-- `not exists` is true, and the profile is returned. The policy would look present, pass
-- review, and enforce nothing -- the always-passing guard this codebase has shipped before
-- (see the check:sql defects in #587).
--
-- So the check runs through a SECURITY DEFINER function, the same escape 0088's and 0090's
-- triggers use, with a pinned search_path because resolving `blocked_users` through a
-- caller-controlled search_path is a privilege-escalation hole.
create or replace function profile_owner_blocked_me(target uuid) returns boolean
language sql security definer set search_path = public, pg_temp stable as $$
  select exists (
    select 1 from blocked_users
    where blocker = target and blocked = auth.uid()
  );
$$;

-- Signed-out readers are unchanged. A blocked climber can sign out and see a public profile
-- exactly as any stranger can -- blocking hides you from an ACCOUNT, it does not make a
-- public profile private, and the screen's wording does not claim otherwise. Keeping anon
-- read also avoids breaking every public surface that shows a name (guide directory, route
-- pages, trip reports).
drop policy if exists "profiles public read" on profiles;
create policy "profiles public read" on profiles for select
  using (
    auth.uid() is null
    or auth.uid() = id
    or not profile_owner_blocked_me(id)
  );

-- Confirm -- expect the function, and the policy present with the new expression:
--   select proname, prosecdef from pg_proc where proname = 'profile_owner_blocked_me';
--   select policyname, cmd from pg_policies where tablename = 'profiles' order by cmd;
--
-- BEHAVIOUR CANNOT BE PROVEN WITH ONE ACCOUNT. The service role bypasses RLS entirely, so
-- unlike 0088/0090 (triggers, which fire for every role) there is no single-account probe
-- that exercises this. It needs a second signed-up climber:
--   as B:  select id from profiles where id = '<A>';   -- 1 row
--   as A:  insert into blocked_users (blocker, blocked) values ('<A>','<B>');
--   as B:  select id from profiles where id = '<A>';   -- expect 0 rows
--
-- Until that is run, this is reviewed and reasoned, NOT verified.
