-- Blocking ends a friendship, a blocked climber cannot send a friend request, and the request
-- note is stored.
--
-- MEASURED FIRST, with three real accounts (scripts/oneoff/probe-friend-request-lifecycle.mjs,
-- anon key + each climber's own JWT): every policy 0087 wrote holds -- nobody can forge, accept,
-- answer, read or delete someone else's request -- but three things the app TELLS a climber were
-- not true:
--
--   1. The block sheet says "This also removes them as a friend and clears any friend requests
--      between you." Nothing did. `blocked_users` (0088) is a standalone table, `blockUser()`
--      touches `connections` not at all, and 0185's header records "There is no trigger on
--      `connections`". The app filtered its own React state, so the friend was back after a
--      reload, and the blocked person -- whose profile read of the blocker 0095 now refuses --
--      saw their friend turn into a nameless "Climber".
--   2. A blocked climber could still SEND a friend request to the person who blocked them (201),
--      and the blocker's own read returned it. 0088 guards messages, 0094 crew invites; the
--      friend request was the one door left open.
--   3. The Add-friend sheet offers a 300-character note and "Send request". There was no column,
--      so the note lived in the SENDER's local state and the recipient never saw it.
--
-- Both block functions are SECURITY DEFINER with a pinned search_path, for 0088's reason: the
-- requester performs the insert and must never be able to read the addressee's block list, and an
-- RLS subquery runs as the calling role.

-- 1. A BLOCK ENDS THE RELATIONSHIP, in both directions and at any status. The pair index is
--    unordered (0087), so least/greatest finds the one row whichever side asked.
create or replace function end_connection_on_block() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from connections
   where least(requester, addressee) = least(new.blocker, new.blocked)
     and greatest(requester, addressee) = greatest(new.blocker, new.blocked);
  return new;
end;
$$;

drop trigger if exists blocked_users_end_connection on blocked_users;
create trigger blocked_users_end_connection after insert on blocked_users
  for each row execute function end_connection_on_block();

-- 2. NO NEW REQUEST ACROSS A BLOCK, in either direction: the blocked climber cannot ask, and the
--    blocker must unblock first rather than hold a request to someone they have shut out.
--    Same wording rule as 0088: it never says "you are blocked".
create or replace function guard_connection_not_blocked() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (
    select 1 from blocked_users
     where (blocker = new.addressee and blocked = new.requester)
        or (blocker = new.requester and blocked = new.addressee)
  ) then
    raise exception 'you cannot send this climber a friend request';
  end if;
  return new;
end;
$$;

drop trigger if exists connections_guard_not_blocked on connections;
create trigger connections_guard_not_blocked before insert on connections
  for each row execute function guard_connection_not_blocked();

-- Blocks made BEFORE this migration ended nothing; end them now, so an existing blocked friend
-- does not stay a friend until somebody blocks again.
delete from connections c
 using blocked_users b
 where least(c.requester, c.addressee) = least(b.blocker, b.blocked)
   and greatest(c.requester, c.addressee) = greatest(b.blocker, b.blocked);

-- 3. THE NOTE. Readable by exactly who can read the row (0087: the two people on it). It is the
--    requester's words, so the addressee -- who may UPDATE the row to answer it -- must not be able
--    to rewrite them: 0087's guard trigger pins the parties and now the note too.
alter table connections add column if not exists note text;
alter table connections drop constraint if exists connections_note_len;
alter table connections add constraint connections_note_len
  check (note is null or char_length(note) <= 300);

create or replace function guard_connection_parties_immutable() returns trigger
language plpgsql as $$
begin
  if new.requester is distinct from old.requester or new.addressee is distinct from old.addressee then
    raise exception 'a connection cannot change who it is between';
  end if;
  if new.note is distinct from old.note then
    raise exception 'a request note cannot be edited';
  end if;
  if new.status is distinct from old.status then
    new.responded_at := now();
  end if;
  return new;
end;
$$;

comment on column connections.note is
  'Optional note the requester attached to a friend request (<=300 chars). Readable only by the two climbers on the row; immutable after insert.';

-- Confirm:
--   select tgname from pg_trigger where tgrelid in ('connections'::regclass,'blocked_users'::regclass) and not tgisinternal;
--     -> connections_guard_parties, connections_guard_not_blocked, blocked_users_end_connection
--   node scripts/oneoff/probe-friend-request-lifecycle.mjs   (three real accounts; must end 0 failed)
