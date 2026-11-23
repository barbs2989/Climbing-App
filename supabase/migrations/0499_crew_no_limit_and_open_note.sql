-- 0499: two crew fixes from the crews-and-partners review (2026-11-23).
--
--   1. "REMOVE LIMIT · STOP LISTING" CLOSED THE CREW TO EVERYONE. The crew card saves a size of 0 for it, and
--      the app reads 0 as "no limit". The cap triggers (0415) exempt only a NULL cap — which crews.cap, NOT
--      NULL DEFAULT 4, can never be — so with 0 every invite, every approved request and every email invite
--      raised "This crew is full" (spots held >= 0 is always true). A size of 0 or less now means no limit
--      in both triggers. crew_listings needs nothing: 0 minus the spots held is never a spot to offer, so
--      the crew is already off the list, which is the other half of what the button says.
--   2. A CREW'S NOTE REACHED NOBODY. The crew card says "This note is shown to anyone who requests to join",
--      and starting a session asks for "a line for the crew"; neither was stored. crews.open_note holds it
--      (280 characters), crew_listings hands it to SIGNED-IN climbers browsing listed crews (0496 keeps crew
--      notes from signed-out readers), and a note that matches the screening floor (0265) is refused at save,
--      as a listing note is since 0497.

begin;

-- 1 ── a size of 0 is "no limit", not "full" ──
create or replace function public.crew_members_respect_cap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cap int;
  v_email text;
begin
  if new.status not in ('confirmed', 'invited') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status in ('confirmed', 'invited') then
    return new;  -- already held a spot
  end if;
  if coalesce(current_setting('crew.creator_joins', true), '') = 'on' then
    return new;  -- the organiser's own row
  end if;
  select c.cap into v_cap from public.crews c where c.id = new.crew_id for update;
  if v_cap is null or v_cap <= 0 then
    return new;  -- no limit
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = new.user_id;
  if v_email is not null and exists (
       select 1 from public.crew_email_invites e
        where e.crew_id = new.crew_id and e.claimed_by is null and lower(e.email) = v_email) then
    return new;  -- claiming a spot an email invite already holds
  end if;
  if public.crew_spots_held(new.crew_id, new.user_id, null) >= v_cap then
    raise exception 'This crew is full'
      using errcode = 'P0001', hint = 'Raise the crew''s size to add more climbers.';
  end if;
  return new;
end
$$;
revoke all on function public.crew_members_respect_cap() from public, anon, authenticated;

create or replace function public.crew_email_invites_respect_cap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cap int;
begin
  select c.cap into v_cap from public.crews c where c.id = new.crew_id for update;
  if v_cap is not null and v_cap > 0 and public.crew_spots_held(new.crew_id, null, new.email) >= v_cap then
    raise exception 'This crew is full'
      using errcode = 'P0001', hint = 'Raise the crew''s size to add more climbers.';
  end if;
  return new;
end
$$;
revoke all on function public.crew_email_invites_respect_cap() from public, anon, authenticated;

-- 2 ── the crew's note for climbers browsing it ──
alter table public.crews add column if not exists open_note text;
alter table public.crews drop constraint if exists crews_open_note_len;
alter table public.crews add constraint crews_open_note_len check (open_note is null or char_length(open_note) <= 280);
comment on column public.crews.open_note is
  'The organiser''s line for climbers browsing listed crews (0499). Read by signed-in climbers through crew_listings; refused at save when it matches the screening floor.';

create or replace function public.crews_open_note_floor() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.open_note is not null
     and (tg_op = 'INSERT' or new.open_note is distinct from old.open_note)
     and screening_match(new.open_note) is not null then
    raise exception 'that note can''t be posted — please reword it';
  end if;
  return new;
end
$$;
revoke all on function public.crews_open_note_floor() from public, anon, authenticated;
drop trigger if exists crews_open_note_floor on public.crews;
create trigger crews_open_note_floor before insert or update of open_note on public.crews
  for each row execute function public.crews_open_note_floor();

-- 0426's view, with the note appended (a replaced view can only grow at the end).
create or replace view public.crew_listings as
 select c.id,
        c.route_id,
        c.created_by,
        c.cap,
        c.dates,
        c.created_at,
        k.confirmed_count,
        case when auth.uid() is null then '{}'::uuid[]
             else coalesce((select array_agg(m.user_id order by m.user_id)
                              from public.crew_members m
                             where m.crew_id = c.id and m.status = 'confirmed'
                               and not exists (select 1 from public.blocked_users b
                                                where (b.blocker = m.user_id and b.blocked = auth.uid())
                                                   or (b.blocker = auth.uid() and b.blocked = m.user_id))),
                           '{}'::uuid[])
        end as confirmed_member_ids,
        c.area_id,
        c.discipline,
        k.held_members + (select count(*) from public.crew_email_invites e
                           where e.crew_id = c.id and e.claimed_by is null) as held_count,
        case when auth.uid() is null then null else c.open_note end as open_note
   from public.crews c
   cross join lateral (
     select count(*) filter (where m.status = 'confirmed') as confirmed_count,
            count(*) filter (where m.status in ('confirmed', 'invited')) as held_members
       from public.crew_members m
      where m.crew_id = c.id
   ) k
  where not dismissed and not private;
grant select on public.crew_listings to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.crew_listings from anon, authenticated;

commit;
