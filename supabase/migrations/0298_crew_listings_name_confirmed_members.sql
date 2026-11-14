-- 0298: an open crew's card can name who is already in it.
--
-- crew_listings exposed confirmed_count and created_by only, so a REAL open crew's card showed one chip -- the
-- organiser -- and "N of your friends are in this crew" could never fire for one. The example crews carry a member
-- list and showed both. This adds confirmed_member_ids, the one thing the card was missing.
--
-- Two limits, both deliberate:
--   * signed-out visitors get an empty list. The view is readable by anon (it lists the crews), but who is going on
--     which climb on which dates is not something to hand to someone with no account.
--   * a member who has BLOCKED the viewer, or whom the viewer has blocked, is left out -- the block guarantees
--     (check:block-guarantees) say a blocked climber cannot read you, and a roster is a read of you.
-- The view keeps its owner's rights (no security_invoker), as before, which is what lets it count and list members
-- past crew_members' own policy; blocked_users is read the same way. Columns are only appended, so CREATE OR
-- REPLACE keeps every existing reader's shape.

create or replace view public.crew_listings as
 select c.id,
        c.route_id,
        c.created_by,
        c.cap,
        c.dates,
        c.created_at,
        (select count(*) from public.crew_members m
          where m.crew_id = c.id and m.status = 'confirmed') as confirmed_count,
        case when auth.uid() is null then '{}'::uuid[]
             else coalesce((select array_agg(m.user_id order by m.user_id)
                              from public.crew_members m
                             where m.crew_id = c.id and m.status = 'confirmed'
                               and not exists (select 1 from public.blocked_users b
                                                where (b.blocker = m.user_id and b.blocked = auth.uid())
                                                   or (b.blocker = auth.uid() and b.blocked = m.user_id))),
                           '{}'::uuid[])
        end as confirmed_member_ids
   from public.crews c
  where not dismissed;
