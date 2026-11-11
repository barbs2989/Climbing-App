-- 0408: a crew's creator is always one of its confirmed members, in the database too.
--
-- The app counts you in your own crew from the device side (the hydration puts you in as climberId 0),
-- but every PUBLIC count reads crew_members only: crew_listings.confirmed_count, and from it the crew
-- finder's "N of M · K spots left" and the route/area "crews here" spot filters. The creator's row was a
-- SECOND write, made by formCrew after createCrew returned -- so a crew whose second write failed, or
-- one made before that write existed, listed its organiser nowhere: your card said "2 members" while
-- the finder said "1 of 4 · 3 spots left" for the same crew. (The 0381 share link unions created_by
-- in and was right all along, so the two disagreed.)
--
-- Two parts:
--   * a trigger writes the creator's confirmed row in the same statement as the crew, so the two can
--     no longer come apart. (formCrew stopped writing the row itself once this was live; a stray
--     duplicate from an old client is harmless: addCrewMember ignores 23505.)
--   * a backfill for crews that exist without one. A creator cannot leave without disbanding the crew
--     (CrewCard: "you're the organizer, so this disbands it"), so a missing row is never a departure.
--     A creator row that exists at some OTHER status is left alone (on conflict do nothing).
--
-- The trigger runs as definer, past crew_members' insert policy; the row it writes is the one that
-- policy already allows (0086: invited_by = auth.uid() = the organiser), and 0227's guard passes
-- because the creator is confirming themselves. On an empty preview database the backfill inserts
-- nothing. The backfill dates each row from the crew's own created_at, not today, so the organiser
-- does not read as the newest joiner of an old crew.

begin;

create or replace function public.crew_creator_joins()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- On insert, and when created_by is handed to someone else (a service-role fix; the app never
  -- does it): the new organiser gets their confirmed row, so the count cannot drift back.
  if new.created_by is not null
     and (tg_op = 'INSERT' or new.created_by is distinct from old.created_by) then
    insert into public.crew_members (crew_id, user_id, status, invited_by)
    values (new.id, new.created_by, 'confirmed', new.created_by)
    on conflict (crew_id, user_id) do nothing;
  end if;
  return new;
end
$$;
revoke all on function public.crew_creator_joins() from public, anon, authenticated;

drop trigger if exists crews_creator_joins on public.crews;
create trigger crews_creator_joins
  after insert or update of created_by on public.crews
  for each row execute function public.crew_creator_joins();

insert into public.crew_members (crew_id, user_id, status, invited_by, joined_at)
select c.id, c.created_by, 'confirmed', c.created_by, coalesce(c.created_at, now())
  from public.crews c
 where c.created_by is not null
   and not exists (select 1 from public.crew_members m where m.crew_id = c.id and m.user_id = c.created_by)
on conflict (crew_id, user_id) do nothing;

commit;

-- VERIFY (expect 0):
--   select count(*) from public.crews c where c.created_by is not null
--      and not exists (select 1 from public.crew_members m where m.crew_id = c.id and m.user_id = c.created_by);
--   select tgname from pg_trigger where tgname = 'crews_creator_joins';
