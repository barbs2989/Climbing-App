-- 0420: a username is chosen once. One change is allowed in the first 7 days (typos), then it is locked.
--
-- WHY (owner, 2026-11-14): "You shouldn't be able to switch your username once you've chosen it."
-- Until now `profiles.username` carried only 0009's UNIQUE, and Edit profile rewrote it on every
-- Save, so a climber could take another climber's old handle the day it was freed, or rename
-- after a bad interaction and leave their vouches, reports and @mentions pointing at a stranger.
--
-- THE RULE lives here, not in the UI, because the client is not the only writer: anyone signed in
-- can PATCH their own profiles row through PostgREST. The editor only reflects it.
--   * empty -> a name        always allowed; stamps username_set_at
--   * a name -> another name allowed ONCE, within 7 days of username_set_at
--   * a name -> empty        never (it would reopen the first-set path and reset the window)
-- The two bookkeeping columns are the trigger's own: whatever a client sends for them is replaced
-- with the stored value, so nobody can reset their own counter.
--
-- THE ESCAPE HATCH for support (an impersonating or abusive handle, a real mistake past the window):
--   begin; set local climbmatch.username_override = 'on'; update profiles set username = ... ; commit;
-- `set local` dies with the transaction, and a client cannot run it through PostgREST.
--
-- CASE: "Nate" and "nate" were two different usernames under the plain UNIQUE. A case-insensitive
-- unique index closes that impersonation route. Measured 2026-11-14: 7 profiles, all with a
-- username, 0 case-insensitive collisions, so the index builds.
--
-- EXISTING ACCOUNTS get their 7-day window from today, not from an unknown past date.

begin;

alter table public.profiles add column if not exists username_set_at timestamptz;
alter table public.profiles add column if not exists username_changes smallint not null default 0;

comment on column public.profiles.username_set_at is
  'When this account first chose its username (0420). Starts the 7-day window for its one allowed change. Written by profiles_username_lock(), never by the client.';
comment on column public.profiles.username_changes is
  'How many times the username has been changed after it was first set (0420). At 1, or 7 days after username_set_at, it is locked.';

update public.profiles
   set username_set_at = now()
 where coalesce(username, '') <> '' and username_set_at is null;

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username)) where coalesce(username, '') <> '';

create or replace function public.profiles_username_lock() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.username_changes := 0;
    new.username_set_at := case when coalesce(new.username, '') <> '' then now() else null end;
    return new;
  end if;

  -- The bookkeeping is never the client's to write.
  new.username_set_at := old.username_set_at;
  new.username_changes := old.username_changes;

  if new.username is not distinct from old.username then
    return new;
  end if;

  if coalesce(current_setting('climbmatch.username_override', true), '') = 'on' then
    new.username_set_at := coalesce(old.username_set_at, now());
    return new;
  end if;

  if coalesce(old.username, '') = '' then
    if coalesce(new.username, '') <> '' then new.username_set_at := now(); end if;
    return new;
  end if;

  if coalesce(new.username, '') = '' then
    raise exception 'username_locked: your username can''t be removed' using errcode = 'P0001';
  end if;

  if old.username_changes >= 1
     or coalesce(old.username_set_at, now()) < now() - interval '7 days' then
    raise exception 'username_locked: your username is locked — contact support to change it' using errcode = 'P0001';
  end if;

  new.username_changes := old.username_changes + 1;
  return new;
end; $$;

drop trigger if exists profiles_username_lock on public.profiles;
create trigger profiles_username_lock before insert or update on public.profiles
  for each row execute function public.profiles_username_lock();

commit;
