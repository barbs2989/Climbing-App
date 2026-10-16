-- Ranks and the trust score: harder to pad by collusion, by borrowed evidence, and by volume.
--
-- 0194 made Ranks real and stated what it still could not stop. This closes as much of that as
-- the data can support, and fixes two things measured on the way:
--
--   * compute_trust_score ran as the CALLER (it was never a definer). climb_logs, belay_catches
--     and verification_records are all owner-only under RLS, so anyone looking at another climber
--     got a score with that climber's email verification, private logs and catches missing --
--     an email-verified account read 5 to itself and 0 to everyone else, while the Ranks Trust
--     board (a definer) showed the full number. One climber, two trust scores.
--   * the trust score counted EVERY climb_logs row, every shared trip report on any of them, and
--     paid the BELAYER for catches the belayer filed about themselves. 0194 closed all three for
--     Ranks and left the trust score open, so padding logs still padded trust.
--
-- WHAT THIS CHANGES
--   1. rankable_logs(users): ONE place that decides which logs count and how well each is backed.
--      The leaderboard and the trust score both read it, so the two cannot drift apart. Execute is
--      revoked from every client role: it returns other people's logs and is only for definers.
--   2. A partner's confirmation counts (tier 'confirmed', weight 1) only when the partner
--        - was tagged on the log, and is not the author (as 0194);
--        - had held their account for 30 days when they confirmed, and has a confirmed email --
--          so a confirmation takes a real, aged second account, not one made that afternoon;
--        - is STILL an accepted connection and unblocked either way;
--        - has not already fully confirmed 12 of this author's climbs in that calendar year.
--      Past the 12, that partner's further confirmations fall back to whatever evidence the log
--      carries. Two friends can still vouch for each other; they can no longer carry a board.
--   3. Evidence (tier 'evidence', weight 0.75) has to agree with the climb:
--        - a GPS track needs 20+ points, must pass within 5 km of the climb (the route's own
--          coordinate, else its area's -- every route but one has one), and if the file carries
--          timestamps it must have been recorded within a day of date_climbed;
--        - a photo counts through photo_taken_on (new): the date the photo's OWN embedded data
--          records, read in the browser when it is attached. It must be within a day of the climb,
--          and photo_near_route (new) must not be false -- false means the photo's own location
--          put it more than 15 km from the climb. Only the date and that yes/no are stored here.
--      A photo with no embedded date no longer counts as evidence at all.
--   4. compute_trust_score is a DEFINER with a pinned search_path, so everyone sees the same
--      number. Its weights are unchanged; its three padded inputs now read the rules above:
--        logged climbs       = rankable_logs;
--        conditions reported = rankable logs shared as public or crew trip reports THAT SAY
--                              SOMETHING -- notes, condition tags or beta. trip_report_visibility
--                              defaults to 'crew', so every bare log used to count as a report
--                              too, and logging alone paid twice (measured by the 0203 probe:
--                              24 bare logs, 24 "reports");
--        belay catches       = counted_catch_count -- catches the CAUGHT climber filed, plus falls
--                              recorded in the climber's own log (the Belay board's rule, 0194).
--   5. my_trust_counts(): those three counts for the caller, so the Profile's "what feeds your
--      score" breakdown is itemised from the numbers the server used rather than re-derived.
--
-- WHAT IT STILL CANNOT STOP, stated so nobody reads this as solved:
--   * two real, month-old, email-confirmed accounts confirming each other -- at most 12 climbs a
--     year each way;
--   * a forged file: the photo date, its location and a GPX track are all written by the
--     climber's own device, and a determined person can fabricate any of them. These rules stop
--     the borrowed photo and the random track, not a forgery.
--   The report button on every ranking row remains the answer to both.
--
-- PRIVACY. Nothing new is shown to anybody. photo_taken_on / photo_near_route are owner-only
-- under climb_logs' existing RLS and are never returned by a leaderboard function.

-- ── 1. Evidence columns ─────────────────────────────────────────────────────────────────────
alter table climb_logs
  add column if not exists photo_taken_on date,
  add column if not exists photo_near_route boolean;
comment on column climb_logs.photo_taken_on is
  'The date a photo attached to this log says it was taken, from the photo''s own embedded data, read in the browser (0203). Null when no attached photo carries a date. Evidence for Ranks only within a day of date_climbed.';
comment on column climb_logs.photo_near_route is
  'Whether the photo''s own embedded location was within 15 km of the climb (0203). Null when the photo carried no location or the climb has no coordinate. The location itself is not stored.';

-- ── 2. Does a GPS track back this climb? ────────────────────────────────────────────────────
-- Accepts the shape the log form writes -- {"pts": [[lat, lng, elev_ft], ...], "startedAt": iso}
-- -- and a bare array of points. Anything else backs nothing.
create or replace function log_track_backs_climb(p_track jsonb, p_date date,
                                                 p_lat double precision, p_lng double precision)
returns boolean language plpgsql immutable set search_path = public, pg_temp as $$
declare
  pts jsonb;
  started text;
  nearest double precision;
