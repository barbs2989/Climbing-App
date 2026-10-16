-- Ranks ranked nobody real. Every board was `[...CLIMBERS, me, ...FILLER_CLIMBERS]` -- seed
-- arrays -- so a signed-in climber was ranked against ~485 example profiles and no other real
-- account could ever appear. It could not have been fixed in the client: `climb_logs` is
-- author-only under RLS, so no browser can read anybody else's logs to count them. The ranking
-- has to be computed here, and once it is computed here the rules that make it hard to pad can
-- be enforced here too, where the person being ranked cannot edit them.
--
-- WHAT THIS ADDS
--   1. A log cannot be dated in the future (trigger; one day of slack for time zones).
--   2. climb_log_confirmations: a partner the author TAGGED on a log (climb_logs.partners, which
--      the log form's "Climbed with" chips already fill) can confirm or deny it. Only an accepted
--      connection of the author, and not across a block. Editing the climb's route, date or tick
--      clears every verdict on it -- a confirmation is of the climb as it was when confirmed.
--   3. belay_catches.filed_by, stamped from the session. The insert policy lets EITHER party file
--      a catch, so "I caught X" is self-credit; the Belay board counts only catches the CAUGHT
--      climber filed, plus falls recorded in the climber's own log (`belayed_by` + `caught_fall`).
--   4. leaderboard(scope, area, radius): one row per rankable climber with every board's number.
--   5. leaderboard_top_climbs(...): the "Top climbs" board, from PUBLIC trip reports only.
--
-- THE COUNTING RULES (leaderboard), each aimed at one way of padding a board
--   * only logs on a CATALOG route count -- the route's own grade, discipline and gain are used,
--     never anything the author typed;
--   * a log a tagged partner DENIED counts nowhere;
--   * one log per climber, route and day; at most 30 counted logs per climber per day;
--   * sends, classics and points count DISTINCT routes: repeating a climb counts once;
--   * an onsight/flash counts only if it is the climber's FIRST log on that route;
--   * peaks count distinct summits (the route's area), not routes to one summit;
--   * points weight each send by the ROUTE's grade (8 + g^2*0.35, onsight 10 + g^2*0.3), where the
--     client used to multiply by the grade on the climber's own profile -- a typed "5.13" scaled
--     every 5.6 they logged;
--   * each log is TIERED: confirmed by a tagged partner (weight 1), carries a photo or GPS track
--     (0.75), or neither (0.5). Points use the weight; `stats.backed` is the same numbers with
--     the unbacked tier removed, for the board's "backed climbs only" switch.
--
-- WHAT IT STILL CANNOT STOP, stated so nobody reads this as solved: two accounts confirming each
-- other's invented climbs, and photos that are not of the climb. A confirmation is only as good
-- as the partner; that is why the report button sits on every ranking row.
--
-- PRIVACY. The board exposes COUNTS derived from a climber's logs, never a log -- governed by
-- profiles.show_on_ranks (0177), honoured here for everyone but the caller. The tagged partner
-- sees the climb they are asked about (route, date, tick) and the author's name, which a
-- connection already sees. Top climbs reads only trip_report_visibility = 'public' logs, which
-- RLS already lets anyone read, so it exposes nothing new. The Privacy Policy says so.

-- ── 1. No future-dated logs ─────────────────────────────────────────────────────────────────
create or replace function climb_logs_not_in_future()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if new.date_climbed is not null and new.date_climbed > (now() at time zone 'utc')::date + 1 then
    raise exception 'a climb cannot be logged for a date that has not happened yet (%)', new.date_climbed
      using errcode = '22008';
  end if;
  return new;
end $$;
drop trigger if exists climb_logs_not_in_future on climb_logs;
create trigger climb_logs_not_in_future before insert or update of date_climbed on climb_logs
  for each row execute function climb_logs_not_in_future();

-- ── 2. Partner confirmations ────────────────────────────────────────────────────────────────
create table if not exists climb_log_confirmations (
  log_id     uuid not null references climb_logs(id) on delete cascade,
  partner_id uuid not null references auth.users(id) on delete cascade,
  verdict    text not null check (verdict in ('confirmed', 'denied')),
  created_at timestamptz not null default now(),
  primary key (log_id, partner_id)
);
alter table climb_log_confirmations enable row level security;
-- Read by either party. No write policy on purpose: every write goes through
-- respond_to_log_tag(), which checks the tag, the connection and the block.
drop policy if exists "confirmations read by either party" on climb_log_confirmations;
create policy "confirmations read by either party" on climb_log_confirmations for select
  using (partner_id = auth.uid()
         or exists (select 1 from climb_logs l where l.id = log_id and l.user_id = auth.uid()));

-- A verdict is on the climb as it stood. Change the climb and they all go; untag a partner and
-- theirs goes. Definer because the author cannot delete the partner's row under RLS.
create or replace function climb_logs_clear_stale_confirmations()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.route_id is distinct from old.route_id
     or new.date_climbed is distinct from old.date_climbed
     or new.tick_type is distinct from old.tick_type then
    delete from climb_log_confirmations where log_id = new.id;
  elsif new.partners is distinct from old.partners then
    delete from climb_log_confirmations
     where log_id = new.id and not (partner_id = any(coalesce(new.partners, '{}')));
  end if;
  return new;
end $$;
revoke all on function climb_logs_clear_stale_confirmations() from public;
revoke all on function climb_logs_clear_stale_confirmations() from anon;
revoke all on function climb_logs_clear_stale_confirmations() from authenticated;
drop trigger if exists climb_logs_clear_stale_confirmations on climb_logs;
create trigger climb_logs_clear_stale_confirmations after update on climb_logs
  for each row execute function climb_logs_clear_stale_confirmations();

-- Accepted connection between the caller and `other`, and no block either way.
create or replace function log_tag_eligible(author uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select auth.uid() is not null
     and author <> auth.uid()
     and exists (select 1 from connections c where c.status = 'accepted'
                  and ((c.requester = auth.uid() and c.addressee = author)
                    or (c.addressee = auth.uid() and c.requester = author)))
     and not exists (select 1 from blocked_users b
                      where (b.blocker = auth.uid() and b.blocked = author)
                         or (b.blocker = author and b.blocked = auth.uid()));
$$;
revoke all on function log_tag_eligible(uuid) from public;
revoke all on function log_tag_eligible(uuid) from anon;
grant execute on function log_tag_eligible(uuid) to authenticated;

-- The climbs I have been tagged on: unanswered first, then the most recent.
create or replace function log_tags_for_me()
returns table(log_id uuid, author_id uuid, author_name text, author_username text,
              author_avatar text, route_id text, route_name text, route_grade text,
              date_climbed date, tick_type text, verdict text)
language sql stable security definer set search_path = public, pg_temp as $$
  select l.id, l.user_id, p.name, p.username, p.avatar, l.route_id, ro.name, ro.grade,
         l.date_climbed, l.tick_type, c.verdict
    from climb_logs l
    join profiles p on p.id = l.user_id
    left join routes ro on ro.id = l.route_id
    left join climb_log_confirmations c on c.log_id = l.id and c.partner_id = auth.uid()
   where auth.uid() is not null
     and auth.uid() = any(l.partners)
     and log_tag_eligible(l.user_id)
   order by (c.verdict is null) desc, l.date_climbed desc nulls last, l.id
   limit 50;
$$;
revoke all on function log_tags_for_me() from public;
revoke all on function log_tags_for_me() from anon;
grant execute on function log_tags_for_me() to authenticated;

create or replace function respond_to_log_tag(p_log_id uuid, p_verdict text)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare a uuid; tagged uuid[];
begin
  if auth.uid() is null then raise exception 'sign in to confirm a climb'; end if;
  if p_verdict not in ('confirmed', 'denied') then raise exception 'verdict must be confirmed or denied'; end if;
  select l.user_id, l.partners into a, tagged from climb_logs l where l.id = p_log_id;
  if a is null or not (auth.uid() = any(coalesce(tagged, '{}'))) or not log_tag_eligible(a) then
    raise exception 'you were not tagged on that climb' using errcode = '42501';
  end if;
  insert into climb_log_confirmations(log_id, partner_id, verdict)
       values (p_log_id, auth.uid(), p_verdict)
  on conflict (log_id, partner_id) do update set verdict = excluded.verdict, created_at = now();
  return p_verdict;
end $$;
revoke all on function respond_to_log_tag(uuid, text) from public;
revoke all on function respond_to_log_tag(uuid, text) from anon;
grant execute on function respond_to_log_tag(uuid, text) to authenticated;

-- ── 3. Who filed a belay catch ──────────────────────────────────────────────────────────────
alter table belay_catches add column if not exists filed_by uuid references auth.users(id) on delete set null;
comment on column belay_catches.filed_by is
  'The account that filed this catch, stamped from the session by trigger. The Belay leaderboard counts only catches filed by the CLIMBER who was caught; a belayer crediting themselves is not evidence.';
create or replace function belay_catches_stamp_filer()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin new.filed_by := auth.uid(); return new; end $$;
drop trigger if exists belay_catches_stamp_filer on belay_catches;
create trigger belay_catches_stamp_filer before insert on belay_catches
  for each row execute function belay_catches_stamp_filer();

-- ── 4. The leaderboard ──────────────────────────────────────────────────────────────────────
drop function if exists leaderboard(text, text, integer);
create or replace function leaderboard(p_scope text, p_area_id text default null, p_radius_mi integer default 120)
returns table(user_id uuid, is_me boolean, name text, username text, show_name boolean, avatar text,
              location text, disciplines jsonb, dist_mi integer, no_origin boolean,
              trust integer, catches integer, vouches integer, contribs integer, stats jsonb)
language plpgsql stable security definer set search_path = public, pg_temp as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  r double precision := least(greatest(coalesce(p_radius_mi, 120), 10), 500);
  o_lat double precision; o_lng double precision;
  a_path ltree;
begin
  if me is null then raise exception 'sign in to see rankings'; end if;
  if p_scope is null or p_scope not in ('overall', 'near', 'friends', 'area') then
    raise exception 'unknown scope %', p_scope;
  end if;
  if p_scope = 'near' then
    select z.lat, z.lng into o_lat, o_lng
      from profile_zips pz join zip_centroids z on z.zip = pz.zip where pz.user_id = me;
  end if;
  if p_scope = 'area' then
    select a.path into a_path from areas a where a.id = p_area_id;
    if a_path is null then raise exception 'unknown area %', p_area_id; end if;
  end if;

  return query
  with people as (
    select p.id, (p.id = me) as is_me, p.name, p.username, p.show_name, p.avatar, p.location, p.disciplines,
           case when p_scope = 'near' and o_lat is not null then (
             select 3958.8 * 2 * asin(sqrt(
                      power(sin(radians(z.lat - o_lat) / 2), 2)
                    + cos(radians(o_lat)) * cos(radians(z.lat)) * power(sin(radians(z.lng - o_lng) / 2), 2)))
               from profile_zips pz join zip_centroids z on z.zip = pz.zip where pz.user_id = p.id)
           end as miles
      from profiles p
     where (p.id = me or coalesce(p.show_on_ranks, true))
       and not profile_owner_blocked_me(p.id)
       and not exists (select 1 from blocked_users b where b.blocker = me and b.blocked = p.id)
       and (p_scope <> 'friends' or p.id = me
            or exists (select 1 from connections c where c.status = 'accepted'
                        and ((c.requester = me and c.addressee = p.id) or (c.addressee = me and c.requester = p.id))))
  ),
  scoped as (
    select * from people pe
     where p_scope <> 'near' or pe.is_me or (pe.miles is not null and pe.miles <= r)
  ),
  raw as (
    select l.id, l.user_id, l.route_id, l.date_climbed, l.tick_type, l.created_at, l.partners,
           l.photos, l.gpx_track, ro.grade_num, ro.grade_system, coalesce(ro.classic, false) as classic,
           ro.gain_ft, ro.area_id, ro.discipline as raw_disc,
           case when ro.discipline = 'rock' then 'trad' else ro.discipline end as disc
      from climb_logs l
      join scoped s on s.id = l.user_id
      join routes ro on ro.id = l.route_id
      join areas ra on ra.id = ro.area_id
     where l.date_climbed is not null
       and l.date_climbed <= current_date + 1
       and (p_scope <> 'area' or ra.path <@ a_path)
       and not exists (select 1 from climb_log_confirmations c
                        where c.log_id = l.id and c.verdict = 'denied' and c.partner_id = any(l.partners))
  ),
  tiered as (
    select raw.*,
           case when exists (select 1 from climb_log_confirmations c
                              where c.log_id = raw.id and c.verdict = 'confirmed'
                                and c.partner_id = any(raw.partners) and c.partner_id <> raw.user_id) then 'confirmed'
                when (jsonb_typeof(raw.photos) = 'array' and jsonb_array_length(raw.photos) > 0)
                  or raw.gpx_track is not null then 'evidence'
                else 'self' end as tier,
           row_number() over (partition by raw.user_id, raw.route_id, raw.date_climbed order by raw.created_at, raw.id) as rn_day
      from raw
  ),
  deduped as (
    select t.*,
           row_number() over (partition by t.user_id, t.date_climbed order by t.created_at, t.id) as rn_cap,
           row_number() over (partition by t.user_id, t.route_id order by t.date_climbed, t.created_at, t.id) as nth_on_route
      from tiered t where t.rn_day = 1
  ),
  counted as (
    select d.*,
           case d.tier when 'confirmed' then 1.0 when 'evidence' then 0.75 else 0.5 end::numeric as w,
           (d.date_climbed >= current_date - 365) as recent,
           (coalesce(d.tick_type, '') not in ('Attempt', 'Turned around', 'Fell', 'Hung')) as sent,
           greatest(0, least(20, case when d.grade_system in ('yds', 'v', 'wi', 'm') then coalesce(d.grade_num, 0) else 0 end))::numeric as g
      from deduped d where d.rn_cap <= 30
  ),
  vlogs as (
    select c.*, va.v from counted c
    cross join (values ('all'), ('backed')) as va(v)
     where va.v = 'all' or c.tier <> 'self'
  ),
  per_route as (
    select vl.user_id, vl.v, vl.route_id, max(vl.disc) as disc, max(vl.g) as g, max(vl.w) as w,
           bool_or(vl.recent) as recent_any, bool_or(vl.classic) as classic
      from vlogs vl where vl.sent group by vl.user_id, vl.v, vl.route_id
  ),
  route_keys as (
    select pr.*, k from per_route pr
    cross join lateral unnest(case when pr.disc in ('sport', 'trad') then array[pr.disc, 'rock'] else array[pr.disc] end) as k
  ),
  sends as (
    select rk.user_id, rk.v,
           jsonb_object_agg(rk.k, jsonb_build_object('life', rk.life, 'yr', rk.yr)) as sends,
           jsonb_object_agg(rk.k, rk.pts) as points
      from (select user_id, v, k, count(*) as life, count(*) filter (where recent_any) as yr,
                   round(sum((8 + g * g * 0.35) * w)) as pts
              from route_keys group by user_id, v, k) rk
     group by rk.user_id, rk.v
  ),
  totals as (
    select pr.user_id, pr.v, round(sum((8 + pr.g * pr.g * 0.35) * pr.w)) as pts_all,
           count(*) filter (where pr.classic) as classics
      from per_route pr group by pr.user_id, pr.v
  ),
  onsights as (
    select o.user_id, o.v,
           jsonb_object_agg(o.k, jsonb_build_object('life', o.life, 'yr', o.yr)) as onsights,
           jsonb_object_agg(o.k, o.pts) as onsight_pts
      from (select vl.user_id, vl.v, k, count(*) as life, count(*) filter (where vl.recent) as yr,
                   round(sum((10 + vl.g * vl.g * 0.3) * vl.w)) as pts
              from vlogs vl
             cross join lateral unnest(case when vl.disc in ('sport', 'trad') then array[vl.disc, 'rock']
                                            when vl.disc = 'bouldering' then array['bouldering']
                                            else array[]::text[] end) as k
             where vl.tick_type in ('Onsight', 'Flash') and vl.nth_on_route = 1
             group by vl.user_id, vl.v, k) o
     group by o.user_id, o.v
  ),
  peaks as (
    select vl.user_id, vl.v, count(distinct vl.area_id) as life,
           count(distinct vl.area_id) filter (where vl.recent) as yr
      from vlogs vl
     where vl.tick_type = 'Summit' and vl.raw_disc in ('mountaineering', 'alpine', 'scrambling')
     group by vl.user_id, vl.v
  ),
  base as (
    select vl.user_id, vl.v, count(*) as logged, count(*) filter (where vl.tier <> 'self') as backed,
           count(distinct vl.date_climbed) filter (where vl.recent) as days_yr,
           coalesce(sum(vl.gain_ft) filter (where vl.recent), 0) as vert_yr
      from vlogs vl group by vl.user_id, vl.v
  ),
  stats_v as (
    select b.user_id, b.v, jsonb_build_object(
             'logged', b.logged, 'backed', b.backed, 'daysYr', b.days_yr, 'vertYr', b.vert_yr,
             'classics', coalesce(t.classics, 0),
             'sends', coalesce(s.sends, '{}'::jsonb),
             'points', coalesce(s.points, '{}'::jsonb) || jsonb_build_object('all', coalesce(t.pts_all, 0)),
             'onsights', coalesce(o.onsights, '{}'::jsonb),
             'onsightPts', coalesce(o.onsight_pts, '{}'::jsonb),
             'peaks', jsonb_build_object('life', coalesce(pk.life, 0), 'yr', coalesce(pk.yr, 0))) as st
      from base b
      left join sends s on s.user_id = b.user_id and s.v = b.v
      left join totals t on t.user_id = b.user_id and t.v = b.v
      left join onsights o on o.user_id = b.user_id and o.v = b.v
      left join peaks pk on pk.user_id = b.user_id and pk.v = b.v
  ),
  stats as (select sv.user_id, jsonb_object_agg(sv.v, sv.st) as st from stats_v sv group by sv.user_id)
  select s.id, s.is_me, s.name, s.username, s.show_name, s.avatar, s.location, s.disciplines,
         case when p_scope = 'near' and not s.is_me and s.miles is not null
              then (greatest(1, ceil(s.miles / 5.0)) * 5)::integer end,
         (p_scope = 'near' and o_lat is null),
         compute_trust_score(s.id),
         (select count(*)::integer from (
            select bc.climber_id, bc.date_occurred from belay_catches bc
             where bc.belayer_id = s.id and bc.filed_by = bc.climber_id
            union
            select l.user_id, l.date_climbed from climb_logs l
             where l.belayed_by = s.id and l.caught_fall and l.user_id <> s.id) x),
         (select count(distinct vo.from_id)::integer from vouches vo where vo.to_id = s.id and vo.from_id <> s.id),
         (select count(*)::integer from (
            select distinct 'f|' || coalesce(c.route_id, c.area_id, '') || '|' || coalesce(c.field, '') as k
              from contributions c
             where c.contributor = s.id::text and c.kind = 'field'
               and (c.status = 'approved' or exists (
                     select 1 from contributions c2
                      where c2.kind = 'field' and c2.field is not distinct from c.field
                        and c2.route_id is not distinct from c.route_id and c2.area_id is not distinct from c.area_id
                        and c2.value = c.value and c2.contributor <> c.contributor
                        and c2.contributor is not null and c2.contributor not in ('anon', '')))
            union all
            select 'r|' || c.id::text from contributions c
             where c.contributor = s.id::text and (c.kind = 'photo' or (c.kind <> 'field' and c.status = 'approved'))) x),
         st.st
    from scoped s
    left join stats st on st.user_id = s.id
   where p_scope <> 'area' or st.st is not null
   order by s.is_me desc, coalesce((st.st -> 'all' ->> 'logged')::integer, 0) desc, s.id
   limit 500;
end $$;
revoke all on function leaderboard(text, text, integer) from public;
revoke all on function leaderboard(text, text, integer) from anon;
grant execute on function leaderboard(text, text, integer) to authenticated;

-- ── 5. Top climbs ───────────────────────────────────────────────────────────────────────────
drop function if exists leaderboard_top_climbs(text, text, text, integer);
create or replace function leaderboard_top_climbs(p_scope text, p_area_id text default null,
                                                  p_disc text default 'all', p_radius_mi integer default 120)
returns table(route jsonb, area_name text, climbers integer, avg_stars numeric)
language plpgsql stable security definer set search_path = public, pg_temp as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
  r double precision := least(greatest(coalesce(p_radius_mi, 120), 10), 500);
  o_lat double precision; o_lng double precision;
  a_path ltree;
begin
  if me is null then raise exception 'sign in to see rankings'; end if;
  if p_scope = 'near' then
    select z.lat, z.lng into o_lat, o_lng
      from profile_zips pz join zip_centroids z on z.zip = pz.zip where pz.user_id = me;
    if o_lat is null then return; end if;
  end if;
  if p_scope = 'area' then
    select a.path into a_path from areas a where a.id = p_area_id;
    if a_path is null then raise exception 'unknown area %', p_area_id; end if;
  end if;
  return query
  -- The whole route row, so the client can open it with dbRouteToCamel like every other DB list.
  select to_jsonb(ro), ra.name,
         count(distinct l.user_id)::integer, round(avg(l.stars)::numeric, 1)
    from climb_logs l
    join profiles p on p.id = l.user_id
    join routes ro on ro.id = l.route_id
    join areas ra on ra.id = ro.area_id
   where l.trip_report_visibility = 'public'
     and coalesce(p.show_on_ranks, true)
     and not profile_owner_blocked_me(l.user_id)
     and not exists (select 1 from blocked_users b where b.blocker = me and b.blocked = l.user_id)
     and not exists (select 1 from climb_log_confirmations c
                      where c.log_id = l.id and c.verdict = 'denied' and c.partner_id = any(l.partners))
     and (p_scope <> 'area' or ra.path <@ a_path)
     and (p_scope <> 'friends' or l.user_id = me
          or exists (select 1 from connections c where c.status = 'accepted'
                      and ((c.requester = me and c.addressee = l.user_id) or (c.addressee = me and c.requester = l.user_id))))
     and (p_scope <> 'near' or (ro.lat is not null and 3958.8 * 2 * asin(sqrt(
            power(sin(radians(ro.lat - o_lat) / 2), 2)
          + cos(radians(o_lat)) * cos(radians(ro.lat)) * power(sin(radians(ro.lng - o_lng) / 2), 2))) <= r))
     and (coalesce(p_disc, 'all') = 'all'
          or (p_disc = 'rock' and ro.discipline in ('rock', 'sport', 'trad'))
          or (p_disc = 'trad' and ro.discipline in ('rock', 'trad'))
          or ro.discipline = p_disc)
   group by ro.id, ra.name
   order by 3 desc, 4 desc nulls last, ro.name
   limit 40;
end $$;
revoke all on function leaderboard_top_climbs(text, text, text, integer) from public;
revoke all on function leaderboard_top_climbs(text, text, text, integer) from anon;
grant execute on function leaderboard_top_climbs(text, text, text, integer) to authenticated;
