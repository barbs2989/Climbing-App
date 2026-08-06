-- Blocking is the app's most load-bearing safety promise, and it was React state only.
--
-- The Blocked climbers screen says, verbatim: "Blocked climbers can't message you, invite
-- you to crews, or see your profile, and they're hidden from your search, rankings and
-- suggestions." None of that was true. `blocked` is a useState array in ClimbMatch.jsx with
-- no table behind it (`blocked_users` returned PGRST205 against the live DB), so a block
-- vanished on refresh -- and even within a session it only hid things in the blocker's own
-- browser. The blocked climber could still send messages the whole time, because nothing
-- server-side had ever heard of the block.
--
-- Same shape as the bug class fixed in 0082/0085/#590/#610/#621: a control named for
-- something it does not do. This one carries a safety claim, so it is the worst of them.
--
-- Directional, unlike connections (0087): A blocking B says nothing about B blocking A.
-- So the unique index is on the ORDERED pair, not least()/greatest().
create table if not exists blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker uuid not null references auth.users(id) on delete cascade,
  blocked uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint blocked_users_no_self check (blocker <> blocked)
);

create unique index if not exists blocked_users_pair_uidx on blocked_users (blocker, blocked);
-- The enforcement trigger below looks up "has the recipient blocked the sender", i.e. by
-- blocker; the pair index above already serves that. This one serves the reverse question
-- ("who has blocked me") which moderation tooling will want.
create index if not exists blocked_users_blocked_idx on blocked_users (blocked);

alter table blocked_users enable row level security;

-- Read: ONLY the blocker. Deliberately not the blocked party -- letting someone enumerate
-- who has blocked them turns a safety tool into a notification, which is exactly the
-- outcome a blocker is trying to avoid.
drop policy if exists "blocked read own" on blocked_users;
create policy "blocked read own" on blocked_users for select
  using (auth.uid() = blocker);

-- Insert: on your own behalf only. `blocker` is constrained rather than defaulted so the
-- policy states the rule outright (0085's lesson: gate WHAT, not only WHO).
drop policy if exists "blocked insert own" on blocked_users;
create policy "blocked insert own" on blocked_users for insert
  with check (auth.uid() = blocker);

-- Delete: unblocking. Only the blocker.
drop policy if exists "blocked delete own" on blocked_users;
create policy "blocked delete own" on blocked_users for delete
  using (auth.uid() = blocker);

-- No UPDATE policy, deliberately. A block row has nothing to amend: you block or you
-- unblock. With RLS on and no policy, UPDATE is denied by default -- which also means the
-- pair columns cannot be rewritten, so no guard trigger is needed here (unlike 0087).

-- SERVER ENFORCEMENT: a blocked climber cannot send you a DM.
--
-- This is the half that makes the screen's promise real. It must be SECURITY DEFINER: the
-- sender is the one inserting, and the sender must never be able to read the recipient's
-- block list (see the select policy above), so the check cannot run as the caller.
-- search_path is pinned because a SECURITY DEFINER function that resolves `blocked_users`
-- through a caller-controlled search_path is a privilege-escalation hole.
create or replace function guard_message_not_blocked() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (
    select 1 from blocked_users
    where blocker = new.recipient_id and blocked = new.sender_id
  ) then
    -- Deliberately does not say "you are blocked". Confirming a block to the blocked party
    -- is the same leak the select policy refuses.
    raise exception 'you cannot message this climber';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_guard_blocked on messages;
create trigger messages_guard_blocked before insert on messages
  for each row execute function guard_message_not_blocked();

-- Confirm -- expect the table, exactly 3 policies (select/insert/delete, NO update), and
-- the trigger:
--   select policyname, cmd from pg_policies where tablename = 'blocked_users' order by cmd;
--   select tgname from pg_trigger where tgname = 'messages_guard_blocked';
--
-- And prove the enforcement actually fires, rather than trusting "Success":
--   insert into blocked_users (blocker, blocked) values ('<B>','<A>');
--   insert into messages (sender_id, recipient_id, body) values ('<A>','<B>','test');
--     -- expect: P0001 you cannot message this climber
--   delete from blocked_users where blocker = '<B>' and blocked = '<A>';
--   insert into messages (sender_id, recipient_id, body) values ('<A>','<B>','test');
--     -- expect: success, then delete the row
--
-- NOT enforced by this migration, and the UI copy has been narrowed to match: crew invites,
-- profile visibility, and hiding a blocked climber from search/rankings/suggestions. Those
-- need their own policies on crew_members and profiles; profile visibility in particular is
-- the unresolved PRIVACY_CONTROLS_LIVE problem, not something to bolt on here.
