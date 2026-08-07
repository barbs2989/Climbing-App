-- A climber you blocked can still add you to a crew.
--
-- 0088 made blocking real for DMs with a SECURITY DEFINER trigger on `messages`, and the
-- Blocked-climbers screen was narrowed to admit the rest:
--
--   "Blocked climbers can't message you, and they're removed from your partners. They can
--    still see your public profile and invite you to crews — we're working on that."
--
-- This closes the crew-invite half. #633 stopped YOU finding a blocked climber in search or
-- invite, but that is your own client filtering your own list — it does nothing about THEM
-- adding YOU. Blocking has to hold from the other side, which means the server.
--
-- Same shape as 0088's message guard, deliberately: a trigger, not a policy, because
--   * `crew_members` insert is performed by the INVITER, and
--   * the inviter must never be able to read the target's block list (0088's select policy
--     restricts it to the blocker), so the check cannot run as the caller.
-- SECURITY DEFINER with a pinned search_path — resolving `blocked_users` through a
-- caller-controlled search_path would be a privilege-escalation hole.
create or replace function guard_crew_invite_not_blocked() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  -- Only meaningful when someone else did the adding. A climber joining a crew themselves
  -- has invited_by = their own id, and self-blocking does not exist; rows from before 0086
  -- can have invited_by null and are left alone rather than retroactively refused.
  if new.invited_by is not null and new.invited_by <> new.user_id and exists (
    select 1 from blocked_users
    where blocker = new.user_id and blocked = new.invited_by
  ) then
    -- Says nothing about a block, exactly as the message guard does not. Confirming a block
    -- to the blocked party is the leak the read policy exists to prevent — and here the
    -- inviter would learn it from a crew screen rather than a chat.
    raise exception 'this climber cannot be added to your crew';
  end if;
  return new;
end;
$$;

drop trigger if exists crew_members_guard_blocked on crew_members;
create trigger crew_members_guard_blocked before insert on crew_members
  for each row execute function guard_crew_invite_not_blocked();

-- The trigger reads blocked_users by (blocker, blocked); 0088's pair index already serves
-- that lookup, so no new index is needed.

-- Confirm -- expect the function and the trigger:
--   select proname from pg_proc where proname = 'guard_crew_invite_not_blocked';
--   select tgname from pg_trigger where tgname = 'crew_members_guard_blocked';
--
-- Behavioural check (a trigger fires for the service role too, unlike RLS, so this is
-- testable with a single account only in the negative direction — a real two-account test
-- needs a second signed-up climber):
--   insert into blocked_users (blocker, blocked) values ('<A>','<B>');
--   insert into crew_members (crew_id, user_id, invited_by, status)
--     values ('<crew>','<A>','<B>','invited');   -- expect P0001
