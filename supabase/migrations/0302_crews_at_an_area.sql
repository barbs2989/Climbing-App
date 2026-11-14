-- 0302: a crew can be bound to an AREA (a sport, trad, top-rope, aid or bouldering SESSION) instead of
-- one route.
--
-- Owner decision 2026-10-15 (the crews half of 0300): finding a crew for a crag day keyed on one route
-- is too granular — "Hellgate on Saturday, swapping burns on the 5.11s" is the party, not a route. For
-- alpine, mountaineering, scrambling, ice and mixed a crew stays bound to its route, exactly as today.
--
-- Three decisions, each deliberate:
--   * EXACTLY ONE of route_id / area_id. Allowing both would give every reader a precedence rule to
--     get wrong; a crag session that later settles on a route is the chat's and the itinerary's job,
--     not the binding's. The CHECK says so.
--   * crews.discipline is STORED for an area crew, never inferred. areas.disciplines is maintained
--     only for peaks and crags (0198), dominant_discipline is a route-count majority that changes
--     under the climber's feet, and a canyon-level crew ("LCC Saturday, sport") has neither. A route
--     crew keeps deriving its discipline from the route, so the column stays null there.
--   * area_id is a FOREIGN KEY, unlike route_id (0036 skipped that because most of the catalog was
--     then seed ROUTES). Area crews are created only from catalog surfaces, so the FK buys the finder
--     referential honesty. NO cascade: an area FOLD (0292's shape) must REPOINT crews.area_id to the
--     keeper beside topos and contributions, never delete the session — README-numbering records the
--     convention, and the fold template's refusal counter is untouched because a same-place fold moves
--     a session rather than losing one.
--
-- Route-merge migrations count `crews where route_id in (...)` before dropping a route and refuse to
-- cascade; an area crew has a null route_id and is never in that count. RLS is unchanged: the base
-- table stays organizer-or-confirmed-member, and crew_listings still never carries float_plan or
-- meet_place. The view's columns are APPENDED (0298's shape), so every existing reader keeps its
-- shape; area_id and discipline are browse-safe, like route_id.

alter table public.crews add column if not exists area_id text references public.areas(id);
alter table public.crews add column if not exists discipline text;
alter table public.crews alter column route_id drop not null;
alter table public.crews drop constraint if exists crews_one_place;
alter table public.crews add constraint crews_one_place
  check ((route_id is not null)::int + (area_id is not null)::int = 1);
alter table public.crews drop constraint if exists crews_discipline_values;
alter table public.crews add constraint crews_discipline_values check (discipline is null or discipline in
  ('sport','trad','toprope','aid','bouldering','scrambling','hiking','alpine','mountaineering','ice','mixed'));
alter table public.crews drop constraint if exists crews_area_needs_discipline;
alter table public.crews add constraint crews_area_needs_discipline check (area_id is null or discipline is not null);
create index if not exists crews_area_idx on public.crews(area_id);
comment on column public.crews.area_id is
  'The area this crew meets at — a crag SESSION (0302). Exactly one of route_id / area_id is set. An area fold must repoint this, never delete the crew.';
comment on column public.crews.discipline is
  'Stored for an area crew (what the session is: sport, trad, toprope, aid, bouldering…); null for a route crew, which derives it from the route.';

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
        end as confirmed_member_ids,
        c.area_id,
        c.discipline
   from public.crews c
  where not dismissed;
grant select on public.crew_listings to anon, authenticated;
