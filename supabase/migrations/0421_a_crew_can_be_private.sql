-- 0421: a crew can be PRIVATE — invite only, unlisted, its roster read only by the people on it.
--
-- Owner decision 2026-11-14 ("why can't we just keep the private crew non public?"), with the new
-- "Form a crew" picker on a group's Members tab. A group's roster is members-only (0318), but every
-- crew was public twice over:
--   * crew_members had "crew membership is public read" (0036, `using (true)`), so anyone holding
--     the anon key could list who is on any crew, and
--   * crew_listings (Join a crew) lists every undismissed crew with its confirmed member ids (0298).
-- A crew formed from a private group's members would publish that those people climb together,
-- which the group itself never did. So a crew can now say `private`:
--   1. crews.private (default false: every existing crew stays exactly as it was).
--   2. crew_members of a private crew are read only by its organiser and the people with a row on it
--      (invited, pending, confirmed) — through crew_visible_to_me(), SECURITY DEFINER because a policy
--      on crew_members that read crews would be filtered by crews' own RLS (organiser/members only)
--      and hide EVERY crew's roster from non-members, public ones included.
--   3. Nobody can ask to join a private crew: the self-`pending` branch of "join or invite" (0180)
--      requires a crew that is not private. The organiser's invites are unchanged; an invitee still
--      accepts or declines (0227), blocks (0094) and the cap (0415) still hold.
--   4. crew_listings leaves private crews out (body otherwise as 0415).
--   5. crew_share_preview (0381) returns NULL for a private crew — its Join files a pending request,
--      which (3) now refuses.
--
-- Audited, no change needed: every other SECURITY DEFINER reader of crew_members (crew_alignment,
-- crew_ready_ids, share_crew_itinerary, report_content, people_you_may_know, route_private_conditions,
-- objective_private_logs, claim_*_email_invites, crew_spots_held, crew_creator_joins) answers only a
-- caller who is on that crew, or only about the caller's own rows. The client reads crew_members only
-- for crews the caller is on (useMyCrews) and invites addressed to the caller (useMyCrewInvites).

begin;

alter table public.crews add column if not exists private boolean not null default false;

comment on column public.crews.private is
  'Invite only (0421): left out of crew_listings and the share link, nobody can ask to join, and the roster (crew_members) is read only by the organiser and the people on it.';

create or replace function public.crew_visible_to_me(p_crew uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from crews c
     where c.id = p_crew
       and (not c.private
            or c.created_by = auth.uid()
            or exists (select 1 from crew_members m where m.crew_id = c.id and m.user_id = auth.uid()))
  );
$$;
revoke all on function public.crew_visible_to_me(uuid) from public;
grant execute on function public.crew_visible_to_me(uuid) to anon, authenticated;

drop policy if exists "crew membership is public read" on public.crew_members;
drop policy if exists "crew membership readable unless the crew is private" on public.crew_members;
create policy "crew membership readable unless the crew is private" on public.crew_members
  for select using (public.crew_visible_to_me(crew_id));

-- Whether a crew is private, for the insert policy below. DEFINER for the same reason as above: a
-- requester cannot read the crew row (crews is organiser/members only), so a plain subquery there
-- reads NULL for every crew — which refused every request to join, listed crews included (caught by
-- scripts/oneoff/verify-0421-private-crew-pglite.mjs before this shipped).
create or replace function public.crew_is_private(p_crew uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce((select c.private from crews c where c.id = p_crew), true);
$$;
revoke all on function public.crew_is_private(uuid) from public;
grant execute on function public.crew_is_private(uuid) to authenticated;

-- 0180's policy, with the request branch closed on a private crew.
drop policy if exists "join or invite" on public.crew_members;
create policy "join or invite" on public.crew_members for insert
  with check (
    invited_by = auth.uid()
    and (
      auth.uid() = (select created_by from public.crews where id = crew_id)
      or (auth.uid() = user_id and status = 'pending' and not public.crew_is_private(crew_id))
    )
  );

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
                           where e.crew_id = c.id and e.claimed_by is null) as held_count
   from public.crews c
   cross join lateral (
     select count(*) filter (where m.status = 'confirmed') as confirmed_count,
            count(*) filter (where m.status in ('confirmed', 'invited')) as held_members
       from public.crew_members m
      where m.crew_id = c.id
   ) k
  where not dismissed and not private;
grant select on public.crew_listings to anon, authenticated;
-- 0376: the view stays read-only to the client roles.
revoke insert, update, delete, truncate, references, trigger on public.crew_listings from anon, authenticated;

-- 0381's preview, with `and not cr.private` in its crew lookup.
create or replace function public.crew_share_preview(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with c as (
    select cr.*
      from crews cr
     where cr.share_token = p_token
       and cr.share_on
       and not cr.dismissed
       and not cr.private
  ),
  last_day as (
    select coalesce(
             case when c.agreed_date ~ '^\d{4}-\d{2}-\d{2}$' then c.agreed_date::date end,
             (select max(x::date) from jsonb_array_elements_text(c.dates) x where x ~ '^\d{4}-\d{2}-\d{2}$')
           ) as d
      from c
  ),
  ids as (
    select c.created_by as user_id from c where c.created_by is not null
    union
    select cm.user_id from c join crew_members cm on cm.crew_id = c.id and cm.status = 'confirmed'
  ),
  people as (
    select p.name, p.show_name from ids join profiles p on p.id = ids.user_id
  )
  select case
    when not exists (select 1 from c) then null
    when (select d from last_day) is not null and (select d from last_day) < current_date then null
    else jsonb_build_object(
      'crew_id',     (select id from c),
      'route_id',    (select route_id from c),
      'area_id',     (select area_id from c),
      'discipline',  (select discipline from c),
      'dates',       (select dates from c),
      'agreed_date', (select agreed_date from c),
      'cap',         (select cap from c),
      'going',       (select count(*) from ids),
      'first_names', (select coalesce(jsonb_agg(split_part(btrim(name), ' ', 1)), '[]'::jsonb)
                        from people where show_name and coalesce(btrim(name), '') <> ''),
      'place_name',  coalesce((select r.name from c join routes r on r.id = c.route_id),
                              (select a.name from c join areas a on a.id = c.area_id))
    )
  end;
$$;
revoke all on function public.crew_share_preview(uuid) from public;
grant execute on function public.crew_share_preview(uuid) to anon, authenticated;

commit;

-- VERIFY:
--   select column_name, data_type, column_default from information_schema.columns
--    where table_name = 'crews' and column_name = 'private';                     -- boolean, false
--   select policyname, cmd from pg_policies where tablename = 'crew_members';    -- the new select policy; no "public read"
--   select count(*) from public.crews where private;                             -- 0 until someone makes one
--   select count(*) from public.crew_listings;                                   -- unchanged
