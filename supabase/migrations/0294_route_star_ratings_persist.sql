-- A climber's star rating from the route page's header persists, counts once, and reaches everyone.
--
-- The five stars over the route photo wrote to `myStars`, React state in App. A climber gave a
-- route five stars, came back the next day, and the stars were empty: nothing was ever sent. Nor
-- did the tap reach the route's own ★ number, which averaged trip-report stars and nothing else,
-- so no other climber ever saw it either.
--
-- ONE VOTE PER CLIMBER PER ROUTE. The primary key is (route_id, user_id), so a second tap changes
-- your rating rather than adding a vote, and tapping your own star again withdraws it (a delete).
-- A climber who has also logged a trip report with stars is still ONE vote: the header rating is
-- their considered rating of the route and wins; without one, their most recent PUBLIC, visible
-- trip report's stars stand in. Before this, every trip report counted, so logging a route three
-- times was three votes.
--
-- `routes.stars` is the cached result, kept by triggers on both tables, because the Climbs list,
-- its min-stars filter and its stars sort all read that column. Only 5 of 314,599 routes held a
-- value when this was written (an import's), and a route's value is replaced only when a climber
-- votes on it -- the same climbers-only rule the owner set for DIFFICULTY BREAKDOWN (2026-09-30).
--
-- READ IS OWN-ROW ONLY. Nothing renders who rated what; the route page needs your own rating and
-- the aggregate, and route_star_summary() returns the aggregate.
create table if not exists route_ratings (
  route_id text not null references routes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (route_id, user_id)
);
create index if not exists route_ratings_user_idx on route_ratings (user_id);

alter table route_ratings enable row level security;

drop policy if exists "route ratings read own" on route_ratings;
create policy "route ratings read own" on route_ratings for select
  using (auth.uid() = user_id);

drop policy if exists "route ratings insert own" on route_ratings;
create policy "route ratings insert own" on route_ratings for insert
  with check (auth.uid() = user_id and stars between 1 and 5);

drop policy if exists "route ratings update own" on route_ratings;
create policy "route ratings update own" on route_ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and stars between 1 and 5);

drop policy if exists "route ratings delete own" on route_ratings;
create policy "route ratings delete own" on route_ratings for delete
  using (auth.uid() = user_id);

-- A WITH CHECK cannot pin columns it does not name, so an update could otherwise move a rating
-- onto another route and stack a second vote there.
create or replace function guard_route_rating_target_immutable() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.route_id is distinct from old.route_id or new.user_id is distinct from old.user_id then
    raise exception 'a route rating cannot change which route or climber it belongs to';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists route_ratings_guard_target on route_ratings;
create trigger route_ratings_guard_target before update on route_ratings
  for each row execute function guard_route_rating_target_immutable();

-- The one definition of a route's star rating: the average of one vote per climber. Definer, so
-- it can read every climber's row; it returns only an average and a count.
create or replace function route_star_summary(p_route_id text)
returns table (stars numeric, raters integer)
language sql stable security definer set search_path = public, pg_temp as $$
  with header as (
    select rr.user_id, rr.stars::numeric as stars from route_ratings rr where rr.route_id = p_route_id
  ), logged as (
    select distinct on (cl.user_id) cl.user_id, cl.stars::numeric as stars
    from climb_logs cl
    where cl.route_id = p_route_id and cl.stars between 1 and 5
      and cl.trip_report_visibility = 'public' and cl.moderation = 'visible'
      and not exists (select 1 from header h where h.user_id = cl.user_id)
    order by cl.user_id, cl.date_climbed desc nulls last, cl.created_at desc
  ), votes as (
    select stars from header union all select stars from logged
  )
  select round(avg(stars), 2), count(*)::integer from votes;
$$;
revoke all on function route_star_summary(text) from public;
grant execute on function route_star_summary(text) to anon, authenticated;

-- Re-cache one route's rating. A route nobody has voted on keeps whatever it held, so the cache is
-- touched only by a vote; withdrawing the last vote clears it (null), since nobody now rates it.
create or replace function refresh_route_stars(p_route_id text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_route_id is null then return; end if;
  update routes set stars = (select s.stars from route_star_summary(p_route_id) s)
   where id = p_route_id and stars is distinct from (select s.stars from route_star_summary(p_route_id) s);
end;
$$;
revoke all on function refresh_route_stars(text) from public, anon, authenticated;

create or replace function route_ratings_refresh_stars() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then perform refresh_route_stars(old.route_id); end if;
  if tg_op in ('INSERT', 'UPDATE') and (tg_op = 'INSERT' or new.route_id is distinct from old.route_id or new.stars is distinct from old.stars) then
    perform refresh_route_stars(new.route_id);
  end if;
  return null;
end;
$$;

drop trigger if exists route_ratings_refresh_stars on route_ratings;
create trigger route_ratings_refresh_stars after insert or update or delete on route_ratings
  for each row execute function route_ratings_refresh_stars();

-- A trip report's stars are a vote too, so a change to one -- including it going private or being
-- taken down -- re-caches the route.
create or replace function climb_logs_refresh_stars() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op in ('UPDATE', 'DELETE') and old.stars is not null then perform refresh_route_stars(old.route_id); end if;
  if tg_op = 'INSERT' and new.stars is not null then perform refresh_route_stars(new.route_id); end if;
  if tg_op = 'UPDATE' and new.route_id is distinct from old.route_id and new.stars is not null then
    perform refresh_route_stars(new.route_id);
  end if;
  return null;
end;
$$;

drop trigger if exists climb_logs_refresh_stars on climb_logs;
create trigger climb_logs_refresh_stars
  after insert or delete or update of stars, route_id, trip_report_visibility, moderation, user_id on climb_logs
  for each row execute function climb_logs_refresh_stars();

-- Confirm -- expect 4 policies, the summary function, and two triggers:
--   select policyname, cmd from pg_policies where tablename = 'route_ratings' order by cmd;
--   select * from route_star_summary('<route id>');
--   select tgname from pg_trigger where tgname in ('route_ratings_refresh_stars','climb_logs_refresh_stars');