begin
  if p_track is null or p_date is null or p_lat is null or p_lng is null then return false; end if;
  pts := case jsonb_typeof(p_track) when 'array' then p_track when 'object' then p_track -> 'pts' end;
  if pts is null or jsonb_typeof(pts) <> 'array' or jsonb_array_length(pts) < 20 then return false; end if;
  started := case when jsonb_typeof(p_track) = 'object' then p_track ->> 'startedAt' end;
  if started is not null then
    begin
      if abs(((started::timestamptz) at time zone 'utc')::date - p_date) > 1 then return false; end if;
    exception when others then
      return false;
    end;
  end if;
  select min(6371 * 2 * asin(least(1, sqrt(
             power(sin(radians((e ->> 0)::float8 - p_lat) / 2), 2)
           + cos(radians(p_lat)) * cos(radians((e ->> 0)::float8))
             * power(sin(radians((e ->> 1)::float8 - p_lng) / 2), 2)))))
    into nearest
    from jsonb_array_elements(pts) e
   where jsonb_typeof(e) = 'array' and jsonb_typeof(e -> 0) = 'number' and jsonb_typeof(e -> 1) = 'number';
  return nearest is not null and nearest <= 5;
end $$;

-- ── 3. Which logs count, and how well each is backed ────────────────────────────────────────
drop function if exists rankable_logs(uuid[]);
create or replace function rankable_logs(p_users uuid[])
returns table(id uuid, user_id uuid, route_id text, date_climbed date, tick_type text,
              created_at timestamptz, is_report boolean, tier text, nth_on_route bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  with raw as (
    select l.id, l.user_id, l.route_id, l.date_climbed, l.tick_type, l.created_at,
           (coalesce(l.trip_report_visibility, '') in ('public', 'crew')
            and (btrim(coalesce(l.notes, '')) <> '' or cardinality(coalesce(l.cond_tags, '{}')) > 0
                 or btrim(coalesce(l.beta, '')) <> '')) as is_report,
           l.partners, l.photo_taken_on, l.photo_near_route, l.gpx_track,
           coalesce(ro.lat, ra.lat) as rlat, coalesce(ro.lng, ra.lng) as rlng
      from climb_logs l
      join routes ro on ro.id = l.route_id
      join areas ra on ra.id = ro.area_id
     where l.user_id = any(p_users)
       and l.date_climbed is not null
       and l.date_climbed <= current_date + 1
       and not exists (select 1 from climb_log_confirmations c
                        where c.log_id = l.id and c.verdict = 'denied' and c.partner_id = any(l.partners))
  ),
  good_conf as (
    select c.log_id, r.user_id as author, c.partner_id, r.date_climbed
      from raw r
      join climb_log_confirmations c on c.log_id = r.id
      join profiles pp on pp.id = c.partner_id
     where c.verdict = 'confirmed'
       and c.partner_id = any(r.partners) and c.partner_id <> r.user_id
       and pp.created_at <= c.created_at - interval '30 days'
       and exists (select 1 from verification_records v
                    where v.user_id = c.partner_id and v.verification_type = 'email' and v.status = 'verified')
       and exists (select 1 from connections cn where cn.status = 'accepted'
                    and ((cn.requester = r.user_id and cn.addressee = c.partner_id)
                      or (cn.addressee = r.user_id and cn.requester = c.partner_id)))
       and not exists (select 1 from blocked_users b
                        where (b.blocker = r.user_id and b.blocked = c.partner_id)
                           or (b.blocker = c.partner_id and b.blocked = r.user_id))
  ),
  capped_conf as (
    select g.log_id,
           row_number() over (partition by g.author, g.partner_id, extract(year from g.date_climbed)
                              order by g.date_climbed, g.log_id) as nth
      from good_conf g
  ),
  tiered as (
    select r.*,
           case when exists (select 1 from capped_conf cc where cc.log_id = r.id and cc.nth <= 12) then 'confirmed'
                when (r.photo_taken_on between r.date_climbed - 1 and r.date_climbed + 1
                      and r.photo_near_route is not false)
                  or log_track_backs_climb(r.gpx_track, r.date_climbed, r.rlat, r.rlng) then 'evidence'
                else 'self' end as tier
      from raw r
  ),
  one_a_day as (
    select t.*,
           row_number() over (partition by t.user_id, t.route_id, t.date_climbed
                              order by case t.tier when 'confirmed' then 0 when 'evidence' then 1 else 2 end,
                                       t.created_at, t.id) as rn_day
      from tiered t
  ),
  deduped as (
    select d.*,
           row_number() over (partition by d.user_id, d.date_climbed order by d.created_at, d.id) as rn_cap,
           row_number() over (partition by d.user_id, d.route_id order by d.date_climbed, d.created_at, d.id) as nth
      from one_a_day d where d.rn_day = 1
  )
  select x.id, x.user_id, x.route_id, x.date_climbed, x.tick_type, x.created_at,
         x.is_report, x.tier, x.nth
    from deduped x where x.rn_cap <= 30;
$$;
revoke all on function rankable_logs(uuid[]) from public;
revoke all on function rankable_logs(uuid[]) from anon;
revoke all on function rankable_logs(uuid[]) from authenticated;

-- ── 4. Belay catches that count ─────────────────────────────────────────────────────────────
create or replace function counted_catch_count(p_belayer uuid)
returns integer language sql stable security definer set search_path = public, pg_temp as $$
  select count(*)::integer from (
    select bc.climber_id, bc.date_occurred from belay_catches bc
     where bc.belayer_id = p_belayer and bc.filed_by = bc.climber_id
    union
    select l.user_id, l.date_climbed from climb_logs l
     where l.belayed_by = p_belayer and l.caught_fall and l.user_id <> p_belayer) x;
$$;
revoke all on function counted_catch_count(uuid) from public;
revoke all on function counted_catch_count(uuid) from anon;
revoke all on function counted_catch_count(uuid) from authenticated;

-- ── 5. The trust score ──────────────────────────────────────────────────────────────────────
-- Weights exactly as 0038 set them (check:trust-breakdown reads them out of THIS function now).
create or replace function compute_trust_score(user_id uuid)
returns integer
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  base_score int := 0;
  vouch_count int;
  log_count int;
  report_count int;
  catch_count int;
  tenure_days int;
  verified_count int;
begin
  if exists(select 1 from verification_records where verification_records.user_id = compute_trust_score.user_id and status = 'verified' and verification_type = 'email') then
    base_score := base_score + 5;
  end if;

  if exists(select 1 from verification_records where verification_records.user_id = compute_trust_score.user_id and status = 'verified' and verification_type = 'id') then
    base_score := base_score + 10;
  end if;

  select count(*) into verified_count
  from verification_records
  where verification_records.user_id = compute_trust_score.user_id
    and status = 'verified'
    and verification_type in ('member_club', 'guide_certified');
  base_score := base_score + least(verified_count * 5, 10);

  select extract(day from (now() - profiles.created_at)) into tenure_days
  from profiles where profiles.id = compute_trust_score.user_id;
  base_score := base_score + least(tenure_days / 30, 20);

  -- Vouches: 1 point per unique vouch, capped at 20
  select count(distinct from_id) into vouch_count
  from vouches where vouches.to_id = compute_trust_score.user_id and vouches.from_id <> compute_trust_score.user_id;
  base_score := base_score + least(vouch_count, 20);

  select count(*), count(*) filter (where rl.is_report)
    into log_count, report_count
  from rankable_logs(array[compute_trust_score.user_id]) rl;
  base_score := base_score + least(log_count / 5, 15);
  base_score := base_score + least(report_count / 3, 14);

  catch_count := counted_catch_count(compute_trust_score.user_id);
  base_score := base_score + least(catch_count * 2, 10);

  return least(base_score, 99);
end $$;
revoke all on function compute_trust_score(uuid) from public;
grant execute on function compute_trust_score(uuid) to anon, authenticated;

-- ── 6. The caller's own counted inputs, for the Profile breakdown ──────────────────────────
create or replace function my_trust_counts()
returns table(logs integer, reports integer, catches integer)
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'sign in to see your trust score'; end if;
  return query
  select count(*)::integer,
         (count(*) filter (where rl.is_report))::integer,
         counted_catch_count(me)
    from rankable_logs(array[me]) rl;
end $$;
revoke all on function my_trust_counts() from public;
revoke all on function my_trust_counts() from anon;
grant execute on function my_trust_counts() to authenticated;

-- ── 7. The leaderboard, now reading rankable_logs and counted_catch_count ──────────────────────────────────────────────────────────────────────
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
  -- WHICH logs count and how well each is backed is rankable_logs (0203), shared with the trust
  -- score. Only the area scope and the route facts are added here.
  counted as (
    select rl.id, rl.user_id, rl.route_id, rl.date_climbed, rl.tick_type, rl.tier,
           rl.nth_on_route, ro.grade_num, ro.grade_system, coalesce(ro.classic, false) as classic,
           ro.gain_ft, ro.area_id, ro.discipline as raw_disc,
           case when ro.discipline = 'rock' then 'trad' else ro.discipline end as disc,
           case rl.tier when 'confirmed' then 1.0 when 'evidence' then 0.75 else 0.5 end::numeric as w,
           (rl.date_climbed >= current_date - 365) as recent,
           (coalesce(rl.tick_type, '') not in ('Attempt', 'Turned around', 'Fell', 'Hung')) as sent,
           greatest(0, least(20, case when ro.grade_system in ('yds', 'v', 'wi', 'm') then coalesce(ro.grade_num, 0) else 0 end))::numeric as g
      from rankable_logs(array(select sc.id from scoped sc)) rl
      join routes ro on ro.id = rl.route_id
      join areas ra on ra.id = ro.area_id
     where p_scope <> 'area' or ra.path <@ a_path
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
         counted_catch_count(s.id),
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
