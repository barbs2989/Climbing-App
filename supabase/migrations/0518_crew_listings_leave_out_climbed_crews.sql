-- 0518: a crew that has already CLIMBED its route is no longer listed to climbers looking for a crew
-- (owner, 2026-11-23: "crews that have already climbed the route together" should not show up on
-- available crews — it would not make sense to those listed).
--
-- crew_listings (Join a crew, and the route page's Partners tab "Current crews") left out only a
-- dismissed or a private crew. The app hid a past crew by its DATE alone, and that date is "the next
-- proposed day still ahead" (ClimbMatch.jsx dbOpenCrews). So a crew that climbed on its first proposed
-- day, with a later day still on its list, stayed open to joiners; so did an undated crew that had
-- logged the climb. Nothing in the database said otherwise. Two records say a crew has climbed:
--
--   1. a climb log filed AS THE CREW'S CLIMB (climb_logs.crew_id). It is the same test the app uses to
--      move your own crew to Past crews (isArchivedCrew). The view runs with its owner's rights, so
--      it sees every such log whatever its trip-report visibility. Only the crew's absence shows, so
--      no log content leaves.
--   2. a LOCKED day (crews.agreed_date, 0075) that is behind us. One day of slack, because
--      current_date is UTC and the app's day is the climber's local one; the app drops the crew on
--      the climber's own date (CrewFinder / RoutePartnersTab `upcoming`).
--
-- agreed_date is appended to the view so the finder dates a crew by its LOCKED day when it has one,
-- not by whichever proposed day happens to be next. agreed_date is text "YYYY-MM-DD"; a value of any
-- other shape is ignored rather than cast, so one bad row cannot fail the whole listing.
--
-- Measured live before this migration (2026-11-23): 20 crews listed; 2 carry a crew log, 5 a past
-- locked day. All of them also had every proposed day past, so the screen was already hiding them.
-- No live crew was being wrongly offered. This closes the hole before one is.

begin;

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
        case when auth.uid() is null then null else c.open_note end as open_note,
        case when c.agreed_date ~ '^\d{4}-\d{2}-\d{2}$' then c.agreed_date else null end as agreed_date
   from public.crews c
   cross join lateral (
     select count(*) filter (where m.status = 'confirmed') as confirmed_count,
            count(*) filter (where m.status in ('confirmed', 'invited')) as held_members
       from public.crew_members m
      where m.crew_id = c.id
   ) k
  where not c.dismissed and not c.private
    -- 1: the crew has logged the climb together
    and not exists (select 1 from public.climb_logs l where l.crew_id = c.id)
    -- 2: its locked day has gone by (CASE, not OR: Postgres does not promise to test the shape first)
    and case when c.agreed_date ~ '^\d{4}-\d{2}-\d{2}$'
             then c.agreed_date::date >= current_date - 1
             else true end;
grant select on public.crew_listings to anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on public.crew_listings from anon, authenticated;

commit;
