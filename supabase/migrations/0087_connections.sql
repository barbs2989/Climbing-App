-- Connections between climbers. There has never been a table for this.
--
-- `connections`, `friendReqIn` and `friendReqOut` are React state in ClimbMatch.jsx and
-- nothing else. Send someone a partner request, refresh, and it is gone -- so two real
-- users could never hold a relationship, only a session. Every other social surface got a
-- table (crews, messages, vouches, belay catches, comments); this one was missed.
--
-- ONE ROW PER PAIR, in either direction. A request A->B and a request B->A are the same
-- relationship, so the unique index is on the UNORDERED pair. Without that you get two
-- half-relationships that disagree about their own status.
create table if not exists connections (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references auth.users(id) on delete cascade,
  addressee uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz default now(),
  responded_at timestamptz,
  constraint connections_no_self check (requester <> addressee)
);

create unique index if not exists connections_pair_uidx
  on connections (least(requester, addressee), greatest(requester, addressee));
create index if not exists connections_requester_idx on connections (requester);
create index if not exists connections_addressee_idx on connections (addressee);

alter table connections enable row level security;

-- Read: only the two people involved. A connection is not public.
drop policy if exists "connections read own" on connections;
create policy "connections read own" on connections for select
  using (auth.uid() = requester or auth.uid() = addressee);

-- Insert: you may only ask on your OWN behalf, and only ever as 'pending'.
-- Constraining WHAT and not just WHO is the lesson of 0082/0085 -- an insert policy that
-- gated only the actor let a guide write status='verified' on their own row. The same
-- mistake here would let someone insert an already-'accepted' connection to a stranger.
drop policy if exists "connections request own" on connections;
create policy "connections request own" on connections for insert
  with check (auth.uid() = requester and status = 'pending');

-- Update: only the ADDRESSEE answers, only while still pending, and only to a terminal
-- state. This is what stops a requester from accepting on the other person's behalf.
drop policy if exists "connections respond as addressee" on connections;
create policy "connections respond as addressee" on connections for update
  using (auth.uid() = addressee and status = 'pending')
  with check (status in ('accepted','declined'));

-- Delete: either party may walk away, at any status.
drop policy if exists "connections remove either side" on connections;
create policy "connections remove either side" on connections for delete
  using (auth.uid() = requester or auth.uid() = addressee);

-- A WITH CHECK cannot pin columns it does not mention, so the update policy above still
-- permits the addressee to rewrite `requester`/`addressee` and reassign the relationship to
-- someone else. Guard the identity columns explicitly -- same shape as 0085's
-- guard_review_content_immutable.
create or replace function guard_connection_parties_immutable() returns trigger
language plpgsql as $$
begin
  if new.requester is distinct from old.requester or new.addressee is distinct from old.addressee then
    raise exception 'a connection cannot change who it is between';
  end if;
  if new.status is distinct from old.status then
    new.responded_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists connections_guard_parties on connections;
create trigger connections_guard_parties before update on connections
  for each row execute function guard_connection_parties_immutable();

-- Confirm -- expect the table, 4 policies, and the trigger function:
--   select policyname, cmd from pg_policies where tablename = 'connections' order by cmd;
--   select proname from pg_proc where proname = 'guard_connection_parties_immutable';
--
-- And that the pair index really is unordered (the second insert must fail):
--   insert into connections (requester, addressee) values ('<A>','<B>');
--   insert into connections (requester, addressee) values ('<B>','<A>');  -- expect 23505
