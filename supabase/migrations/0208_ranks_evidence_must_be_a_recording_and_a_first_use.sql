-- Ranks: the last two ways to game it, made much harder.
--
-- 0203 left two things standing and said so: two real accounts confirming each other, and a
-- forged photo or GPS file. Neither can be made impossible -- a climber controls their own
-- accounts and files -- but each had a cheap path, and this closes the cheap path.
--
--   (a) COLLUSION. A confirmation now counts fully only for a climber whom at least TWO different
--       qualifying partners have confirmed (all 0203's partner rules still apply: a month-old
--       account, a confirmed email, still connected, 12 a year each). A pair of accounts no longer
--       lifts anything; a ring needs three real, aged, email-confirmed accounts.
--   (b) TRACKS. A GPS track has to be a RECORDING: every kept point carries its offset in seconds
--       from the first (the 4th element the log form now writes), the times never go backwards,
--       the recording lasts 20 minutes to 4 days, and no stretch moves faster than 60 km/h. The
--       cheapest fake -- downloading a route's line from this app or a planner and attaching it --
--       has no times at all, so it backs nothing. A track with no times is still STORED and still
--       draws; it just is not evidence.
--   (c) PHOTOS. Each attached photo's visual fingerprint (a 64-bit difference hash of the picture,
--       computed in the browser -- it survives resizing, recompression and a stripped or edited
--       EXIF) is stored as photo_hash. A photo backs a climb only on the FIRST log that used it:
--       one within 8 bits of an earlier log's photo, by anyone, is the same picture reused. MEASURED
--       (scripts in the PR): a re-save, resize or format change moved a picture up to 8 of 64 bits
--       (flat sky flips bits on compression noise alone); two different scenes never came within 12.
--       A 256-bit hash separated no better. The cost of the bar: the same view shot a step to the
--       side sits 3-5 bits away, so a SECOND climber's own photo of one famous view can read as a
--       reuse -- it then backs nothing, and the climb still counts, as an unbacked one.
--
-- STILL POSSIBLE, stated so nobody reads this as solved: three colluding real accounts; a photo
-- genuinely taken that day but not of the climb; a hand-forged recording with plausible times and
-- speeds. The report button on every ranking row remains the answer to those.
--
-- PRIVACY. photo_hash is a fingerprint of the picture, not the picture; it cannot be turned back
-- into one. It is owner-only under climb_logs' RLS and no leaderboard function returns it. Track
-- times are offsets inside the climber's own log, which only they can read.

alter table climb_logs add column if not exists photo_hash text;
comment on column climb_logs.photo_hash is
  'A 64-bit difference hash (16 hex) of the attached photo that dated this log, computed in the browser (0208). Only the FIRST log to use a photo gets credit for it on Ranks.';
create index if not exists climb_logs_photo_hash_idx on climb_logs (photo_hash) where photo_hash is not null;

-- ── 1. Is this photo's first use this log? ──────────────────────────────────────────────────
create or replace function photo_is_first_use(p_log uuid, p_hash text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select p_hash is not null and p_hash ~ '^[0-9a-f]{16}$'
     and not exists (
       select 1 from climb_logs mine, climb_logs o
        where mine.id = p_log and o.id <> p_log
          and o.photo_hash ~ '^[0-9a-f]{16}$'
          and bit_count(('x' || o.photo_hash)::bit(64) # ('x' || p_hash)::bit(64)) <= 8
          and (o.created_at, o.id) < (mine.created_at, mine.id));
$$;
revoke all on function photo_is_first_use(uuid, text) from public;
revoke all on function photo_is_first_use(uuid, text) from anon;
revoke all on function photo_is_first_use(uuid, text) from authenticated;

-- ── 2. Is this track a recording of this climb? ─────────────────────────────────────────────
create or replace function log_track_backs_climb(p_track jsonb, p_date date,
                                                 p_lat double precision, p_lng double precision)
returns boolean language plpgsql immutable set search_path = public, pg_temp as $$
declare
  pts jsonb;
  started text;
  nearest double precision;
  n int;
  timed int;
  backwards int;
  dur double precision;
  fastest double precision;
begin
  if p_track is null or p_date is null or p_lat is null or p_lng is null then return false; end if;
  if jsonb_typeof(p_track) <> 'object' then return false; end if;   -- a bare array carries no times
  pts := p_track -> 'pts';
  started := p_track ->> 'startedAt';
  if pts is null or jsonb_typeof(pts) <> 'array' or started is null then return false; end if;
  n := jsonb_array_length(pts);
  if n < 20 then return false; end if;
  begin
    if abs(((started::timestamptz) at time zone 'utc')::date - p_date) > 1 then return false; end if;
  exception when others then
    return false;
  end;

  with p as (
    select ord, (e ->> 0)::float8 as lat, (e ->> 1)::float8 as lng,
           case when jsonb_typeof(e -> 3) = 'number' then (e ->> 3)::float8 end as t
      from jsonb_array_elements(pts) with ordinality as x(e, ord)
     where jsonb_typeof(e) = 'array' and jsonb_typeof(e -> 0) = 'number' and jsonb_typeof(e -> 1) = 'number'
  ), seg as (
    select p.*, lag(lat) over w as plat, lag(lng) over w as plng, lag(t) over w as pt
      from p window w as (order by ord)
  )
  select count(*) filter (where t is not null),
         count(*) filter (where t is not null and pt is not null and t < pt),
         max(t) - min(t),
         max(case when t is not null and pt is not null and t - pt >= 1 then
               6371 * 2 * asin(least(1, sqrt(power(sin(radians(lat - plat) / 2), 2)
                 + cos(radians(plat)) * cos(radians(lat)) * power(sin(radians(lng - plng) / 2), 2))))
               / ((t - pt) / 3600.0) end),
         min(6371 * 2 * asin(least(1, sqrt(power(sin(radians(lat - p_lat) / 2), 2)
                 + cos(radians(p_lat)) * cos(radians(lat)) * power(sin(radians(lng - p_lng) / 2), 2)))))
    into timed, backwards, dur, fastest, nearest
    from seg;

  if timed < n * 0.9 or backwards > 0 then return false; end if;       -- a recording has times, in order
  if dur is null or dur < 1200 or dur > 4 * 86400 then return false; end if;
  if fastest is not null and fastest > 60 then return false; end if;   -- km/h: faster than any party moves
  return nearest is not null and nearest <= 5;
end $$;

-- ── 3. rankable_logs, with the three new rules ────────────────────────────────────────
create or replace function rankable_logs(p_users uuid[])
returns table(id uuid, user_id uuid, route_id text, date_climbed date, tick_type text,
              created_at timestamptz, is_report boolean, tier text, nth_on_route bigint)
language sql stable security definer set search_path = public, pg_temp as $$
  with raw as (
    select l.id, l.user_id, l.route_id, l.date_climbed, l.tick_type, l.created_at,
           (coalesce(l.trip_report_visibility, '') in ('public', 'crew')
            and (btrim(coalesce(l.notes, '')) <> '' or cardinality(coalesce(l.cond_tags, '{}')) > 0
                 or btrim(coalesce(l.beta, '')) <> '')) as is_report,
           l.partners, l.photo_taken_on, l.photo_near_route, l.photo_hash, l.gpx_track,
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
  -- (a) A climber is carried by confirmations only once at least TWO different partners have
  -- confirmed their climbs: one colluding friend is no longer enough.
  confirmer_count as (
    select g.author, count(distinct g.partner_id) as n from good_conf g group by g.author
  ),
  capped_conf as (
    select g.log_id,
           row_number() over (partition by g.author, g.partner_id, extract(year from g.date_climbed)
                              order by g.date_climbed, g.log_id) as nth
      from good_conf g
      join confirmer_count cc on cc.author = g.author and cc.n >= 2
  ),
  tiered as (
    select r.*,
           case when exists (select 1 from capped_conf cc where cc.log_id = r.id and cc.nth <= 12) then 'confirmed'
                when (r.photo_taken_on between r.date_climbed - 1 and r.date_climbed + 1
                      and r.photo_near_route is not false
                      and photo_is_first_use(r.id, r.photo_hash))
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
